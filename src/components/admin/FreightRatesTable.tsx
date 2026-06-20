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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function Row({ rate, onSaved }: { rate: FreightRate; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [port, setPort]       = useState(rate.port_name)
  const [country, setCountry] = useState(rate.country)
  const [cost, setCost]       = useState(String(rate.base_cost_usd))
  const [state, setState]     = useState<'idle' | 'saving' | 'error'>('idle')

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
      <tr className="bg-blue-50">
        <td className="px-4 py-2">
          <input
            value={port}
            onChange={e => setPort(e.target.value)}
            className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </td>
        <td className="px-4 py-2">
          <input
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={cost}
            onChange={e => setCost(e.target.value)}
            className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </td>
        <td className="px-4 py-2 text-xs text-gray-400">—</td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={state === 'saving'}
              className="text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded disabled:opacity-50"
            >
              {state === 'saving' ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancel} className="text-xs text-gray-500 hover:underline">Cancel</button>
            {state === 'error' && <span className="text-xs text-red-600">Failed</span>}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900">{rate.port_name}</td>
      <td className="px-4 py-3 text-gray-600">{rate.country}</td>
      <td className="px-4 py-3 text-gray-900 font-mono">${Number(rate.base_cost_usd).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(rate.updated_at)}</td>
      <td className="px-4 py-3">
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-blue-700 hover:underline font-medium"
        >
          Edit
        </button>
      </td>
    </tr>
  )
}

export default function FreightRatesTable({ rates }: { rates: FreightRate[] }) {
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
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {rates.length} destination{rates.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={refreshAll}
          disabled={refreshState === 'refreshing'}
          className="text-sm font-semibold bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
        >
          {refreshState === 'refreshing' ? 'Refreshing…'
            : refreshState === 'done'      ? 'All rates marked current'
            : 'Refresh All Rates'}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Port Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Country</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Base Cost (USD)</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Last Updated</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                    No freight rates found. Seed rates in Supabase to get started.
                  </td>
                </tr>
              ) : (
                rates.map(rate => (
                  <Row key={rate.id} rate={rate} onSaved={() => router.refresh()} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {refreshState === 'error' && (
        <p className="text-sm text-red-600">Refresh failed — check your connection and try again.</p>
      )}
    </div>
  )
}
