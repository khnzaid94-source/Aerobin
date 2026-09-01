const STORAGE_KEY = 'aerobin.dispatch.auditLog.v1'

// Translates the pilot data's own dispatchStatus strings into an audit-log
// action/result pair, so the log's seed entries are read straight from
// aerobin_data.json rather than invented.
function seedEntryFor(ward, hoursAgo) {
  const status = ward.current.dispatchStatus || ''
  let action = 'Logged'
  let result = 'From pilot record'

  if (status.startsWith('Dispatched')) {
    action = 'Dispatched'
    result = 'Truck sent'
  } else if (status.startsWith('On standby')) {
    action = 'Flagged'
    result = 'Awaiting officer decision'
  } else if (status.startsWith('Not required')) {
    action = 'Skipped'
    result = 'No dispatch needed'
  } else if (status.startsWith('Baseline')) {
    action = 'Monitoring'
    result = 'Pre-pilot baseline, no dispatch'
  }

  return {
    id: `seed-${ward.id}`,
    wardId: ward.id,
    wardName: ward.name,
    score: ward.current.burnRiskScore,
    action,
    result,
    time: Date.now() - hoursAgo * 3600 * 1000,
    session: false,
  }
}

/** Builds the initial 24h audit trail from each ward's current pilot record. */
export function buildSeedLog(wardList) {
  return wardList
    .map((ward, i) => seedEntryFor(ward, 1 + i * 2.3))
    .sort((a, b) => b.time - a.time)
}

export function loadAuditLog(wardList) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through to seed
  }
  return buildSeedLog(wardList)
}

export function persistAuditLog(log) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
  } catch {
    // best-effort only; in-memory state still works without persistence
  }
}

/**
 * Wipes the persisted dispatch log. Called by DemoProvider every time
 * demo mode is toggled (either direction) — demo mode's ward overrides
 * (see demoOverrides.js) are meant to be replayable on demand, and
 * without this a ward dispatched during one demo run would stay stuck
 * showing "Logged" forever, including the next time demo mode is turned
 * back on. Clearing it here, at the one place demoMode actually changes,
 * is simpler and more reliable than trying to detect staleness later
 * from a flag stored alongside the log.
 */
export function clearAuditLog() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // best-effort only
  }
}

export function makeDispatchEntry({ ward, action }) {
  return {
    id: `${ward.id}-${Date.now()}`,
    wardId: ward.id,
    wardName: ward.name,
    score: ward.current.burnRiskScore,
    action: action === 'dispatch' ? 'Dispatched' : 'Skipped',
    result: action === 'dispatch' ? 'Truck sent' : 'Marked no dispatch',
    time: Date.now(),
    session: true,
  }
}

/** Stats for entries logged live during this browser session (not seed data). */
export function sessionStats(log) {
  const sessionEntries = log.filter((e) => e.session)
  const dispatched = sessionEntries.filter((e) => e.action === 'Dispatched').length
  const skipped = sessionEntries.filter((e) => e.action === 'Skipped').length
  return { dispatched, skipped, total: sessionEntries.length }
}
