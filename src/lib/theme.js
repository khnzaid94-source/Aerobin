// Mirrors the CSS custom properties in src/index.css.
// Leaflet and Recharts both need real color values (not Tailwind classes)
// for inline SVG/canvas styling, so this is the single source of truth
// for hex values used outside of className strings.

export const COLORS = {
  navy: '#121417',
  navyRaised: '#1E2328',
  navyLine: '#2E3630',
  ink: '#0A0C0F',
  teal: '#0CBDA0',
  tealDim: 'rgba(12, 189, 160, 0.12)',
  tealText: '#00695A',
  white: '#FFFFFF',
  mist: '#F6F3EF',
  slate: '#565B72',
  slateSoft: '#8B8FA3',
  red: '#F0435A',
  redDim: 'rgba(240, 67, 90, 0.13)',
  redText: '#B42245',
  amber: '#FFB020',
  amberDim: 'rgba(255, 176, 32, 0.16)',
  amberText: '#8A5A00',
  muted: '#8A9AA8',
  logoBg: '#1C2520',
}

// Landing-page identity accents — one per app, used only for card
// branding (title eyebrow, hover border, accent art, description tint).
// Deliberately a separate palette from RISK_BANDS/statusColor below: those
// are operational (what's happening in a ward / metric), these are just
// "whose app is this."
export const APP_ACCENTS = {
  citizen: { accent: '#4FB89A', tint: '#9ADCC3' },
  dispatch: { accent: '#7AA7D6', tint: '#AAC8E6' },
  analyst: { accent: '#C98A1A', tint: '#E8B86A' },
  model: { accent: '#B49BD8', tint: '#D3C4EC' },
}

export const RISK_BANDS = {
  High: { color: COLORS.red, textColor: COLORS.redText, dim: COLORS.redDim, label: 'High risk' },
  Medium: { color: COLORS.amber, textColor: COLORS.amberText, dim: COLORS.amberDim, label: 'Medium risk' },
  Low: { color: COLORS.teal, textColor: COLORS.tealText, dim: COLORS.tealDim, label: 'Low risk' },
}

// Score-based thresholds, matching the brief exactly:
// red >= 70, amber 40-70, green (teal) < 40.
export function riskBandForScore(score) {
  if (score >= 70) return 'High'
  if (score >= 40) return 'Medium'
  return 'Low'
}

export function riskMeta(score) {
  const band = riskBandForScore(score)
  return { band, ...RISK_BANDS[band] }
}

// Status strings used across phases / replication / ESG metrics in the
// source data ("green" | "amber" | "red") map onto the same three colors.
// Use this for non-text elements (dots, spines, chart lines, marker
// fills) where the brighter, more saturated color reads fine.
export function statusColor(status) {
  if (status === 'green') return COLORS.teal
  if (status === 'amber') return COLORS.amber
  if (status === 'red') return COLORS.red
  return COLORS.slateSoft
}

// Same three statuses, but a darker variant meant specifically for
// *text* rendered on white/mist/tinted-light backgrounds. The bright
// teal/amber/red above all fail WCAG AA as text color on light
// backgrounds (as low as ~1.7:1 for amber) — these pass comfortably
// (5:1+) while still reading clearly as "teal / amber / red".
export function statusTextColor(status) {
  if (status === 'green') return COLORS.tealText
  if (status === 'amber') return COLORS.amberText
  if (status === 'red') return COLORS.redText
  return COLORS.slate
}
