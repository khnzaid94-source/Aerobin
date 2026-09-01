# Aerobin Microapps — Implementation Plan

**Status:** Build Mode — Phased Execution  
**Locks (user-confirmed):**
- No MIT licence → view-only, © 2026 All rights reserved
- Option A: Stay on JavaScript (`src/**/*.jsx`), remove `@types/*`, add `jsconfig.json` with `checkJs`
- Project Submissions `Prototype Video.mkv:65.18 MB` pushed **direct** (no LFS) — under 100 MB hard limit, >50 MB warning expected
- `AeroBin Dashboard Data/` deleted — no action
- Public repo, no deployment (Vercel/Netlify deferred)
- Hold `SS/` screenshots and `git push` until user signals

**Full audit coverage:** `package.json:1-30`, `vite.config.js:1-8`, `.gitignore:1-24`, `.oxlintrc.json:1-8`, `index.html:1-15`, `src/**/*` (28 files), `public/data/aerobin_data.json:1-1833`, `public/data/pune-admin-wards.geojson:1`, `Project Submissions/*` (15 files)

---

## Phase 0 — Repo Hygiene (15m) — No visual change, must-do before first commit

| Task | File(s) | Why |
|------|---------|-----|
| Rotate & ignore secrets | `.env.local:7` `VITE_OPENWEATHER_API_KEY=d1e97...` | Leaked key on disk; rotate at openweathermap.org, ensure only `.env.example:1-7` is committed. Harden `.gitignore:13` `*.local` → add explicit `.env`, `/dist`, `coverage`, `.vite` |
| Normalize line endings & binaries | `.gitattributes` (new) | `* text=auto eol=lf`, `*.mkv binary`, `*.pptx binary` — prevents CRLF churn on GitHub preview |
| Fix oxlint schema | `.oxlintrc.json:2` `$schema: ./node_modules/...` → `https://...` or remove | Breaks on fresh clone before `npm install` |
| Add Node guard | `package.json:4` `0.0.0` → `1.0.0`, `engines:{node:">=18"}`, `.nvmrc` `20` | React 19 + Vite 8 require Node 18+ |
| Stay JS cleanly | `package.json:22-24` remove `@types/react`, `@types/react-dom`; add `jsconfig.json` `{compilerOptions:{checkJs:true, jsx:"react-jsx"}}` | Dead deps confuse reviewers; keep IDE hints without TS migration |

Verification: `npm install` clean, `git status` shows `.env.local` ignored, `git check-attr --all -- *.mkv` confirms binary.

---

## Phase 1 — High-Priority Bug + UX Fixes (1.5h) — Executes now

### A. Global Shell
1. **ErrorBoundary** — `src/App.jsx:18` wrap `<Outlet/>` with `react-error-boundary` + retry → `StateScreen.jsx:10` `ErrorScreen` with button. Prevents white-screen on lazy chunk failure.
2. **TopNav a11y** — `src/components/TopNav.jsx:11-47` add bottom border/underline for active tab (color-blind), keep `aria-current`; add skip-link before `<header>`.
3. **404 page** — `src/App.jsx:36` `Navigate to="/"` → dedicated 404 `StateScreen` (“No page at {path} — Back to Menu”).
4. **Loading skeletons** — `StateScreen.jsx:1-8` spinner → map skeleton + card skeletons for `CitizenAlert.jsx:61`, `DispatchConsole.jsx:161`.
5. **Focus** — keep `index.css:152-156` `:focus-visible`, ensure all interactive map markers have `tabIndex`.

### B. Citizen Alert `src/pages/CitizenAlert.jsx:1-126`
6. **Banner vs ZoomControl clash** — `CitizenAlert.jsx:82-113` banner `z-[500]` overlaps `LeafletMap.jsx:85` `ZoomControl bottomright` on mobile. Move banner to `z-[600]` and `ZoomControl` to `bottomleft` on `<640px`.
7. **BottomSheet a11y** — `BottomSheet.jsx:11-25` add `role="dialog"`, backdrop, drag handle, `Esc` close, focus trap & return; keep `prefers-reduced-motion` from `index.css:215-219`.
8. **Directions CTA** — `CitizenAlert.jsx:12-39` `WardDetails` add “Get directions” → `https://maps.google.com/?q=${lat},${lon}` using `ward.coordinates`.
9. **Staleness trust** — `CitizenAlert.jsx:98-103` banner: show `LiveReading` age (`timeAgo` from `src/lib/useWeather.js`) inline (“Live · 2 min ago”) so `LiveReading.jsx:25-27` copy is not hidden.
10. **All-clear proof** — `CitizenAlert.jsx:89` add “See last High week (Week 6)” link → deep-link to `ImpactAnalyst` playback.

### C. PMC Dispatch `src/pages/DispatchConsole.jsx:1-255`
11. **Sort queue** — `DispatchConsole.jsx:165` `dispatchToday.filter(band==='High')` → `.sort((a,b)=>b.current.burnRiskScore - a.current.burnRiskScore)`, add badge count.
12. **Map ↔ Queue sync** — `DispatchConsole.jsx:183` currently `renderTooltip` only, missing `selectedWardId`/`onSelectWard`. Wire through `LeafletMap.jsx:52-95` so marker click highlights `WardRow:40-74` and vice versa.
13. **WCAG regression** — `DispatchConsole.jsx:205` `color: RISK_BANDS.Low.color` (`#00D4AA` on white ~1.9:1) → `RISK_BANDS.Low.textColor` (`#00695A` 5.6:1) via `statusTextColor()` from `src/lib/theme.js:74`. Same for `84-98`.
14. **Search/filter backlog (tracked now, code later)** — `auditLog.js:97-102` `sessionStats` supports “This session only” toggle; add pills `All/Dispatched/Skipped/Flagged` + name search to `DispatchConsole.jsx:246-250` in next pass.

### D. Impact Analyst `src/pages/ImpactAnalyst.jsx:1-262` + `PilotPlayback.jsx:1-164` + `Sparkline.jsx:1-71`
15. **Sparkline id collision** — `Sparkline.jsx:32` `spark-${color}` duplicates for 4+ green metrics. Fix: `spark-${metricKey}-${color}` + pass `metric.key`.
16. **Playback a11y** — `PilotPlayback.jsx:90-100` add `aria-valuetext="Week 6 — Nov 11"` + thumb tooltip showing `weekDates[weekIndex]`.
17. **Metric delta** — `ImpactAnalyst.jsx:11-46` `MetricCard` add `+{(current-baseline).toFixed(1)}` and trend arrow via `metricStatus()`.
18. **Health** — `useWeather.js:57` fetch add `AbortController` 8s timeout; `exportReport.js:24-34` wrap `URL.createObjectURL` in `try/finally` revoke.

---

## Phase 2 — Docs Split (30m) — Executes now, no code risk

- **Rewrite `README.md:1-310` → ~180-line GitHub page** — Header/tagline, What is AeroBin (5 wards, 12 weeks Oct-Dec, CPCB baselines `aerobin_data.json:1-43`), Goals (PM2.5/SMS/equity), 3 Apps table, Key Features (Demo Mode `demoOverrides.js:24-39`, Playback `PilotPlayback.jsx:73-80` 2.5s/week, Live PM2.5 `useWeather.js`, Audit Log `auditLog.js`), Tech Stack `package.json:12-29`, Data, Getting Started (`npm install/dev/build` + `.env.example:7`), Structure, Design Decisions summary + links, Process Docs (`Project Submissions/` 1A-4B), Limitations & Next Steps (FIRMS feed, backend vs `localStorage`), Author & `© 2026 All rights reserved — View-only`.

- **Extract** full `README.md:29-223` contrast story → `docs/CONTRAST_FIX.md` (unlayered `@layer base` `index.css:58-67`, `COLORS.amberText:#8A5A00` etc. 1.65:1→5.9:1).
- **Extract** data model + “Why today is all-clear” (`aerobin_data.json:49` `highRiskWardsToday:0`) → `docs/DATA_MODEL.md`.
- **Backlog** remaining 12 UX/feature items (B10, C12-13,15, D20-22, AppMenu stats, F26-30 PWA/i18n/feedback) → `docs/ROADMAP.md` with Impact/Effort table.

---

## Phase 3 — Deferred (Docs Only Now, Code Later — On Hold per User)

- Add `SS/citizen-map.png`, `SS/dispatch-queue.png`, `SS/analyst-playback.png` references to README (you fill `SS/` folder).
- `git init -b main`, first commit, GitHub public push (direct 65 MB video, no LFS, expect yellow >50 MB warning).
- Then implement Phase 3 backlog in a second PR: `C12` bulk dispatch, `C13` audit search, `C15` tooltip enrich, `D20` CSV export, `F26-30` compare/history/i18n/PWA/feedback.

---

## Verification Checklist

- [ ] `.env.local` ignored, `git status` clean, `.gitattributes` applied
- [ ] `npm run lint` (oxlint) 0 warnings, `npm run build` succeeds, `vite preview` loads `/`, `/citizen`, `/dispatch`, `/analyst`
- [ ] Demo mode toggle OFF→ON→OFF on `AppMenu.jsx:81` — `Wagholi:78.4 High` pulsing, `Kharadi:54.2 Medium`, `S3:12.6` red, `clearAuditLog()` resets queue, banner `TopNav.jsx:49-58` appears
- [ ] Dispatch queue sorted desc, marker click ↔ row highlight, WCAG contrast recomputed (tealText/amberText/redText 5.6-6.6:1)
- [ ] Pilot Playback scrub 1→12, sparklines each show tracking dot, `Sparkline.jsx` gradients unique per metric
- [ ] 375px mobile: `BottomSheet` opens/closes with backdrop, no `TopNav` overflow, banner not covering `ZoomControl`
- [ ] README renders on GitHub with 3 `SS/` placeholders, `docs/` links work, no league secrets exposed

---

## Resume Instructions

1. Reopen `Aerobin-microapps/` in any new session — this file persists.
2. Run `npm install` if `node_modules` missing, then follow Phase order above.
3. Screenshot step: after Phase 1, run app, capture 3 screens to `SS/`, then push.
