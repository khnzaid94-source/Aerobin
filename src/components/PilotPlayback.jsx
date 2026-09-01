import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Play, Pause } from 'lucide-react'
import { LeafletMap } from './LeafletMap'
import { Card } from './Card'
import { riskMeta, COLORS } from '../lib/theme'
import { formatScore } from '../lib/format'

const TICK_MS = 2500

/**
 * Scrubs through all 12 pilot weeks. Map markers and the "this week"
 * score list below always reflect `weekIndex`; the ESG sparklines
 * (rendered by the parent) receive the same index as `activeIndex` so
 * everything on the page moves together instead of the map and the
 * scorecard telling two different stories.
 */
export function PilotPlayback({ wardList, weeks, weekDates, onWeekChange, pm25, smsAdoption }) {
  const totalWeeks = weeks.length
  const [searchParams, setSearchParams] = useSearchParams()
  const initialWeek = (() => {
    const q = parseInt(searchParams.get('week') ?? '', 10)
    return Number.isFinite(q) && q >= 1 && q <= totalWeeks ? q - 1 : totalWeeks - 1
  })()
  const [weekIndex, setWeekIndex] = useState(initialWeek)
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    onWeekChange?.(weekIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekIndex])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    next.set('week', String(weekIndex + 1))
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekIndex])

  useEffect(() => {
    if (!isPlaying) return undefined
    intervalRef.current = setInterval(() => {
      setWeekIndex((prev) => {
        if (prev >= totalWeeks - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, TICK_MS)
    return () => clearInterval(intervalRef.current)
  }, [isPlaying, totalWeeks])

  const handlePlayToggle = () => {
    if (!isPlaying && weekIndex >= totalWeeks - 1) {
      setWeekIndex(0)
    }
    setIsPlaying((p) => !p)
  }

  const handleScrub = (e) => {
    setIsPlaying(false)
    setWeekIndex(Number(e.target.value))
  }

  const wardsAtWeek = wardList.map((w) => {
    const weekEntry = w.weeks[weekIndex]
    return {
      ...w,
      band: riskMeta(weekEntry.burnRiskScore).band,
      score: weekEntry.burnRiskScore,
    }
  })

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-navy">Pilot playback</h2>
          <p className="mt-1 text-sm text-slate">
            Scrub through all 12 weeks — ward risk on the map and every sparkline below move
            together.
          </p>
        </div>
        <button
          onClick={handlePlayToggle}
          className="flex shrink-0 items-center gap-2 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90"
          aria-label={isPlaying ? 'Pause playback' : 'Play playback'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? 'Pause' : 'Play pilot'}
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="font-semibold" style={{ color: COLORS.navy }}>
          Week {weekIndex + 1} of {totalWeeks}
        </span>
        <div className="flex items-center gap-2">
          <span style={{ color: COLORS.slate }}>{weekDates[weekIndex]}</span>
          <button
            onClick={() => {
              const url = new URL(window.location.href)
              url.searchParams.set('week', String(weekIndex + 1))
              navigator.clipboard?.writeText(url.toString()).catch(()=>{})
            }}
            className="rounded-full border border-mist bg-white px-2 py-1 text-xs font-semibold text-navy"
          >Copy link</button>
        </div>
      </div>

      <div className="relative">
        <input
          type="range"
          className="ab-range"
          min={0}
          max={totalWeeks - 1}
          step={1}
          value={weekIndex}
          onChange={handleScrub}
          aria-label="Pilot week"
          aria-valuetext={`Week ${weekIndex + 1} — ${weekDates[weekIndex]}`}
          title={`Week ${weekIndex + 1} — ${weekDates[weekIndex]}`}
        />
        {/* Tick marks sit on the track itself, one per week, behind the
            thumb (z-index below the input) so the thumb visibly slides
            over them as it passes. Inset by 9px on each side to match
            the thumb's own radius, so tick N lines up with where the
            thumb actually centers on week N, not the raw 0–100% width. */}
        <div className="ab-range-ticks">
          {weeks.map((_, i) => (
            <span key={i} className="ab-range-tick" aria-hidden />
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-[11px]" style={{ color: COLORS.slateSoft }}>
        <span>Week 1</span>
        <span>Week 6</span>
        <span>Week 12</span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="h-64 overflow-hidden rounded-xl">
          <LeafletMap wards={wardsAtWeek} legend={false} scrollWheelZoom={false} className="h-full w-full" />
        </div>

        <ul className="flex flex-col justify-center gap-2">
          {wardsAtWeek.map((ward) => {
            const meta = riskMeta(ward.score)
            return (
              <li
                key={ward.id}
                className="flex items-center justify-between rounded-lg bg-mist px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm font-medium" style={{ color: COLORS.navy }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} aria-hidden />
                  {ward.name}
                </span>
                <span className="text-sm font-semibold" style={{ color: meta.textColor }}>
                  {formatScore(ward.score)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {!isPlaying && (
        <p
          className="mt-5 rounded-xl px-4 py-3 text-sm font-medium"
          style={{ background: COLORS.tealDim, color: COLORS.navy }}
        >
          {weekIndex >= totalWeeks - 1 ? (
            <>
              Pilot complete: PM2.5 down from {pm25.baseline} to {pm25.current} {pm25.unit}, SMS
              adoption at {smsAdoption.current}%.
            </>
          ) : (
            <>
              Week {weekIndex + 1} snapshot: PM2.5 at {pm25.series[weekIndex]?.value ?? '—'}{' '}
              {pm25.unit}, SMS adoption at {smsAdoption.series[weekIndex]?.value ?? 0}%.
            </>
          )}
        </p>
      )}
    </Card>
  )
}
