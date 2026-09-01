import { statusColor, statusTextColor } from '../lib/theme'

export function Card({ children, className = '', padded = true }) {
  return (
    <div className={`ab-card ${padded ? 'p-5' : ''} ${className}`}>{children}</div>
  )
}

const STATUS_LABEL = { green: 'On track', amber: 'Watch', red: 'Behind' }

export function StatusPill({ status, label }) {
  const dotColor = statusColor(status)
  const textColor = statusTextColor(status)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: `${dotColor}1F`, color: textColor }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} aria-hidden />
      {label ?? STATUS_LABEL[status] ?? status}
    </span>
  )
}

/** Left-edge colored spine used on ESG / phase / replication cards. */
export function StatusSpine({ status, children, className = '' }) {
  const color = statusColor(status)
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white ${className}`}>
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} aria-hidden />
      <div className="pl-4">{children}</div>
    </div>
  )
}
