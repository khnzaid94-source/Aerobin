/**
 * The 9 ESG metrics in aerobin_data.json carry baseline/target/current
 * numbers but — unlike the phase trigger metrics and replication
 * conditions — no explicit green/amber/red status. This derives one,
 * using the same progress-toward-target logic for every metric so the
 * grading is consistent and auditable rather than picked by eye:
 *
 *   progress = how far current sits between baseline and target
 *              (1.0 = target met or exceeded, 0 = no movement from baseline)
 *   green  = progress >= 0.9   (met, or within 10% of target)
 *   amber  = progress >= 0.6   ("close" — the brief's own word for this tier)
 *   red    = progress <  0.6
 *
 * Two metrics need special handling because they're expressed as a
 * ceiling with no baseline (S3's equity gap has baseline: null — there's
 * nothing to diverge from, only a limit not to exceed):
 *   - S3_equityGap: graded on how far *above* its target ceiling it sits.
 * Metrics with baseline: 0 or null but a higher-is-better target (S2, G2,
 * G3) fall through to the general formula with baseline treated as 0,
 * which is already the correct "no progress yet" starting point for them.
 */
const CEILING_METRICS = new Set(['S3_equityGap'])

export function metricStatus(metric) {
  const { baseline, target, current, key } = metric
  if (current == null || target == null) return 'amber'

  if (CEILING_METRICS.has(key)) {
    const overshoot = (current - target) / target
    if (overshoot <= 0) return 'green'
    if (overshoot <= 0.15) return 'amber'
    return 'red'
  }

  const base = baseline ?? 0
  const lowerIsBetter = target < base
  const span = lowerIsBetter ? base - target : target - base
  const progress = lowerIsBetter ? (base - current) / (span || 1) : (current - base) / (span || 1)

  if (progress >= 0.9) return 'green'
  if (progress >= 0.6) return 'amber'
  return 'red'
}

export function metricProgressLabel(metric) {
  const status = metricStatus(metric)
  return { green: 'On track', amber: 'Close', red: 'Behind' }[status]
}
