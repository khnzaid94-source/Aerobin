import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import { statusColor } from '../lib/theme'

/**
 * Bare 12-week trend line — no axes, gridlines or tooltip. The Analyst
 * dashboard is meant to be scanned as a row of signals, not read chart by
 * chart, so anything beyond the line shape itself is noise.
 *
 * `activeIndex`, when set, draws a small tracking dot at that position —
 * used by the Pilot Playback control so scrubbing the 12-week timeline
 * moves a dot across every sparkline in sync. Nulls are kept in `data`
 * (not filtered out) so index 0–11 always lines up with meta.weeks,
 * which is exactly what activeIndex refers to; connectNulls just skips
 * the gap visually.
 */
export function Sparkline({ series, status, height = 40, activeIndex = null, id }) {
  const color = statusColor(status)
  const data = series.map((point) => ({ week: point.week, value: point.value }))
  const values = data.map((d) => d.value).filter((v) => v != null)

  if (values.length < 2) {
    return (
      <div className="flex items-center text-xs text-slate-soft" style={{ height }}>
        Not enough data yet
      </div>
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.15 || 1
  const colorKey = color.replace('#', '')
  const gradientId = id ? `spark-${id}-${colorKey}` : `spark-${colorKey}`

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={[min - pad, max + pad]} />
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            connectNulls
            activeDot={false}
            dot={(dotProps) => {
              const { index, cx, cy, payload } = dotProps
              if (activeIndex == null || index !== activeIndex || payload.value == null) {
                return <g key={`dot-${index}`} />
              }
              return (
                <g key={`dot-${index}`}>
                  <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.2} />
                  <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
                </g>
              )
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
