export function LoadingScreen({ label = 'Loading pilot data…' }) {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-slate">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-navy-line border-t-teal" aria-hidden />
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export function ErrorScreen({ title = "Couldn't load pilot data", detail }) {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="rounded-full bg-red-dim px-3 py-1 text-xs font-semibold text-red">Data error</div>
      <h2 className="font-display text-xl">{title}</h2>
      {detail && <p className="max-w-md text-sm text-slate">{detail}</p>}
      <p className="max-w-md text-sm text-slate">
        Check that <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">aerobin_data.json</code>{' '}
        is present in <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">public/data/</code>.
      </p>
    </div>
  )
}
