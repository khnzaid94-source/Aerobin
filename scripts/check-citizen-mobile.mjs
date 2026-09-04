// Mobile 375px check (run: node scripts/check-citizen-mobile.mjs)
// In-flow banner below map stays, toolbar pill hidden, bottom sheet opens on
// marker tap, no horizontal overflow.
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:5199'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 375, height: 700 } })

await page.goto(`${BASE}/citizen`, { waitUntil: 'networkidle', timeout: 60000 })

const pill = await page.locator('[data-testid="today-pill"]').count()
const banner = await page.evaluate(() => {
  const t = document.body.innerText.toLowerCase()
  // rendered uppercase via CSS — "TODAY" + a live/offline status variant
  return t.includes('today') && (t.includes('live pm2.5 connected') || t.includes('offline mode'))
})
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > 375)

await page.locator('.ab-marker').first().dispatchEvent('click')
await page.waitForTimeout(600)
const sheet = await page.evaluate(() => {
  const t = document.body.innerText
  return {
    sheetVisible: !!document.querySelector('[role="dialog"]'),
    hasWard: t.includes('Burn-risk score'),
  }
})

console.log('pill (want 0):', pill)
console.log('in-flow banner present:', banner)
console.log('horizontal overflow:', overflow)
console.log('bottom sheet:', JSON.stringify(sheet))

await browser.close()
const pass = pill === 0 && banner && !overflow && sheet.sheetVisible && sheet.hasWard
console.log(pass ? 'MOBILE PASS' : 'MOBILE FAIL')
process.exit(pass ? 0 : 1)
