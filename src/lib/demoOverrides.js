/**
 * Demo Mode — a deliberate, clearly-labeled override layer for showing
 * the alert / high-risk UI paths on demand.
 *
 * The real pilot data's final week is an honest, calm, all-clear state
 * (see README) — accurate, but hard to *show* on camera without editing
 * aerobin_data.json by hand every time. This does the same edit, safely
 * and reversibly, behind a toggle: it deep-clones the fetched data (the
 * original object is never mutated, so switching demo mode off restores
 * the exact real numbers) and only touches the specific fields listed
 * here — nothing else in the app changes behaviour.
 *
 * What it changes, and why:
 *   - Wagholi   -> score 78.4 (High/red)   } together these show all
 *   - Kharadi   -> score 54.2 (Medium/amber) } three map/legend tiers
 *   - summary.highRiskWardsToday -> 1, kept in sync with the ward above
 *     (Citizen/Dispatch compute their own counts from ward scores
 *     directly; this only keeps the landing-page stat line consistent
 *     with them)
 *   - S3 (model equity gap) pushed just over its ceiling -> a genuine
 *     red ESG status, which the real data never has (the pilot came in
 *     amber-or-better on every metric)
 */
export function applyDemoOverrides(rawData) {
  const data = JSON.parse(JSON.stringify(rawData))

  data.wards.wagholi.current.burnRiskScore = 78.4
  data.wards.wagholi.current.riskBand = 'High'
  data.wards.wagholi.current.dispatchStatus = 'Dispatched'

  data.wards.kharadi.current.burnRiskScore = 54.2
  data.wards.kharadi.current.riskBand = 'Medium'
  data.wards.kharadi.current.dispatchStatus = 'On standby'

  data.summary.highRiskWardsToday = 1

  data.esg.social.S3_equityGap.current = 12.6

  return data
}
