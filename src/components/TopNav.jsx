import { Link, useLocation } from 'react-router-dom'
import { COLORS } from '../lib/theme'
import { useDemoMode } from '../lib/useDemoMode'
import { useI18n } from '../lib/i18n'

const TABS = [
  { path: '/citizen', label: 'Citizen Alert', short: 'Citizen' },
  { path: '/dispatch', label: 'PMC Dispatch', short: 'Dispatch' },
  { path: '/analyst', label: 'Impact Analyst', short: 'Analyst' },
]

export function TopNav() {
  const location = useLocation()
  const { demoMode, setDemoMode } = useDemoMode()
  const { lang, setLang } = useI18n()

  return (
    <>
      <header className="flex items-center justify-between gap-2 bg-navy px-3 py-2.5 sm:gap-3 sm:px-6">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition hover:border-teal sm:gap-2 sm:px-3 sm:text-sm"
          style={{ borderColor: COLORS.navyLine, color: '#F0F1F5' }}
        >
          <span aria-hidden>←</span> <span className="hidden sm:inline">App Menu</span>
          <span className="sm:hidden">Menu</span>
        </Link>

        <nav className="relative flex min-w-0 gap-1 rounded-full bg-navy-raised p-1" aria-label="Switch app">
          {TABS.map((tab) => {
            const active = location.pathname.startsWith(tab.path)
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`relative rounded-full px-2 py-1.5 text-[11px] font-semibold tracking-wide transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-3 sm:text-sm ${active ? 'shadow-sm' : 'hover:text-white hover:scale-[1.02]'}`}
                style={{
                  background: active ? COLORS.teal : 'transparent',
                  color: active ? COLORS.navy : '#C7CDD9',
                  boxShadow: active ? `inset 0 -2px 0 ${COLORS.navy}` : undefined,
                  transform: active ? 'translateY(0) scale(1)' : 'scale(0.98)',
                }}
                aria-current={active ? 'page' : undefined}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
              </Link>
            )
          })}
        </nav>
        <select
          value={lang}
          onChange={(e)=>setLang(e.target.value)}
          aria-label="Language"
          className="rounded-full bg-navy-raised px-2 py-1 text-xs font-semibold text-white border border-navy-line"
        >
          <option value="en">EN</option>
          <option value="mr">MR</option>
          <option value="hi">HI</option>
        </select>
      </header>

      {demoMode && (
        <div
          className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold sm:px-6"
          style={{ background: COLORS.redDim, color: COLORS.redText }}
        >
          <span>● Demo mode — showing simulated alert data, not the pilot's real current state</span>
          <button onClick={() => setDemoMode(false)} className="underline shrink-0">
            Turn off
          </button>
        </div>
      )}
    </>
  )
}
