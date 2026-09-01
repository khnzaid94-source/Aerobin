import { useCallback, useEffect, useRef, useState } from 'react'

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
const AIR_POLLUTION_URL = 'https://api.openweathermap.org/data/2.5/air_pollution'

// OpenWeatherMap's 1-5 Air Quality Index, for a plain-language label.
const OWM_AQI_LABEL = { 1: 'Good', 2: 'Fair', 3: 'Moderate', 4: 'Poor', 5: 'Very Poor' }

/**
 * Live PM2.5 for a set of wards, called once per app load and cached in
 * memory (a module-level cache survives remounts within the same tab so
 * switching between the three apps doesn't re-fetch needlessly).
 *
 * Falls back to a single citywide pilot baseline (fallbackPm25, the
 * E1_pm25 ESG metric's `current` value) whenever:
 *   - no API key is configured (VITE_OPENWEATHER_API_KEY unset), or
 *   - the network request fails / OpenWeatherMap errors.
 * In both cases the UI is told via `source: 'fallback'` per ward so it
 * can show an explicit "offline" indicator rather than silently lying
 * about data being live.
 */
const cache = new Map() // wardId -> { pm25, aqi, aqiLabel, updatedAt, source }

export function useWeather(wardList, fallbackPm25) {
  const [readings, setReadings] = useState(() => Object.fromEntries(cache))
  const [isFetching, setIsFetching] = useState(false)
  const requestId = useRef(0)

  const fetchAll = useCallback(async () => {
    if (!wardList || wardList.length === 0) return
    const thisRequest = ++requestId.current
    setIsFetching(true)
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), 8000)

    if (!API_KEY) {
      const fallback = {}
      for (const ward of wardList) {
        fallback[ward.id] = {
          pm25: fallbackPm25 ?? null,
          aqi: null,
          aqiLabel: null,
          updatedAt: Date.now(),
          source: 'fallback',
          reason: 'no-api-key',
        }
      }
      if (thisRequest === requestId.current) {
        for (const [id, val] of Object.entries(fallback)) cache.set(id, val)
        setReadings(Object.fromEntries(cache))
        setIsFetching(false)
      }
      clearTimeout(timer)
      return
    }

    const results = await Promise.allSettled(
      wardList.map(async (ward) => {
        const [lat, lon] = ward.coordinates
        const res = await fetch(`${AIR_POLLUTION_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`, {
          signal: abort.signal,
        })
        if (!res.ok) throw new Error(`OpenWeatherMap ${res.status}`)
        const json = await res.json()
        const point = json?.list?.[0]
        if (!point) throw new Error('Empty air pollution response')
        return {
          id: ward.id,
          pm25: point.components?.pm2_5 ?? null,
          aqi: point.main?.aqi ?? null,
          aqiLabel: OWM_AQI_LABEL[point.main?.aqi] ?? null,
        }
      })
    )
    clearTimeout(timer)

    if (thisRequest !== requestId.current) return // a newer refresh superseded this one

    results.forEach((result, i) => {
      const ward = wardList[i]
      if (result.status === 'fulfilled') {
        cache.set(ward.id, {
          pm25: result.value.pm25,
          aqi: result.value.aqi,
          aqiLabel: result.value.aqiLabel,
          updatedAt: Date.now(),
          source: 'live',
        })
      } else {
        cache.set(ward.id, {
          pm25: fallbackPm25 ?? null,
          aqi: null,
          aqiLabel: null,
          updatedAt: Date.now(),
          source: 'fallback',
          reason: result.reason?.name === 'AbortError' ? 'timeout' : 'fetch-failed',
        })
      }
    })

    setReadings(Object.fromEntries(cache))
    setIsFetching(false)
  }, [wardList, fallbackPm25])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const anyLive = Object.values(readings).some((r) => r.source === 'live')
  const hasApiKey = Boolean(API_KEY)

  return {
    readings, // { [wardId]: { pm25, aqi, aqiLabel, updatedAt, source, reason } }
    isFetching,
    refresh: fetchAll,
    offline: !anyLive,
    hasApiKey,
  }
}
