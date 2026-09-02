import { useState } from 'react'
import { Download, Check, Sparkles, RefreshCw } from 'lucide-react'
import { Card, StatusPill, StatusSpine } from '../components/Card'
import { Sparkline } from '../components/Sparkline'
import { PilotPlayback } from '../components/PilotPlayback'
import { useAerobinData } from '../lib/useAerobinData'
import { LoadingScreen, ErrorScreen } from '../components/StateScreen'
import { metricStatus, metricProgressLabel } from '../lib/esgStatus'
import { downloadReportJSON, downloadReportCSV } from '../lib/exportReport'
import { fetchAIInsights } from '../lib/aiClient'
import { useI18n } from '../lib/i18n'

function MetricCard({ metric, activeIndex }) {
  const status = metricStatus(metric)
  const unit = metric.unit === 'binary' ? '' : ` ${metric.unit}`
  const baseline = metric.baseline
  const delta = baseline != null && metric.current != null ? metric.current - baseline : null
  // For display only; status itself comes from esgStatus.js
  const deltaStr = delta == null ? null : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}${unit}`
  return (
    <StatusSpine status={status} className="ab-card">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-soft">
              {metric.pillar} · {metric.key.split('_')[0]}
            </p>
            <h3 className="font-display text-base leading-snug text-navy">{metric.label}</h3>
          </div>
          <StatusPill status={status} label={metricProgressLabel(metric)} />
        </div>

        <div className="mt-3 flex items-end gap-4">
          <div>
            <p className="text-2xl font-bold text-navy">
              {metric.current}
              <span className="text-sm font-normal text-slate">{unit}</span>
              {deltaStr && (
                <span className="ml-2 text-xs font-semibold" style={{ color: status === 'red' ? '#B42245' : '#00695A' }}>
                  {deltaStr} vs baseline
                </span>
              )}
            </p>
            <p className="text-xs text-slate-soft">
              Target {metric.target}
              {unit} · Baseline {metric.baseline ?? '—'}
              {metric.baseline != null ? unit : ''}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <Sparkline series={metric.series} status={status} activeIndex={activeIndex} id={metric.key} />
        </div>
      </div>
    </StatusSpine>
  )
}

function PhaseSection({ phases }) {
  const current = phases.phases.find((p) => p.status === 'active') ?? phases.phases[0]

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-soft">
            Phase progress
          </p>
          <h2 className="font-display text-xl text-navy">
            {current.name} <span className="font-body text-sm font-normal text-slate">· {current.months}</span>
          </h2>
        </div>
        <ol className="flex items-center gap-1.5 text-xs font-semibold text-slate-soft">
          {phases.phases.map((p, i) => (
            <li key={p.name} className="flex items-center gap-1.5">
              <span
                className={`rounded-full px-2.5 py-1 ${
                  p.status === 'active' ? 'bg-navy text-white' : 'bg-mist text-slate-soft'
                }`}
              >
                {p.name}
              </span>
              {i < phases.phases.length - 1 && <span aria-hidden>→</span>}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {current.triggerMetrics.map((tm) => (
          <StatusSpine key={tm.metric} status={tm.status} className="ab-card">
            <div className="p-3.5">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-snug text-navy">{tm.metric}</p>
                <StatusPill status={tm.status} />
              </div>
              <p className="text-lg font-bold text-navy">
                {tm.current}
                {tm.unit}
              </p>
              <p className="text-xs text-slate-soft">Target: {tm.target}</p>
            </div>
          </StatusSpine>
        ))}
      </div>

      <p className="mt-4 rounded-xl bg-mist px-4 py-3 text-sm text-slate">
        <span className="font-semibold text-navy">Exit condition: </span>
        {current.exitCondition}
      </p>
    </Card>
  )
}

function ReplicationSection({ replication }) {
  const [eqGap, setEqGap] = useState(() => {
    const raw = replication.conditions.find(c=>c.condition.includes('Equity Gap'))?.current ?? '10.7%'
    const n = parseFloat(String(raw).replace('%','')) || 10.7
    return n
  })
  const liveReplication = {
    ...replication,
    conditions: replication.conditions.map(c => {
      if (!c.condition.includes('Equity Gap')) return c
      const status = eqGap < 10 ? 'green' : eqGap <= 10.3 ? 'amber' : eqGap <= 15 ? 'amber' : 'red'
      const note = eqGap < 10 ? `What-if ${eqGap.toFixed(1)}% — below threshold, would be met.` : c.note
      return { ...c, current: `${eqGap.toFixed(1)}%`, status, note }
    }),
    readinessStatus: eqGap < 10 && replication.conditions.filter(c=>!c.condition.includes('Equity Gap')).every(c=>c.status==='green') ? 'Ready to replicate (what-if)' : replication.readinessStatus,
  }
  const src = liveReplication
  const counts = src.conditions.reduce(
    (acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }),
    {}
  )
  const total = src.conditions.length
  const met = counts.green ?? 0
  const pct = total ? Math.round((met / total) * 100) : 0

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-soft">
            Replication readiness · {src.targetCity} {eqGap !== 10.7 && <span className="normal-case">· what-if {eqGap.toFixed(1)}%</span>}
          </p>
          <h2 className="font-display text-xl text-navy">{src.readinessStatus}</h2>
        </div>
        <div className="flex gap-1.5 text-xs font-semibold">
          {['green', 'amber', 'red'].map((s) =>
            counts[s] ? (
              <span key={s}>
                <StatusPill status={s} label={`${counts[s]} ${s}`} />
              </span>
            ) : null
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-2.5">
        {src.conditions.map((c) => (
          <li key={c.condition}>
            <StatusSpine status={c.status} className="ab-card">
              <div className="p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-navy">{c.condition}</p>
                  <p className="text-xs text-slate-soft">
                    {c.current} <span aria-hidden>/</span> target {c.target}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate">{c.note}</p>
                {c.condition.includes('Equity Gap') && (
                  <div className="mt-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate">
                      What-if gap:
                      <input type="range" min="8" max="13" step="0.1" value={eqGap} onChange={e=>setEqGap(parseFloat(e.target.value))} className="ab-range flex-1" style={{maxWidth:180}} />
                      <span className="w-12 text-right">{eqGap.toFixed(1)}%</span>
                    </label>
                    <p className="mt-1 text-[11px] text-slate-soft">Drag to see how closing the gap flips replication to Ready — current real value 10.7%</p>
                  </div>
                )}
              </div>
            </StatusSpine>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-soft">
          <span>Replication progress</span><span>{met}/{total} conditions met — {pct}%</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-mist">
          <div className="h-2 rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-soft">Earliest replication: Month 10+ (needs 3/3 green){eqGap < 10 ? ' · what-if meets threshold' : ''}</p>
      </div>
      <p className="mt-3 text-sm text-slate">{src.readinessNote}</p>
    </Card>
  )
}

function DiagnosticsSection({ diagnostics }) {
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aerobin.diagnostics.checked') || '{}') } catch { return {} }
  })
  const toggle = (id) => {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    try { localStorage.setItem('aerobin.diagnostics.checked', JSON.stringify(next)) } catch { /* ignore */ }
  }
  return (
    <Card>
      <h2 className="mb-4 font-display text-xl text-navy">Diagnostics</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {diagnostics.map((d) => (
          <StatusSpine key={d.id} status={d.color} className="ab-card">
            <div className="p-3.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-soft">
                  {d.pillar}
                </span>
                <div className="flex items-center gap-2">
                  <StatusPill status={d.color} label={d.type} />
                  <label className="flex items-center gap-1 text-xs text-slate">
                    <input type="checkbox" checked={!!checked[d.id]} onChange={()=>toggle(d.id)} />
                    Done
                  </label>
                </div>
              </div>
              <p className={`font-display text-base leading-snug ${checked[d.id] ? 'text-slate line-through' : 'text-navy'}`}>{d.title}</p>
              <p className="mt-1 text-sm text-slate">{d.message}</p>
              <p className="mt-2 text-xs font-medium text-navy/70">
                <span className="font-semibold">Next: </span>
                {d.action}
              </p>
            </div>
          </StatusSpine>
        ))}
      </div>
    </Card>
  )
}

function AiDiagnostics({ esgMetrics, summary, replication }) {
  const { t } = useI18n()
  // idle | generating | ready | unavailable | error
  const [state, setState] = useState('idle')
  const [insights, setInsights] = useState([])

  const generate = async () => {
    setState('generating')
    const result = await fetchAIInsights({ esg: esgMetrics, summary, replication })
    if (result.status === 'ok') {
      setInsights(result.insights)
      setState('ready')
    } else if (result.reason === 'no-api-key') {
      setState('unavailable')
    } else {
      setState('error')
    }
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl text-navy">
            <Sparkles size={18} aria-hidden />
            {t('aiTitle')}
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-soft">{t('aiSubtitle')}</p>
        </div>
        {state !== 'unavailable' && (
          <button
            onClick={generate}
            disabled={state === 'generating'}
            className="flex shrink-0 items-center gap-2 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-60"
          >
            {state === 'generating' ? (
              <RefreshCw size={16} className="ab-spin" aria-hidden />
            ) : (
              <Sparkles size={16} aria-hidden />
            )}
            {state === 'generating'
              ? t('aiGenerating')
              : state === 'ready'
                ? t('aiRegenerate')
                : t('aiGenerate')}
          </button>
        )}
      </div>

      {state === 'generating' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="ab-card p-3.5" aria-hidden>
              <div className="ab-shimmer h-3 w-1/3 rounded" />
              <div className="ab-shimmer mt-2.5 h-4 w-2/3 rounded" />
              <div className="ab-shimmer mt-2 h-3 w-full rounded" />
              <div className="ab-shimmer mt-1.5 h-3 w-5/6 rounded" />
            </div>
          ))}
        </div>
      )}

      {state === 'unavailable' && (
        <p className="rounded-xl bg-mist px-4 py-3 text-sm text-slate">{t('aiUnavailable')}</p>
      )}

      {state === 'error' && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate">{t('aiRetry')}</p>
          <button
            onClick={generate}
            className="rounded-full border border-navy-line bg-white px-3 py-1.5 text-xs font-semibold text-navy"
          >
            Retry
          </button>
        </div>
      )}

      {state === 'ready' && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {insights.map((ins, i) => (
              <StatusSpine key={i} status={ins.color} className="ab-card">
                <div className="p-3.5">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-soft">
                      {ins.pillar}
                    </span>
                    <StatusPill status={ins.color} label={ins.type} />
                  </div>
                  <p className="font-display text-base leading-snug text-navy">{ins.title}</p>
                  <p className="mt-1 text-sm text-slate">{ins.message}</p>
                  <p className="mt-2 text-xs font-medium text-navy/70">
                    <span className="font-semibold">Next: </span>
                    {ins.action}
                  </p>
                </div>
              </StatusSpine>
            ))}
          </div>
          <p className="mt-3 text-[11px] font-semibold text-slate-soft">
            ● {t('aiTag')} · {t('aiSubtitle')}
          </p>
        </>
      )}
    </Card>
  )
}

function DownloadReportButton({ data }) {
  const [downloaded, setDownloaded] = useState(null)

  const handleJSON = () => {
    downloadReportJSON(data)
    setDownloaded('json')
    setTimeout(() => setDownloaded(null), 2000)
  }
  const handleCSV = () => {
    downloadReportCSV(data)
    setDownloaded('csv')
    setTimeout(() => setDownloaded(null), 2000)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleJSON}
        className="flex shrink-0 items-center gap-2 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90"
      >
        {downloaded==='json' ? <Check size={16} /> : <Download size={16} />}
        {downloaded==='json' ? 'Downloaded JSON' : 'Export JSON'}
      </button>
      <button
        onClick={handleCSV}
        className="flex shrink-0 items-center gap-2 rounded-full border border-navy-line bg-white px-4 py-2.5 text-sm font-semibold text-navy transition hover:border-slate"
      >
        {downloaded==='csv' ? <Check size={16} /> : <Download size={16} />}
        {downloaded==='csv' ? 'Downloaded CSV' : 'Export CSV'}
      </button>
    </div>
  )
}

export function ImpactAnalyst() {
  const data = useAerobinData()
  const [activeWeekIndex, setActiveWeekIndex] = useState(null)

  if (data.status === 'loading') return <LoadingScreen label="Assembling the scorecard…" />
  if (data.status === 'error') return <ErrorScreen detail={data.error} />

  const pm25 = data.esgMetrics.find((m) => m.key === 'E1_pm25')
  const smsAdoption = data.esgMetrics.find((m) => m.key === 'S2_smsAdoption')

  return (
    <div className="min-h-[calc(100dvh-52px)] bg-mist">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-soft">
            Week {data.summary.currentWeek} of {data.summary.totalWeeks} · {data.summary.pilotStatus}
          </p>
          <h1 className="font-display text-2xl text-navy sm:text-3xl">Impact Analyst Dashboard</h1>
        </div>

        <div className="flex flex-col gap-6">
          <PilotPlayback
            wardList={data.wardList}
            weeks={data.meta.weeks}
            weekDates={data.meta.weekDates}
            onWeekChange={setActiveWeekIndex}
            pm25={pm25}
            smsAdoption={smsAdoption}
          />

          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-navy">ESG scorecard</h2>
                <p className="mt-1 text-xs text-slate-soft">
                  Status = progress from baseline toward target (green ≥ 90%, amber ≥ 60%). Dot
                  on each trend tracks the week selected above.
                </p>
              </div>
              <DownloadReportButton data={data} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.esgMetrics.map((m) => (
                <MetricCard key={m.key} metric={m} activeIndex={activeWeekIndex} />
              ))}
            </div>
          </Card>

          <PhaseSection phases={data.phases} />
          <ReplicationSection replication={data.replication} />
          <AiDiagnostics esgMetrics={data.esgMetrics} summary={data.summary} replication={data.replication} />
          <DiagnosticsSection diagnostics={data.diagnostics} />
        </div>

        <p className="mt-6 text-center text-xs text-slate-soft">
          {data.meta.description} · Budget used {data.summary.pilotBudgetUsed} of{' '}
          {data.summary.pilotBudget} · Last updated {data.summary.lastUpdated}
        </p>
      </div>
    </div>
  )
}
