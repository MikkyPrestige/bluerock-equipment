'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import MultiMachineQuoteModal from './MultiMachineQuoteModal'
import ComparisonExportButtons from './ComparisonExportButtons'
import excImg       from '@/assests/img/machinery/machine-card-excavator-openpit.jpg'
import bullImg      from '@/assests/img/machinery/machine-card-bulldozer-field.jpg'
import loaderImg    from '@/assests/img/machinery/machine-card-wheel-loader-gravel.jpg'
import graderImg    from '@/assests/img/machinery/machine-card-motor-grader-road.jpg'
import truckImg     from '@/assests/img/machinery/freight-port-crane-containers.jpg'
import compactorImg from '@/assests/img/machinery/yard-operations-aerial-storage.jpg'
import logo         from '@/assests/img/logo.jpg'

// ── Types ──

export type ComparisonMachine = {
  id: string
  brand: string
  model: string
  year: number
  category?: string | null
  price_usd?: number | null
  engine_hours?: number | null
  operating_weight_kg?: number | null
  engine_configuration?: string | null
  hours_since_service?: number | null
  serial_number?: string | null
  yard_city?: string | null
  yard_country?: string | null
  wear_analysis?: Record<string, string> | null
  status?: string | null
  [key: string]: unknown
}

interface Props {
  machines: ComparisonMachine[]
  alreadySaved: string[]
}

// ── Category images ──
const CATEGORY_IMAGES: Record<string, typeof excImg> = {
  'Excavator':         excImg,
  'Bulldozer':         bullImg,
  'Wheel Loader':      loaderImg,
  'Motor Grader':      graderImg,
  'Articulated Truck': truckImg,
  'Compactor':         compactorImg,
}
function categoryImg(cat: unknown) {
  return CATEGORY_IMAGES[String(cat)] ?? excImg
}

// ── Wear helpers ──
const wearRank: Record<string, number> = { excellent: 0, good: 1, wear_detected: 2, needs_repair: 3 }
const wearLabel: Record<string, string> = {
  excellent: 'Excellent', good: 'Good', wear_detected: 'Wear Detected', needs_repair: 'Needs Repair',
}
const wearColors: Record<string, string> = {
  excellent:    'text-emerald-400',
  good:         'text-blue-400',
  wear_detected:'text-amber-400',
  needs_repair: 'text-red-400',
}

function worstWearKey(wear: Record<string, string>): string {
  const vals = Object.values(wear ?? {})
  if (!vals.length) return ''
  return vals.reduce((a, b) => (wearRank[b] ?? 0) > (wearRank[a] ?? 0) ? b : a)
}
function worstWearLabel(wear: Record<string, string>): string {
  const key = worstWearKey(wear)
  return key ? (wearLabel[key] ?? key) : '—'
}

// ── Row definitions ──
type RowType = 'price' | 'hours' | 'wear' | 'default'
interface Row { key: string; label: string; type?: RowType; fmt?: (v: unknown) => string }

const ROWS: Row[] = [
  { key: 'category',             label: 'Category' },
  { key: 'year',                 label: 'Year' },
  { key: 'engine_hours',         label: 'Engine Hours',     type: 'hours',
    fmt: v => v != null ? `${Number(v).toLocaleString()} hrs` : '—' },
  { key: 'price_usd',            label: 'Asking Price',     type: 'price',
    fmt: v => v != null ? `$${Number(v).toLocaleString()}` : '—' },
  { key: 'operating_weight_kg',  label: 'Operating Weight',
    fmt: v => v != null ? `${Number(v).toLocaleString()} kg` : '—' },
  { key: 'engine_configuration', label: 'Engine Config' },
  { key: 'hours_since_service',  label: 'Hrs Since Service',
    fmt: v => v != null ? `${Number(v).toLocaleString()} hrs` : '—' },
  { key: 'serial_number',        label: 'Serial Number' },
  { key: 'yard_location',        label: 'Yard Location' },
  { key: 'wear_summary',         label: 'Worst Wear',       type: 'wear' },
]

function getCellValue(m: ComparisonMachine, row: Row): string {
  if (row.key === 'yard_location') return `${m.yard_city ?? ''}, ${m.yard_country ?? ''}`
  if (row.type === 'wear') return worstWearLabel(m.wear_analysis ?? {})
  if (row.fmt) return row.fmt(m[row.key])
  return m[row.key] != null ? String(m[row.key]) : '—'
}

function getCellClass(m: ComparisonMachine, row: Row): string {
  if (row.type === 'price') return 'text-gold-400 font-bold text-base'
  if (row.type === 'hours') return 'text-white font-semibold'
  if (row.type === 'wear') {
    const key = worstWearKey(m.wear_analysis ?? {})
    return `font-semibold ${wearColors[key] ?? 'text-white/60'}`
  }
  return 'text-white/70'
}

function getRowBg(row: Row): string {
  if (row.type === 'price') return 'bg-gold-400/4'
  if (row.type === 'hours') return 'bg-white/2'
  return ''
}

// ── Mini checkbox SVG ──
function Check() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#0a1628" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function ComparisonClient({ machines, alreadySaved }: Props) {
  const [removed,  setRemoved]  = useState<Set<string>>(new Set())
  const [removing, setRemoving] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saved,    setSaved]    = useState<Set<string>>(new Set(alreadySaved))
  const [saving,   setSaving]   = useState<Set<string>>(new Set())
  const [quoteState,  setQuoteState]  = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [quotedCount, setQuotedCount] = useState(0)

  const visible     = machines.filter(m => !removed.has(m.id))
  const selectedIds = [...selected].filter(id => !removed.has(id))
  const hasSelected = selectedIds.length > 0

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleRemove(machineId: string) {
    setRemoving(prev => new Set(prev).add(machineId))
    try {
      const res = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: machineId, in_comparison: false }),
        credentials: 'include',
      })
      if (res.ok) {
        setRemoved(prev => new Set(prev).add(machineId))
        setSelected(prev => { const n = new Set(prev); n.delete(machineId); return n })
      }
    } finally {
      setRemoving(prev => { const n = new Set(prev); n.delete(machineId); return n })
    }
  }

  async function handleSave(machineId: string) {
    if (saved.has(machineId) || saving.has(machineId)) return
    setSaving(prev => new Set(prev).add(machineId))
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: machineId }),
        credentials: 'include',
      })
      if (res.ok || res.status === 201) {
        setSaved(prev => new Set(prev).add(machineId))
      }
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(machineId); return n })
    }
  }

  async function handleSaveSelected() {
    await Promise.all(selectedIds.map(id => handleSave(id)))
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
        setSelected(new Set())
      } else {
        setQuoteState('error')
      }
    } catch {
      setQuoteState('error')
    }
  }

  return (
    <>
      {/* ── TITLE BAR ── */}
      <div className="bg-navy-900 border-b border-white/8 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-1.5">Side-by-Side Analysis</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Comparison Workbench</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ComparisonExportButtons machineIds={visible.map(m => m.id)} count={visible.length} />
            {visible.length > 0 && (
              <button
                onClick={() => handleQuoteRequest(visible.map(m => m.id))}
                disabled={quoteState === 'submitting'}
                className="bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 font-bold text-xs sm:text-sm px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-all duration-150 shadow-md shadow-gold-400/20 whitespace-nowrap"
              >
                {quoteState === 'submitting' ? 'Submitting…' : 'Request Quote for All'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* Empty state */}
        {visible.length === 0 ? (
          <div className="text-center py-28">
            <div className="text-white/10 text-7xl mb-6">⚖</div>
            <p className="text-white/50 text-base mb-2">Your comparison tray is empty.</p>
            <p className="text-white/30 text-sm mb-8 max-w-sm mx-auto">
              Browse inventory and click <span className="text-white/50 font-semibold">+ Compare</span> on any machine card to add it here.
            </p>
            <Link
              href="/machines"
              className="bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-7 py-3 rounded text-sm transition-colors duration-150 shadow-lg shadow-black/30"
            >
              Browse Inventory
            </Link>
          </div>
        ) : (
          <>
            {/* ── MOBILE STACKED CARDS (< md) ── */}
            <div className="md:hidden flex flex-col gap-5">
              {visible.map(m => {
                const isSelected = selected.has(m.id)
                const isSaved    = saved.has(m.id)
                const isSaving   = saving.has(m.id)
                const isRemoving = removing.has(m.id)
                return (
                  <div
                    key={m.id}
                    className={`bg-navy-900 border rounded-xl overflow-hidden transition-all duration-150 ${
                      isSelected ? 'border-gold-400/40' : 'border-white/8'
                    }`}
                  >
                    {/* Photo header */}
                    <div className="relative h-36 overflow-hidden">
                      <Image src={categoryImg(m.category)} alt={String(m.category ?? '')} fill className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-navy-950/40 to-navy-950/95" />

                      {/* Checkbox overlay */}
                      <div className="absolute top-3 right-3">
                        <button
                          onClick={() => toggleSelect(m.id)}
                          className="w-6 h-6 rounded-md border-2 flex items-center justify-center backdrop-blur-sm transition-all duration-150"
                          style={{
                            borderColor: isSelected ? '#d4a843' : 'rgba(255,255,255,0.35)',
                            background:  isSelected ? '#d4a843' : 'rgba(10,22,40,0.65)',
                          }}
                          aria-label={isSelected ? 'Deselect' : 'Select for quote'}
                        >
                          {isSelected && <Check />}
                        </button>
                      </div>

                      <div className="absolute bottom-0 inset-x-0 p-4">
                        <Link href={`/machines/${m.id}`}>
                          <h3 className="font-display font-bold text-white text-lg leading-tight">
                            {m.brand} {m.model}
                          </h3>
                          <p className="text-white/40 text-xs mt-0.5">{String(m.year)} · {String(m.category ?? '')}</p>
                        </Link>
                      </div>
                    </div>

                    {/* Spec rows */}
                    {ROWS.map(row => {
                      const val = getCellValue(m, row)
                      const cls = getCellClass(m, row)
                      return (
                        <div key={row.key} className={`flex items-center justify-between px-4 py-3 border-t border-white/6 ${getRowBg(row)}`}>
                          <p className="text-white/35 text-xs uppercase tracking-wider flex-shrink-0 w-36">{row.label}</p>
                          <p className={`text-sm text-right ml-2 ${cls}`}>{val}</p>
                        </div>
                      )
                    })}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 px-4 py-3 border-t border-white/8">
                      <button
                        onClick={() => handleSave(m.id)}
                        disabled={isSaved || isSaving}
                        className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-all duration-150 ${
                          isSaved
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default'
                            : 'border-gold-400/35 text-gold-400 hover:bg-gold-400/10 hover:border-gold-400/65 disabled:opacity-40'
                        }`}
                      >
                        {isSaved ? '♥ Saved ✓' : isSaving ? 'Saving…' : '♡ Save to Watchlist'}
                      </button>
                      <button
                        onClick={() => handleRemove(m.id)}
                        disabled={isRemoving}
                        className="text-xs text-white/25 hover:text-red-400 border border-white/10 hover:border-red-400/30 px-3 py-2 rounded-lg transition-all duration-150 disabled:opacity-40"
                      >
                        {isRemoving ? '…' : 'Remove ×'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── DESKTOP TABLE (md+) ── */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-sm border-collapse">

                {/* Machine column headers */}
                <thead>
                  <tr className="border-b border-white/10">

                    {/* Sticky spec-label cell */}
                    <th className="sticky left-0 z-20 bg-navy-800 px-5 py-5 text-left align-bottom w-44 border-r border-white/8">
                      <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Specification</span>
                    </th>

                    {visible.map(m => {
                      const isSelected = selected.has(m.id)
                      const isSaved    = saved.has(m.id)
                      const isSaving   = saving.has(m.id)
                      const isRemoving = removing.has(m.id)
                      return (
                        <th key={m.id} className="px-5 py-4 text-left min-w-[240px] align-top bg-navy-900">

                          {/* Checkbox row */}
                          <div className="flex items-center gap-2 mb-3">
                            <button
                              onClick={() => toggleSelect(m.id)}
                              className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150"
                              style={{
                                borderColor: isSelected ? '#d4a843' : 'rgba(255,255,255,0.2)',
                                background:  isSelected ? '#d4a843' : 'transparent',
                              }}
                              aria-label={isSelected ? 'Deselect' : 'Select for quote'}
                            >
                              {isSelected && <Check />}
                            </button>
                            <span className="text-[10px] font-medium text-white/30 leading-none">
                              {isSelected ? 'Selected' : 'Select'}
                            </span>
                          </div>

                          {/* Thumbnail */}
                          <div className="relative h-20 w-full rounded-lg overflow-hidden mb-3 group">
                            <Image
                              src={categoryImg(m.category)}
                              alt={String(m.category ?? '')}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-navy-950/40" />
                          </div>

                          {/* Machine name */}
                          <Link href={`/machines/${m.id}`} className="group block">
                            <p className="font-display font-bold text-white text-base leading-tight group-hover:text-gold-300 transition-colors duration-150">
                              {m.brand} {m.model}
                            </p>
                            <p className="text-white/35 text-xs font-normal mt-0.5">
                              {String(m.year)} · {String(m.category ?? '')}
                            </p>
                          </Link>

                          {/* Per-machine action buttons */}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <button
                              onClick={() => handleSave(m.id)}
                              disabled={isSaved || isSaving}
                              className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all duration-150 ${
                                isSaved
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default'
                                  : 'border-gold-400/35 text-gold-400 hover:bg-gold-400/10 hover:border-gold-400/65 disabled:opacity-50'
                              }`}
                            >
                              {isSaved ? '♥ Saved ✓' : isSaving ? 'Saving…' : '♡ Save'}
                            </button>
                            <button
                              onClick={() => handleRemove(m.id)}
                              disabled={isRemoving}
                              className="text-[10px] text-white/20 hover:text-red-400 border border-white/10 hover:border-red-400/30 px-2.5 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-40"
                            >
                              {isRemoving ? '…' : 'Remove ×'}
                            </button>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>

                {/* Spec rows */}
                <tbody>
                  {ROWS.map((row, i) => (
                    <tr
                      key={row.key}
                      className={`border-b border-white/5 last:border-0 ${getRowBg(row)} ${!getRowBg(row) ? 'hover:bg-white/2' : ''} ${i % 2 === 0 ? '' : 'bg-white/[0.015]'}`}
                    >
                      <td className="sticky left-0 z-10 bg-navy-800 border-r border-white/8 px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">
                        {row.label}
                        {row.type === 'price' && (
                          <div className="w-1 h-3 rounded-full bg-gold-400/50 inline-block ml-2 mb-0.5 align-middle" />
                        )}
                        {row.type === 'hours' && (
                          <div className="w-1 h-3 rounded-full bg-white/30 inline-block ml-2 mb-0.5 align-middle" />
                        )}
                      </td>
                      {visible.map(m => (
                        <td key={m.id} className={`px-5 py-4 ${getCellClass(m, row)}`}>
                          {getCellValue(m, row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add another machine CTA */}
            {visible.length < 3 && (
              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-white/5" />
                <Link
                  href="/machines"
                  className="text-xs text-white/30 hover:text-gold-400 border border-white/10 hover:border-gold-400/30 px-4 py-2 rounded-full transition-all duration-150 whitespace-nowrap"
                >
                  + Add another machine ({visible.length}/3)
                </Link>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            )}
          </>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-8 px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-8 w-auto object-contain invert opacity-75" />
            </Link>
            <p className="text-xs mt-1.5 text-white/20">Premium Direct-Sale Heavy Machinery</p>
          </div>
          <nav className="flex gap-5 text-xs text-white/30">
            <Link href="/machines"  className="hover:text-white transition-colors duration-150">Inventory</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors duration-150">Dashboard</Link>
            <Link href="/trust"     className="hover:text-white transition-colors duration-150">Trust Hub</Link>
          </nav>
        </div>
      </footer>

      {/* ── STICKY SELECTION BAR ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-200 ${
          hasSelected ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-navy-900/95 backdrop-blur-md border-t border-gold-400/20 px-4 sm:px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-white/70">
              <span className="font-bold text-gold-400">{selectedIds.length}</span>{' '}
              machine{selectedIds.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-white/35 hover:text-white/65 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleSaveSelected}
                disabled={selectedIds.every(id => saved.has(id) || saving.has(id))}
                className="text-xs font-semibold px-4 py-2 rounded-xl border border-gold-400/40 text-gold-400 hover:bg-gold-400/10 hover:border-gold-400/70 transition-all duration-150 disabled:opacity-40"
              >
                Save Selected to Watchlist
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

      {/* ── QUOTE MODAL ── */}
      {(quoteState === 'done' || quoteState === 'error') && (
        <MultiMachineQuoteModal
          state={quoteState}
          count={quotedCount}
          onClose={() => setQuoteState('idle')}
          browseHref="/machines"
        />
      )}
    </>
  )
}
