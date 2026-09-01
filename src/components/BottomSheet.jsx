import { X } from 'lucide-react'
import { COLORS } from '../lib/theme'

/**
 * Mobile substitute for the floating Leaflet popup (Citizen Alert only —
 * a tiny floating popup is hard to read/tap on a phone; a bottom sheet
 * gives the same content full width and an easy thumb-reach close area).
 */
export function BottomSheet({ open, onClose, children }) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close ward details"
          onClick={onClose}
          className="fixed inset-0 z-[699] bg-navy/30 backdrop-blur-[1px]"
        />
      )}
      <div className="ab-sheet" data-closed={!open} aria-hidden={!open} role="dialog" aria-modal="true" aria-label="Ward details">
      <div className="flex items-center justify-between border-b border-mist px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.slateSoft }}>
          Ward details
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-mist text-navy"
        >
          <X size={16} />
        </button>
      </div>
      <div className="px-4 py-4">{children}</div>
      </div>
    </>
  )
}
