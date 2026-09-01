import { COLORS } from '../lib/theme'
import { formatPm25, timeAgo } from '../lib/format'

/**
 * PM2.5 value + a small timestamp line making the data's freshness
 * explicit, per the contrast-fix brief:
 *   - live reading  → "Live PM2.5 · Updated X min ago" in muted grey
 *   - fallback/stale → "Last known reading · X min ago" in a dark amber
 * Both colors are set with explicit hex values (not inherited/default),
 * and both are verified (via computed WCAG contrast, not eyeballed) to
 * pass AA on the white card backgrounds this renders on: COLORS.amber
 * itself (#FFB020) is only ~1.8:1 on white and fails badly as text —
 * COLORS.amberText (#8A5A00) is the same hue, darkened, at ~5.9:1.
 */
export function LiveReading({ reading, className = '' }) {
  if (!reading) {
    return (
      <p className={`text-[11px] font-medium ${className}`} style={{ color: COLORS.muted }}>
        Checking PM2.5…
      </p>
    )
  }

  const isLive = reading.source === 'live'
  const ago = timeAgo(reading.updatedAt)
  const label = isLive ? `Live PM2.5 · Updated ${ago}` : `Last known reading · ${ago}`
  const labelColor = isLive ? COLORS.muted : COLORS.amberText

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium" style={{ color: COLORS.slate }}>
          PM2.5
        </span>
        <span className="text-sm font-semibold" style={{ color: COLORS.navy }}>
          {formatPm25(reading.pm25)}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] font-medium" style={{ color: labelColor }}>
        {label}
      </p>
    </div>
  )
}
