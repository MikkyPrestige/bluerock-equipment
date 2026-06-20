'use client'

import { useState } from 'react'
import Link from 'next/link'

type State = 'prompt' | 'form' | 'loading' | 'done' | 'error'

export default function QuoteRequestButton({
  machineId,
  defaultPort,
}: {
  machineId: string
  defaultPort: string
}) {
  const [state, setState] = useState<State>('prompt')
  const [port, setPort] = useState(defaultPort)
  const [errMsg, setErrMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: machineId, port_of_discharge: port }),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) {
        setErrMsg(json.error || 'Submission failed')
        setState('error')
        return
      }
      setState('done')
    } catch {
      setErrMsg('Network error — please try again')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-5">
        <p className="font-semibold text-green-800 text-base">Quote request submitted</p>
        <p className="text-sm text-green-700 mt-1">
          Your Proforma Invoice will be ready within 24 hours.{' '}
          <Link href="/dashboard" className="underline font-medium">Track it in your dashboard.</Link>
        </p>
      </div>
    )
  }

  if (state === 'prompt') {
    return (
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Ready to proceed?</h3>
          <p className="text-sm text-gray-500 mt-1">Request a delivery quote — 48-hour price lock included.</p>
        </div>
        <button
          onClick={() => setState('form')}
          className="bg-blue-700 text-white px-6 py-3 rounded-md text-sm font-semibold hover:bg-blue-800 whitespace-nowrap"
        >
          Request Quote
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-gray-900">Quote Request</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Port of Discharge <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={port}
          onChange={e => setPort(e.target.value)}
          placeholder="e.g. Port of Lagos, Nigeria"
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          The destination port for shipping. Used to calculate freight costs.
        </p>
      </div>

      {state === 'error' && (
        <p className="text-sm text-red-600">{errMsg}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state === 'loading'}
          className="bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === 'loading' ? 'Submitting…' : 'Submit Request'}
        </button>
        <button
          type="button"
          onClick={() => { setState('prompt'); setErrMsg('') }}
          className="text-sm text-gray-500 hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
