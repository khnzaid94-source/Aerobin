import { useEffect, useRef, useState } from 'react'

/**
 * Model v0.1 live — ward-day burn-risk probability from the ONNX classifier
 * trained in training/02_train_model.ipynb (public/models/burn-risk-v0.1.onnx,
 * Gradient Boosting, calibrated). Runs fully client-side via onnxruntime-web.
 *
 * Feature pipeline mirrors 01_build_dataset.ipynb exactly, on live data:
 *   - daily weather from Open-Meteo forecast API with past_days=92 (serves
 *     relative_humidity_2m_mean and reaches 92 days back — the forecast API,
 *     not the archive API, because the archive can lag and this is one call)
 *   - daily PM2.5 means from Open-Meteo air-quality API (CAMS), past_days=92
 *   - 7-day slopes/means are past-only (yesterday vs 8 days back), matching
 *     training's shift(1) semantics — no same-day leakage
 *   - days_since_rain counts consecutive dry (<1mm) days over non-null
 *     precipitation values; 92-day cap is a documented live limitation
 *   - static ward flags come from the app dataset (same source as training)
 *   - festival windows: the training table (Diwali/Holika + 7-day aftermath)
 *     extended forward with future dates so the feature stays meaningful
 *
 * Honesty contract (useWeather/useFires ethos): status is 'loading' | 'ready'
 * | 'unavailable'; every failure path — no ORT session, fetch failure, bad
 * data — resolves to 'unavailable' with a reason. The UI shows a quiet
 * "unavailable" note, never a fake probability. Demo mode deliberately does
 * NOT alter this: it's a parallel live estimate of the real world, not a
 * re-rendering of the pilot's simulated scores.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'
const MODEL_URL = `${import.meta.env.BASE_URL}models/burn-risk-v0.1.onnx`
const PAST_DAYS = 92 // covers 7d lags + a generous days_since_rain window

const INCOME_ORDER = { low: 0, mixed: 1, high: 2 }

// Training festival table (2022–24, from 01_build_dataset.ipynb) extended
// forward so live inference keeps the festival_window feature meaningful.
const FESTIVAL_STARTS = [
  '2022-10-24', // Diwali
  '2023-03-07', // Holika Dahan
  '2023-11-12', // Diwali
  '2024-03-24', // Holika Dahan
  '2024-11-01', // Diwali
  '2025-03-14', // Holika Dahan
  '2025-10-21', // Diwali
  '2026-03-04', // Holika Dahan
  '2026-11-08', // Diwali
]
const FESTIVAL_AFTERMATH_DAYS = 7

// Ward centroids [lat, lon] — kept in sync with api/fires.js (training/live
// consistency; see the model card for why these and not the JSON's proxies).
const WARDS = [
  { id: 'hadapsar', name: 'Hadapsar', coordinates: [18.5018, 73.926] },
  { id: 'kharadi', name: 'Kharadi', coordinates: [18.5588, 73.9286] },
  { id: 'wagholi', name: 'Wagholi', coordinates: [18.6074, 73.9872] },
  { id: 'bhosari', name: 'Bhosari', coordinates: [18.6297, 73.8459] },
  { id: 'mundhwa', name: 'Mundhwa', coordinates: [18.5336, 73.8949] },
]

// ---- module-level singletons (survive remounts within the tab) ----
let sessionPromise = null // ort InferenceSession singleton
let cache = { at: 0, data: null } // { wardId -> { probability, asOf, status } }
const CACHE_MS = 10 * 60 * 1000 // live estimate refresh cadence — 10 min

async function getOrt() {
  // Lazy import: the ~360KB onnxruntime-web chunk only loads when a component
  // actually asks for a burn-risk estimate. ort is configured once.
  const ort = await import('onnxruntime-web')
  ort.env.wasm.wasmPaths = `${import.meta.env.BASE_URL}models/ort/`
  // No COOP/COEP headers site-wide (they'd break cross-origin OSM tiles), so
  // the threaded WASM can't get a SharedArrayBuffer — single-threaded is fine
  // for a 307KB model (sub-10ms inference).
  ort.env.wasm.numThreads = 1
  return ort
}

async function getSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await getOrt()
      const response = await fetch(MODEL_URL)
      if (!response.ok) throw new Error(`model file responded with ${response.status}`)
      const buffer = await response.arrayBuffer()
      return ort.InferenceSession.create(buffer, { executionProviders: ['wasm'] })
    })().catch((err) => {
      // Don't cache the failure — a later mount should retry (e.g. the user
      // came back online). Reset so the next call tries fresh.
      sessionPromise = null
      throw err
    })
  }
  return sessionPromise
}

// ---- feature computation (mirrors 01_build_dataset.ipynb) ----

function isoDay(offsetDays = 0) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function festivalWindowToday(dateStr) {
  const today = new Date(dateStr + 'T00:00:00Z')
  for (const start of FESTIVAL_STARTS) {
    const s = new Date(start + 'T00:00:00Z')
    const diff = Math.floor((today - s) / 86400000)
    if (diff >= 0 && diff < FESTIVAL_AFTERMATH_DAYS) return true
  }
  return false
}

async function fetchJson(url, params, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const qs = new URLSearchParams(params).toString()
    const res = await fetch(`${url}?${qs}`, { signal: controller.signal })
    if (!res.ok) throw new Error(`Open-Meteo responded with ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** Compute the 16-feature vector for one ward from live Open-Meteo data. */
function buildFeatures({ weather, pm25, staticFlags }) {
  // Both series arrive oldest -> newest; walk back from the last day.
  const days = weather.time
  if (!days || days.length < 9) throw new Error('not enough weather history')

  // Last fully-observed local day = yesterday (today is still in progress).
  // Training rows also used full days, so live inference predicts for
  // yesterday's completed ward-day — the honest analogue of "today's risk".
  let idx = days.length - 1
  // If the final day is today, step back one so all features are complete-day.
  if (days[idx] === isoDay(0)) idx -= 1
  const lastDate = days[idx]
  if (!lastDate) throw new Error('empty weather series')

  // PM2.5 daily means (oldest -> newest), aligned by date.
  const pm25ByDay = new Map()
  if (pm25?.time?.length) {
    for (let i = 0; i < pm25.time.length; i++) {
      const day = pm25.time[i].slice(0, 10)
      if (pm25.pm2_5[i] == null) continue
      const acc = pm25ByDay.get(day) ?? { sum: 0, n: 0 }
      acc.sum += pm25.pm2_5[i]
      acc.n += 1
      pm25ByDay.set(day, acc)
    }
  }
  const pm25Mean = (date) => {
    const acc = pm25ByDay.get(date)
    return acc && acc.n > 0 ? acc.sum / acc.n : null
  }

  // PM2.5 features (past-only: lag1 vs lag8, i.e. yesterday vs 8 days back).
  const pmLag1 = pm25Mean(days[idx])
  const pmLag8 = pm25Mean(days[idx - 7])
  if (pmLag1 == null || pmLag8 == null) throw new Error('PM2.5 history gap')
  const pm25Slope7d = (pmLag1 - pmLag8) / 7
  // 7-day rolling mean ending yesterday (shift(1) then rolling 7).
  let pmSum = 0
  let pmN = 0
  for (let i = 0; i < 7; i++) {
    const v = pm25Mean(days[idx - i])
    if (v != null) { pmSum += v; pmN += 1 }
  }
  const pm25Mean7d = pmN > 0 ? pmSum / pmN : pmLag1

  // Humidity features (same lag semantics from the daily table).
  const hum = weather.relative_humidity_2m_mean
  const hLag1 = hum[idx]
  const hLag8 = hum[idx - 7]
  if (hLag1 == null || hLag8 == null) throw new Error('humidity history gap')
  const humidityTrend7d = (hLag1 - hLag8) / 7
  let hSum = 0
  let hN = 0
  for (let i = 0; i < 7; i++) {
    const v = hum[idx - i]
    if (v != null) { hSum += v; hN += 1 }
  }
  const humidity7d = hN > 0 ? hSum / hN : hLag1

  // Days since rain: consecutive days with < 1mm, counted backwards from
  // yesterday over non-null values (training semantics; nulls just aren't
  // there in the archive, but the forecast API pads early past days with null).
  const precip = weather.precipitation_sum
  let daysSinceRain = 0
  for (let i = idx; i >= 0; i--) {
    const v = precip[i]
    if (v == null) continue // unknown day — doesn't reset or extend the streak
    if (v >= 1.0) break
    daysSinceRain += 1
  }

  const doy = Math.floor(
    (new Date(lastDate + 'T00:00:00Z') - new Date(lastDate.slice(0, 4) + '-01-01T00:00:00Z')) / 86400000
  ) + 1

  return {
    features: [
      pmLag1, // pm25_mean
      pm25Mean7d, // pm25_mean_7d
      pm25Slope7d, // pm25_slope_7d
      hLag1, // humidity_mean
      humidity7d, // humidity_7d
      humidityTrend7d, // humidity_trend_7d
      weather.temperature_2m_max[idx], // temp_max
      weather.wind_speed_10m_max[idx], // wind_max
      precip[idx] ?? 0, // precipitation_sum (yesterday)
      daysSinceRain, // days_since_rain
      staticFlags.greenCover, // green_cover_pct
      staticFlags.marketFlag, // market_flag
      INCOME_ORDER[staticFlags.incomeLevel], // income_ord
      festivalWindowToday(lastDate) ? 1 : 0, // festival_window
      Math.sin((2 * Math.PI * doy) / 365.25), // doy_sin
      Math.cos((2 * Math.PI * doy) / 365.25), // doy_cos
    ],
    asOf: lastDate,
  }
}

async function estimateForWard(ward, staticFlags, session) {
  const [lat, lon] = ward.coordinates
  const [weatherJson, pm25Json] = await Promise.all([
    fetchJson(FORECAST_URL, {
      latitude: lat,
      longitude: lon,
      daily: 'temperature_2m_max,relative_humidity_2m_mean,precipitation_sum,wind_speed_10m_max',
      past_days: PAST_DAYS,
      forecast_days: 1,
      timezone: 'Asia/Kolkata',
    }, 12000),
    fetchJson(AIR_QUALITY_URL, {
      latitude: lat,
      longitude: lon,
      hourly: 'pm2_5',
      past_days: Math.min(PAST_DAYS, 92), // API max
      forecast_days: 1,
      timezone: 'Asia/Kolkata',
    }, 12000),
  ])
  const { features, asOf } = buildFeatures({
    weather: weatherJson.daily,
    pm25: pm25Json.hourly,
    staticFlags,
  })

  const ort = await getOrt()
  const inputName = session.inputNames[0]
  const data = new Float32Array(features)
  const tensor = new ort.Tensor('float32', data, [1, features.length])
  const outputs = await session.run({ [inputName]: tensor })
  const probs = outputs[session.outputNames[1]] // [P(0) P(1)] with zipmap off
  const p1 = probs.data[1]
  if (!Number.isFinite(p1)) throw new Error('model output not finite')
  return { probability: p1, asOf }
}

/**
 * Live model estimates for all five wards (or null when unavailable).
 * Returns { status, data, error } where data maps wardId ->
 * { probability, asOf }. Cached 10 minutes at module level.
 */
export function useBurnRisk(staticWardFlags) {
  const [state, setState] = useState(() =>
    cache.data && Date.now() - cache.at < CACHE_MS
      ? { status: 'ready', data: cache.data, error: null }
      : { status: 'loading', data: null, error: null }
  )
  const requestId = useRef(0)

  useEffect(() => {
    // Static flags arrive from useAerobinData; without them (still loading)
    // stay in loading state until they're available.
    if (!staticWardFlags) return
    if (cache.data && Date.now() - cache.at < CACHE_MS) {
      setState({ status: 'ready', data: cache.data, error: null })
      return
    }

    const thisRequest = ++requestId.current
    let cancelled = false

    ;(async () => {
      try {
        const session = await getSession()
        const entries = await Promise.all(
          WARDS.map(async (ward) => {
            const flags = staticWardFlags[ward.id]
            const result = await estimateForWard(ward, flags, session)
            return [ward.id, { ...result, status: 'ready' }]
          })
        )
        const data = Object.fromEntries(entries)
        cache = { at: Date.now(), data }
        if (!cancelled && thisRequest === requestId.current) {
          setState({ status: 'ready', data, error: null })
        }
      } catch (err) {
        if (cancelled || thisRequest !== requestId.current) return
        setState({
          status: 'unavailable',
          data: null,
          error: err?.name === 'AbortError' ? 'timeout' : (err?.message ?? 'model-unavailable'),
        })
      }
    })()

    return () => {
      cancelled = true
    }
    // staticWardFlags is a stable derived object from useAerobinData
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staticWardFlags])

  return state
}
