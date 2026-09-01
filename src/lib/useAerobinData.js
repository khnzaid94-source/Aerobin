import { useEffect, useMemo, useState } from 'react'
import { useDemoMode } from './useDemoMode'
import { applyDemoOverrides } from './demoOverrides'

const DATA_URL = `${import.meta.env.BASE_URL}data/aerobin_data.json`

/**
 * Single data loader shared by all three apps. Fetches aerobin_data.json
 * once (React StrictMode-safe via the `cancelled` flag) and reshapes it
 * into the views each app actually consumes, so every app reads from the
 * same object shape instead of re-deriving it three separate ways.
 *
 * When Demo Mode is on, the real fetched JSON is left untouched in state
 * — `applyDemoOverrides` runs inside the derive step below, so toggling
 * demo mode is instant (no re-fetch) and turning it back off restores
 * the exact real values.
 */
export function useAerobinData() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const { demoMode } = useDemoMode()

  useEffect(() => {
    let cancelled = false

    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Data file responded with ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (cancelled) return
        if (!json?.wards || !json?.esg) {
          throw new Error('aerobin_data.json is missing expected sections (wards/esg)')
        }
        setState({ status: 'ready', data: json, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setState({ status: 'error', data: null, error: err.message || 'Unknown error' })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const derived = useMemo(() => {
    if (!state.data) return null
    const raw = demoMode ? applyDemoOverrides(state.data) : state.data

    const wardList = Object.values(raw.wards).map((w) => ({
      id: w.info.id,
      name: w.info.name,
      adminWard: w.info.adminWard,
      coordinates: w.info.coordinates, // [lat, lon]
      population: w.info.population,
      greenCover: w.info.greenCover,
      marketFlag: w.info.marketFlag,
      incomeLevel: w.info.incomeLevel,
      current: w.current,
      weeks: w.weeks,
    }))

    const esgMetrics = [
      ...Object.entries(raw.esg.environmental).map(([key, m]) => ({ key, pillar: 'Environmental', ...m })),
      ...Object.entries(raw.esg.social).map(([key, m]) => ({ key, pillar: 'Social', ...m })),
      ...Object.entries(raw.esg.governance).map(([key, m]) => ({ key, pillar: 'Governance', ...m })),
    ]

    return {
      meta: raw.meta,
      summary: raw.summary,
      wardList,
      esgMetrics,
      phases: raw.phases,
      replication: raw.replication,
      diagnostics: raw.diagnostics,
    }
  }, [state.data, demoMode])

  return {
    status: state.status, // 'loading' | 'ready' | 'error'
    error: state.error,
    demoMode,
    ...derived,
  }
}
