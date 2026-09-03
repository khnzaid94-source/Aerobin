import { useEffect, useMemo, useRef, useState } from 'react'
import { useAerobinData } from '../lib/useAerobinData'
import { useWeather } from '../lib/useWeather'
import { useDemoMode } from '../lib/useDemoMode'
import { useBurnRisk } from '../lib/useBurnRisk'
import { LeafletMap } from '../components/LeafletMap'
import { LoadingScreen, ErrorScreen } from '../components/StateScreen'
import { riskMeta, RISK_BANDS, COLORS } from '../lib/theme'
import { formatScore, formatPercent, formatPm25, timeAgo } from '../lib/format'
import { loadAuditLog, persistAuditLog, makeDispatchEntry, sessionStats } from '../lib/auditLog'
import { fetchDispatchLog, isConfigured as supabaseConfigured } from '../lib/supabase'
import { LiveReading } from '../components/LiveReading'

/**
 * Compact hover card for the Dispatch map — Leaflet's <Tooltip> shows
 * this on mouseover and hides it on mouseout automatically (unlike
 * <Popup>, which needs a click), so there's no button/interaction
 * inside it — just enough to answer "what's this marker?" without
 * having to click first. Uses the same text-safe risk colors as
 * everywhere else (meta.textColor, not meta.color) so a hovered Medium
 * ward is actually readable.
 */
function WardTooltip({ ward, reading, modelEstimate }) {
  const meta = riskMeta(ward.current.burnRiskScore)
  const feature = ward.current.topFeatures?.[0]
  return (
    <div className="min-w-[160px] max-w-[220px] font-body">
      <p className="font-display text-sm" style={{ color: COLORS.navy }}>
        {ward.name}
      </p>
      <p className="mt-0.5 text-xs font-semibold" style={{ color: meta.textColor }}>
        {meta.label} · score {formatScore(ward.current.burnRiskScore)}
      </p>
      {feature && (
        <p className="mt-0.5 text-[11px] leading-snug" style={{ color: COLORS.slate }}>
          {feature}
        </p>
      )}
      <p className="mt-0.5 text-[11px]" style={{ color: COLORS.slateSoft }}>
        {ward.current.dispatchStatus}
      </p>
      {reading && (
        <p className="mt-0.5 text-xs" style={{ color: COLORS.slate }}>
          PM2.5 {formatPm25(reading.pm25)}
        </p>
      )}
      {modelEstimate && (
        <p className="mt-0.5 text-[11px] font-semibold" style={{ color: COLORS.slateSoft }}>
          Model v0.1 live: {(modelEstimate.probability * 100).toFixed(1)}% ({modelEstimate.asOf})
        </p>
      )}
    </div>
  )
}

function slaCountdown(entryTime) {
  const elapsed = Date.now() - entryTime
  const left = 24*3600*1000 - elapsed
  if (left <= 0) return { label: 'SLA breached', tone: '#B42245' }
  const hrs = Math.floor(left/3600000), mins = Math.floor((left%3600000)/60000)
  const tone = left < 6*3600000 ? '#8A5A00' : left < 12*3600000 ? '#8A5A00' : '#00695A'
  return { label: `${hrs}h ${mins}m left`, tone }
}

function WardRow({ ward, reading, done, selected, onSelect, onAction, auditEntry, modelEstimate }) {
  const meta = riskMeta(ward.current.burnRiskScore)
  const sla = auditEntry ? slaCountdown(auditEntry.time) : null
  return (
    <li
      onClick={() => onSelect?.(ward.id)}
      onKeyDown={(e) => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); onSelect?.(ward.id)} }}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-3 py-2.5 transition ${selected ? 'border-teal bg-teal-dim/30' : 'border-mist hover:border-slate-soft'}`}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base text-navy">{ward.name}</p>
        <p className="text-xs text-slate">Score {formatScore(ward.current.burnRiskScore)} {sla && <span style={{color:sla.tone, fontWeight:600}}>· {sla.label}</span>}</p>
        <LiveReading reading={reading} wardId={ward.id} className="mt-1" />
        {modelEstimate && (
          <p className="mt-0.5 text-[11px] font-semibold text-slate-soft">
            Model v0.1 live: {(modelEstimate.probability * 100).toFixed(1)}% burn-day probability ({modelEstimate.asOf})
          </p>
        )}
      </div>
      {done ? (
        <span
          className="shrink-0 rounded-full bg-teal-dim px-2.5 py-1 text-xs font-semibold"
          style={{ color: COLORS.tealText }}
        >
          Logged ✓
        </span>
      ) : (
        <div className="flex shrink-0 gap-1.5" onClick={(e)=>e.stopPropagation()}>
          <button
            onClick={() => onAction(ward, 'dispatch')}
            className="rounded-full bg-teal px-3 py-1.5 text-xs font-semibold text-navy transition hover:brightness-95"
          >
            Dispatch
          </button>
          <button
            onClick={() => onAction(ward, 'skip')}
            className="rounded-full border border-navy-line px-3 py-1.5 text-xs font-semibold text-slate transition hover:border-slate"
          >
            Skip
          </button>
        </div>
      )}
    </li>
  )
}

function AuditRow({ entry }) {
  // The tinted background stays keyed off the vivid status color (a pale
  // wash of it looks right as a backdrop); the text itself uses the
  // darker text-safe variant — the vivid colors below fail WCAG AA as
  // text on a light background (amber especially, ~1.7:1).
  const bgKey =
    entry.action === 'Dispatched'
      ? RISK_BANDS.Low.color
      : entry.action === 'Skipped'
        ? '#8B8FA3'
        : entry.action === 'Flagged'
          ? RISK_BANDS.Medium.color
          : RISK_BANDS.Low.color

  const textColor =
    entry.action === 'Dispatched'
      ? RISK_BANDS.Low.textColor
      : entry.action === 'Skipped'
        ? '#8B8FA3'
        : entry.action === 'Flagged'
          ? RISK_BANDS.Medium.textColor
          : RISK_BANDS.Low.textColor

  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-mist px-1 py-2 font-mono text-xs last:border-0">
      <div className="min-w-0">
        <p className="truncate text-navy">
          <span className="font-semibold">{entry.wardName}</span>
          <span className="text-slate-soft"> · score {formatScore(entry.score)}</span>
          {entry.remote && (
            <span
              className="ml-1.5 rounded-full px-1.5 py-0.5 font-sans text-[10px] font-semibold"
              style={{ background: COLORS.tealDim, color: COLORS.tealText }}
              title="Logged from another device — synced via Supabase"
            >
              ↺ synced
            </span>
          )}
        </p>
        <p className="text-slate-soft">{entry.result}</p>
      </div>
      <div className="text-right">
        <span
          className="mb-1 inline-block rounded px-1.5 py-0.5 font-sans font-semibold"
          style={{ background: `${bgKey}1F`, color: textColor }}
        >
          {entry.action}
        </span>
        <p className="text-slate-soft">{timeAgo(entry.time)}</p>
      </div>
    </li>
  )
}

export function DispatchConsole() {
  const data = useAerobinData()
  const { demoMode } = useDemoMode()
  const [auditLog, setAuditLog] = useState(null)
  const [selectedWardId, setSelectedWardId] = useState(null)
  const [auditFilter, setAuditFilter] = useState('All')
  const [auditQuery, setAuditQuery] = useState('')
  const [sessionOnly, setSessionOnly] = useState(false)
  const prevDemoModeRef = useRef(demoMode)

  const wardsWithBand = useMemo(() => {
    if (data.status !== 'ready') return []
    return data.wardList.map((w) => ({ ...w, band: riskMeta(w.current.burnRiskScore).band }))
  }, [data.status, data.wardList])

  const fallbackPm25 = data.status === 'ready'
    ? data.esgMetrics.find((m) => m.key === 'E1_pm25')?.current
    : null
  const weather = useWeather(wardsWithBand, fallbackPm25)

  // Static flags for the live model estimate (same fields as training).
  const staticFlags = useMemo(() => {
    if (data.status !== 'ready') return null
    return Object.fromEntries(
      data.wardList.map((w) => [
        w.id,
        { greenCover: w.greenCover, marketFlag: w.marketFlag, incomeLevel: w.incomeLevel },
      ])
    )
  }, [data.status, data.wardList])
  const burnRisk = useBurnRisk(staticFlags)

  useEffect(() => {
    if (data.status === 'ready' && auditLog === null) {
      const local = loadAuditLog(wardsWithBand)
      setAuditLog(local)
      // Best-effort merge of real (non-demo) dispatch entries from other
      // devices within the last 24h. Local rows win on id collisions;
      // remote rows are marked session:true so they render like genuine
      // actions. Any failure quietly leaves the local seed untouched.
      if (supabaseConfigured()) {
        fetchDispatchLog().then((remote) => {
          if (remote.length === 0) return
          setAuditLog((current) => {
            if (!current) return local
            const seen = new Set(current.map((e) => e.id))
            const fresh = remote.filter((e) => !seen.has(e.id))
            if (fresh.length === 0) return current
            return [...fresh, ...current].sort((a, b) => b.time - a.time)
          })
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.status])

  // Handles turning demo mode on/off *while already on this page* (e.g.
  // the "Turn off" link in the demo banner). DemoProvider already clears
  // the persisted log the instant demoMode changes (see DemoProvider.jsx)
  // — this just re-reads it into this component's own state, since a
  // component that's still mounted won't otherwise notice storage
  // changed. loadAuditLog naturally falls back to a fresh seed once the
  // storage is empty.
  useEffect(() => {
    if (data.status !== 'ready') return
    if (prevDemoModeRef.current === demoMode) return
    prevDemoModeRef.current = demoMode
    setAuditLog(loadAuditLog(wardsWithBand))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode])

  if (data.status === 'loading' || auditLog === null) {
    return <LoadingScreen label="Loading dispatch queue…" />
  }
  if (data.status === 'error') return <ErrorScreen detail={data.error} />

  const dispatchToday = wardsWithBand
    .filter((w) => w.band === 'High')
    .sort((a, b) => b.current.burnRiskScore - a.current.burnRiskScore)
  const actionedIds = new Set(
    auditLog.filter((e) => e.session).map((e) => e.wardId)
  )

  const handleAction = (ward, action) => {
    const entry = makeDispatchEntry({ ward, action }, { demo: demoMode })
    const next = [entry, ...auditLog]
    setAuditLog(next)
    persistAuditLog(next)
  }

  const handleBulkDispatch = () => {
    const pending = dispatchToday.filter((w) => !actionedIds.has(w.id))
    if (pending.length === 0) return
    const entries = pending.map((ward) => makeDispatchEntry({ ward, action: 'dispatch' }, { demo: demoMode }))
    const next = [...entries, ...auditLog]
    setAuditLog(next)
    persistAuditLog(next)
  }

  const handleUndo = () => {
    const firstSessionIdx = auditLog.findIndex((e) => e.session)
    if (firstSessionIdx === -1) return
    const next = auditLog.filter((_, i) => i !== firstSessionIdx)
    setAuditLog(next)
    persistAuditLog(next)
  }

  const g2 = data.esgMetrics.find((m) => m.key === 'G2_pmcResponseRate')
  const session = sessionStats(auditLog)

  return (
    <div className="flex h-[calc(100dvh-52px)] flex-col lg:flex-row">
      <div className="h-64 shrink-0 lg:h-full lg:flex-1">
        <LeafletMap
          wards={wardsWithBand}
          selectedWardId={selectedWardId}
          onSelectWard={setSelectedWardId}
          renderTooltip={(ward) => <WardTooltip ward={ward} reading={weather.readings[ward.id]} modelEstimate={burnRisk.status === 'ready' ? burnRisk.data[ward.id] : null} />}
          className="h-full w-full"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-mist lg:w-[440px] lg:flex-none">
        {/* Response rate tracker */}
        <div className="border-b border-white bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-soft">
                Pilot-to-date response rate
              </p>
              <p className="font-display text-xl text-navy">
                {formatPercent(g2.current, 1)}{' '}
                <span className="text-sm font-normal text-slate">of alerts actioned in 24 hrs</span>
              </p>
              <p className="text-[11px] font-medium" style={{ color: supabaseConfigured() ? COLORS.tealText : COLORS.muted }}>
                {supabaseConfigured() ? '● Cross-device sync on' : '● Local session only'}
              </p>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: `${RISK_BANDS.Low.color}1F`, color: RISK_BANDS.Low.textColor }}
            >
              Target ≥ {g2.target}%
            </span>
          </div>
          {session.total > 0 && (
            <p className="mt-1.5 text-xs text-slate-soft">
              This session: {session.dispatched} dispatched, {session.skipped} skipped ({session.total} logged)
            </p>
          )}
        </div>

        {/* Dispatch Today */}
        <div className="flex min-h-0 flex-1 flex-col border-b border-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg text-navy">Dispatch today {dispatchToday.length>0 && `· ${dispatchToday.length}`}</h2>
            {dispatchToday.length>0 && (
              <div className="flex gap-1.5">
                <button
                  onClick={handleBulkDispatch}
                  disabled={dispatchToday.every((w)=>actionedIds.has(w.id))}
                  className="rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Dispatch all
                </button>
                {session.total>0 && (
                  <button onClick={handleUndo} className="rounded-full border border-mist bg-white px-3 py-1 text-xs font-semibold text-slate">Undo last</button>
                )}
              </div>
            )}
          </div>
          {dispatchToday.length === 0 ? (
            <p className="rounded-xl bg-white px-3 py-3 text-sm text-slate">
              No wards are above the dispatch threshold (score ≥ 70) right now — nothing needs a
              truck today.
            </p>
          ) : (
            <ul className="ab-scroll flex flex-col gap-2 overflow-y-auto">
              {dispatchToday.map((ward) => {
                const entry = auditLog.find(e=>e.wardId===ward.id && e.session)
                return (
                <WardRow
                  key={ward.id}
                  ward={ward}
                  reading={weather.readings[ward.id]}
                  done={actionedIds.has(ward.id)}
                  selected={ward.id === selectedWardId}
                  onSelect={setSelectedWardId}
                  onAction={handleAction}
                  auditEntry={entry}
                  modelEstimate={burnRisk.status === 'ready' ? burnRisk.data[ward.id] : null}
                />
              )})}
            </ul>
          )}
        </div>

        {/* Audit Log */}
        <div className="flex min-h-0 flex-[1.1] flex-col p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg text-navy">Audit log · last 24 hrs</h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-soft">Logged to this browser only</span>
              <button
                onClick={()=>{
                  const headers = ['time','ward','action','result','score']
                  const rows = auditLog.map(e=> [new Date(e.time).toISOString(), e.wardName, e.action, e.result, e.score])
                  const csv = [headers.join(','), ...rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n')
                  const blob = new Blob([csv], {type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`aerobin-audit-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
                }}
                className="rounded-full border border-mist bg-white px-2.5 py-1 text-xs font-semibold text-navy"
              >Export CSV</button>
            </div>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {['All','Dispatched','Skipped','Flagged'].map((f)=> (
              <button key={f} onClick={()=>setAuditFilter(f)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${auditFilter===f ? 'bg-navy text-white' : 'bg-white text-slate border border-mist'}`}>{f}</button>
            ))}
            <label className="ml-auto flex items-center gap-1 text-xs text-slate">
              <input type="checkbox" checked={sessionOnly} onChange={(e)=>setSessionOnly(e.target.checked)} /> This session
            </label>
          </div>
          <input
            type="search"
            placeholder="Search ward…"
            value={auditQuery}
            onChange={(e)=>setAuditQuery(e.target.value)}
            className="mb-2 w-full rounded-lg border border-mist bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-soft"
          />
          <ul className="ab-scroll flex-1 overflow-y-auto rounded-xl bg-white px-3">
            {auditLog
              .filter((e)=> auditFilter==='All' || e.action===auditFilter)
              .filter((e)=> !sessionOnly || e.session)
              .filter((e)=> !auditQuery || e.wardName.toLowerCase().includes(auditQuery.toLowerCase()))
              .slice(0, 40)
              .map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
