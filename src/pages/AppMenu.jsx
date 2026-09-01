import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wind } from 'lucide-react'
import { useAerobinData } from '../lib/useAerobinData'
import { LoadingScreen, ErrorScreen } from '../components/StateScreen'
import { WaveArt, NodeGridArt, RingsArt } from '../components/CardAccentArt'
import { COLORS, APP_ACCENTS } from '../lib/theme'
import { useDemoMode } from '../lib/useDemoMode'

// Explicit hex values throughout this page, on purpose: every card here
// sits on dark navy chrome, and relying on inherited/opacity-based white
// is exactly what let the card titles go unreadable before (see the
// @layer base fix in index.css for the actual root cause). Nothing on
// this page inherits its text color.
const TEXT_ON_DARK = '#FFFFFF'
const TEXT_ON_DARK_SECONDARY = '#C7CDD9'

const APPS = [
  {
    path: '/citizen',
    key: 'citizen',
    eyebrow: 'Street level',
    title: 'Citizen Alert',
    question: '"Is my ward burning today? Where can I dump waste for free?"',
    description: "A map for residents. Today's high-risk wards, one tap for the nearest dump point.",
    stat: (d) => `${d.summary.highRiskWardsToday} of ${d.summary.wardsMonitored} wards high risk today`,
    Art: WaveArt,
  },
  {
    path: '/dispatch',
    key: 'dispatch',
    eyebrow: 'Operations',
    title: 'PMC Dispatch',
    question: '"Which wards need trucks? Did my driver actually go there?"',
    description: 'A console for ward officers. Dispatch decisions, logged and auditable.',
    stat: (d) => {
      const g2 = d.esgMetrics.find((m) => m.key === 'G2_pmcResponseRate')
      return `${g2.current}% of alerts actioned within 24 hrs`
    },
    Art: NodeGridArt,
  },
  {
    path: '/analyst',
    key: 'analyst',
    eyebrow: 'Leadership',
    title: 'Impact Analyst',
    question: '"Did the pilot work? Are we ready to scale?"',
    description: 'A scorecard for funders and PMC leadership. Nine metrics, one readiness call.',
    stat: (d) => `Week ${d.summary.currentWeek} of ${d.summary.totalWeeks} · ${d.replication.readinessStatus}`,
    Art: RingsArt,
  },
]

function Logo() {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: COLORS.logoBg, border: `1px solid ${COLORS.teal}` }}
      >
        <Wind size={21} color={COLORS.teal} strokeWidth={2.25} aria-hidden="true" />
      </div>
      <div>
        <p style={{ color: TEXT_ON_DARK, fontSize: 18, fontWeight: 500, margin: 0 }}>AeroBin</p>
        <p style={{ color: COLORS.muted, fontSize: 16, fontWeight: 500, margin: 0 }}>
          Predictive Justice For Clean Air
        </p>
      </div>
    </div>
  )
}

export function AppMenu() {
  const data = useAerobinData()
  const { demoMode, setDemoMode } = useDemoMode()
  const [showDemoHint, setShowDemoHint] = useState(false)
  const [hintFading, setHintFading] = useState(false)
  const hasAutoCollapsedRef = useRef(false)
  const autoTimerRef = useRef(null)
  const hideTimerRef = useRef(null)
  const fadeTimerRef = useRef(null)
  const triggerFade = () => {
    if (hintFading) return
    setHintFading(true)
    clearTimeout(fadeTimerRef.current)
    fadeTimerRef.current = setTimeout(() => {
      setShowDemoHint(false)
      setHintFading(false)
      hasAutoCollapsedRef.current = true
    }, 220)
  }
  useEffect(() => {
    try {
      const seen = sessionStorage.getItem('aerobin.demoHintSeen')
      if (!seen && !demoMode) {
        setShowDemoHint(true)
        setHintFading(false)
        autoTimerRef.current = setTimeout(() => {
          triggerFade()
        }, 3500)
      }
    } catch { /* ignore */ }
    return () => {
      clearTimeout(autoTimerRef.current)
      clearTimeout(hideTimerRef.current)
      clearTimeout(fadeTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode])
  const handleDismiss = () => {
    clearTimeout(autoTimerRef.current)
    clearTimeout(hideTimerRef.current)
    try { sessionStorage.setItem('aerobin.demoHintSeen', '1') } catch { /* ignore */ }
    triggerFade()
  }
  const handleDemoToggle = () => {
    clearTimeout(autoTimerRef.current)
    clearTimeout(hideTimerRef.current)
    clearTimeout(fadeTimerRef.current)
    try { sessionStorage.setItem('aerobin.demoHintSeen', '1') } catch { /* ignore */ }
    hasAutoCollapsedRef.current = true
    setShowDemoHint(false)
    setHintFading(false)
    setDemoMode(!demoMode)
  }
  const handleAnchorEnter = () => {
    clearTimeout(hideTimerRef.current)
    clearTimeout(fadeTimerRef.current)
    clearTimeout(autoTimerRef.current)
    if (!demoMode && hasAutoCollapsedRef.current) {
      setHintFading(false)
      setShowDemoHint(true)
    } else if (!demoMode && showDemoHint && hintFading) {
      setHintFading(false)
    }
  }
  const handleAnchorLeave = () => {
    if (!hasAutoCollapsedRef.current) return
    hideTimerRef.current = setTimeout(() => triggerFade(), 800)
  }
  const handlePopupEnter = () => {
    clearTimeout(hideTimerRef.current)
    clearTimeout(fadeTimerRef.current)
    if (hintFading) setHintFading(false)
  }
  const handlePopupLeave = () => {
    if (!hasAutoCollapsedRef.current) return
    hideTimerRef.current = setTimeout(() => triggerFade(), 800)
  }

  return (
    <div className="min-h-screen bg-navy">
      <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
        <div className="mb-8 flex items-start justify-between gap-4">
          <Logo />
          <div
            className="relative shrink-0"
            onMouseEnter={handleAnchorEnter}
            onMouseLeave={handleAnchorLeave}
            onFocus={handleAnchorEnter}
            onBlur={handleAnchorLeave}
          >
            <button
              onClick={handleDemoToggle}
              aria-describedby={showDemoHint && !demoMode ? 'demo-hint' : undefined}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
              style={
                demoMode
                  ? { background: COLORS.redDim, color: COLORS.red }
                  : { background: COLORS.navyRaised, color: COLORS.muted, border: `1px solid ${COLORS.navyLine}` }
              }
            >
              {demoMode ? '● Demo mode on' : 'Demo mode'}
            </button>
            {showDemoHint && !demoMode && (
              <div
                id="demo-hint"
                role="tooltip"
                onMouseEnter={handlePopupEnter}
                onMouseLeave={handlePopupLeave}
                onKeyDown={(e)=>{ if(e.key==='Escape') handleDismiss() }}
                className={`absolute right-0 top-full z-10 mt-2 w-60 rounded-xl border border-white/60 bg-mist p-3 text-xs leading-snug shadow-[0_4px_16px_rgba(10,12,15,0.12),0_1px_3px_rgba(10,12,15,0.10)] transition-all duration-200 ease-out ${hintFading ? 'opacity-0 translate-y-1 pointer-events-none' : 'opacity-100 translate-y-0'}`}
              >
                <span aria-hidden className="absolute -top-1.5 right-6 h-3 w-3 rotate-45 border-l border-t border-white/60 bg-mist" />
                <p className="relative font-semibold text-navy">Try Demo mode</p>
                <p className="relative mt-1 text-slate">See High-risk states without editing JSON — great for recordings.</p>
                <button onClick={handleDismiss} className="relative mt-2 text-xs font-semibold text-teal hover:brightness-95">Dismiss</button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-10 max-w-2xl">
          <span
            className="rounded-full bg-navy-raised px-3 py-1 text-xs font-semibold uppercase tracking-widest"
            style={{ color: COLORS.teal }}
          >
            AeroBin · Pune pilot
          </span>
          <h1
            className="mt-4 font-display text-3xl leading-tight sm:text-4xl"
            style={{ color: TEXT_ON_DARK }}
          >
            Three tools. One mission: clean air, made accountable.
          </h1>
          <p className="mt-4 text-base leading-relaxed" style={{ color: TEXT_ON_DARK_SECONDARY }}>
            This is AeroBin's working prototype, built for three people who each have a stake in
            Pune's air: the resident, the officer, and the analyst.
          </p>
        </div>

        {data.status === 'loading' && <LoadingScreen label="Loading pilot summary…" />}
        {data.status === 'error' && <ErrorScreen detail={data.error} />}

        {data.status === 'ready' && (
          <div className="grid gap-5 sm:grid-cols-3">
            {APPS.map((app) => {
              const accent = APP_ACCENTS[app.key]
              const Art = app.Art
              return (
                <Link
                  key={app.path}
                  to={app.path}
                  className="ab-app-card group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-navy-raised p-6"
                  style={{ '--ab-accent': accent.accent }}
                >
                  <Art color={accent.accent} />

                  <div className="relative">
                    <span
                      className="text-xs font-semibold uppercase tracking-widest"
                      style={{ color: accent.accent }}
                    >
                      {app.eyebrow}
                    </span>
                    <h2
                      className="mt-2 font-display"
                      style={{
                        color: TEXT_ON_DARK,
                        fontWeight: 500,
                        fontSize: 16,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {app.title}
                    </h2>
                    <p
                      className="mt-3 text-sm italic leading-relaxed"
                      style={{ color: TEXT_ON_DARK_SECONDARY }}
                    >
                      {app.question}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: accent.tint }}>
                      {app.description}
                    </p>
                  </div>

                  <div
                    className="relative mt-6 flex items-center justify-between border-t pt-4"
                    style={{ borderColor: COLORS.navyLine }}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-medium" style={{ color: COLORS.muted }}>
                        {app.stat(data)}
                      </span>
                      {data.meta?.weekDates && (
                        <span className="text-[11px]" style={{ color: COLORS.muted, opacity: 0.8 }}>
                          Last updated: {data.summary.lastUpdated}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-sm font-semibold transition group-hover:translate-x-0.5"
                      style={{ color: accent.accent }}
                    >
                      Open →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <p className="mt-14 text-center text-xs" style={{ color: COLORS.muted }}>
          {data.status === 'ready' && `${data.meta.description} · Data marked "${data.meta.dataType}."`}
        </p>
      </div>
    </div>
  )
}
