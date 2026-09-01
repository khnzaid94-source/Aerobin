import { useCallback, useState } from 'react'
import { DemoContext } from './DemoContext'
import { clearAuditLog } from './auditLog'

/**
 * App-wide toggle, mounted once above the router so it survives
 * navigating between Citizen/Dispatch/Analyst — flip it once on the
 * landing page and every app already reflects it.
 */
export function DemoProvider({ children }) {
  const [demoMode, setDemoModeState] = useState(false)

  // Every toggle (either direction) clears the persisted dispatch log.
  // Demo mode's ward overrides are meant to be replayable on demand — see
  // demoOverrides.js — so a ward dispatched during one demo run shouldn't
  // still show "Logged" the next time demo mode is turned back on. This
  // is the one place demoMode actually changes, so it's the reliable
  // place to reset, rather than each page trying to detect staleness.
  const setDemoMode = useCallback((next) => {
    setDemoModeState(next)
    clearAuditLog()
  }, [])

  return <DemoContext.Provider value={{ demoMode, setDemoMode }}>{children}</DemoContext.Provider>
}
