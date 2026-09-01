# Roadmap — Backlog from Full Audit

_All items below are now **implemented** (Phase backlog built without push). This log is kept for reviewer traceability._

| # | Area | Improvement | File(s) | Impact | Effort | Status |
|---|------|-------------|---------|--------|--------|--------|
| B10 | Citizen | All-clear proof link “See last High week (Week 6)” → Analyst playback deep-link | `CitizenAlert.jsx:146` | Med | Low | ✅ Done |
| C12 | Dispatch | Bulk “Dispatch all High” + Undo | `DispatchConsole.jsx:185-225` | High | Med | ✅ Done |
| C13 | Dispatch | Audit log filter pills `All/Dispatched/Skipped/Flagged` + name search + “This session only” toggle | `DispatchConsole.jsx:260-285` | High | Med | ✅ Done |
| C15 | Dispatch | Enrich `WardTooltip` with `topFeatures[0]` + `dispatchStatus` | `DispatchConsole.jsx:21-46` | Med | Low | ✅ Done |
| D20 | Analyst | Export CSV (9 rows) alongside JSON, rename button “Export JSON” | `exportReport.js:24-55`, `ImpactAnalyst.jsx:191-228` | Med | Low | ✅ Done |
| D21 | Analyst | Sticky replication callout + progress bar `2/3 met → Month 10+` | `ImpactAnalyst.jsx:114-135` | Med | Low | ✅ Done |
| D22 | Analyst | Diagnostics checklist with persisted checkbox | `ImpactAnalyst.jsx:163-188` | Low | Med | ✅ Done |
| E23 | Menu | Per-card “Last updated: Dec 23” microcopy | `AppMenu.jsx:162-168` | Low | Low | ✅ Done |
| E24 | Menu | Demo mode first-visit tooltip + `sessionStorage` persist | `AppMenu.jsx:72-112` | Low | Low | ✅ Done |
| F26 | Feature | Ward search & 2-column compare | `CitizenAlert.jsx:13-48` `WardCompare` | Med | Med | ✅ Done |
| F27 | Feature | Historical sparkline per ward (read-only 4-week SVG) | `CitizenAlert.jsx:30-46` `MiniTrend` | Med | Med | ✅ Done |
| F28 | Feature | i18n skeleton (Marathi/Hindi: EN/MR/HI) | `lib/i18n.jsx`, `TopNav.jsx`, `App.jsx` `I18nProvider` | Low | Med | ✅ Done |
| F29 | Feature | PWA offline cache (shell + data, not live PM2.5) | `public/manifest.json`, `public/sw.js`, `lib/registerSW.js` | Low | Med | ✅ Done |
| F30 | Feature | “Was this alert useful?” thumbs → `localStorage: aerobin.feedback.*` | `CitizenAlert.jsx:13-28` `FeedbackButtons` | Med | Med | ✅ Done |

## Prioritization Rationale

Phase 1 picks items with **High Impact / Low Effort + No Visual Break** (ErrorBoundary, WCAG `textColor` fix `DispatchConsole.jsx:205`, Sparkline id `Sparkline.jsx:32`, queue sort, map↔queue sync). Remaining items touch more UI state or product scope and are safer as a second PR after the portfolio video is recorded, so the stable demo you push now isn’t regressed.

## How to Claim

Move a row to `implementation plan.md` Phase 1 and implement with verification: `npm run lint && npm run build`, demo toggle OFF→ON→OFF flow, 375px mobile pass, `PilotPlayback` scrub 1→12 check.
