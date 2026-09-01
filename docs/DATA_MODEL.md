# AeroBin Data Model

## Pilot Snapshot

Simulated 12-week pilot **Oct 7 – Dec 23, 2024** across 5 real Pune wards: Hadapsar, Kharadi, Wagholi, Bhosari, Mundhwa. Chosen to mix income/market/sensor coverage, not just best-instrumented areas.

Source: `public/data/aerobin_data.json:1-1833` — CPCB 2022-24 baselines + ESG report target structures. `public/data/pune-admin-wards.geojson:1` is city context layer only (several pilot wards share one admin polygon — see `note` fields in `wards.wagholi/bhosari.info`).

```json
meta.weeks:        ["Week 1" … "Week 12"]
meta.weekDates:    ["Oct 7" … "Dec 23"]
summary.pilotStatus: "Active"
summary.currentWeek: 12 / totalWeeks: 12
summary.highRiskWardsToday: 0   // honest all-clear, see below
summary.lastUpdated: "2024-12-23"
```

## Why “Today” Is All-Clear

Both `CitizenAlert` and `DispatchConsole` are scoped to **current** (`wards[ward].current.burnRiskScore`) only — no history per brief. `summary.highRiskWardsToday` is `0` because the dataset’s final week (Week 12, Dec 23) has every ward back in **Low** (<40):

| Ward | `current.burnRiskScore` | `riskBand` | `dispatchStatus` |
|------|------------------------|------------|------------------|
| Hadapsar | 22.6 | Low | Not required |
| Kharadi  | 5.0  | Low | Not required |
| Wagholi  | 37.7 | Low | Not required |
| Bhosari  | 24.9 | Low | Not required |
| Mundhwa  | 26.7 | Low | Not required |

Risk band thresholds `src/lib/theme.js:47-51`: `≥70 → High (red #F0435A)`, `40–69 → Medium (amber #FFB020)`, `<40 → Low (teal #00D4AA)`. Map colors `LeafletMap.jsx:25-34`, banner count `CitizenAlert.jsx:64-65`, and queue `DispatchConsole.jsx:165` all derive from that one score — so bumping any `current.burnRiskScore` above 70 in the JSON immediately yields a pulsing red marker, non-zero banner, and populated dispatch queue without code changes.

The risk season *was* High — Wagholi hit 95.5 in Week 6, Hadapsar 81.8, Bhosari 80.9 — with `post-festival week flag` active Weeks 4-6 (Diwali debris). That history is only shown in **Pilot Playback** `src/components/PilotPlayback.jsx:54-61` where `wardsAtWeek` uses `w.weeks[weekIndex].burnRiskScore`, and in ESG sparklines.

## Demo Mode Overlay

`src/lib/demoOverrides.js:24-39` deep-clones fetched JSON (original never mutated, toggle is instant no-re-fetch via `useAerobinData.js:47-49`) and touches only:

- `wards.wagholi.current.burnRiskScore = 78.4` → High/red, `dispatchStatus = Dispatched`
- `wards.kharadi.current.burnRiskScore = 54.2` → Medium/amber, `On standby`
- `summary.highRiskWardsToday = 1` (keeps landing stat line `AppMenu.jsx:25` in sync)
- `esg.social.S3_equityGap.current = 12.6` → pushes equity gap over its 10% ceiling, yielding the only genuine **red** ESG status (real pilot is amber-or-better everywhere)

Toggle lives in `DemoContext.js:1-3` + `DemoProvider.jsx:10-25` above the router, so flipping once on `/` carries through to `/citizen`, `/dispatch`, `/analyst`; banner at `TopNav.jsx:49-58` reminds you it’s simulated. `DemoProvider:21` calls `clearAuditLog()` `auditLog.js:75-81` on every toggle so dispatching Wagholi in demo is replayable, not one-shot stuck on “Logged ✓”.

## ESG Scorecard — 9 Metrics `esg.environmental/social/governance`

| Key | Label | Baseline | Target | Current | Unit |
|-----|-------|----------|--------|---------|------|
| E1_pm25 | PM2.5 Reduction | 85 | 68 | 71.2 | µg/m³ |
| E2_wasteDeverted | Waste Diverted | 2 | 9 | 9.4 | tonnes/month |
| E3_fuelSaved | Truck Fuel Saved | 0 | 90 | 84.6 | litres/month |
| S1_respiratoryComplaints | Respiratory Rate | 38 | 28 | 30.1 | cases/month/ward |
| S2_smsAdoption | SMS Adoption | 0 | 25 | 28.8 | % |
| S3_equityGap | Equity Gap | null | 10 | 10.7 | % (ceiling) |
| G1_auditTrail | Audit Trail | 0 | 100 | 100 | % |
| G2_pmcResponseRate | PMC Response | null | 80 | 87.1 | % |
| G3_openData | Open Data | 0 | 1 | 1 | binary |

Status derived in `src/lib/esgStatus.js:1-48`: `progress = (current-baseline)/(target-baseline)` (higher-or-lower handled), `≥0.9 → green On track`, `≥0.6 → amber Close`, else `red Behind`. Exception: `S3_equityGap` (no baseline, ceiling metric) graded on `overshoot = (current-target)/target`: `≤0 → green`, `≤0.15 → amber`, else `red` — hence 10.7 on 10 → amber (12.6 → red in demo).

Each metric has a 12-entry `series[]` for `Sparkline.jsx:16-66` (index 0-11 ↔ `meta.weeks`). `null` values kept, `connectNulls` bridges gaps so `activeIndex` from Playback always aligns.

## Phases & Replication `phases`, `replication`, `diagnostics`

- **Phases:** Pilot (Months 1-3, active) 3/3 green triggers; Expansion (Months 4-9, pending) needs `Equity Gap <10%` + `Audit 100%` + `PM2.5 ↓`; Full-Scale Month 10+. `ImpactAnalyst.jsx:49-103` shows `current` active phase.
- **Replication** `targetCity: Nagpur`: `10.7% → amber`, `100% → green`, `1/2 seasons → red` → `Not yet ready`, Month 10+ earliest.
- **Diagnostics** 4 cards: 3 green insights + 1 amber warning on equity gap at 10.7%.

## Shared Architecture

- **Data:** `useAerobinData.js:5-87` + `useWardGeoJSON.js:1-36` fetch from `public/data/` at runtime, not bundled — malformed JSON shows `StateScreen.jsx:10` error, not build failure.
- **Weather:** `useWeather.js:1-114` per-ward OpenWeatherMap once per app load, module `Map` cache survives tab navigation; fallback to `E1_pm25.current` + `source:'fallback'` → `LiveReading.jsx:15-43` shows amber “Last known reading”.
- **Theme:** `index.css:9-42` `@theme` tokens + `theme.js:6-79` JS constants (single truth for Leaflet/Recharts inline styles). `APP_ACCENTS` green/blue/gold for landing cards only, distinct from risk red/amber/teal.
- **Routing:** `App.jsx:1-43` `react-router-dom` lazy chunks: Leaflet vs Recharts split.
- **Audit:** `auditLog.js:1-102` seeds from `wards[].current.dispatchStatus`, persists to `localStorage: aerobin.dispatch.auditLog.v1`.
