import { useEffect, useState } from 'react'

/**
 * Satellite burn-detection feed from /api/fires (NASA FIRMS hotspots for
 * the Pune bbox, attributed to the nearest ward centroid within 5 km).
 *
 * Same honest-availability contract as useWeather: the hook reports
 * `source: 'fallback'` with a reason when the endpoint is missing a key,
 * times out, or errors — the UI then simply hides the satellite line
 * instead of pretending the sky is clear.
 */
export function useFires() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let cancelled = false
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), 12000)

    fetch('/api/fires', { signal: abort.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Fires endpoint responded with ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (cancelled) return
        if (json?.available !== true) {
          setState({ status: 'unavailable', data: null, error: json?.reason ?? 'endpoint-off' })
        } else {
          setState({ status: 'ready', data: json, error: null })
        }
      })
      .catch((err) => {
        if (cancelled) return
        setState({
          status: 'unavailable',
          data: null,
          error: err?.name === 'AbortError' ? 'timeout' : 'fetch-failed',
        })
      })
      .finally(() => clearTimeout(timer))

    return () => {
      cancelled = true
      abort.abort()
      clearTimeout(timer)
    }
  }, [])

  return state // { status: 'loading'|'ready'|'unavailable', data, error }
}
