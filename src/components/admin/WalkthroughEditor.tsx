'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TECHNICIANS = ['BlueRock Team', 'Lead Inspector', 'Senior Technician', 'Field Specialist']
const STATUSES = [
  { value: 'scheduled',  label: 'Scheduled' },
  { value: 'completed',  label: 'Completed' },
  { value: 'cancelled',  label: 'Cancelled' },
  { value: 'no_show',    label: 'No Show' },
]

export default function WalkthroughEditor({
  id,
  initialTechnician,
  initialStatus,
  initialNotes,
}: {
  id: string
  initialTechnician: string | null
  initialStatus: string
  initialNotes: string | null
}) {
  const router = useRouter()
  const [technician, setTechnician] = useState(initialTechnician ?? TECHNICIANS[0])
  const [status, setStatus] = useState(initialStatus)
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save() {
    setSaveState('saving')
    try {
      const res = await fetch(`/api/admin/walkthroughs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technician, status, admin_notes: notes }),
        credentials: 'include',
      })
      if (res.ok) {
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 2000)
        router.refresh()
      } else {
        setSaveState('error')
      }
    } catch {
      setSaveState('error')
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Technician</label>
          <select
            value={technician}
            onChange={e => setTechnician(e.target.value)}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TECHNICIANS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Post-Call Notes <span className="text-gray-400 font-normal normal-case">(saved to buyer profile)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Machine condition discussed, buyer concerns, follow-up actions…"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saveState === 'saving'}
          className="bg-gray-900 text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-gray-700 disabled:opacity-50"
        >
          {saveState === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {saveState === 'saved'  && <span className="text-xs text-green-700">Saved</span>}
        {saveState === 'error'  && <span className="text-xs text-red-600">Save failed — retry</span>}
      </div>
    </div>
  )
}
