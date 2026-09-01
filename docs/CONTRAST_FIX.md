# Contrast Fix — Full Technical Deep Dive

_Moved from `README.md:29-223` to keep the GitHub front page scannable. This is the audit trail for reviewers._

## 1. The Unlayered vs Layered Cascade Bug

**Symptom:** Landing-page card titles in `src/pages/AppMenu.jsx:137-146` set to `text-white` rendered as barely-visible dark navy anyway.

**Root cause:** `src/index.css:4-88`

```css
@import "tailwindcss"; /* Tailwind v4 puts utilities in @layer utilities */

h1,h2,h3,h4 { color: var(--color-navy); } /* unlayered */
```

Per CSS Cascade Layers spec, **unlayered rules always win over any layered rule** — including Tailwind’s `text-white` (`@layer utilities`) — regardless of specificity or source order. So every `<h2 class="text-white">` lost to the element selector.

**Fix (two parts):**

1.  **Root cause** — Wrap base resets in `@layer base` (`src/index.css:66-88`):

    ```css
    @layer base {
      body { color: var(--color-navy); background: var(--color-mist); }
      h1,h2,h3,h4 { color: var(--color-navy); font-family: var(--font-display); }
      button { font-family: inherit; }
    }
    ```

    `@layer base` is lower priority than `utilities`, so Tailwind colors correctly win again, app-wide.

2.  **Belt and suspenders** — Every color the brief called out explicitly (card titles, logo mark, Pilot Playback text) is also set with an **inline hex** (`src/pages/AppMenu.jsx:14-15` `TEXT_ON_DARK:#FFFFFF`, `src/components/LiveReading.jsx:15-43`). Those elements are immune even if CSS changes again.

**Lesson:** If readable JSX renders invisible in any Tailwind v4 project, check unlayered-vs-layered precedence first.

## 2. Text-Safe Color Variants (Second Pass)

**Different bug, same family:** Badges/labels used the *vivid* risk colors as **text** on a pale tint of the same hue — e.g. `COLORS.amber #FFB020` text on `COLORS.amberDim rgba(255,176,32,0.16)` background (`src/lib/theme.js:6-26`).

Computed WCAG contrast: **1.65–1.91:1** — fails AA minimum 4.5:1 for text. Same colors are fine as dots/sparklines (non-text needs 3:1).

**Fix:** Second, darker variant per color, verified computed (not eyeballed):

| Token | Vivid (dots/lines) | Text-safe (text) | Contrast on white/mist |
|-------|-------------------|------------------|------------------------|
| Teal  | `#00D4AA`         | `#00695A` `tealText` | 5.6:1 |
| Amber | `#FFB020`         | `#8A5A00` `amberText`| 5.9:1 |
| Red   | `#F0435A`         | `#B42245` `redText`  | 6.6:1 |

`RISK_BANDS` + `statusColor()`/`statusTextColor()` in `src/lib/theme.js:39-79` expose both: `.color`/`statusColor()` for dots/markers/lines, `.textColor`/`statusTextColor()` for any text. Touched: `StatusPill` `Card.jsx:11-23`, `LiveReading` amber line, demo banner `TopNav.jsx:49-58`, ward badges `CitizenAlert.jsx:18-22`, `PilotPlayback` week list, `DispatchConsole.jsx:77-98` audit badges.

**Exception:** Landing page demo toggle `AppMenu.jsx:81-91` sits on dark navy — darker red would *reduce* contrast there, so it keeps vivid `COLORS.red`/`redDim` (~4:1 on navy).

**Regression note:** `DispatchConsole.jsx:205` was still using `RISK_BANDS.Low.color` as text on white — fixed in Phase 1 to `textColor`.

## 3. Verification

Recompute with any WCAG tool (e.g. `npx wcag-contrast #00695A #FFFFFF` → 5.6:1). All three text variants pass 5:1+ on white cards, `mist #F8F9FB`, and their own tinted badge backgrounds. Demo-mode toggle on navy ` #1A1A2E` passes 4:1.
