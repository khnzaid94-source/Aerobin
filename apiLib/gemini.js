// Shared Gemini helper for the /api serverless functions (chat.js, insights.js).
//
// Lives outside api/ so Vercel never routes it as an endpoint. Handles the
// one part of the Gemini REST API that has historically been brittle: model
// IDs get renamed/retired ("gemini-2.0-flash" and later "gemini-2.5-flash"
// both began returning 404 "no longer available to new users"). Strategy:
//   1. Resolve the account's live model list once per lambda instance
//      (ListModels) and order our preference chain by what actually exists.
//   2. On a 404 from generateContent, fall through to the next candidate —
//      a retired model id can never take the feature down.
// 'gemini-flash-latest' is Google's self-updating GA alias and is tried
// first; numbered newest-first candidates follow as a safety net.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

const MODEL_PREFERENCE = [
  'gemini-flash-latest', // Google's self-updating GA flash alias
  'gemini-3.7-flash',
  'gemini-3.6-flash', // explicitly recommended by the 2.5 retirement error
  'gemini-3.5-flash',
  'gemini-2.5-flash', // legacy keys
]

let cachedCandidates = null

function interestingModels(models) {
  return (models ?? [])
    .map((m) => (m.name ?? '').replace('models/', ''))
    .filter(
      (n) =>
        n &&
        !n.includes('embedding') &&
        !n.includes('tts') &&
        !n.includes('image') &&
        !n.includes('veo') &&
        !n.includes('lyria') &&
        !n.includes('live') &&
        !n.includes('native-audio') &&
        !n.includes('transcribe') &&
        !n.includes('computer-use') &&
        !n.includes('robotics') &&
        !n.includes('deep-research') &&
        !n.includes('preview') // previews rotate names; GA aliases cover us
    )
}

async function resolveCandidates(apiKey) {
  if (cachedCandidates) return cachedCandidates
  let listed = []
  try {
    const res = await fetch(`${GEMINI_BASE}/models`, {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const json = await res.json()
      listed = interestingModels(json?.models)
    }
  } catch {
    // ListModels is an optimization, not a requirement — fall through
  }
  const known = new Set(listed)
  // Preference order first (skipping any the account can't see), then any
  // other flash model the account lists as a last resort.
  const ordered = [
    ...MODEL_PREFERENCE.filter((m) => listed.length === 0 || known.has(m)),
    ...listed.filter((m) => !MODEL_PREFERENCE.includes(m) && m.includes('flash')),
  ]
  cachedCandidates = ordered.length > 0 ? ordered : MODEL_PREFERENCE
  return cachedCandidates
}

/**
 * Generate content, falling through candidate models on 404.
 * @returns {Promise<
 *   | { ok: true, text: string, model: string }
 *   | { ok: false, error: string, model: string|null, detail: string }
 * >}
 */
export async function generateWithFallback({ apiKey, systemInstruction, contents, generationConfig }) {
  const candidates = await resolveCandidates(apiKey)
  let lastModel = null
  let lastDetail = ''

  for (const model of candidates.slice(0, 3)) {
    lastModel = model
    try {
      const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          contents,
          generationConfig,
        }),
        signal: AbortSignal.timeout(20000),
      })
      if (res.ok) {
        const json = await res.json()
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return { ok: true, text: text.trim(), model }
        lastDetail = 'empty-response'
        break // an ok response with no text is not a model-name problem
      }
      const body = await res.text().catch(() => '')
      lastDetail = `gemini-${res.status}: ${body.slice(0, 200)}`
      if (res.status === 404) {
        // Model retired/renamed for this key — try the next candidate.
        continue
      }
      if (res.status === 429 || res.status === 503) {
        // Transient overload/quota on the free tier — one retry with
        // backoff on the same model before falling through.
        await new Promise((resolve) => setTimeout(resolve, 1200))
        const retry = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
            contents,
            generationConfig,
          }),
          signal: AbortSignal.timeout(20000),
        })
        if (retry.ok) {
          const json = await retry.json()
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) return { ok: true, text: text.trim(), model }
          lastDetail = 'empty-response'
          break
        }
        const retryBody = await retry.text().catch(() => '')
        lastDetail = `gemini-${retry.status}: ${retryBody.slice(0, 200)}`
        if (retry.status === 503 || retry.status === 429) continue // try next candidate model
        break
      }
      break // other statuses would fail identically on every model
    } catch (err) {
      lastDetail = err?.name === 'TimeoutError' || err?.name === 'AbortError' ? 'timeout' : 'fetch-failed'
      break // network-level failure: retrying other models won't help
    }
  }
  return { ok: false, error: lastDetail || 'no-candidate', model: lastModel, detail: lastDetail }
}
