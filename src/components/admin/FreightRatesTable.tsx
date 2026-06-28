'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FreightRate {
  id: string
  port_name: string
  country: string
  base_cost_usd: number
  updated_at: string
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

const EDIT_INP = [
  'w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-navy-900',
  'focus:outline-none focus:border-gold-400/60 focus:ring-2 focus:ring-gold-400/10',
  'transition-all duration-150',
].join(' ')

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function Row({ rate, index, onSaved }: { rate: FreightRate; index: number; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [port,    setPort]    = useState(rate.port_name)
  const [country, setCountry] = useState(rate.country)
  const [cost,    setCost]    = useState(String(rate.base_cost_usd))
  const [state,   setState]   = useState<'idle' | 'saving' | 'error'>('idle')

  const isStale = Date.now() - new Date(rate.updated_at).getTime() > THIRTY_DAYS_MS
  const isEven  = index % 2 === 0

  async function save() {
    setState('saving')
    const res = await fetch(`/api/admin/freight-rates/${rate.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port_name: port, country, base_cost_usd: parseFloat(cost) }),
      credentials: 'include',
    })
    if (res.ok) {
      setState('idle')
      setEditing(false)
      onSaved()
    } else {
      setState('error')
    }
  }

  function cancel() {
    setPort(rate.port_name)
    setCountry(rate.country)
    setCost(String(rate.base_cost_usd))
    setState('idle')
    setEditing(false)
  }

  if (editing) {
    return (
      <tr className="bg-navy-800/70 border-y border-white/10">
        <td className="px-5 py-3">
          <input
            value={port}
            onChange={e => setPort(e.target.value)}
            placeholder="Port name"
            className={EDIT_INP}
          />
        </td>
        <td className="px-5 py-3">
          <input
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="Country"
            className={EDIT_INP}
          />
        </td>
        <td className="px-5 py-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={e => setCost(e.target.value)}
              className={EDIT_INP + ' pl-6'}
            />
          </div>
        </td>
        <td className="px-5 py-3 text-white/20 text-xs">updating…</td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={state === 'saving'}
              className="text-xs font-bold bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 px-3 py-1.5 rounded-lg transition-all duration-150"
            >
              {state === 'saving' ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={cancel}
              className="text-xs text-white/40 hover:text-white/70 transition-colors duration-150"
            >
              Cancel
            </button>
            {state === 'error' && (
              <span className="text-xs text-red-400">Failed</span>
            )}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`group transition-colors duration-100 hover:bg-white/[0.03] ${isEven ? '' : 'bg-white/[0.015]'}`}>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white/90">{rate.port_name}</span>
          {isStale && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"
              title="Overdue for refresh"
            />
          )}
        </div>
      </td>
      <td className="px-5 py-3.5 text-white/50 text-sm">{rate.country}</td>
      <td className="px-5 py-3.5">
        <span className="font-mono font-bold text-gold-400">
          ${Number(rate.base_cost_usd).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td className="px-5 py-3.5 text-[11px] text-white/30 hidden sm:table-cell">
        {fmtDate(rate.updated_at)}
      </td>
      <td className="px-5 py-3.5">
        <button
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors duration-150"
        >
          Edit
        </button>
      </td>
    </tr>
  )
}

export default function FreightRatesTable({ rates, totalCount }: { rates: FreightRate[], totalCount?: number }) {
  const router = useRouter()
  const [refreshState, setRefreshState] = useState<'idle' | 'refreshing' | 'done' | 'error'>('idle')

  async function refreshAll() {
    setRefreshState('refreshing')
    const res = await fetch('/api/admin/freight-rates/refresh', {
      method: 'POST',
      credentials: 'include',
    })
    if (res.ok) {
      setRefreshState('done')
      setTimeout(() => setRefreshState('idle'), 3000)
      router.refresh()
    } else {
      setRefreshState('error')
    }
  }

  return (
    <div className="space-y-4">

      {/* Stats / controls bar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-white/40">
          {totalCount ?? rates.length} destination{(totalCount ?? rates.length) !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-3">
          {refreshState === 'done' && (
            <span className="text-xs font-semibold text-emerald-400">✓ All rates marked current</span>
          )}
          {refreshState === 'error' && (
            <span className="text-xs text-red-400">Refresh failed — retry</span>
          )}
          <button
            onClick={refreshAll}
            disabled={refreshState === 'refreshing' || refreshState === 'done'}
            className="text-xs font-bold bg-navy-800 hover:bg-navy-700 disabled:opacity-50 border border-white/10 text-white px-4 py-2 rounded-xl transition-all duration-150"
          >
            {refreshState === 'refreshing' ? 'Refreshing…' : 'Refresh All Rates'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-navy-900 border border-white/8 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-white/8">
                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-white/30 uppercase tracking-widest">Port Name</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-white/30 uppercase tracking-widest">Country</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-white/30 uppercase tracking-widest">Base Cost (USD)</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-white/30 uppercase tracking-widest hidden sm:table-cell">Last Updated</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-white/30 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <p className="text-sm text-white/30">No freight rates found.</p>
                    <p className="text-xs text-white/15 mt-1">Seed rates in Supabase to get started.</p>
                  </td>
                </tr>
              ) : (
                rates.map((rate, i) => (
                  <Row key={rate.id} rate={rate} index={i} onSaved={() => router.refresh()} />
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-white/6 flex items-center gap-3">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
          <p className="text-[10px] text-white/20">Amber dot = rate not refreshed in 30+ days</p>
        </div>
      </div>

    </div>
  )
}
