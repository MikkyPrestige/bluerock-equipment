'use client'

import { useState } from 'react'

interface QuoteBuilderFormProps {
  quoteId: string
  initialFreight: number | null
  initialCustoms: number | null
  initialTotal: number | null
  machinePrice: number
}

const INP = [
  'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-navy-900',
  'placeholder:text-slate-400 focus:outline-none focus:border-gold-400/60',
  'focus:ring-2 focus:ring-gold-400/12 transition-all duration-150',
].join(' ')

const LBL = 'block text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2'

export default function QuoteBuilderForm({
  quoteId,
  initialFreight,
  initialCustoms,
  initialTotal,
  machinePrice,
}: QuoteBuilderFormProps) {
  const [freight, setFreight] = useState(initialFreight?.toString() ?? '')
  const [customs, setCustoms] = useState(initialCustoms?.toString() ?? '')
  const [total, setTotal]     = useState(initialTotal?.toString() ?? '')
  const [state, setState]     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errMsg, setErrMsg]   = useState('')

  const computedTotal = machinePrice + (parseFloat(freight) || 0) + (parseFloat(customs) || 0)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setState('saving')
    setErrMsg('')
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freight_estimate: freight ? parseFloat(freight) : null,
          customs_fee:      customs ? parseFloat(customs) : null,
          total_amount:     total   ? parseFloat(total)   : null,
          status: 'invoice_generated',
        }),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error || 'Save failed'); setState('error'); return }
      setState('saved')
    } catch {
      setErrMsg('Network error')
      setState('error')
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* 3-col price grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Machine Price — static */}
        <div className="bg-navy-950/50 border border-white/6 rounded-xl px-4 py-3.5">
          <p className={LBL}>Machine Price (USD)</p>
          <p className="font-display text-xl font-bold text-gold-400">${machinePrice.toLocaleString()}</p>
          <p className="text-[10px] text-white/25 mt-1">Fixed — from inventory</p>
        </div>

        {/* Freight */}
        <div>
          <label className={LBL}>Freight Estimate (USD)</label>
          <input
            type="number" min="0" step="0.01"
            value={freight} onChange={e => setFreight(e.target.value)}
            placeholder="0.00" className={INP}
          />
        </div>

        {/* Customs */}
        <div>
          <label className={LBL}>Customs Fee (USD)</label>
          <input
            type="number" min="0" step="0.01"
            value={customs} onChange={e => setCustoms(e.target.value)}
            placeholder="0.00" className={INP}
          />
        </div>
      </div>

      {/* Total row */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className={LBL}>Total Amount (USD)</label>
          <input
            type="number" min="0" step="0.01"
            value={total} onChange={e => setTotal(e.target.value)}
            placeholder="0.00" className={INP}
          />
        </div>
        <button
          type="button"
          onClick={() => setTotal(computedTotal.toFixed(2))}
          className="text-xs font-semibold text-gold-400 hover:text-gold-300 transition-colors duration-150 whitespace-nowrap pb-2.5"
        >
          Auto-compute (${computedTotal.toLocaleString()})
        </button>
      </div>

      {/* Feedback */}
      {state === 'error' && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{errMsg}</p>
      )}
      {state === 'saved' && (
        <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
          ✓ Saved — status set to Invoice Generated.
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'saving'}
        className="bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-colors duration-150 shadow-md shadow-black/20"
      >
        {state === 'saving' ? 'Saving…' : 'Save Pricing'}
      </button>
    </form>
  )
}
