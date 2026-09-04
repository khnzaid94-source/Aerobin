# Aerobin Microapps — Implementation Plan

**Status:** v1.0 shipped & deployed · **v2.0 AI enablement in progress**  
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

---

# v2.0 — AI Enablement (2026-09 →)

**Why:** v1.0 was a pure visualization suite — the "AI" existed only in the 3B AI Workflow design doc. v2.0 makes that design *literally true in code*, phase by phase. Every phase ships something demo-able; every AI feature degrades **honestly** (never a silent fake — same ethos as `useWeather`'s `source: 'fallback'`).

**Architecture decision:** Vercel serverless functions in `api/` hold all AI keys server-side (never `VITE_`-prefixed, never in the client bundle). Vercel serves `api/*` before the SPA rewrite, so `vercel.json` needs no change. Client talks to `/api/*`; if no key is configured, endpoints respond `{ available: false }` and the UI shows its existing static content.

| Phase | Feature | Status |
|-------|---------|--------|
| 5 | AI Insights (Analyst) + Citizen Chatbot — Gemini via serverless | ✅ Shipped (live, verified EN+MR) |
| 6 | FIRMS satellite burn detection + PM2.5 anomaly detection + Supabase persistence | ✅ Shipped & fully verified (RLS battery green) |
| 7 | Real burn-risk classifier (Open-Meteo + FIRMS labels → scikit-learn → ONNX in-browser) | ✅ Shipped & closed (7a/7b/7c + post-ship fix series + README/screenshots) |
| 8 | Live feedback analytics | ⏸ Deferred (needs real accumulated usage; S3 measurement folded into Phase 7 `/model` page) |

**v2.0 status: CLOSED.** All locked roadmap items shipped, live-verified, and documented. Optional future work (none blocking): Phase 8 once real usage accumulates; model v0.2 (training window through 2025 + yesterday's-hotspot-count persistence feature) as a retrain-and-file-drop; screenshot re-captures anytime (filenames stable). **→ Next: see "v2.1 — Future Scope" at the bottom of this document.**

### Phase 5/6 deployment fixes (found during live verification — the early push paid off)
- `fix(api): accept Vercel-parsed JSON bodies` — Vercel auto-parses `application/json`, so handlers accept object-or-string bodies
- `fix(api): shared Gemini helper with model-404 fallback chain` — `gemini-2.0-flash` and `gemini-2.5-flash` both 404 ("no longer available to new users"); new `apiLib/gemini.js` resolves the account's live model list, prefers `gemini-flash-latest` (self-updating alias), falls through candidates on 404
- `fix(api): raise chat token budget` — Gemini 3.x "thinking" tokens consumed the 300 cap, truncating replies mid-sentence → 2048
- `fix(api): retry once with backoff on transient 429/503` — free-tier overload no longer surfaces as a failure
- `perf(chat): lite model chain` — full-size 3.x models spend 5–25s "thinking" on 2-sentence grounded replies AND reject every `thinkingConfig` override (`thinkingBudget` AND `thinkingLevel` both 400 INVALID_ARGUMENT). Model choice is the only latency lever: chat now uses the flash-lite chain (grounded replies in ~1.2–1.6s), insights keeps the full chain (thinking on, 10–25s by design)
- `fix(api): deadline-aware budget` — server caps the whole fallback chain at 25s total (retry only if budget has room); frontend waits 35s so the server's verdict always arrives before the browser gives up; "Thinking…" honestly notes free-tier latency
- `fix(citizen): WardDetails crash` — FeedbackButtons referenced a scope-leaked `demoMode`; now reads the context hook directly
- `fix(citizen): Today banner overlapped markers and clipped popups` — banner was an absolute overlay inside the map (z-600); moved into page flow below the map where it can never overlap
- `fix(map): zoom controls overlapped chat bubble` — `bottomright` → `topleft`; default view one level wider (zoom 12→11) + 220px bottom padding in fitBounds so bottom-marker popups have room without auto-panning
- `fix(citizen): chat bubble position drifted between demo/real modes` — FAB/panel were `position:fixed` (viewport-anchored) so the demo banner's height shift moved them relative to the map; now `position:absolute` inside the map wrapper (tracks the map, identical in both modes); OSM attribution shifted left of the bubble (credit stays visible)
- Supabase marketplace integration injects vars as `SUPABASE_*` (no `VITE_` prefix) → added `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` aliases via Vercel CLI in all 3 environments; service-role key deliberately never copied
- `fix(db): make schema idempotent` — policies drop+recreate so partial pastes self-heal
- RLS verification gotcha (documented for future contributors): probes with `Prefer: return=representation` fail on `feedback` because the read-back needs a SELECT policy the table intentionally lacks — insert-only is by design; test with plain POST (201), not representation read-back

### Standing roadmap order (locked 2026-09)
1. Phase 7a dataset → 7b train + metrics checkpoint (notebook-first, run in Colab) → 7c integrate (ONNX in-browser, `/model` page)
2. Final README rewrite + fresh screenshots at closing (user captures; filenames in `SS/` stay the same)

**✅ Closing pass DONE (2026-09):** README rewritten for v2.0 (4-app table, model-card embed `SS/model-card.png`, AI + ML tech-stack sections, keyless-model deployment note, structure with `training/` + `public/models/`, honest-numbers limitations); fresh screenshots captured live by the user and shipped (`8561688`).

---

### Phase 7 post-ship fix series (found during user's live testing — the early push paid off again)
- `fix(model): wasm-only ORT entry` (`642ead5`) — the **full** `onnxruntime-web` browser loader hardcodes a fetch for `ort-wasm-simd-threaded.jsep.mjs` (WebGPU/JSEP flavor we don't ship) → prod try-it failed with `no available backend found`. Fix: import `onnxruntime-web/wasm` (its loader fetches the plain `.mjs` from `wasmPaths` — the exact file the Vite plugin copies). ORT chunk 358 KB → **48 KB**. Lesson recorded: the Node-path test harness exercised the Node build, not the browser loader — verification upgraded to **real-Chromium Playwright** (`scripts/browser_check` pattern), which now guards the exact failure mode.
- `fix(citizen): popups stopped jumping + map regains full height` (`1b0a821`) — ward popups grew in stages after open (satellite/model/PM2.5 lines each arrived seconds later, resizing a popup Leaflet had already auto-panned for) and clipped "Last 4 weeks" + feedback at the bottom edge. Fixes: **fixed-height StableSlots** in WardDetails (skeleton → content → quiet "unavailable", popup height constant for its lifetime), Popup `maxHeight` 480 + FAB-safe `autoPanPaddingBottomRight` (Leaflet's own `.leaflet-popup-scrolled` as backstop, styled subtly), and the Today banner moved from a block below the map into a **compact toolbar pill on desktop** (map regains ~90px original height; mobile keeps the in-flow banner since popups are bottom sheets there). Verified in real Chromium: 510px→510px Δ=0 across Bhosari/Wagholi/Hadapsar, "Last 4 weeks" visible, mobile 375px pass — regression scripts committed (`scripts/check-citizen-popup.mjs`, `check-citizen-mobile.mjs`).
- `fix(citizen): toolbar pill contrast` (in `8561688`) — the "· Live PM2.5 / Offline mode" qualifier used `muted` (#8A9AA8): fine on the old navy banner (~6.5:1) but ~2.6:1 on the new light tint → failed WCAG AA. Fixed to `slate` + semibold: **measured 6.01:1** from the live DOM by `scripts/check-pill-contrast.mjs` (composites the rgba tint over white, asserts ≥ 4.5:1).
- `chore(git): *.onnx binary` (`35657ff`) — `text=auto` LF-normalized the model file on commit; caught by sha256-comparing prod vs local (identical by luck — no CRLF bytes). Attribute added so it's never luck again.

**Verification tooling that now lives in the repo:** `scripts/check-citizen-popup.mjs` (popup height stability + Last-4-weeks visibility, 3 wards), `scripts/check-citizen-mobile.mjs` (375px banner/sheet/overflow), `scripts/check-pill-contrast.mjs` (live-DOM WCAG ratio). All Playwright/Chromium, run against dev or preview server via `BASE` env.

---

## Phase 5 — AI Insights + Multilingual Citizen Chatbot 🚧

### A. Serverless layer (new)
1. **`api/insights.js`** — POST; takes ESG metric summaries, asks Gemini Flash for 3–5 diagnostic insights (JSON array: `{pillar, type, color, title, message, action}`); system prompt enforces grounding in provided numbers only, no invented metrics. No key → `{ available: false }`.
2. **`api/chat.js`** — POST `{ messages, lang }`; injects the ward dataset (scores, bands, features, dump-slot info, live PM2.5 context) as grounding context; instructs the model to answer only about the 5 pilot wards, admit unknowns, reply in EN/MR/HI. No key → `{ available: false }`.
3. Both: 15s timeout, `GEMINI_API_KEY` from server env only, no CORS middleware needed (same-origin), Vercel Hobby-compatible.

### B. Frontend (new)
4. **`src/lib/aiClient.js`** — `fetchAIInsights(payload)` / `sendChatMessage(messages, lang)` with 15s `AbortController`; every failure path resolves to a typed "unavailable" result, never a thrown error reaching the UI.
5. **AI Insights section in `ImpactAnalyst.jsx`** — new `AiDiagnostics` card between Replication and Diagnostics: "AI Insights (Gemini)" header with a Generate button; loading shimmer; results as `StatusSpine` cards (reusing `d.color` bands); explicit "AI-generated · verify against data" footnote; button hidden/disabled when endpoint reports unavailable, with a one-line explanation instead of an error.
6. **Citizen Chatbot** — floating action button (bottom-right, above the Today banner) on `/citizen`; opens a chat panel (desktop: floating card; mobile: full-width sheet reusing the BottomSheet pattern). Message list, input, send; quick-prompt chips ("Is my ward at risk?", "Where do I dump waste?"); replies render in the app language (`useI18n().lang` → passed to `/api/chat`); unavailable → a small honest notice in the panel, not a broken widget.
7. **i18n** — new keys in `src/lib/i18n.jsx` for all chat/insights strings (EN/MR/HI).
8. **Honesty contract** — UI never fakes AI availability: no key ⇒ widgets show "AI assistant not configured" one-liner; timeout/failure ⇒ retry affordance; every AI output carries a visible "AI-generated" tag.

### C. Config & docs
9. `.env.example` — add `GEMINI_API_KEY` (server-side only) note.
10. `README.md` — AI features section, new env var in Deployment, `api/` in structure.

### Verification
- [ ] `oxlint` 0 errors, `vite build` 0 errors
- [ ] Without `GEMINI_API_KEY`: Insights shows unavailable notice, chat shows notice, all v1.0 flows untouched
- [ ] With key: Insights generates ≤5 grounded cards; chat answers ward questions in EN + MR/HI, refuses out-of-scope questions politely
- [ ] Demo Mode ON: AI context reflects overridden values (Wagholi High etc.)
- [ ] Mobile 375px: chat panel full-width, keyboard-safe

---

## Phase 6 — Real-Time Intelligence + Persistence 🚧 BUILT

- **FIRMS satellite hotspots:** `api/fires.js` — NASA FIRMS MAP_KEY (free), Pune bbox, VIIRS S-NPP NRT (375 m, best for small waste fires), hotspots attributed to nearest ward centroid ≤5 km (polygons deliberately NOT used — several pilot wards share/proxy boundaries, see `useWardGeoJSON.js`); 30-min module cache; `src/lib/useFires.js` hook; Citizen `WardDetails` satellite line (teal/amber/red by count) + chatbot grounding field `satelliteHotspots24h`.
- **PM2.5 anomaly detection:** `src/lib/anomaly.js` — localStorage history per ward (cap 20, 72h window), z-score ≥ 2.5 with ≥ 6 readings required, flat-baseline guard (std < 0.5); `useWeather` feeds successful live readings only (fallback values would poison variance); `LiveReading` renders "Unusual spike vs recent readings" badge (Citizen + Dispatch).
- **Supabase (free):** `@supabase/supabase-js`; `src/lib/supabase.js` (null-client degradation when unconfigured); `supabase/schema.sql` — append-only `feedback` + `dispatch_log` tables with RLS (anon INSERT-only on feedback, INSERT+SELECT on dispatch_log, no update/delete ever); `auditLog.makeDispatchEntry` write-through with `demo` flag (demo actions never pollute the real corpus); DispatchConsole merges remote non-demo rows from last 24h on mount (local wins on id); "Cross-device sync on / Local session only" indicator; `FeedbackButtons` votes post to `feedback` with ward + score + demo flag.
- Deployment env vars: `FIRMS_MAP_KEY` (server), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client, RLS-protected).

## Phase 7 — Real Burn-Risk Classifier ✅ SHIPPED (dataset → trained model → live in-browser inference)

**Decisions locked:** notebook-first (run in Colab, review metrics at checkpoint before integration) · ONNX served **in-browser** via `onnxruntime-web` (free, offline-friendly, PWA-aligned) · S3 equity measurement folded into the `/model` page · pilot's static scores stay untouched (model is a parallel "Model v0.1 live" view) · all training data from free public sources, zero new accounts.

**Data sources:**
- **Open-Meteo Archive API** — daily weather per ward 2022–24 (humidity, temp max, precipitation, wind). Free, no key.
- **Open-Meteo Air Quality API** — daily PM2.5 (CAMS reanalysis, gridded → consistent coverage for all 5 wards, no sparse-station problem). Free, no key.
- **NASA FIRMS SP collections** (`VIIRS_SNPP_SP`) — historical hotspots back to 2022 (the live NRT feed we use in `api/fires.js` only reaches ~2 months back; SP covers the full training window). Existing MAP key, ~220 chunked requests, well inside the 5000/10min limit.

**7a. `training/01_build_dataset.ipynb`:** ✅ DONE (run locally, end-to-end, 2026-09-03)
1. Fetch weather + PM2.5 for the 5 ward coordinates (`api/fires.js` centroid set — training/live consistency), 2022-07-15 → 2024-12-31 (901 days; start clipped to CAMS PM2.5 availability, verified live: 2022 H1 hours return `None`, 2023–24 complete)
2. Fetch FIRMS `VIIRS_SNPP_SP` for the Pune bbox, 5-day chunks (Area API caps DAY_RANGE at 1–5), 181 requests, 1s sleep, cached to `training/cache/` (gitignored); attribution via the same ≤5km-nearest-centroid rule as `api/fires.js`
3. **Labels:** ward-day = burn day if attributed hotspots ≥ threshold that day or the next (48h framing); `LABEL_THRESHOLD=1` primary (86 burn days / 4,365 ward-days, 2.0% base rate; per-ward: Bhosari 23, Wagholi 22, Hadapsar 19, Kharadi 18, Mundhwa 4); threshold 2 sensitivity run pending in 7b comparison
4. **Features:** PM2.5 daily mean + 7d slope + 7d mean, humidity mean/trend/7d, temp max, wind max, precipitation, days-since-rain, green cover %, market/income flags, festival windows (Diwali/Holika + 7-day aftermath), doy sin/cos — all rolling features past-only (`shift(1)`, no leakage)
5. Committed outputs: `training/burn_dataset.csv` (4,365 rows × 23 cols incl. `split_year` for the time split) + `training/ward_day_labels.csv` (58 attributed pixels, full lineage) — deterministic re-runs via cache
6. Verified in the wild: FIRMS SP probe confirmed 0 pixels in monsoon windows is real (not a bug); VIIRS CSVs carry `bright_ti4` not `brightness` (parser handles both); pandas 3.0 API breaks fixed (`.dt` on DatetimeIndex, SeriesGroupBy.fillna)

**7b. `training/02_train_model.ipynb`:** ✅ RUN — metrics checkpoint reached (numbers below; integration gated on review per the locked recipe)
- LR vs GB, time-split train '22–'23 (2,535 rows / 52 burn days) → test '24 (1,830 rows / 34 burn days), calibrated (sigmoid CV), no shuffling
- **Class-weights decision (found live):** passing 50× sample weights into `CalibratedClassifierCV` broke GB's probabilities (Brier 0.135 vs 0.018) — both candidates now run unweighted inside calibration; honest calibrated probabilities beat inflated positive rates (documented in-notebook)
- **Winner: Gradient Boosting** — AUPRC 0.035 (1.9× lift over 0.019 base), ROC-AUC 0.668, Brier 0.018; top-1% precision 0.11 (≈6× base) but top-2.5% precision 0.04; **threshold-2 labels: AUPRC 0.008 vs 0.008 base → zero skill** (only 9 strict burn days in train — too few to learn)
- **S3 equity gap measured: 0.18** (high-income Kharadi precision 0.18 vs 0.00 in low/mixed groups at top-2.5%) — the model performs *worse where fires matter most*, now measurable and on `/model`
- Exported: `public/models/burn-risk-v0.1.onnx` (307 KB, single flat `X` float32[1,16] input, zipmap off, max |onnx−sklearn| = 8.3e-05) + `burn-risk-v0.1-metrics.json` sidecar (features, sources, all metrics, per-ward precision, equity gap, limitations, threshold-2 sensitivity)
- skl2onnx gotchas solved: DataFrame-fitted pipelines convert to per-column inputs → re-fit a name-free clone on plain ndarray for one flat input; zipmap disabled for onnxruntime-web
- **Interpretation for the model card:** modest but real ranking skill (1.9× lift); operational precision is far from dispatch-grade; the point of v0.1 is the honest pipeline + honest numbers, not a production predictor

**7c. Integration:** ✅ SHIPPED (local, verified 2026-09-03)
- **Runtime delivery:** `onnxruntime-web` 1.29, extern-wasm build via Vite `resolve.conditions: ['onnxruntime-web-use-extern-wasm']` (default `.bundle` import inlines ~28 MB of wasm — found during verification); inline `ortWasmAssets()` Vite plugin copies `ort-wasm-simd-threaded.wasm`+`.mjs` (13.3 MB) from node_modules → `dist/models/ort/` at build (repo stays lean, version locked by package-lock) and streams them in dev/preview via mount-prefix middleware (connect strips the prefix — `req.url` inside the handler is just `/<asset>`)
- `ort.env.wasm.numThreads = 1` (no COOP/COEP site-wide — they'd break OSM tiles; sub-10ms inference for a 307 KB model doesn't need threads)
- **`src/lib/useBurnRisk.js`** — honesty-contract hook (`loading|ready|unavailable`); ORT session singleton w/ failure reset; features from **live Open-Meteo** (forecast API `past_days=92` serves `relative_humidity_2m_mean` daily + is current through yesterday — no archive/forecast stitching needed; air-quality API `past_days=92` hourly PM2.5 → daily means); mirrors 7a math exactly (shift-1 past-only lags, `days_since_rain` over non-null precip, festival table extended 2025–26, doy sin/cos); demo mode deliberately does not alter it (parallel live estimate of the real world)
- **`/model` page** (`src/pages/ModelCard.jsx`, lazy route) — sidecar rendered verbatim (never recomputed): S3 equity gap **0.18 as the red headline**, AUPRC/lift/precision@K/Brier, threshold-2 zero-skill note, per-ward precision table, features/sources/limitations, training-notebook link; **try-it** ward selector → live in-browser estimate
- **Entry points:** AppMenu 4th "Model v0.1 · Transparency" card (quiet row below the 3-app grid — the 3-app story stays the headline); Analyst S3 metric card links to `/model`; Citizen WardDetails + Dispatch WardRow/tooltip show a quiet "Model v0.1 live: X% (asOf)" line only when the hook is ready
- i18n: full model-card strings in EN/MR/HI (`model*` keys)
- **Verified:** oxlint clean (only the pre-existing i18n fast-refresh warning); `vite build` — ORT as separate 358 KB lazy chunk, exactly one 13.3 MB wasm at `dist/models/ort/`, model 307 KB + sidecar 5 KB; live pipeline E2E (Node harness mirroring the hook): all 5 wards → **2.0–2.1% P(burn) for 2026-09-02** (monsoon, sane calibrated band); kill-switch (wasm blocked → honest unavailable, v1.0 flows untouched); all routes 200 in dev
- Live-contract findings (verified against real APIs): forecast API serves `relative_humidity_2m_mean` + 92 days of history; archive API current through yesterday; `past_days` precipitation has nulls before data begins (counted as unknown, not dry)

## Phase 8 — Live Feedback Analytics ⏸ DEFERRED

- Supabase feedback + dispatch outcomes → live "was the model right" labels and per-ward precision.
- Deferred: with test rows wiped, there is no real corpus yet. Needs accumulated real usage first.
- The S3 "Model Accuracy Equity Gap" measurement (from Phase 7's held-out test split) lives on `/model` instead — historically measured now, live-measured later.

---

# v2.1 — Future Scope: Detect → Explain → Respond → Learn (locked 2026-09, not scheduled)

**Why this reframe:** the closing question — "the model honestly says it's not good enough; can we do better?" — triggered a deep dive. Finding: v0.1's weak prediction metrics are not an effort gap, they're physics. (1) FIRMS 375 m pixels (~14 ha) structurally miss small waste fires — labels are a lower bound dominated by larger fires + the Bhosari industrial confound; (2) CAMS PM2.5 is ~10 km gridded while pilot wards sit 3–5 km apart — weather/PM features can't separate wards, so the model mostly learned "Pune in dry winter"; (3) the true burn driver (waste collection failure, festival cleanup nights, enforcement presence) is invisible to every free satellite feed. **Conclusion: day-ahead prophecy was the wrong job for this data; detection + response + community ground truth is the correct architecture.** The app already is two-thirds of that loop (satellite hotspots + PM2.5 anomaly detection live; dispatch/audit live) — the workstreams below complete it. The model card's "negative result" becomes the *engineering rationale*: tested rigorously, measured, and answered with the right architecture.

### Workstream A — Reframe the model card (~0.5 day) ⏸ PENDING
- `/model` leads with "what it's for": prioritization — the top 1% of ranked days carry ~6× the baseline burn rate; the job is ranking days for attention, not day-ahead prophecy
- PR-curve visualization (Recharts, already in the stack) from new sidecar arrays (small cell appended to `training/02_train_model.ipynb`; cached data, no refetch; page still renders sidecar numbers verbatim, never recomputes)
- "Why detection-first" section — the three label-physics findings above, shown with the measured numbers; S3 equity gap stays as the justice framing
- README model section rewritten to lead with the detection→response loop

### Workstream B — Risk Explorer on /model (~1 day) ⏸ PENDING
- Interactive scenario panel: drag days-since-rain, pick season, toggle festival window, set PM2.5 trend → the actual ONNX model computes the scenario **live in-browser** and shows the risk multiplier vs the neutral reference ("2.8× baseline on a dry post-Diwali November day")
- Honest labeling: scenario exploration (partial-dependence style), NOT prediction; ward static flags fixed to a selected ward so static features stay real
- Browser checks assert sanity: dry-festival scenario >1×, monsoon reference ≈1×

### Workstream C — Citizen report flywheel, with photo reports (~1–1.5 days) ⏸ PENDING
**Decisions locked:** inline base64 photos (client-side canvas compression to ~640 px JPEG, ~40–80 KB, stored as a text column — no storage bucket, no new policies); reports surface as per-ward counts + latest note, not map markers; staged build A→B→C.
- `reports` table: append-only like `dispatch_log` (anon INSERT+SELECT under RLS, idempotent migration): `ward_id, ward_name, note ≤200 chars optional, photo base64 optional, demo flag, created_at` — no new serverless endpoint, same client-side pattern as the dispatch log
- Citizen `WardDetails`: "Report burning" button → note + photo form → insert (demo-flagged like everything else); unconfigured → honest "needs cloud sync" notice; confirmation: "Thanks — N others reported near this ward today"
- Dispatch: "Citizen reports (24h)" chip on queue rows + tooltip count (only when configured)
- i18n EN/MR/HI for all new strings; photo size guard; world-writable trust model documented (same posture as `feedback`)
- **Why it matters:** people are the only sensor that reliably sees small waste fires — this is the ground-truth corpus satellites can't provide. The flywheel: the app collects the data that fixes the app.

### Workstream D — Model v0.2 multi-satellite retrain ⏸ DEFERRED (gated)
- Pre-flight findings (2026-09-05, read-only probes): S-NPP SP archive is flaky-to-patchy for 2025 (mostly HTTP 500s with real successes interleaved — API load vs archive thinning unresolved; `2026-02-10` returned 4 pixels, several 2025 dates 0/500); NOAA-20 SP answered once for 2025-01-10 (2 pixels) but 500s elsewhere; NOAA-21 SP covers from 2024-01. Live NRT (the app's own `api/fires.js` feed) unaffected by any of this. FIRMS bulk/Archive Download (Earthdata login) remains an untested alternative path for full-history shapefile/CSV exports if the Area API stays flaky.
- Plan if picked up: combine S-NPP + NOAA-20 + NOAA-21 SP archives (3 satellites of the same 375 m VIIRS class → more burn-day labels, partially relieving label scarcity), extend window through 2025, add `hotspots_prev_day` + `hotspots_prev_3d` persistence features, mandatory persistence-vs-meteorology ablation reported on the model card
- **Hard gate (unchanged):** swap only if AUPRC ≥ ~0.045 (≥30% relative over v0.1), S3 equity gap ≤ 0.18, Brier ≤ 0.03 — otherwise keep v0.1 and document why
- Deprioritized under the new framing: the reframe makes v0.1's honest numbers a feature; the retrain is a quiet upgrade, not the headline

### Also documented (not scheduled)
- Phase 8 live feedback analytics — still needs real accumulated usage; Workstream C's `reports` table becomes a second feed for it alongside `feedback` + `dispatch_log`
