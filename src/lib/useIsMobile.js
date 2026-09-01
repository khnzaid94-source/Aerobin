import { useEffect, useState } from 'react'

/** True when the viewport is at or below `breakpoint` px wide. Reacts live to resizing/rotation. */
export function useIsMobile(breakpoint = 640) {
  const query = `(max-width: ${breakpoint}px)`
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    setIsMobile(mql.matches)
    return () => mql.removeEventListener('change', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakpoint])

  return isMobile
}
