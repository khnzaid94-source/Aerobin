import { metricStatus } from './esgStatus'

export function buildReportSummary(data) {
  return {
    generatedAt: new Date().toISOString(),
    pilot: data.meta,
    summary: data.summary,
    esgScorecard: data.esgMetrics.map((m) => ({
      key: m.key,
      pillar: m.pillar,
      label: m.label,
      unit: m.unit,
      baseline: m.baseline,
      target: m.target,
      current: m.current,
      status: metricStatus(m),
    })),
    phaseProgress: data.phases,
    replicationReadiness: data.replication,
    diagnostics: data.diagnostics,
  }
}

export function downloadReportJSON(data) {
  const summary = buildReportSummary(data)
  const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = `aerobin-impact-report-week${data.summary.currentWeek}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function downloadReportCSV(data) {
  const rows = [
    ['key','pillar','label','unit','baseline','target','current','status'],
    ...data.esgMetrics.map((m) => {
      const status = metricStatus(m)
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      return [m.key, m.pillar, m.label, m.unit, m.baseline, m.target, m.current, status].map(esc).join(',')
    }),
  ]
  const header = rows[0].map((h)=>`"${h}"`).join(',') + '\n'
  const body = rows.slice(1).join('\n')
  const blob = new Blob([header + body], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = `aerobin-esg-week${data.summary.currentWeek}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
