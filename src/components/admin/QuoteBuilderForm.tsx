'use client'

import { useState } from 'react'

interface QuoteBuilderFormProps {
  quoteId: string
  initialFreight: number | null
  initialCustoms: number | null
  initialTotal: number | null
  machinePrice: number
}

export default function QuoteBuilderForm({
  quoteId,
  initialFreight,
  initialCustoms,
  initialTotal,
  machinePrice,
}: QuoteBuilderFormProps) {
  const [freight, setFreight] = useState(initialFreight?.toString() ?? '')
  const [customs, setCustoms] = useState(initialCustoms?.toString() ?? '')
  const [total, setTotal] = useState(initialTotal?.toString() ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const computedTotal =
    machinePrice + (parseFloat(freight) || 0) + (parseFloat(customs) || 0)

  function handleComputeTotal() {
    setTotal(computedTotal.toFixed(2))
  }

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
          customs_fee: customs ? parseFloat(customs) : null,
          total_amount: total ? parseFloat(total) : null,
          status: 'invoice_generated',
        }),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) {
        setErrMsg(json.error || 'Save failed')
        setState('error')
        return
      }
      setState('saved')
    } catch {
      setErrMsg('Network error')
      setState('error')
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Machine Price (USD)
          </label>
          <p className="text-base font-bold text-gray-900">${machinePrice.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Fixed — from inventory</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Freight Estimate (USD)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={freight}
            onChange={e => setFreight(e.target.value)}
            placeholder="0.00"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Customs Fee (USD)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={customs}
            onChange={e => setCustoms(e.target.value)}
            placeholder="0.00"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Total Amount (USD)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={total}
            onChange={e => setTotal(e.target.value)}
            placeholder="0.00"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={handleComputeTotal}
          className="text-sm text-blue-700 hover:underline whitespace-nowrap pb-2"
        >
          Auto-compute (${computedTotal.toLocaleString()})
        </button>
      </div>

      {state === 'error' && <p className="text-sm text-red-600">{errMsg}</p>}
      {state === 'saved' && <p className="text-sm text-green-700">Saved — status set to Invoice Generated.</p>}

      <button
        type="submit"
        disabled={state === 'saving'}
        className="bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
      >
        {state === 'saving' ? 'Saving…' : 'Save Pricing'}
      </button>
    </form>
  )
}
