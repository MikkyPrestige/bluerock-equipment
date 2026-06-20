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
      if (!res.ok) { setErrMsg(json.error || 'Submission failed'); setState('error'); return }
      setState('done')
    } catch {
      setErrMsg('Network error — please try again')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
        <p className="font-semibold text-emerald-400 text-sm">✓ Quote request submitted</p>
        <p className="text-xs text-white/45 mt-1.5 leading-relaxed">
          Your Proforma Invoice will be ready within 24 hours.{' '}
          <Link href="/dashboard" className="text-gold-400 hover:text-gold-300 underline font-medium transition-colors">
            Track it in your dashboard.
          </Link>
        </p>
      </div>
    )
  }

  if (state === 'prompt') {
    return (
      <button
        onClick={() => setState('form')}
        className="w-full bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-5 py-3.5 rounded-lg text-sm transition-colors duration-150 shadow-lg shadow-black/20"
      >
        Request a Quote
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-white font-semibold text-sm">Quote Request</p>

      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
          Port of Discharge <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={port}
          onChange={e => setPort(e.target.value)}
          placeholder="e.g. Port of Lagos, Nigeria"
          required
          className="w-full bg-navy-950/60 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/20 transition-colors"
        />
        <p className="text-[10px] text-white/25 mt-1.5 leading-relaxed">
          Your destination port — used to calculate freight costs in the Proforma.
        </p>
      </div>

      {state === 'error' && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{errMsg}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state === 'loading'}
          className="flex-1 bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === 'loading' ? 'Submitting…' : 'Submit Request'}
        </button>
        <button
          type="button"
          onClick={() => { setState('prompt'); setErrMsg('') }}
          className="text-sm text-white/30 hover:text-white/60 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
