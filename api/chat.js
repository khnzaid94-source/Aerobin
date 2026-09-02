// Citizen chatbot endpoint (Vercel serverless function).
// POST { messages: [{role:'user'|'assistant', text}], lang: 'en'|'mr'|'hi', context }
// -> { available, reply: string }
//
// The ward dataset is injected as grounding context on every request, so the
// model answers ONLY about the pilot's 5 wards with the actual scores shown
// in the app. GEMINI_API_KEY stays server-side (no VITE_ prefix). Without a
// key the endpoint reports { available: false } and the widget shows an
// honest "not configured" notice.

const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const LANG_NAME = { en: 'English', mr: 'Marathi (Devanagari script)', hi: 'Hindi (Devanagari script)' }

function systemPromptFor(lang) {
  const replyLang = LANG_NAME[lang] ?? 'English'
  return `You are the AeroBin Citizen Assistant for an open waste burning early-warning pilot in Pune, India. You help residents understand their ward's air quality and what to do about it.

You will be given TODAY'S pilot context: each ward's burn-risk score (0-100), risk band (Low <40, Medium 40-69, High >=70), top contributing features, free PMC dump-slot availability, and the pilot summary.

STRICT RULES:
1. Answer ONLY about the 5 pilot wards (Hadapsar, Kharadi, Wagholi, Bhosari, Mundhwa), their scores, burning risk, air quality, waste disposal, and the pilot itself.
2. If a question is about anything else — other cities, politics, general knowledge, personal advice — politely decline and offer to explain ward risk or where to dump waste instead.
3. Use ONLY the numbers in the provided context. Never invent values. If the context doesn't contain the answer, say you don't have that information yet.
4. Be brief: 1-3 sentences, plain language a resident understands. No markdown headings, no bullet lists longer than 3 items.
5. When a ward is High risk, remind the resident they can use the free PMC dump slot today instead of burning waste.
6. Reply in ${replyLang}.
7. Respond ONLY with the assistant's reply text — no labels, no preamble.`
}

// Keep the injected context small: only what the answers need.
function compactWardContext(context) {
  return {
    pilotSummary: context.summary ?? null,
    demoMode: context.demoMode ?? false,
    wards: (context.wards ?? []).map((w) => ({
      name: w.name,
      burnRiskScore: w.burnRiskScore,
      riskBand: w.riskBand,
      topFeatures: w.topFeatures,
      dispatchStatus: w.dispatchStatus,
      livePm25: w.livePm25 ?? null,
      livePm25Source: w.livePm25Source ?? null,
    })),
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'POST only' })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    response.status(200).json({ available: false, reason: 'no-api-key' })
    return
  }

  let messages, lang, context
  try {
    // Vercel auto-parses application/json bodies into objects; fall back to
    // manual parse for raw-string bodies (e.g. other content types locally).
    const body = typeof request.body === 'object' && request.body !== null
      ? request.body
      : JSON.parse(request.body || '{}')
    messages = Array.isArray(body?.messages) ? body.messages.slice(-10) : []
    lang = typeof body?.lang === 'string' ? body.lang : 'en'
    context = body?.context ?? {}
  } catch {
    response.status(400).json({ available: false, reason: 'invalid-json' })
    return
  }

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    response.status(400).json({ available: false, reason: 'no-user-message' })
    return
  }

  const wardContext = compactWardContext(context)
  const contents = messages
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.text ?? '').slice(0, 1000) }],
    }))
    // Gemini expects the conversation to open with a user turn — drop any
    // leading assistant greeting the client may include.
    .filter((c, i) => !(c.role === 'model' && i === 0) && c.parts[0].text.trim() !== '')
  // Grounding context rides along on every request so it can never be
  // prompt-injected away from the conversation history. It is prepended
  // INTO the first user turn (not as a separate message) so the
  // user/model roles keep alternating cleanly.
  const firstUserIdx = contents.findIndex((c) => c.role === 'user')
  const groundingPrefix =
    `TODAY'S PILOT CONTEXT (authoritative, JSON):\n${JSON.stringify(wardContext)}\n\n` +
    (wardContext.demoMode
      ? "Note: demo mode is ON, so these are demo-forced values — still answer as if they are today's readings.\n\n"
      : '') +
    'Remember: use only these numbers.\n\n'
  if (firstUserIdx >= 0) {
    contents[firstUserIdx].parts[0].text = groundingPrefix + contents[firstUserIdx].parts[0].text
  } else {
    contents.unshift({ role: 'user', parts: [{ text: groundingPrefix.trim() }] })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPromptFor(lang) }] },
        contents,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 300,
        },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      response.status(200).json({ available: false, reason: `gemini-${res.status}` })
      return
    }

    const json = await res.json()
    const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!reply) {
      response.status(200).json({ available: false, reason: 'empty-response' })
      return
    }

    response.status(200).json({ available: true, reply })
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : 'fetch-failed'
    response.status(200).json({ available: false, reason })
  } finally {
    clearTimeout(timer)
  }
}
