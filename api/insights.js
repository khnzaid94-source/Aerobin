// AI Insights endpoint (Vercel serverless function).
// POST { esg: [{key,label,pillar,unit,current,baseline,target,series}], summary, replication }
// -> { available, insights: [{pillar,type,color,title,message,action}] }
//
// GEMINI_API_KEY lives only in the server environment (never in the client
// bundle — no VITE_ prefix). When it is absent the endpoint reports
// { available: false } so the UI can honestly say AI is not configured
// instead of pretending.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
// Preferred models in order; resolved against the live ListModels endpoint
// once per lambda instance so a renamed/retired model never breaks insights.
const MODEL_PREFERENCE = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-1.5-flash',
]
let resolvedModel = null

async function resolveModel(apiKey) {
  if (resolvedModel) return resolvedModel
  try {
    const res = await fetch(`${GEMINI_BASE}/models`, {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const json = await res.json()
      const names = new Set(
        (json?.models ?? [])
          .map((m) => (m.name ?? '').replace('models/', ''))
          .filter((n) => n && !n.includes('embedding') && !n.includes('tts') && !n.includes('image'))
      )
      resolvedModel = MODEL_PREFERENCE.find((m) => names.has(m)) ?? [...names].find((n) => n.includes('flash')) ?? null
    }
  } catch {
    // fall through to static preference
  }
  if (!resolvedModel) resolvedModel = MODEL_PREFERENCE[0]
  return resolvedModel
}

const SYSTEM_PROMPT = `You are the analytical engine of AeroBin, an open waste burning early-warning pilot across 5 wards in Pune, India (Hadapsar, Kharadi, Wagholi, Bhosari, Mundhwa).

You will be given the pilot's 9 ESG metrics (current value, baseline, target, 12-week series), the replication readiness conditions, and the pilot summary. Your job is to produce diagnostic insights a program analyst would write.

STRICT RULES:
- Use ONLY the numbers given. Never invent, estimate, or extrapolate metrics that are not present.
- Every claim must be traceable to a provided value. Cite the metric key in parentheses, e.g. (E1_pm25).
- 3 to 5 insights, each a JSON object:
  { "pillar": "Environmental"|"Social"|"Governance"|"Cross-pillar", "type": "insight"|"warning", "color": "green"|"amber"|"red", "title": string (max 8 words), "message": string (max 40 words), "action": string (max 25 words) }
- "color" reflects status: green = on track, amber = close/at threshold, red = behind/blocked.
- Prioritize: blocked triggers first, then divergence/convergence between metrics, then achieved milestones.
- Respond with ONLY the JSON array. No markdown fences, no prose.

Respond in English.`

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

  let payload
  try {
    // Vercel auto-parses application/json bodies into objects; fall back to
    // manual parse for raw-string bodies (e.g. other content types locally).
    const body = typeof request.body === 'object' && request.body !== null
      ? request.body
      : JSON.parse(request.body || '{}')
    payload = body?.context
  } catch {
    response.status(400).json({ available: false, reason: 'invalid-json' })
    return
  }

  if (!payload || !Array.isArray(payload.esg) || payload.esg.length === 0) {
    response.status(400).json({ available: false, reason: 'missing-esg-context' })
    return
  }

  // Compact the context so the model reads numbers, not prose.
  const compact = {
    pilot: payload.summary ?? null,
    replication: payload.replication ?? null,
    esg: payload.esg.map((m) => ({
      key: m.key,
      label: m.label,
      pillar: m.pillar,
      unit: m.unit,
      current: m.current,
      baseline: m.baseline,
      target: m.target,
      series: Array.isArray(m.series) ? m.series.map((p) => p.value) : [],
    })),
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)

  try {
    const model = await resolveModel(apiKey)
    const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Pilot context (JSON):\n${JSON.stringify(compact)}` }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      response.status(200).json({ available: false, reason: `gemini-${res.status}-${model}` })
      return
    }

    const json = await res.json()
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      response.status(200).json({ available: false, reason: 'empty-response' })
      return
    }

    let insights
    try {
      insights = JSON.parse(text)
    } catch {
      response.status(200).json({ available: false, reason: 'unparseable-response' })
      return
    }

    if (!Array.isArray(insights)) {
      response.status(200).json({ available: false, reason: 'unexpected-shape' })
      return
    }

    // Sanitize to the exact shape the UI renders; drop anything malformed.
    const validColors = new Set(['green', 'amber', 'red'])
    const validPillars = new Set(['Environmental', 'Social', 'Governance', 'Cross-pillar'])
    const cleaned = insights
      .filter(
        (i) =>
          i &&
          typeof i.title === 'string' &&
          typeof i.message === 'string' &&
          typeof i.action === 'string'
      )
      .slice(0, 5)
      .map((i) => ({
        pillar: validPillars.has(i.pillar) ? i.pillar : 'Cross-pillar',
        type: i.type === 'warning' ? 'warning' : 'insight',
        color: validColors.has(i.color) ? i.color : 'amber',
        title: i.title.slice(0, 90),
        message: i.message.slice(0, 260),
        action: i.action.slice(0, 160),
      }))

    if (cleaned.length === 0) {
      response.status(200).json({ available: false, reason: 'no-valid-insights' })
      return
    }

    response.status(200).json({ available: true, insights: cleaned })
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : 'fetch-failed'
    response.status(200).json({ available: false, reason })
  } finally {
    clearTimeout(timer)
  }
}
