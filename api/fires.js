// Satellite burn-detection endpoint (Vercel serverless function).
// GET /api/fires -> { available, fetchedAt, wards: [{ id, name, count }], total }
//
// Pulls active fire/hotspot pixels from NASA FIRMS (VIIRS S-NPP NRT,
// 375m resolution — the best free feed for small open-waste fires) for the
// Pune bounding box, then attributes each hotspot to the nearest pilot
// ward centroid within 5 km. Ward polygons are NOT used for attribution
// on purpose: several pilot wards share/proxy admin-ward boundaries (see
// src/lib/useWardGeoJSON.js), so nearest-centroid is the honest method.
//
// FIRMS_MAP_KEY lives server-side only. Results are cached for 30 minutes
// — FIRMS data arrives on satellite pass cadence, not per-minute, and the
// free MAP_KEY allows 5000 transactions / 10 minutes which we never approach.

const FIRMS_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv'
const FIRMS_SOURCE = 'VIIRS_SNPP_NRT'
// Pune bounding box: west, south, east, north
const PUNE_BBOX = '73.70,18.40,74.10,18.68'
const DAY_RANGE = '1' // last 24h
const MAX_WARD_DISTANCE_KM = 5

// Ward centroids — [lat, lon], kept in sync with aerobin_data.json info.coordinates.
const WARDS = [
  { id: 'hadapsar', name: 'Hadapsar', coordinates: [18.5018, 73.926] },
  { id: 'kharadi', name: 'Kharadi', coordinates: [18.5588, 73.9286] },
  { id: 'wagholi', name: 'Wagholi', coordinates: [18.6074, 73.9872] },
  { id: 'bhosari', name: 'Bhosari', coordinates: [18.6297, 73.8459] },
  { id: 'mundhwa', name: 'Mundhwa', coordinates: [18.5336, 73.8949] },
]

let cache = { at: 0, data: null }
const CACHE_MS = 30 * 60 * 1000

function haversineKm(a, b) {
  const R = 6371
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLon = ((b[1] - a[1]) * Math.PI) / 180
  const la1 = (a[0] * Math.PI) / 180
  const la2 = (b[0] * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Minimal CSV parse — FIRMS CSVs have quoted fields and \r\n line endings.
function parseFirmsCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim())
  const latIdx = headers.indexOf('latitude')
  const lonIdx = headers.indexOf('longitude')
  if (latIdx === -1 || lonIdx === -1) return []
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const lat = parseFloat(cols[latIdx])
    const lon = parseFloat(cols[lonIdx])
    if (Number.isFinite(lat) && Number.isFinite(lon)) rows.push([lat, lon])
  }
  return rows
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'GET only' })
    return
  }

  const apiKey = process.env.FIRMS_MAP_KEY
  if (!apiKey) {
    response.status(200).json({ available: false, reason: 'no-api-key' })
    return
  }

  if (cache.data && Date.now() - cache.at < CACHE_MS) {
    response.status(200).json({ available: true, fetchedAt: cache.at, ...cache.data })
    return
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(
      `${FIRMS_URL}/${apiKey}/${FIRMS_SOURCE}/${PUNE_BBOX}/${DAY_RANGE}`,
      { signal: controller.signal }
    )
    if (!res.ok) {
      response.status(200).json({ available: false, reason: `firms-${res.status}` })
      return
    }
    const text = await res.text()

    // Attribution: nearest ward centroid within the distance cap.
    const counts = Object.fromEntries(WARDS.map((w) => [w.id, 0]))
    let total = 0
    for (const [lat, lon] of parseFirmsCsv(text)) {
      let best = null
      let bestKm = Infinity
      for (const ward of WARDS) {
        const km = haversineKm([lat, lon], ward.coordinates)
        if (km < bestKm) {
          bestKm = km
          best = ward
        }
      }
      if (best && bestKm <= MAX_WARD_DISTANCE_KM) {
        counts[best.id] += 1
        total += 1
      }
    }

    const data = {
      total,
      wards: WARDS.map((w) => ({ id: w.id, name: w.name, count: counts[w.id] })),
      bbox: PUNE_BBOX,
      dayRange: Number(DAY_RANGE),
    }
    cache = { at: Date.now(), data }

    response.status(200).json({ available: true, fetchedAt: cache.at, ...data })
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : 'fetch-failed'
    response.status(200).json({ available: false, reason })
  } finally {
    clearTimeout(timer)
  }
}
