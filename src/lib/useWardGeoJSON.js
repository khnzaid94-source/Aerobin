import { useEffect, useState } from 'react'

const GEOJSON_URL = `${import.meta.env.BASE_URL}data/pune-admin-wards.geojson`

/**
 * Loads the Pune admin-ward boundaries used as map context. Several pilot
 * wards (e.g. Kharadi and Wagholi) share the same underlying admin-ward
 * polygon in this file, and a couple are proxied to a neighbouring
 * boundary — see the `note` field on those wards in aerobin_data.json.
 * Because that mapping is ambiguous, this file is rendered as a single
 * subtle city-context layer rather than highlighted per pilot ward; the
 * actual per-ward markers use the lat/lon in aerobin_data.json directly.
 */
export function useWardGeoJSON() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let cancelled = false
    fetch(GEOJSON_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Ward boundary file responded with ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setState({ status: 'ready', data: json, error: null })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', data: null, error: err.message || 'Unknown error' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
