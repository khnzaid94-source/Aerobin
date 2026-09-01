import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom'
import { TopNav } from './components/TopNav'
import { LoadingScreen } from './components/StateScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppMenu } from './pages/AppMenu'
import { DemoProvider } from './lib/DemoProvider'
import { I18nProvider } from './lib/i18n'

// Each app is its own chunk — Leaflet (Citizen/Dispatch) and Recharts
// (Analyst) only load once someone actually opens that app.
const CitizenAlert = lazy(() => import('./pages/CitizenAlert').then((m) => ({ default: m.CitizenAlert })))
const DispatchConsole = lazy(() => import('./pages/DispatchConsole').then((m) => ({ default: m.DispatchConsole })))
const ImpactAnalyst = lazy(() => import('./pages/ImpactAnalyst').then((m) => ({ default: m.ImpactAnalyst })))

function AnimatedOutlet() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="ab-page-enter">
      <Outlet />
    </div>
  )
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-mist">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[1000] focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:text-white">
        Skip to content
      </a>
      <TopNav />
      <main id="main-content">
        <ErrorBoundary>
          <Suspense fallback={<LoadingScreen label="Loading app…" />}>
            <AnimatedOutlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}

function NotFound() {
  const loc = useLocation()
  return (
    <div className="flex min-h-[calc(100dvh-52px)] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-slate">404</div>
      <h2 className="font-display text-xl text-navy">No page at {loc.pathname}</h2>
      <p className="text-sm text-slate">The link you followed doesn’t exist.</p>
      <a href="/" className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Back to Menu</a>
    </div>
  )
}

function App() {
  return (
    <I18nProvider>
      <DemoProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppMenu />} />
            <Route element={<AppLayout />}>
              <Route path="/citizen" element={<CitizenAlert />} />
              <Route path="/dispatch" element={<DispatchConsole />} />
              <Route path="/analyst" element={<ImpactAnalyst />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DemoProvider>
    </I18nProvider>
  )
}

export default App
