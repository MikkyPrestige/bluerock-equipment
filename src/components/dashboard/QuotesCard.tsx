'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Pagination from '@/components/ui/Pagination'
import { createClient } from '@/lib/supabase/client'

export type QuoteRow = {
  id: string
  machine_id: string
  status: string
  total_amount: number | null
  lock_expires_at: string | null
  created_at: string
  port_of_discharge: string | null
  machines: { id: string; name?: string | null; brand: string; model: string; price_usd: number } | null
}

interface Props {
  activeQuotes:  QuoteRow[]
  expiredQuotes: QuoteRow[]
  pastQuotes:    QuoteRow[]
  preferredPort: string | null
  totalActive:   number
  totalExpired:  number
  totalPast:     number
}

const PAGE_SIZE = 10

const QUOTE_STATUS: Record<string, { label: string; badge: string }> = {
  pending_quote:      { label: 'Awaiting Quote',     badge: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
  invoice_generated:  { label: 'Proforma Ready',      badge: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  revision_requested: { label: 'Revision Requested',  badge: 'bg-rose-500/20 border-rose-500/30 text-rose-400' },
  buyer_accepted:     { label: 'Accepted',            badge: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' },
  payment_pending:    { label: 'Payment Pending',     badge: 'bg-orange-500/20 border-orange-500/30 text-orange-400' },
  payment_confirmed:  { label: 'Payment Confirmed',   badge: 'bg-teal-500/20 border-teal-500/30 text-teal-400' },
  sold:               { label: 'Sold',                badge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
  cancelled:          { label: 'Cancelled',           badge: 'bg-white/8 border-white/12 text-white/30' },
}

const REMOVABLE_STATUSES   = new Set(['pending_quote', 'invoice_generated', 'revision_requested', 'buyer_accepted'])
const CONTACT_ADMIN_STATUS = new Set(['payment_pending', 'payment_confirmed'])

function lockColor(h: number) {
  if (h <= 6)  return 'text-red-400'
  if (h <= 12) return 'text-orange-400'
  if (h <= 24) return 'text-amber-400'
  return 'text-emerald-400'
}

function getName(q: QuoteRow): string {
  const m = q.machines
  if (!m) return 'Unknown Machine'
  return m.name || `${m.brand} ${m.model}`
}

function getPrice(q: QuoteRow): string {
  if (q.total_amount)        return `$${Number(q.total_amount).toLocaleString()}`
  if (q.machines?.price_usd) return `$${Number(q.machines.price_usd).toLocaleString()} + freight`
  return '—'
}

const supabase = createClient()

export default function QuotesCard({
  activeQuotes, expiredQuotes, pastQuotes,
  preferredPort,
  totalActive, totalExpired, totalPast,
}: Props) {
  const router = useRouter()

  /* ── Row state (server-seeded, updated on page change) ── */
  const [activeRows,   setActiveRows]   = useState<QuoteRow[]>(activeQuotes)
  const [expiredRows,  setExpiredRows]  = useState<QuoteRow[]>(expiredQuotes)
  const [pastRows,     setPastRows]     = useState<QuoteRow[]>(pastQuotes)

  /* ── Page state ── */
  const [activePage,   setActivePage]   = useState(0)
  const [expiredPage,  setExpiredPage]  = useState(0)
  const [pastPage,     setPastPage]     = useState(0)

  /* ── Totals (adjusted optimistically after cancel) ── */
  const [activeTotal,  setActiveTotal]  = useState(totalActive)
  const [expiredTotal]                  = useState(totalExpired)
  const [pastTotal]                     = useState(totalPast)

  /* ── Loading state ── */
  const [activeLoading,  setActiveLoading]  = useState(false)
  const [expiredLoading, setExpiredLoading] = useState(false)
  const [pastLoading,    setPastLoading]    = useState(false)

  /* ── Cancel modal ── */
  const [cancelModal, setCancelModal] = useState<{
    id: string; name: string; state: 'confirm' | 'cancelling' | 'error'
  } | null>(null)

  /* ── Request-Again (expired section) ── */
  const [requestingIds, setRequestingIds] = useState<Set<string>>(new Set())
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({})

  /* ── Collapsed expired section ── */
  const [expiredOpen, setExpiredOpen] = useState(false)

  const now = Date.now()

  /* ── Derived ── */
  const activeTotalPages  = Math.max(1, Math.ceil(activeTotal  / PAGE_SIZE))
  const expiredTotalPages = Math.max(1, Math.ceil(expiredTotal / PAGE_SIZE))
  const pastTotalPages    = Math.max(1, Math.ceil(pastTotal    / PAGE_SIZE))

  /* ── Page fetchers ── */
  async function fetchActivePage(page: number) {
    setActiveLoading(true)
    try {
      const nowISO = new Date().toISOString()
      const { data } = await supabase
        .from('quotes')
        .select('id, machine_id, status, total_amount, lock_expires_at, created_at, port_of_discharge, machines(id, name, brand, model, price_usd)')
        .or(`status.in.(invoice_generated,revision_requested,buyer_accepted,payment_pending,payment_confirmed),and(status.eq.pending_quote,lock_expires_at.gt.${nowISO})`)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (data) { setActiveRows(data as unknown as QuoteRow[]); setActivePage(page) }
    } finally { setActiveLoading(false) }
  }

  async function fetchExpiredPage(page: number) {
    setExpiredLoading(true)
    try {
      const nowISO         = new Date().toISOString()
      const thirtyDaysAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('quotes')
        .select('id, machine_id, status, total_amount, lock_expires_at, created_at, port_of_discharge, machines(id, name, brand, model, price_usd)')
        .eq('status', 'pending_quote')
        .lt('lock_expires_at', nowISO)
        .gt('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (data) { setExpiredRows(data as unknown as QuoteRow[]); setExpiredPage(page) }
    } finally { setExpiredLoading(false) }
  }

  async function fetchPastPage(page: number) {
    setPastLoading(true)
    try {
      const { data } = await supabase
        .from('quotes')
        .select('id, machine_id, status, total_amount, lock_expires_at, created_at, port_of_discharge, machines(id, name, brand, model, price_usd)')
        .in('status', ['sold', 'cancelled'])
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (data) { setPastRows(data as unknown as QuoteRow[]); setPastPage(page) }
    } finally { setPastLoading(false) }
  }

  /* ── Cancel (Remove) active quote ── */
  async function handleConfirmCancel() {
    if (!cancelModal) return
    setCancelModal(p => p ? { ...p, state: 'cancelling' } : null)
    try {
      const res = await fetch(`/api/quotes/${cancelModal.id}`, {
        method: 'PATCH',
        credentials: 'include',
      })
      if (res.ok) {
        setActiveRows(prev => prev.filter(q => q.id !== cancelModal.id))
        setActiveTotal(prev => Math.max(0, prev - 1))
        setCancelModal(null)
      } else {
        setCancelModal(p => p ? { ...p, state: 'error' } : null)
      }
    } catch {
      setCancelModal(p => p ? { ...p, state: 'error' } : null)
    }
  }

  /* ── Request Again (expired) ── */
  async function handleRequestAgain(q: QuoteRow) {
    if (requestingIds.has(q.id)) return
    const port = preferredPort || q.port_of_discharge || ''
    if (!port) {
      setRequestErrors(prev => ({ ...prev, [q.id]: 'No port of discharge on file. Please update your profile.' }))
      return
    }
    setRequestingIds(prev => new Set(prev).add(q.id))
    setRequestErrors(prev => { const n = { ...prev }; delete n[q.id]; return n })
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: q.machine_id, port_of_discharge: port }),
        credentials: 'include',
      })
      if (res.status === 201) {
        const { quote } = await res.json()
        router.push(`/dashboard/quotes/${quote.id}`)
      } else {
        setRequestErrors(prev => ({
          ...prev,
          [q.id]: res.status === 409
            ? 'This machine is no longer available. Save it to your watchlist to be notified when a similar machine arrives.'
            : 'Something went wrong. Please try again.',
        }))
      }
    } catch {
      setRequestErrors(prev => ({ ...prev, [q.id]: 'Something went wrong. Please try again.' }))
    } finally {
      setRequestingIds(prev => { const n = new Set(prev); n.delete(q.id); return n })
    }
  }

  /* ── Remove (expired) ── */
  const [removingIds,    setRemovingIds]    = useState<Set<string>>(new Set())
  const [removedExpired, setRemovedExpired] = useState<Set<string>>(new Set())

  async function handleRemoveExpired(quoteId: string) {
    setRemovingIds(prev => new Set(prev).add(quoteId))
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { method: 'PATCH', credentials: 'include' })
      if (res.ok) setRemovedExpired(prev => new Set(prev).add(quoteId))
    } finally {
      setRemovingIds(prev => { const n = new Set(prev); n.delete(quoteId); return n })
    }
  }

  const visibleExpired = expiredRows.filter(q => !removedExpired.has(q.id))

  const hasAny = activeRows.length > 0 || visibleExpired.length > 0 || pastRows.length > 0

  if (!hasAny && activeTotal === 0 && expiredTotal === 0 && pastTotal === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-white/25 text-sm mb-3">No quotes yet.</p>
        <Link href="/machines" className="text-gold-400 text-sm font-semibold hover:text-gold-300 transition-colors">
          Browse inventory to request your first quote →
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col divide-y divide-white/5">

        {/* ── ACTIVE QUOTES ── */}
        {(activeRows.length > 0 || activeTotal > 0) && (
          <div className={`flex flex-col ${activeLoading ? 'opacity-60 pointer-events-none' : ''}`}>
            <div className="p-4 flex flex-col gap-3">
              {activeRows.map(q => {
                const lockDate  = q.lock_expires_at ? new Date(q.lock_expires_at) : null
                const hoursLeft = lockDate ? Math.ceil((lockDate.getTime() - now) / 3600000) : null
                const lockActive = hoursLeft !== null && hoursLeft > 0
                const status = QUOTE_STATUS[q.status] ?? { label: q.status, badge: 'bg-white/8 border-white/12 text-white/40' }
                const canRemove    = REMOVABLE_STATUSES.has(q.status)
                const contactAdmin = CONTACT_ADMIN_STATUS.has(q.status)

                return (
                  <div key={q.id} className="bg-navy-950/50 border border-white/6 rounded-xl p-4 hover:border-white/12 transition-colors duration-150">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${status.badge}`}>
                            {status.label}
                          </span>
                          {lockActive && (
                            <span className={`text-[10px] font-semibold ${lockColor(hoursLeft!)}`}>
                              ⏱ {hoursLeft}h lock remaining
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-bold text-white text-base leading-tight truncate">
                          {getName(q)}
                        </h3>
                        <p className="text-white/30 text-xs mt-0.5">Port: {q.port_of_discharge || '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-display text-lg font-bold text-gold-400 leading-tight">{getPrice(q)}</p>
                        <p className="text-white/20 text-[10px] mt-0.5">
                          {new Date(q.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {canRemove && (
                          <button
                            onClick={() => setCancelModal({ id: q.id, name: getName(q), state: 'confirm' })}
                            className="text-xs font-semibold border border-red-400/20 text-red-400/60 hover:text-red-300 hover:border-red-400/40 px-3 py-1.5 rounded-lg transition-all duration-150"
                          >
                            Remove
                          </button>
                        )}
                        {contactAdmin && (
                          <span className="text-[10px] text-white/25 italic">Contact admin to cancel</span>
                        )}
                      </div>
                      <Link
                        href={`/dashboard/quotes/${q.id}`}
                        className="text-xs font-semibold text-gold-400 hover:text-gold-300 border border-gold-400/25 hover:border-gold-400/50 px-3.5 py-1.5 rounded-lg transition-all duration-150"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>

            {activeTotal > PAGE_SIZE && (
              <Pagination
                currentPage={activePage}
                totalPages={activeTotalPages}
                onPrevious={() => fetchActivePage(activePage - 1)}
                onNext={() => fetchActivePage(activePage + 1)}
                showingFrom={activePage * PAGE_SIZE + 1}
                showingTo={Math.min((activePage + 1) * PAGE_SIZE, activeTotal)}
                totalCount={activeTotal}
                label="quotes"
              />
            )}
          </div>
        )}

        {/* ── EXPIRED QUOTES (collapsible) ── */}
        {(visibleExpired.length > 0 || expiredTotal > 0) && (
          <div className={expiredLoading ? 'opacity-60 pointer-events-none' : ''}>
            <button
              onClick={() => setExpiredOpen(p => !p)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/2 transition-colors duration-150"
            >
              <span className="text-xs font-bold text-white/30 uppercase tracking-widest">
                Expired ({expiredTotal})
              </span>
              <svg
                className={`w-4 h-4 text-white/20 transition-transform duration-200 ${expiredOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expiredOpen && (
              <>
                <div className="px-4 pb-3 flex flex-col gap-2">
                  {visibleExpired.map(q => {
                    const isRemoving   = removingIds.has(q.id)
                    const isRequesting = requestingIds.has(q.id)
                    const error        = requestErrors[q.id]

                    return (
                      <div key={q.id} className="bg-navy-950/30 border border-white/5 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-display font-bold text-white/50 text-sm leading-tight truncate">
                              {getName(q)}
                            </h3>
                            <p className="text-white/25 text-xs mt-0.5">
                              {new Date(q.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                              {q.port_of_discharge ? ` · Port: ${q.port_of_discharge}` : ''}
                            </p>
                          </div>
                          <p className="font-display text-sm font-bold text-white/40 flex-shrink-0 whitespace-nowrap">
                            {getPrice(q)}
                          </p>
                        </div>

                        {error && (
                          <p className="mt-2.5 text-xs text-amber-400/80 bg-amber-500/8 border border-amber-500/15 rounded-lg px-3 py-2 leading-relaxed">
                            {error}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => handleRequestAgain(q)}
                            disabled={isRequesting || isRemoving}
                            className="text-xs font-semibold border border-gold-400/35 text-gold-400 hover:bg-gold-400/10 hover:border-gold-400/65 px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-40"
                          >
                            {isRequesting ? 'Requesting…' : 'Request Again'}
                          </button>
                          <button
                            onClick={() => handleRemoveExpired(q.id)}
                            disabled={isRemoving || isRequesting}
                            className="text-xs font-semibold border border-red-400/20 text-red-400/60 hover:text-red-300 hover:border-red-400/40 px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-40"
                          >
                            {isRemoving ? 'Removing…' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {expiredTotal > PAGE_SIZE && (
                  <Pagination
                    currentPage={expiredPage}
                    totalPages={expiredTotalPages}
                    onPrevious={() => fetchExpiredPage(expiredPage - 1)}
                    onNext={() => fetchExpiredPage(expiredPage + 1)}
                    showingFrom={expiredPage * PAGE_SIZE + 1}
                    showingTo={Math.min((expiredPage + 1) * PAGE_SIZE, expiredTotal)}
                    totalCount={expiredTotal}
                    label="expired quotes"
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* ── PAST TRANSACTIONS ── */}
        {(pastRows.length > 0 || pastTotal > 0) && (
          <div className={pastLoading ? 'opacity-60 pointer-events-none' : ''}>
            <div className="px-5 py-3.5">
              <span className="text-xs font-bold text-white/30 uppercase tracking-widest">Past Transactions</span>
            </div>
            <div className="px-4 pb-3 flex flex-col gap-2">
              {pastRows.map(q => {
                const status = QUOTE_STATUS[q.status] ?? { label: q.status, badge: 'bg-white/8 border-white/12 text-white/40' }
                return (
                  <div key={q.id} className="bg-navy-950/30 border border-white/5 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${status.badge}`}>
                          {status.label}
                        </span>
                        <h3 className="font-display font-bold text-white/55 text-sm leading-tight truncate mt-1.5">
                          {getName(q)}
                        </h3>
                        <p className="text-white/25 text-xs mt-0.5">
                          {new Date(q.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                        </p>
                      </div>
                      <p className="font-display text-sm font-bold text-white/40 flex-shrink-0 whitespace-nowrap">
                        {getPrice(q)}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Link
                        href={`/dashboard/quotes/${q.id}`}
                        className="text-xs font-semibold text-white/30 hover:text-white/60 border border-white/8 hover:border-white/20 px-3.5 py-1.5 rounded-lg transition-all duration-150"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>

            {pastTotal > PAGE_SIZE && (
              <Pagination
                currentPage={pastPage}
                totalPages={pastTotalPages}
                onPrevious={() => fetchPastPage(pastPage - 1)}
                onNext={() => fetchPastPage(pastPage + 1)}
                showingFrom={pastPage * PAGE_SIZE + 1}
                showingTo={Math.min((pastPage + 1) * PAGE_SIZE, pastTotal)}
                totalCount={pastTotal}
                label="transactions"
              />
            )}
          </div>
        )}
      </div>

      {/* ── CANCEL CONFIRMATION MODAL ── */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/8 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            {cancelModal.state === 'error' ? (
              <>
                <h3 className="font-display text-lg font-bold text-white mb-2">Cancellation Failed</h3>
                <p className="text-white/55 text-sm mb-5">Something went wrong. Please try again or contact us.</p>
                <button
                  onClick={() => setCancelModal(null)}
                  className="w-full bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-bold text-white mb-2">Cancel this quote?</h3>
                <p className="text-white font-semibold text-sm mb-1">{cancelModal.name}</p>
                <p className="text-white/40 text-sm mb-5 leading-relaxed">
                  This will cancel your quote and release the 48-hour price lock.
                </p>
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={handleConfirmCancel}
                    disabled={cancelModal.state === 'cancelling'}
                    className="w-full bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    {cancelModal.state === 'cancelling' ? 'Cancelling…' : 'Yes, Cancel Quote'}
                  </button>
                  <button
                    onClick={() => setCancelModal(null)}
                    disabled={cancelModal.state === 'cancelling'}
                    className="w-full bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 font-bold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    Keep Quote
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
