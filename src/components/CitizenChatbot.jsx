import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import { sendChatMessage } from '../lib/aiClient'
import { useI18n } from '../lib/i18n'
import { COLORS } from '../lib/theme'

/**
 * Floating "Ask AeroBin" chat widget for the Citizen Alert app.
 *
 * Grounded strictly in today's ward data (burn scores, bands, top features,
 * live PM2.5 when available) via /api/chat. Language follows the TopNav
 * selector (EN/MR/HI). If the AI endpoint is not configured or fails, the
 * panel shows an honest notice — it never pretends to be working.
 */
export function CitizenChatbot({ wards, weather, fires, summary, demoMode }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // {role, text, status?}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [unavailable, setUnavailable] = useState(null) // null | reason string
  const [probed, setProbed] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, busy, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60)
  }, [open])

  // Fresh panel state each time it opens — today's data, today's language.
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', text: t('chatSubtitle') }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const send = async (raw) => {
    const text = String(raw ?? '').trim()
    if (!text || busy) return
    const history = [...messages, { role: 'user', text }]
    setMessages(history)
    setInput('')
    setBusy(true)
    setUnavailable(null)

    const firesById =
      fires?.status === 'ready'
        ? Object.fromEntries(fires.data.wards.map((w) => [w.id, w.count]))
        : null

    const context = {
      summary,
      demoMode: Boolean(demoMode),
      wards: wards.map((w) => ({
        name: w.name,
        burnRiskScore: w.current?.burnRiskScore ?? null,
        riskBand: w.band,
        topFeatures: w.current?.topFeatures ?? [],
        dispatchStatus: w.current?.dispatchStatus ?? null,
        livePm25: weather?.readings?.[w.id]?.pm25 ?? null,
        livePm25Source: weather?.readings?.[w.id]?.source ?? null,
        satelliteHotspots24h: firesById ? firesById[w.id] ?? 0 : null,
      })),
      satelliteFiresAvailable: fires?.status === 'ready',
    }

    const result = await sendChatMessage(
      history.map((m) => ({ role: m.role, text: m.text })),
      lang,
      context
    )

    if (result.status === 'ok') {
      setMessages((prev) => [...prev, { role: 'assistant', text: result.reply }])
    } else {
      setProbed(true)
      setUnavailable(result.reason)
      setMessages((prev) => [...prev, { role: 'assistant', text: null, status: 'failed' }])
    }
    setBusy(false)
  }

  const isConfigMissing = probed && unavailable === 'no-api-key'
  const notice = isConfigMissing ? t('chatUnavailable') : t('chatRetry')

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t('chatClose') : t('askAeroBin')}
        className="ab-chat-fab"
        style={{ background: open ? COLORS.navy : COLORS.teal }}
      >
        {open ? <X size={20} style={{ color: '#fff' }} /> : <MessageCircle size={20} style={{ color: COLORS.navy }} />}
      </button>

      <div className="ab-chat-panel" data-open={open} role="dialog" aria-label={t('chatTitle')} aria-hidden={!open}>
        <div className="flex items-center justify-between border-b border-mist px-4 py-3">
          <div>
            <p className="flex items-center gap-1.5 font-display text-base text-navy">
              <Sparkles size={14} aria-hidden /> {t('chatTitle')}
            </p>
            <p className="text-[11px] text-slate-soft">{t('chatSubtitle')} · {t('aiTag')}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label={t('chatClose')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-mist text-navy"
          >
            <X size={16} />
          </button>
        </div>

        <div ref={scrollRef} className="ab-chat-scroll ab-scroll flex-1 px-3.5 py-3">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="ab-chat-msg ab-chat-msg--user">
                {m.text}
              </div>
            ) : (
              <div key={i} className="ab-chat-msg ab-chat-msg--bot">
                {m.text ?? notice}
              </div>
            )
          )}
          {busy && <div className="ab-chat-msg ab-chat-msg--bot ab-chat-typing">{t('chatThinking')}</div>}
          {isConfigMissing && (
            <p className="mx-1 mt-2 rounded-lg bg-mist px-2.5 py-2 text-[11px] leading-snug text-slate">
              {t('chatUnavailable')}
            </p>
          )}
        </div>

        {messages.length <= 2 && !busy && (
          <div className="flex flex-wrap gap-1.5 px-3.5 pb-2">
            {[t('chatChipRisk'), t('chatChipDump')].map((chip) => (
              <button
                key={chip}
                onClick={() => send(chip)}
                className="rounded-full border border-mist bg-white px-2.5 py-1 text-[11px] font-semibold text-navy transition hover:border-teal"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <form
          className="flex items-center gap-2 border-t border-mist px-3.5 py-3"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chatPlaceholder')}
            aria-label={t('chatPlaceholder')}
            className="min-w-0 flex-1 rounded-full border border-mist bg-white px-3 py-2 text-sm text-navy outline-none focus:border-teal"
            disabled={isConfigMissing}
          />
          <button
            type="submit"
            aria-label={t('chatSend')}
            disabled={busy || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-white transition hover:bg-navy/90 disabled:opacity-40"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </>
  )
}
