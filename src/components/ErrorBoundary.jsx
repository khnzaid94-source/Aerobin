import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Intentionally not reporting externally — no backend in pilot.
    // Console retained for local debugging only.
    if (import.meta.env.DEV) console.error('ErrorBoundary caught', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      const detail = this.state.error?.message ?? 'Unknown error'
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="rounded-full bg-red-dim px-3 py-1 text-xs font-semibold" style={{ color: '#B42245' }}>
            Something went wrong
          </div>
          <h2 className="font-display text-xl text-navy">{this.props.title ?? "Couldn't load this view"}</h2>
          <p className="max-w-md text-sm text-slate">{detail}</p>
          <button
            onClick={this.handleReset}
            className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy/90"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
