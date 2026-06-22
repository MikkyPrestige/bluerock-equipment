'use client'

interface Props {
  state: 'done' | 'error'
  count: number
  onClose: () => void
  browseHref?: string
}

export default function MultiMachineQuoteModal({ state, count, onClose, browseHref }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-navy-900 border border-white/8 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        {state === 'done' ? (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-bold text-white mb-2">Quote Request Submitted</h3>
            <p className="text-white/55 text-sm leading-relaxed mb-1">
              We&apos;ve received your request for{' '}
              <span className="text-white font-semibold">
                {count} machine{count !== 1 ? 's' : ''}
              </span>.
            </p>
            <p className="text-white/40 text-sm leading-relaxed mb-5">
              Our team will prepare individual proforma invoices within 24 hours. You&apos;ll receive a
              notification in your dashboard for each quote.
            </p>
            <p className="text-xs text-white/25 mb-5 bg-navy-800 rounded-xl px-4 py-3 leading-relaxed">
              Questions? Contact us directly at{' '}
              <a href="mailto:meekyberry6@gmail.com" className="text-gold-400 hover:text-gold-300 transition-colors">
                meekyberry6@gmail.com
              </a>
            </p>
          </>
        ) : (
          <>
            <h3 className="font-display text-lg font-bold text-white mb-2">Submission Failed</h3>
            <p className="text-white/55 text-sm mb-5">
              Something went wrong. Please try again or contact us directly.
            </p>
          </>
        )}

        <div className={browseHref && state === 'done' ? 'flex flex-col gap-2.5' : ''}>
          <button
            onClick={onClose}
            className="w-full bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold py-2.5 rounded-xl text-sm transition-colors duration-150"
          >
            {state === 'done' ? (browseHref ? 'Back to Comparison' : 'Done') : 'Close'}
          </button>
          {browseHref && state === 'done' && (
            <a
              href={browseHref}
              className="w-full block text-center border border-white/15 text-white/60 hover:text-white hover:border-white/30 font-semibold py-2.5 rounded-xl text-sm transition-all duration-150"
            >
              Browse More Machines
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
