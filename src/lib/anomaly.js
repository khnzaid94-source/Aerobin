// Client-side PM2.5 anomaly detection.
//
// useWeather only ever holds the LATEST reading per ward, so this module
// keeps a small per-ward history in localStorage (capped, time-pruned) and
// flags readings that are unusual relative to that history.
//
// Honesty contract (same as the rest of the app):
// - Fewer than MIN_READINGS in the window => { anomaly: false, reason:
//   'insufficient-history' } — we make NO claim until there's a baseline.
// - The z-score threshold is deliberately conservative so a "spike" call
//   is rare and meaningful, not noise.

const HISTORY_KEY = 'aerobin.pm25.history.v1'
const MAX_READINGS_PER_WARD = 20
const WINDOW_HOURS = 72
const MIN_READINGS = 6
const Z_THRESHOLD = 2.5

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // best-effort; detection simply won't persist across reloads
  }
}

function prune(readings) {
  const cutoff = Date.now() - WINDOW_HOURS * 3600 * 1000
  return readings.filter((r) => r.t >= cutoff).slice(-MAX_READINGS_PER_WARD)
}

/**
 * Append a successful live reading to the ward's history.
 * Called by useWeather for source:'live' readings only — fallback readings
 * are a constant baseline value and would poison the variance estimate.
 */
export function recordPm25Reading(wardId, pm25) {
  if (!wardId || typeof pm25 !== 'number' || !Number.isFinite(pm25)) return
  const history = loadHistory()
  const readings = prune([...(history[wardId] ?? []), { t: Date.now(), v: pm25 }])
  history[wardId] = readings
  saveHistory(history)
}

/**
 * Evaluate whether the ward's latest reading is anomalous vs its recent
 * history (rolling z-score over the pruned window).
 * @returns {{anomaly: boolean, reason: string, zScore: number|null, historyCount: number, latest: number|null, mean: number|null}}
 */
export function detectPm25Anomaly(wardId, latestPm25) {
  const readings = prune(loadHistory()[wardId] ?? [])
  const base = {
    anomaly: false,
    zScore: null,
    historyCount: readings.length,
    latest: typeof latestPm25 === 'number' ? latestPm25 : null,
    mean: null,
  }
  if (readings.length < MIN_READINGS) return { ...base, reason: 'insufficient-history' }
  if (typeof latestPm25 !== 'number') return { ...base, reason: 'no-live-reading' }

  const values = readings.map((r) => r.v)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  const std = Math.sqrt(variance)
  if (std < 0.5) return { ...base, mean, reason: 'flat-baseline' } // near-constant readings; z-score meaningless

  const z = (latestPm25 - mean) / std
  return {
    anomaly: z >= Z_THRESHOLD,
    reason: z >= Z_THRESHOLD ? 'spike' : 'normal',
    zScore: Math.round(z * 10) / 10,
    historyCount: readings.length,
    latest: latestPm25,
    mean: Math.round(mean * 10) / 10,
  }
}
