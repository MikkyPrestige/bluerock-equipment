'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import WatchlistExportButtons from './WatchlistExportButtons'
import MultiMachineQuoteModal from '@/components/MultiMachineQuoteModal'
import excImg       from '@/assests/img/machinery/machine-card-excavator-openpit.jpg'
import bullImg      from '@/assests/img/machinery/machine-card-bulldozer-field.jpg'
import loaderImg    from '@/assests/img/machinery/machine-card-wheel-loader-gravel.jpg'
import graderImg    from '@/assests/img/machinery/machine-card-motor-grader-road.jpg'
import truckImg     from '@/assests/img/machinery/freight-port-crane-containers.jpg'
import compactorImg from '@/assests/img/machinery/yard-operations-aerial-storage.jpg'

const CATEGORY_IMAGES: Record<string, typeof excImg> = {
  'Excavator':         excImg,
  'Bulldozer':         bullImg,
  'Wheel Loader':      loaderImg,
  'Motor Grader':      graderImg,
  'Articulated Truck': truckImg,
  'Compactor':         compactorImg,
}
function catImg(cat?: string | null) {
  return CATEGORY_IMAGES[cat ?? ''] ?? excImg
}

const STATUS: Record<string, { label: string; badge: string; color: string }> = {
  available:    { label: 'Available',    badge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400', color: 'text-emerald-400' },
  pending_hold: { label: 'Pending Hold', badge: 'bg-amber-500/20 border-amber-500/30 text-amber-400',   color: 'text-amber-400' },
  reserved:     { label: 'Reserved',     badge: 'bg-amber-500/20 border-amber-500/30 text-amber-400',   color: 'text-amber-400' },
  sold:         { label: 'Sold',         badge: 'bg-red-500/20 border-red-500/30 text-red-400',          color: 'text-red-400' },
}

export type WatchlistEntry = {
  machine_id: string
  in_comparison: boolean
  arrival_alert_params: Record<string, unknown> | null
  created_at: string
  machines: {
    id: string
    name?: string | null
    brand: string
    model: string
    year: number
    category?: string | null
    price_usd: number
    engine_hours?: number | null
    status: string
    yard_city?: string | null
    yard_country?: string | null
  } | null
}

export default function WatchlistClient({ entries }: { entries: WatchlistEntry[] }) {
  const router = useRouter()

  const [removed,  setRemoved]  = useState<Set<string>>(new Set())
  const [removing, setRemoving] = useState<Set<string>>(new Set())
  const [checked,  setChecked]  = useState<Set<string>>(new Set())
  const [alertOn,  setAlertOn]  = useState<Set<string>>(
    new Set(entries.filter(e => e.arrival_alert_params?.enabled).map(e => e.machine_id))
  )
  const [alertBusy, setAlertBusy] = useState<Set<string>>(new Set())
  const [quoteState, setQuoteState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [quotedCount, setQuotedCount] = useState(0)

  const visible  = entries.filter(e => !removed.has(e.machine_id))
  const available = visible.filter(e => e.machines?.status === 'available')
  const canRequestAll = available.length > 0

  function toggleCheck(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAllAvailable() {
    const ids = available.map(e => e.machine_id)
    setChecked(new Set(ids))
  }

  async function handleRemove(machineId: string) {
    setRemoving(prev => new Set(prev).add(machineId))
    try {
      const res = await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: machineId }),
        credentials: 'include',
      })
      if (res.ok) {
        setRemoved(prev => new Set(prev).add(machineId))
        setChecked(prev => { const n = new Set(prev); n.delete(machineId); return n })
      }
    } finally {
      setRemoving(prev => { const n = new Set(prev); n.delete(machineId); return n })
    }
  }

  async function handleAlertToggle(machineId: string, category?: string | null) {
    setAlertBusy(prev => new Set(prev).add(machineId))
    const enabling = !alertOn.has(machineId)
    try {
      const res = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: machineId,
          arrival_alert_params: enabling ? { enabled: true, category } : null,
        }),
        credentials: 'include',
      })
      if (res.ok) {
        setAlertOn(prev => {
          const n = new Set(prev)
          enabling ? n.add(machineId) : n.delete(machineId)
          return n
        })
      }
    } finally {
      setAlertBusy(prev => { const n = new Set(prev); n.delete(machineId); return n })
    }
  }

  async function handleQuoteRequest(machineIds: string[]) {
    if (machineIds.length === 0 || quoteState === 'submitting') return
    setQuoteState('submitting')
    try {
      const res = await fetch('/api/dashboard/watchlist/quote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_ids: machineIds }),
        credentials: 'include',
      })
      if (res.ok) {
        setQuotedCount(machineIds.length)
        setQuoteState('done')
        setChecked(new Set())
      } else {
        setQuoteState('error')
      }
    } catch {
      setQuoteState('error')
    }
  }

  /* ── Empty state ── */
  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-5">
          <svg className="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </div>
        <p className="text-white/40 text-sm font-medium mb-1">Your watchlist is empty</p>
        <p className="text-white/20 text-xs mb-6 max-w-xs">Save machines from the inventory to track pricing, availability, and request quotes.</p>
        <Link
          href="/machines"
          className="bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold text-sm px-6 py-2.5 rounded-xl transition-colors duration-150"
        >
          Browse Inventory
        </Link>
      </div>
    )
  }

  const selectedIds = [...checked].filter(id => !removed.has(id))
  const hasChecked  = selectedIds.length > 0

  return (
    <>
      {/* ── TOP ACTION BAR ── */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <WatchlistExportButtons count={visible.length} />
          {canRequestAll && (
            <button
              onClick={selectAllAvailable}
              disabled={quoteState === 'submitting'}
              className="text-xs font-semibold text-gold-400 hover:text-gold-300 border border-gold-400/30 hover:border-gold-400/60 px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-40"
            >
              Select All Available ({available.length})
            </button>
          )}
        </div>
        <p className="text-xs text-white/25">
          {visible.length} machine{visible.length !== 1 ? 's' : ''} saved
        </p>
      </div>

      {/* ── MACHINE LIST ── */}
      <div className="flex flex-col gap-3 pb-28">
        {visible.map(entry => {
          const m = entry.machines
          if (!m) return null

          const id          = entry.machine_id
          const name        = m.name || `${m.brand} ${m.model}`
          const st          = STATUS[m.status] ?? { label: m.status, badge: 'bg-white/8 border-white/12 text-white/30', color: 'text-white/30' }
          const isChecked   = checked.has(id)
          const isRemoving  = removing.has(id)
          const needsAlert  = m.status === 'sold' || m.status === 'pending_hold' || m.status === 'reserved'
          const alertActive = alertOn.has(id)
          const alertLoading= alertBusy.has(id)

          return (
            <div
              key={id}
              className={`bg-navy-900 border rounded-2xl p-4 sm:p-5 transition-all duration-150 ${
                isChecked ? 'border-gold-400/40 bg-navy-900' : 'border-white/8 hover:border-white/15'
              }`}
            >
              <div className="flex items-start gap-4">

                {/* Checkbox */}
                <div className="flex-shrink-0 pt-1">
                  <button
                    onClick={() => toggleCheck(id)}
                    className="relative w-5 h-5 rounded-md border-2 transition-all duration-150 flex items-center justify-center"
                    style={{ borderColor: isChecked ? '#d4a843' : 'rgba(255,255,255,0.2)', background: isChecked ? '#d4a843' : 'transparent' }}
                    aria-label={isChecked ? 'Deselect' : 'Select for quote'}
                  >
                    {isChecked && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#0a1628" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Category thumbnail */}
                <div className="w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 relative bg-navy-800">
                  <Image
                    src={catImg(m.category)}
                    alt={m.category ?? ''}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <Link
                        href={`/machines/${m.id}`}
                        className="font-display font-bold text-white hover:text-gold-300 transition-colors duration-150 leading-tight block truncate"
                      >
                        {name}
                      </Link>
                      <p className="text-white/35 text-xs mt-0.5">
                        {m.year} · {m.category}
                        {m.engine_hours ? ` · ${Number(m.engine_hours).toLocaleString()} hrs` : ''}
                      </p>
                      {(m.yard_city || m.yard_country) && (
                        <p className="text-white/25 text-xs mt-0.5">
                          📍 {[m.yard_city, m.yard_country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-display text-lg font-bold text-gold-400 leading-tight">
                        ${Number(m.price_usd).toLocaleString()}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block mt-1 uppercase tracking-wide ${st.badge}`}>
                        {st.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    {needsAlert && (
                      <button
                        onClick={() => handleAlertToggle(id, m.category)}
                        disabled={alertLoading}
                        className={`text-xs font-semibold transition-colors duration-150 ${
                          alertActive
                            ? 'text-gold-400'
                            : 'text-white/35 hover:text-white/65'
                        } disabled:opacity-40`}
                      >
                        {alertLoading
                          ? '…'
                          : alertActive
                            ? '🔔 Alert on'
                            : '🔕 Notify me when similar arrives'}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(id)}
                      disabled={isRemoving}
                      className="text-xs text-white/25 hover:text-red-400 transition-colors duration-150 ml-auto disabled:opacity-40"
                    >
                      {isRemoving ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── STICKY SELECTION BAR ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-200 ${
          hasChecked ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-navy-900/95 backdrop-blur-md border-t border-gold-400/20 px-4 sm:px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-white/70">
              <span className="font-bold text-gold-400">{selectedIds.length}</span>{' '}
              machine{selectedIds.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setChecked(new Set())}
                className="text-xs text-white/35 hover:text-white/65 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => handleQuoteRequest(selectedIds)}
                disabled={quoteState === 'submitting'}
                className="bg-gold-400 hover:bg-gold-300 disabled:opacity-60 text-navy-950 font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-150 shadow-lg shadow-gold-400/20"
              >
                {quoteState === 'submitting' ? 'Submitting…' : 'Request Quote for Selected'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONFIRMATION MODAL ── */}
      {(quoteState === 'done' || quoteState === 'error') && (
        <MultiMachineQuoteModal
          state={quoteState}
          count={quotedCount}
          onClose={() => { setQuoteState('idle'); router.refresh() }}
        />
      )}
    </>
  )
}
