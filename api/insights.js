// AI Insights endpoint (Vercel serverless function).
// POST { context: { esg: [...], summary, replication } }
// -> { available, insights: [{pillar,type,color,title,message,action}] }
//
// GEMINI_API_KEY lives only in the server environment (never in the client
// bundle — no VITE_ prefix). When it is absent the endpoint reports
// { available: false } so the UI can honestly say AI is not configured
// instead of pretending.

import { generateWithFallback } from '../apiLib/gemini.js'

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

  const result = await generateWithFallback({
    apiKey,
    systemInstruction: SYSTEM_PROMPT,
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
  })

  if (!result.ok) {
    response.status(200).json({ available: false, reason: result.error, model: result.model })
    return
  }

  let insights
  try {
    insights = JSON.parse(result.text)
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
}
