'use client'

interface Props {
  currentPage:  number
  totalPages:   number
  onPrevious:   () => void
  onNext:       () => void
  showingFrom:  number
  showingTo:    number
  totalCount:   number
  label:        string
}

export default function Pagination({
  currentPage, totalPages, onPrevious, onNext,
  showingFrom, showingTo, totalCount, label,
}: Props) {
  const atStart = currentPage === 0
  const atEnd   = currentPage >= totalPages - 1

  const btnBase = 'text-xs font-semibold px-3.5 py-1.5 rounded-lg border transition-all duration-150'
  const btnActive = `${btnBase} border-gold-400/40 text-gold-400 hover:bg-gold-400/10 hover:border-gold-400/70`
  const btnDisabled = `${btnBase} border-white/10 text-white/20 cursor-not-allowed`

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 pb-1 mt-1 border-t border-white/5 px-4">
      <p className="text-[11px] text-white/30">
        Showing <span className="text-white/50 font-semibold">{showingFrom}–{showingTo}</span> of{' '}
        <span className="text-white/50 font-semibold">{totalCount}</span> {label}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          disabled={atStart}
          className={atStart ? btnDisabled : btnActive}
        >
          ← Previous
        </button>
        <span className="text-[11px] text-white/25 px-1">
          {currentPage + 1} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={atEnd}
          className={atEnd ? btnDisabled : btnActive}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
