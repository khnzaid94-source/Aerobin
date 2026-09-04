// Popup stability verification (run: node scripts/check-citizen-popup.mjs)
// Reproduces the reported bug scenario: click ward markers, wait for the
// async lines (satellite / model / PM2.5) to land, verify:
//   1. popup height never changes after open (no reflow jumps)
//   2. "Last 4 weeks" + feedback row visible without scrolling
//   3. toolbar pill present on desktop, no below-map banner
// Env: BASE (default http://localhost:5199), WIDTH/HEIGHT viewport.
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:5199'
const WIDTH = Number(process.env.WIDTH ?? 1280)
const HEIGHT = Number(process.env.HEIGHT ?? 800)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } })

console.log(`navigating to ${BASE}/citizen (${WIDTH}x${HEIGHT}) …`)
await page.goto(BASE + '/citizen', { waitUntil: 'networkidle', timeout: 60000 })

async function openPopup(wardName) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const markers = page.locator('.ab-marker')
  const count = await markers.count()
  for (let i = 0; i < count; i++) {
    await markers.nth(i).evaluate((el) => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await page.waitForTimeout(250)
    const h3 = page.locator('.leaflet-popup h3').last()
    if ((await h3.textContent())?.trim() === wardName) return true
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }
  return false
}

const popupHeight = () => page.locator('.leaflet-popup').evaluate((el) => el.getBoundingClientRect().height)

const results = []
let allPass = true

for (const ward of ['Bhosari', 'Wagholi', 'Hadapsar']) {
  console.log(`\n=== ${ward} ===`)
  const opened = await openPopup(ward)
  if (!opened) { results.push(`${ward}: FAILED to open`); allPass = false; continue }

  const h1 = await popupHeight()
  const settled = await page
    .waitForFunction(
      () => {
        const t = document.querySelector('.leaflet-popup')?.innerText ?? ''
        return /Model v0\.1 live:/.test(t) || /Model v0\.1 live estimate unavailable/.test(t)
      },
      null,
      { timeout: 25000 }
    )
    .then(() => true)
    .catch(() => false)
  const h2 = await popupHeight()
  const delta = h2 - h1

  const visible = await page.evaluate(() => {
    const pop = document.querySelector('.leaflet-popup')
    const label = [...pop.querySelectorAll('p')].find((p) => p.textContent.trim() === 'Last 4 weeks')
    if (!label) return { found: false }
    const r = label.getBoundingClientRect()
    const pr = pop.getBoundingClientRect()
    return { found: true, inside: r.bottom <= pr.bottom + 1 && r.top >= pr.top - 1 }
  })
  const feedbackVisible = await page.evaluate(() =>
    (document.querySelector('.leaflet-popup')?.innerText ?? '').includes('Was this alert useful?')
  )

  const pass = opened && settled && Math.abs(delta) < 2 && visible.found && visible.inside && feedbackVisible
  if (!pass) allPass = false
  results.push(
    `${ward}: ${pass ? 'PASS' : 'FAIL'} open=${h1.toFixed(0)}px settled=${h2.toFixed(0)}px delta=${delta.toFixed(0)}px ` +
      `last4weeks=${visible.found ? (visible.inside ? 'visible' : 'CLIPPED') : 'missing'} feedback=${feedbackVisible} modelSettled=${settled}`
  )
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
}

const pill = await page.locator('[data-testid="today-pill"]').count()
const oldBanner = await page.evaluate(() => document.body.innerText.includes('Live PM2.5 connected'))
console.log(`\nlayout: pill=${pill} oldBanner=${oldBanner}`)
if (pill !== 1 || oldBanner) allPass = false

await browser.close()
console.log('\n=== SUMMARY ===')
results.forEach((r) => console.log(r))
console.log(allPass ? 'DESKTOP POPUP PASS' : 'DESKTOP POPUP FAIL')
process.exit(allPass ? 0 : 1)
