import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GitBranch, ExternalLink } from 'lucide-react'
import { Card, StatusPill } from '../components/Card'
import { LoadingScreen, ErrorScreen } from '../components/StateScreen'
import { useAerobinData } from '../lib/useAerobinData'
import { useBurnRisk } from '../lib/useBurnRisk'
import { useI18n } from '../lib/i18n'
import { COLORS } from '../lib/theme'

/**
 * /model — the public model card for the real burn-risk classifier
 * (training/02_train_model.ipynb → public/models/burn-risk-v0.1.onnx).
 *
 * Every metric on this page is rendered VERBATIM from the sidecar JSON the
 * training notebook wrote (public/models/burn-risk-v0.1-metrics.json) —
 * the app never recomputes or rounds away the honest numbers. The S3
 * equity gap (precision in high- vs low-income wards) is the headline:
 * the model performs worst where burning is most common, and saying so
 * plainly is the point of this page.
 */

const INCOME_OF = { hadapsar: 'mixed', kharadi: 'high', wagholi: 'low', bhosari: 'low', mundhwa: 'mixed' }
const WARD_ORDER = ['hadapsar', 'kharadi', 'wagholi', 'bhosari', 'mundhwa']

function pct(x, digits = 1) {
  if (x == null || !Number.isFinite(x)) return '—'
  return `${(x * 100).toFixed(digits)}%`
}

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-mist bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-soft">{label}</p>
      <p className="mt-1 font-display text-xl text-navy">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-soft">{hint}</p>}
    </div>
  )
}

export function ModelCard() {
  const { t } = useI18n()
  const data = useAerobinData()
  const [metrics, setMetrics] = useState({ status: 'loading', data: null, error: null })
  const [selectedWard, setSelectedWard] = useState('hadapsar')

  // Load the sidecar once.
  useEffect(() => {
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}models/burn-risk-v0.1-metrics.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Sidecar responded with ${r.status}`)
        return r.json()
      })
      .then((json) => {
        if (!cancelled) setMetrics({ status: 'ready', data: json, error: null })
      })
      .catch((err) => {
        if (!cancelled) setMetrics({ status: 'error', data: null, error: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Static ward flags for the live hook — same fields the training features
  // used (greenCover / marketFlag / incomeLevel), from the app's own dataset.
  const staticFlags = useMemo(() => {
    if (data.status !== 'ready') return null
    return Object.fromEntries(
      data.wardList.map((w) => [
        w.id,
        { greenCover: w.greenCover, marketFlag: w.marketFlag, incomeLevel: w.incomeLevel },
      ])
    )
  }, [data.status, data.wardList])

  if (metrics.status === 'loading') return <LoadingScreen label="Loading model card…" />
  if (metrics.status === 'error') return <ErrorScreen detail={metrics.error} />

  const m = metrics.data
  const tm = m.testMetrics
  const lift = tm.auprc / tm.baseRate

  return (
    <div className="min-h-[calc(100dvh-52px)] bg-mist">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-soft">
            Model card · v{m.version} · {m.model}
          </p>
          <h1 className="font-display text-2xl text-navy sm:text-3xl">{t('modelTitle')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate">{t('modelIntro')}</p>
        </div>

        <div className="flex flex-col gap-6">
          {/* The headline: S3 equity gap */}
          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-soft">
                  {t('modelEquityEyebrow')}
                </p>
                <h2 className="font-display text-xl text-navy">{t('modelEquityTitle')}</h2>
              </div>
              <StatusPill status="red" label={t('modelEquityPill')} />
            </div>
            <p className="text-sm leading-relaxed text-slate">{t('modelEquityBody')}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {['high', 'mixed', 'low'].map((grp) => {
                const prec = tm.incomeGroupPrecision[grp]
                const isWorst = grp === 'low'
                return (
                  <div
                    key={grp}
                    className="rounded-xl border px-4 py-3"
                    style={{
                      borderColor: isWorst ? COLORS.red : COLORS.mist,
                      background: isWorst ? COLORS.redDim : '#FFFFFF',
                    }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-soft">
                      {t('modelIncomeGroup')} {grp}
                    </p>
                    <p className="mt-1 font-display text-2xl" style={{ color: isWorst ? COLORS.redText : COLORS.navy }}>
                      {pct(prec, 0)}
                    </p>
                    <p className="text-xs text-slate-soft">
                      {grp === 'high' ? 'Kharadi' : grp === 'mixed' ? 'Hadapsar, Mundhwa' : 'Wagholi, Bhosari'}
                    </p>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-sm font-semibold" style={{ color: COLORS.redText }}>
              {t('modelEquityGap')} {pct(tm.equityGapS3, 0)}
            </p>
          </Card>

          {/* 2024 holdout metrics, verbatim from the sidecar */}
          <Card>
            <h2 className="mb-1 font-display text-xl text-navy">{t('modelMetricsTitle')}</h2>
            <p className="mb-4 text-xs text-slate-soft">
              {t('modelMetricsSubtitle')} · {m.trainedOn}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="AUPRC" value={tm.auprc.toFixed(3)} hint={`${lift.toFixed(1)}× lift over ${(tm.baseRate * 100).toFixed(1)}% base`} />
              <Metric label="Top-1% precision" value={pct(m.candidates.gradient_boosting.operating_points['1%'].precision, 0)} hint={`of ${m.candidates.gradient_boosting.operating_points['1%'].k} flags`} />
              <Metric label="ROC-AUC" value={tm.rocAuc.toFixed(3)} hint="reported, not relied on" />
              <Metric label="Brier" value={tm.brier.toFixed(3)} hint="calibration quality" />
            </div>
            <p className="mt-3 rounded-xl bg-mist px-4 py-3 text-sm leading-relaxed text-slate">
              {t('modelHonestyNote')}
            </p>
            {m.threshold2Sensitivity && (
              <p className="mt-2 text-xs text-slate-soft">
                {t('modelThreshold2')} — AUPRC {m.threshold2Sensitivity.lrAuprc.toFixed(3)} vs base{' '}
                {pct(m.threshold2Sensitivity.baseRate)} ({t('modelThreshold2Why')})
              </p>
            )}
          </Card>

          {/* Per-ward test precision table */}
          <Card>
            <h2 className="mb-1 font-display text-xl text-navy">{t('modelPerWardTitle')}</h2>
            <p className="mb-4 text-xs text-slate-soft">{t('modelPerWardSubtitle')}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-soft">
                    <th className="pb-2 pr-3 font-semibold">{t('modelWard')}</th>
                    <th className="pb-2 pr-3 font-semibold">Income</th>
                    <th className="pb-2 pr-3 font-semibold">{t('modelBurnDays')}</th>
                    <th className="pb-2 pr-3 font-semibold">Flagged</th>
                    <th className="pb-2 font-semibold">Precision</th>
                  </tr>
                </thead>
                <tbody>
                  {WARD_ORDER.map((wid) => {
                    const s = tm.perWard[wid]
                    if (!s) return null
                    const worst = s.precision === 0
                    return (
                      <tr key={wid} className="border-t border-mist">
                        <td className="py-2.5 pr-3 font-display text-navy capitalize">{wid}</td>
                        <td className="py-2.5 pr-3 text-slate">{INCOME_OF[wid]}</td>
                        <td className="py-2.5 pr-3 text-slate">{s.burn_days}</td>
                        <td className="py-2.5 pr-3 text-slate">{s.flagged}</td>
                        <td
                          className="py-2.5 font-semibold"
                          style={{ color: worst ? COLORS.redText : COLORS.navy }}
                        >
                          {pct(s.precision, 0)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Try it live */}
          <TryItSection selectedWard={selectedWard} onSelectWard={setSelectedWard} staticFlags={staticFlags} />

          {/* Pipeline: features, sources, limitations */}
          <Card>
            <h2 className="mb-3 font-display text-xl text-navy">{t('modelPipelineTitle')}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-soft">
                  {t('modelFeatures')}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {m.features.map((f) => (
                    <li
                      key={f}
                      className="rounded-full border border-mist bg-white px-2.5 py-1 text-xs font-medium text-slate"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-soft">
                  {t('modelSources')}
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate">
                  {Object.entries(m.dataSources).map(([k, v]) => (
                    <li key={k}>
                      <span className="font-semibold text-navy capitalize">{k}: </span>
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-soft">
                  {t('modelLimitations')}
                </p>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-slate">
                  {m.limitations.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <a
                    href="https://github.com/khnzaid94-source/Aerobin/tree/main/training"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-navy-line bg-white px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-slate"
                  >
                    <GitBranch size={14} aria-hidden /> training/ notebooks
                    <ExternalLink size={12} aria-hidden />
                  </a>
                </div>
                <p className="mt-2 text-xs text-slate-soft">
                  ONNX parity vs sklearn: max |Δ| {(m.onnxCheck.maxAbsDiffVsSklearn).toExponential(1)} · opset {m.onnxCheck.opset}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <p className="mt-6 text-center text-xs text-slate-soft">
          {t('modelFooter')} ·{' '}
          <Link to="/analyst" className="font-semibold underline" style={{ color: COLORS.tealText }}>
            Impact Analyst →
          </Link>
        </p>
      </div>
    </div>
  )
}

function TryItSection({ selectedWard, onSelectWard, staticFlags }) {
  const { t } = useI18n()
  const burn = useBurnRisk(staticFlags)
  const est = burn.data?.[selectedWard]

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-navy">{t('modelTryItTitle')}</h2>
          <p className="mt-1 text-xs text-slate-soft">{t('modelTryItSubtitle')}</p>
        </div>
        <select
          value={selectedWard}
          onChange={(e) => onSelectWard(e.target.value)}
          aria-label={t('modelWard')}
          className="rounded-lg border border-mist bg-white px-3 py-1.5 text-sm font-semibold text-navy"
        >
          {WARD_ORDER.map((w) => (
            <option key={w} value={w} className="capitalize">
              {w}
            </option>
          ))}
        </select>
      </div>

      {burn.status === 'loading' && <p className="text-sm text-slate">{t('modelLiveLoading')}</p>}

      {burn.status === 'unavailable' && (
        <p className="rounded-xl bg-mist px-4 py-3 text-sm text-slate">
          {t('modelLiveUnavailable')} <span className="text-slate-soft">({burn.error})</span>
        </p>
      )}

      {burn.status === 'ready' && est && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-2xl border border-mist bg-white px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-soft">
              {selectedWard} · {t('modelLiveAsOf')} {est.asOf}
            </p>
            <p className="mt-1 font-display text-4xl text-navy">{(est.probability * 100).toFixed(1)}%</p>
            <p className="text-xs text-slate-soft">{t('modelLiveProbLabel')}</p>
          </div>
          <div className="min-w-40 flex-1">
            <div className="flex items-center justify-between text-xs text-slate-soft">
              <span>Base rate (train)</span>
              <span>1.9%</span>
            </div>
            <div className="mt-1 h-2.5 rounded-full bg-mist">
              <div
                className="h-2.5 rounded-full bg-teal"
                style={{ width: `${Math.min(est.probability * 100 * 5, 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-soft">{t('modelLiveHonesty')}</p>
          </div>
        </div>
      )}
    </Card>
  )
}
