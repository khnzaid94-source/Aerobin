# Aerobin Microapps — Implementation Plan

**Status:** ✅ COMPLETE — v1.0.0 shipped & deployed  
**Live demo:** https://aerobin.vercel.app (auto-CD from `main`)  
**Source:** https://github.com/khnzaid94-source/Aerobin (public)

**Final decisions (locks, as shipped):**
- No licence file — view-only, © 2026 Zaid Khan, All rights reserved (`README.md` Rights section)
- Option A: JavaScript only (`src/**/*.jsx`), `@types/*` removed, `jsconfig.json` `checkJs:true` for IDE hints
- `Prototype Video.mkv` (65.18 MB) pushed direct, no LFS — yellow >50 MB warning, push succeeded
- `AeroBin Dashboard Data/` deleted early (duplicate of `public/data/`)
- Public repo, deployed on **Vercel** Hobby with **live PM2.5** via env var (Option B)
- Tagline kept: **Predictive Justice For Clean Air** (`src/pages/AppMenu.jsx:65`)
- Terminology corrected to **open waste burning** throughout

**Full audit coverage:** `package.json`, `vite.config.js`, `.gitignore`, `.oxlintrc.json`, `index.html`, `src/**/*` (30+ files), `public/data/aerobin_data.json`, `public/data/pune-admin-wards.geojson`, `Project Submissions/*` (15 files)

---

## Phase 0 — Repo Hygiene ✅ DONE

| Task | Shipped as |
|------|-----------|
| Secret handling | `.env.local` sanitized to empty key locally; real key lives only in Vercel env var; `.gitignore` hardened (`.env`, `/dist`, `coverage`, `.vite`); staged-diff leak scans = 0 hits |
| Normalize line endings & binaries | `.gitattributes` — `* text=auto eol=lf`, `*.mkv *.pptx *.xlsx *.docx binary` |
| Fix oxlint schema | `.oxlintrc.json:2` → remote `$schema` URL |
| Node guard | `package.json` `1.0.0` + `engines: node >=18`, `.nvmrc` `20` |
| Stay JS cleanly | `@types/react`, `@types/react-dom` removed; `jsconfig.json` with `checkJs` |

---

## Phase 1 — High-Priority Bug + UX Fixes ✅ DONE

### A. Global Shell
1. **ErrorBoundary** ✅ — `src/components/ErrorBoundary.jsx` (class + retry), wraps `<Suspense>` in `src/App.jsx`
2. **TopNav a11y** ✅ — active-tab underline via `boxShadow inset`, `aria-current`, skip-link `#main-content`
3. **404 page** ✅ — `NotFound` in `src/App.jsx` with path echo + Back to Menu
4. **Loading** — kept `StateScreen` spinners (skeletons deferred as nice-to-have)
5. **Focus** — `:focus-visible` teal outline retained; dispatch rows got `tabIndex`/`role`/`Enter-Space`

### B. Citizen Alert
6. **Banner z-fix** ✅ — banner `z-[600]`, no ZoomControl clash
7. **BottomSheet a11y** ✅ — `role="dialog"`, `aria-modal`, backdrop close, `Esc`
8. **Directions CTA** ✅ — `Get directions ↗` → Google Maps with ward lat/lon
9. **All-clear proof** ✅ — "See last High week (Week 6)" deep-link to `/analyst`
10. **Extras shipped** — confidence badge + humidity + haversine distance (`CitizenAlert.jsx` `confidenceFor`), 4-week SVG `MiniTrend`, feedback 👍/👎 to `localStorage`, `WardCompare` 2-ward selector, `Copy ward link` + `?ward=` URL sync

### C. PMC Dispatch
11. **Sort queue** ✅ — `dispatchToday` sorted by `burnRiskScore` desc + count badge
12. **Map ↔ Queue sync** ✅ — `selectedWardId`/`onSelectWard` wired both ways; marker icons memoized (`iconCache`)
13. **WCAG regression** ✅ — `Target ≥` badge switched `RISK_BANDS.Low.color` → `Low.textColor` (5.99:1)
14. **Audit search/filter** ✅ — pills `All/Dispatched/Skipped/Flagged`, ward search, "This session" toggle
15. **Tooltip enriched** ✅ — `WardTooltip` shows `topFeatures[0]` + `dispatchStatus` + PM2.5

### D. Impact Analyst
16. **Sparkline id collision** ✅ — `gradientId` = `spark-${metric.key}-${color}`, `id` prop from `MetricCard`
17. **Playback a11y** ✅ — `aria-valuetext` "Week N — date" + `title` on slider
18. **Metric delta** ✅ — `+X.X vs baseline` colored by status
19. **Health** ✅ — `useWeather` 8s `AbortController` + stable deps; `exportReport` `try/finally` revoke

---

## Phase 2 — Docs Split ✅ DONE

- `README.md` rewritten as GitHub landing page: 3-apps table, rendered screenshots, What/Goals, Key Features, Tech Stack, Getting Started, Deployment, honest-today, Design Decisions, Structure, Process Docs, Rights
- `docs/CONTRAST_FIX.md` — full cascade-layers bug + text-safe colors deep dive
- `docs/DATA_MODEL.md` — pilot snapshot, all-clear logic, demo overlay, ESG status derivation
- `docs/ROADMAP.md` — backlog with Impact/Effort, all items since marked ✅ Done

---

## Phase 3 — Backlog (shipped ahead of schedule, one pass) ✅ DONE

- **C12** Bulk `Dispatch all` + `Undo last` (`DispatchConsole.jsx`)
- **D20** CSV export alongside JSON (`exportReport.js` `downloadReportCSV`, `Export JSON/CSV` buttons)
- **D21** Replication progress bar `met/total %`
- **D22** Diagnostics checklist persisted to `localStorage`
- **E23-E24** Per-card "Last updated" microcopy; demo-mode first-visit tooltip + `sessionStorage`
- **F26-F30** Ward compare, 4-week trend, i18n skeleton (EN/MR/HI `lib/i18n.jsx`, selector in TopNav), PWA (`manifest.json`, `sw.js`, `registerSW.js`), feedback buttons
- **SLA countdown** per High-risk row (`slaCountdown`, amber <12h, red breached)
- **What-if equity-gap slider** — drag 8–13%, live recompute `readinessStatus` → "Ready to replicate (what-if)"
- **Shareable URLs** — `?week=` in Pilot Playback (+ Copy link), `?ward=` in Citizen

---

## Phase 4 — Design, Motion, Pre-Push & Ship ✅ DONE

### Ink editorial palette
- `src/index.css` `@theme`: `navy #121417`, `navyRaised #1E2328`, `navyLine #2E3630`, `mist #F6F3EF` (warm paper), `teal #0CBDA0` (muted)
- `src/lib/theme.js` mirrors; `APP_ACCENTS` earth tones (`#4FB89A`/`#7AA7D6`/`#C98A1A`)
- `public/leaf.svg`, `public/manifest.json`, `index.html` `theme-color`, map wash `#e6e9e8` all synced
- WCAG re-verified: tealText 5.99:1, amberText 5.36:1, redText 5.83:1 on new mist

### Motion
- Demo hint: paper tooltip (`bg-mist`, arrow), 220ms fade, **3.5s auto-collapse**, hover-to-return, hide-on-leave 800ms, `Esc`, permanent `Dismiss` via `sessionStorage`
- Tabs: 300ms `cubic-bezier(0.16,1,0.3,1)` scale 0.98→1 (`TopNav.jsx`)
- Page transitions: 320ms `ab-page-in` slide-10px+fade keyed by route (`src/App.jsx` `AnimatedOutlet`)
- All motion disabled under `prefers-reduced-motion`

### Pre-push hygiene
- `.env.local` emptied → `dist` rebuilt → **0 key hits in `dist/assets/*.js`** → `dist` removed
- `Implementation_Plan.md` template (placeholders) deleted; `implementation plan.md` → `implementation-plan.md` (no space)
- `SS/` renamed: `citizen-map.png`, `dispatch-queue.png`, `analyst-playback.png`, `landing.png` (verified against captures)
- README: `crop-burning` → **`open waste burning`**, oxlint `^1.71.0`, `.nvmrc:1`, placeholders → markdown image embeds

### Ship
- `git init -b main`; commit identity `Zaid Khan <291481822+khnzaid94-source@users.noreply.github.com>`
- `8077577` feat: initial (74 files, 8084 insertions) → `4100bb7` docs: live demo URL → `a59271b` fix(sw): network-first
- `gh repo create Aerobin --public --push` + 9 topics (react vite leaflet recharts pune air-quality esg portfolio 1m1b)
- `vercel.json` SPA rewrite (filesystem-first for `/data/*`, `/sw.js`, `/manifest.json`)
- Vercel env var `VITE_OPENWEATHER_API_KEY` (Option B — live PM2.5 on demo)
- Live verification: `/` 200 title renders, `/citizen` 200 (rewrite works), `/data/aerobin_data.json` 200 49,673 B, `/sw.js` + `/manifest.json` 200

### Service worker fix (post-deploy)
- Old cache-first SW could serve stale `index.html` → missing hashed assets on new deploys
- New **network-first** strategy (`public/sw.js`): network wins, cache only for true offline; no manual version-bump footgun; cross-origin guard

---

## Verification Checklist — all passed ✅

- [x] `.env.local` ignored, leak scans 0, `.gitattributes` applied
- [x] `oxlint` 0 errors, `vite build` 0 errors, all routes load
- [x] Demo mode OFF→ON→OFF: Wagholi 78.4 High pulsing, Kharadi 54.2 Medium, S3 red, `clearAuditLog()` resets queue, banner shows
- [x] Queue sorted desc, marker↔row sync, WCAG 5.36–5.99:1 on paper/mist
- [x] Playback scrub 1→12, unique sparkline gradients + tracking dots, `?week=` syncs
- [x] Mobile 375px: BottomSheet + backdrop, no nav overflow
- [x] GitHub renders screenshots, `docs/` links resolve, no secrets in repo
- [x] Live demo: all routes 200, data JSON served, SW + manifest up

---

## Future / Standing Notes

- Optional work lives in `docs/ROADMAP.md` (heatmap layers + driver GPS need FIRMS/satellite feed + real backend)
- OpenWeather key is public-in-bundle by design (Option B); if quota is ever abused, generate a fresh key in Vercel → Settings → Environment Variables → redeploy
- Screenshots predate the ink palette + motion pass — re-capture from https://aerobin.vercel.app anytime and replace `SS/*.png` (README needs no edits, filenames unchanged)
- `sw.js` is now maintenance-free (network-first); no version bumps required on future deploys
