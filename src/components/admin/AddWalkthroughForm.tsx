'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Buyer { id: string; email: string; company_name: string | null }
interface Machine { id: string; name: string }

const TECHNICIANS = ['BlueRock Team', 'Lead Inspector', 'Senior Technician', 'Field Specialist']

export default function AddWalkthroughForm({
  buyers,
  machines,
}: {
  buyers: Buyer[]
  machines: Machine[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [buyerId, setBuyerId] = useState('')
  const [machineId, setMachineId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [technician, setTechnician] = useState(TECHNICIANS[0])
  const [calendlyUrl, setCalendlyUrl] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('saving')
    setErrMsg('')
    try {
      const res = await fetch('/api/admin/walkthroughs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: buyerId,
          machine_id: machineId || null,
          scheduled_at: scheduledAt,
          technician,
          calendly_event_url: calendlyUrl || null,
        }),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error || 'Save failed'); setState('error'); return }
      setOpen(false)
      setBuyerId(''); setMachineId(''); setScheduledAt(''); setCalendlyUrl('')
      setState('idle')
      router.refresh()
    } catch {
      setErrMsg('Network error')
      setState('error')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-blue-800"
      >
        + Log Walkthrough
      </button>
    )
  }

  return (
    <div className="bg-white border border-blue-200 rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Log New Walkthrough</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Buyer *</label>
            <select
              required
              value={buyerId}
              onChange={e => setBuyerId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select buyer…</option>
              {buyers.map(b => (
                <option key={b.id} value={b.id}>{b.company_name || b.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Machine</label>
            <select
              value={machineId}
              onChange={e => setMachineId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">General / TBD</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date & Time *</label>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Technician</label>
            <select
              value={technician}
              onChange={e => setTechnician(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TECHNICIANS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Calendly Event URL (optional)</label>
          <input
            type="url"
            value={calendlyUrl}
            onChange={e => setCalendlyUrl(e.target.value)}
            placeholder="https://calendly.com/events/..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-0.5">Paste from your Calendly booking email</p>
        </div>
        {errMsg && <p className="text-sm text-red-600">{errMsg}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={state === 'saving'}
            className="bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
          >
            {state === 'saving' ? 'Saving…' : 'Log Walkthrough'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:underline">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
