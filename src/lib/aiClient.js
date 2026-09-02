// Client for the AI serverless endpoints (/api/insights, /api/chat).
//
// Every call resolves to a typed result and NEVER throws to the caller:
//   { status: 'ok', ... } | { status: 'unavailable', reason }
// This mirrors useWeather's honest-fallback contract — the UI always knows
// whether it is showing real AI output or a fallback, so nothing silently
// fakes intelligence.

const TIMEOUT_MS = 15000

async function postJSON(url, body) {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abort.signal,
    })
    if (!res.ok) return { status: 'unavailable', reason: `http-${res.status}` }
    const json = await res.json()
    if (json?.available === true) return { status: 'ok', data: json }
    return { status: 'unavailable', reason: json?.reason ?? 'endpoint-off' }
  } catch (err) {
    return { status: 'unavailable', reason: err?.name === 'AbortError' ? 'timeout' : 'fetch-failed' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Ask /api/insights for AI-generated ESG diagnostic insights.
 * @param {{esg: Array, summary: Object, replication: Object}} context
 * @returns {Promise<{status:'ok', insights: Array}|{status:'unavailable', reason: string}>}
 */
export function fetchAIInsights(context) {
  return postJSON('/api/insights', { context }).then((r) =>
    r.status === 'ok' ? { status: 'ok', insights: r.data.insights } : r
  )
}

/**
 * Send a citizen chat message to /api/chat.
 * @param {Array<{role:'user'|'assistant', text:string}>} messages
 * @param {'en'|'mr'|'hi'} lang
 * @param {{summary: Object, demoMode: boolean, wards: Array}} context
 * @returns {Promise<{status:'ok', reply: string}|{status:'unavailable', reason: string}>}
 */
export function sendChatMessage(messages, lang, context) {
  return postJSON('/api/chat', { messages, lang, context }).then((r) =>
    r.status === 'ok' ? { status: 'ok', reply: r.data.reply } : r
  )
}
