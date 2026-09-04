// Contrast verification for the toolbar pill's live/offline qualifier.
// Computes the real WCAG contrast ratio from computed styles + pill
// background (rgba tint composited over white) in the live DOM.
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:5199'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(`${BASE}/citizen`, { waitUntil: 'networkidle', timeout: 60000 })

const result = await page.evaluate(() => {
  const pill = document.querySelector('[data-testid="today-pill"]')
  if (!pill) return { error: 'pill not found' }
  const qual = [...pill.querySelectorAll('span')].find((s) => s.textContent.trim().startsWith('·'))
  if (!qual) return { error: 'qualifier span not found' }

  const style = getComputedStyle(qual)
  const rgb = (str) => str.match(/\d+(\.\d+)?/g).map(Number).slice(0, 3)
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const pillBg = getComputedStyle(pill).backgroundColor
  let bg
  const m = pillBg.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
  if (m) {
    // composite the tint over the white toolbar
    const [r, g, b, a] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])]
    bg = [r * a + 255 * (1 - a), g * a + 255 * (1 - a), b * a + 255 * (1 - a)]
  } else {
    bg = rgb(pillBg)
  }
  const L1 = lum(rgb(style.color))
  const L2 = lum(bg)
  const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
  return {
    text: qual.textContent.trim(),
    color: style.color,
    fontWeight: style.fontWeight,
    pillBackground: pillBg,
    compositedBg: bg.map((v) => Math.round(v)),
    contrastRatio: Number(ratio.toFixed(2)),
    passesAA: ratio >= 4.5,
  }
})

console.log(JSON.stringify(result, null, 2))
await browser.close()
process.exit(result.error || !result.passesAA ? 1 : 0)
