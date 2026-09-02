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
 *
 * Deadline-aware: the whole operation (all candidate attempts + the one
 * 429/503 retry) must finish within TOTAL_BUDGET_MS. The frontend client
 * waits longer than this budget, so the server always gets to deliver its
 * own verdict (success or honest timeout) before the browser gives up.
 *
 * @returns {Promise<
 *   | { ok: true, text: string, model: string }
 *   | { ok: false, error: string, model: string|null, detail: string }
 * >}
 */
const TOTAL_BUDGET_MS = 25000
const ATTEMPT_TIMEOUT_MS = 20000

export async function generateWithFallback({ apiKey, systemInstruction, contents, generationConfig }) {
  const candidates = await resolveCandidates(apiKey)
  const deadline = Date.now() + TOTAL_BUDGET_MS
  let lastModel = null
  let lastDetail = ''

  const attempt = async (model) => {
    const remaining = deadline - Date.now()
    if (remaining < 1000) return { status: 'deadline' }
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
      signal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining)),
    })
    if (res.ok) {
      const json = await res.json()
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return { status: 'ok', text: text.trim() }
      return { status: 'empty' }
    }
    const body = await res.text().catch(() => '')
    return { status: 'error', code: res.status, detail: `gemini-${res.status}: ${body.slice(0, 200)}` }
  }

  for (const model of candidates.slice(0, 3)) {
    lastModel = model
    let result
    try {
      result = await attempt(model)
    } catch (err) {
      const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError'
      lastDetail = timedOut ? 'timeout' : 'fetch-failed'
      if (Date.now() >= deadline) break // budget exhausted — stop, don't stack attempts
      continue // network hiccup on one candidate: the next may still work
    }

    if (result.status === 'ok') return { ok: true, text: result.text, model }
    if (result.status === 'empty') {
      lastDetail = 'empty-response'
      break // an ok response with no text is not a model-name problem
    }
    if (result.status === 'deadline') {
      lastDetail = 'timeout'
      break
    }

    lastDetail = result.detail
    if (result.code === 404) {
      continue // model retired/renamed for this key — try the next candidate
    }
    if (result.code === 429 || result.code === 503) {
      // Transient overload/quota on the free tier — one retry with backoff,
      // but only if the total budget still has room for it.
      const waitMs = 1200
      if (Date.now() + waitMs + 5000 <= deadline) {
        await new Promise((resolve) => setTimeout(resolve, waitMs))
        let retryResult
        try {
          retryResult = await attempt(model)
        } catch (err) {
          lastDetail = err?.name === 'TimeoutError' || err?.name === 'AbortError' ? 'timeout' : 'fetch-failed'
          if (result.code === 503) continue // next candidate model
          break
        }
        if (retryResult.status === 'ok') return { ok: true, text: retryResult.text, model }
        if (retryResult.status === 'empty') {
          lastDetail = 'empty-response'
          break
        }
        if (retryResult.status !== 'deadline') lastDetail = retryResult.detail ?? lastDetail
        if (retryResult.status === 'error' && (retryResult.code === 429 || retryResult.code === 503)) {
          continue // still overloaded — try the next candidate model
        }
        break
      }
      lastDetail = 'timeout'
      break
    }
    break // other statuses (400, 403…) would fail identically on every model
  }
  return { ok: false, error: lastDetail || 'no-candidate', model: lastModel, detail: lastDetail }
}
