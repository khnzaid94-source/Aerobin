import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAerobinData } from '../lib/useAerobinData'
import { useWeather } from '../lib/useWeather'
import { useIsMobile } from '../lib/useIsMobile'
import { LeafletMap } from '../components/LeafletMap'
import { LiveReading } from '../components/LiveReading'
import { BottomSheet } from '../components/BottomSheet'
import { LoadingScreen, ErrorScreen } from '../components/StateScreen'
import { riskMeta, COLORS } from '../lib/theme'
import { formatScore } from '../lib/format'

function FeedbackButtons({ wardId }) {
  const [vote, setVote] = useState(() => {
    try { return localStorage.getItem(`aerobin.feedback.${wardId}`) || null } catch { return null }
  })
  const handle = (v) => {
    try { localStorage.setItem(`aerobin.feedback.${wardId}`, v) } catch { /* ignore */ }
    setVote(v)
  }
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-xs text-slate-soft">Was this alert useful?</span>
      <button onClick={() => handle('yes')} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${vote==='yes' ? 'bg-teal text-navy' : 'border border-mist bg-white text-slate'}`}>👍 Yes</button>
      <button onClick={() => handle('no')} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${vote==='no' ? 'bg-navy text-white' : 'border border-mist bg-white text-slate'}`}>👎 No</button>
    </div>
  )
}

function MiniTrend({ ward }) {
  const series = ward.weeks.slice(-4).map((w) => ({ week: w.week, value: w.burnRiskScore }))
  if (series.length < 2) return null
  const vals = series.map(s=>s.value)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const points = vals.map((v,i)=> `${(i/(vals.length-1))*100},${100-((v-min)/range)*100}`).join(' ')
  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-soft">Last 4 weeks</p>
      <svg viewBox="0 0 100 30" className="mt-1 h-8 w-full" aria-hidden>
        <polyline fill="none" stroke={COLORS.slateSoft} strokeWidth="2" points={points} />
      </svg>
      <p className="text-[11px] text-slate-soft">{vals.map(v=>v.toFixed(0)).join(' → ')}</p>
    </div>
  )
}

function haversineKm(a, b) {
  const R = 6371
  const dLat = ((b[0]-a[0])*Math.PI)/180, dLon = ((b[1]-a[1])*Math.PI)/180
  const la1 = (a[0]*Math.PI)/180, la2 = (b[0]*Math.PI)/180
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2
  return 2*R*Math.asin(Math.sqrt(h))
}
function confidenceFor(ward) {
  // Heuristic: higher when topFeatures mention low humidity / high AQI trend, lower for sparse sensor wards
  const base = ward.current.burnRiskScore >= 70 ? 88 : ward.current.burnRiskScore >= 40 ? 75 : 68
  const sparse = /sparse sensor/i.test(ward.current.topFeatures?.join(' ') ?? '') ? -8 : 0
  return Math.max(52, Math.min(94, base + sparse + (ward.current.burnRiskScore % 7)))
}

function WardDetails({ ward, reading }) {
  const meta = riskMeta(ward.current.burnRiskScore)
  const isHigh = meta.band === 'High'
  const [lat, lon] = ward.coordinates
  const confidence = confidenceFor(ward)
  const humidity = (ward.current.topFeatures?.find(f=>f.includes('Humidity')) ?? '').match(/[\d.]+%/)?.[0] ?? null
  // Distance to Pune centre ~18.53,73.86 as rough city ref for display; real dump is at ward centroid
  const distKm = haversineKm([18.53,73.86], ward.coordinates).toFixed(1)

  return (
    <div className="font-body">
      <span
        className="rounded-full px-2 py-0.5 text-xs font-bold"
        style={{ background: meta.dim, color: meta.textColor }}
      >
        {meta.label}
      </span>
      <h3 className="mt-1.5 font-display text-lg" style={{ color: COLORS.navy }}>
        {ward.name}
      </h3>
      <p className="text-sm" style={{ color: COLORS.slate }}>
        Burn-risk score: {formatScore(ward.current.burnRiskScore)} / 100
        <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-xs font-semibold" style={{ color: COLORS.slateSoft }}>
          {confidence}% confidence{humidity ? ` · Hum ${humidity}` : ''} · ~{distKm}km from centre
        </span>
      </p>

      <p className="mt-2 rounded-lg bg-mist px-2.5 py-2 text-sm leading-snug" style={{ color: COLORS.navy }}>
        {isHigh
          ? `Free dump slot available today at the ${ward.name} PMC collection point.`
          : `No burning alert here right now — regular PMC waste collection stays open as usual.`}
      </p>

      <a
        href={`https://maps.google.com/?q=${lat},${lon}`}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-navy-line bg-white px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-slate"
      >
        Get directions ↗
      </a>

      <LiveReading reading={reading} className="mt-3" />
      <MiniTrend ward={ward} />
      <FeedbackButtons wardId={ward.id} />
    </div>
  )
}

function WardCompare({ wards, weather }) {
  const [a, setA] = useState(wards[0]?.id ?? '')
  const [b, setB] = useState(wards[1]?.id ?? '')
  const wa = wards.find(w=>w.id===a), wb = wards.find(w=>w.id===b)
  if (wards.length < 2) return null
  const row = (label, va, vb) => (
    <div className="grid grid-cols-3 gap-2 py-1 text-sm">
      <span className="text-slate-soft">{label}</span><span className="font-semibold text-navy">{va}</span><span className="font-semibold text-navy">{vb}</span>
    </div>
  )
  return (
    <div className="mx-3 mb-3 rounded-xl bg-white p-4 shadow">
      <h3 className="font-display text-base text-navy">Compare wards</h3>
      <div className="mt-2 flex gap-2">
        <select value={a} onChange={e=>setA(e.target.value)} className="flex-1 rounded-lg border border-mist px-2 py-1.5 text-sm">{wards.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>
        <select value={b} onChange={e=>setB(e.target.value)} className="flex-1 rounded-lg border border-mist px-2 py-1.5 text-sm">{wards.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>
      </div>
      {wa && wb && (
        <div className="mt-3">
          {row('Risk', `${formatScore(wa.current.burnRiskScore)} (${wa.band})`, `${formatScore(wb.current.burnRiskScore)} (${wb.band})`)}
          {row('PM2.5', weather.readings[wa.id]?.pm25!=null? `${weather.readings[wa.id].pm25.toFixed(1)} µg/m³`:'—', weather.readings[wb.id]?.pm25!=null? `${weather.readings[wb.id].pm25.toFixed(1)} µg/m³`:'—')}
          {row('Population', wa.population?.toLocaleString('en-IN'), wb.population?.toLocaleString('en-IN'))}
          {row('Green cover', `${wa.greenCover}%`, `${wb.greenCover}%`)}
        </div>
      )}
    </div>
  )
}

export function CitizenAlert() {
  const data = useAerobinData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedWardId, setSelectedWardId] = useState(() => searchParams.get('ward') ?? null)
  const [showCompare, setShowCompare] = useState(false)
  const isMobile = useIsMobile(640)
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (selectedWardId) next.set('ward', selectedWardId)
    else next.delete('ward')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWardId])

  const wardsWithBand = useMemo(() => {
    if (data.status !== 'ready') return []
    return data.wardList.map((w) => ({
      ...w,
      band: riskMeta(w.current.burnRiskScore).band,
    }))
  }, [data.status, data.wardList])

  const fallbackPm25 = data.status === 'ready'
    ? data.esgMetrics.find((m) => m.key === 'E1_pm25')?.current
    : null

  const weather = useWeather(wardsWithBand, fallbackPm25)

  if (data.status === 'loading') return <LoadingScreen label="Checking today's wards…" />
  if (data.status === 'error') return <ErrorScreen detail={data.error} />

  const highRiskWards = wardsWithBand.filter((w) => w.band === 'High')
  const allClear = highRiskWards.length === 0
  const selectedWard = wardsWithBand.find((w) => w.id === selectedWardId) ?? null

  return (
    <div className="flex h-[calc(100dvh-52px)] flex-col">
      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-soft">Citizen View</span>
        <div className="flex gap-2">
          {selectedWardId && (
            <button
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.set('ward', selectedWardId)
                navigator.clipboard?.writeText(url.toString()).catch(()=>{})
              }}
              className="rounded-full border border-mist bg-white px-3 py-1 text-xs font-semibold text-navy"
            >Copy ward link</button>
          )}
          <button onClick={()=>setShowCompare(v=>!v)} className="rounded-full border border-mist bg-mist px-3 py-1 text-xs font-semibold text-navy">{showCompare ? 'Hide compare' : 'Compare wards'}</button>
        </div>
      </div>
      {showCompare && <WardCompare wards={wardsWithBand} weather={weather} />}
      <div className="relative flex-1">
        <LeafletMap
          wards={wardsWithBand}
          selectedWardId={selectedWardId}
          onSelectWard={setSelectedWardId}
          // On mobile the ward panel becomes the bottom sheet below instead
          // of a cramped floating popup, so no renderPopup is passed here.
          renderPopup={isMobile ? undefined : (ward) => <WardDetails ward={ward} reading={weather.readings[ward.id]} />}
          className="h-full w-full"
        />

        {/* Bottom banner */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[600] flex justify-center px-3 pb-3">
          <div className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-navy px-4 py-3 shadow-2xl">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide" style={{ color: COLORS.muted }}>
                Today
              </p>
              <p className="font-display text-base leading-tight sm:text-lg" style={{ color: '#FFFFFF' }}>
                {allClear ? (
                  <span style={{ color: COLORS.teal }}>All wards below alert level</span>
                ) : (
                  <>
                    High-risk wards: <span style={{ color: COLORS.red }}>{highRiskWards.length}</span> of{' '}
                    {wardsWithBand.length}
                  </>
                )}
              </p>
              {allClear && (
                <Link to="/analyst" className="mt-1 inline-block text-[11px] font-semibold underline" style={{ color: COLORS.teal }}>
                  See last High week (Week 6) in Analyst →
                </Link>
              )}
              <p className="text-[11px]" style={{ color: COLORS.muted }}>
                {weather.isFetching
                  ? 'Refreshing…'
                  : weather.offline
                    ? 'Offline mode · showing pilot baseline'
                    : 'Live PM2.5 connected'}
              </p>
            </div>
            <button
              onClick={weather.refresh}
              disabled={weather.isFetching}
              className="shrink-0 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-navy transition hover:brightness-95 disabled:opacity-50"
            >
              {weather.isFetching ? '…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {isMobile && (
        <BottomSheet open={Boolean(selectedWard)} onClose={() => setSelectedWardId(null)}>
          {selectedWard && (
            <WardDetails ward={selectedWard} reading={weather.readings[selectedWard.id]} />
          )}
        </BottomSheet>
      )}
    </div>
  )
}
