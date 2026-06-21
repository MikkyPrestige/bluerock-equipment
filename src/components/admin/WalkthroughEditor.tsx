'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TECHNICIANS = ['BlueRock Team', 'Lead Inspector', 'Senior Technician', 'Field Specialist']
const STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show',   label: 'No Show' },
]

const INP = [
  'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-navy-900',
  'placeholder:text-slate-400 focus:outline-none focus:border-gold-400/60',
  'focus:ring-2 focus:ring-gold-400/10 transition-all duration-150',
].join(' ')

const LBL = 'block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5'

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
  const [status,     setStatus]     = useState(initialStatus)
  const [notes,      setNotes]      = useState(initialNotes ?? '')
  const [saveState,  setSaveState]  = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

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
        setTimeout(() => setSaveState('idle'), 2500)
        router.refresh()
      } else {
        setSaveState('error')
      }
    } catch {
      setSaveState('error')
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/8 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LBL}>Technician</label>
          <div className="relative">
            <select
              value={technician}
              onChange={e => setTechnician(e.target.value)}
              className={INP + ' appearance-none pr-7'}
            >
              {TECHNICIANS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        <div>
          <label className={LBL}>Status</label>
          <div className="relative">
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className={INP + ' appearance-none pr-7'}
            >
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className={LBL}>
          Post-Call Notes{' '}
          <span className="text-white/20 font-normal normal-case">(saved to buyer profile)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Machine condition discussed, buyer concerns, follow-up actions…"
          className={INP + ' resize-none'}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saveState === 'saving'}
          className="bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
        >
          {saveState === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {saveState === 'saved' && (
          <span className="text-xs text-emerald-400 font-semibold">✓ Saved</span>
        )}
        {saveState === 'error' && (
          <span className="text-xs text-red-400">Save failed — retry</span>
        )}
      </div>
    </div>
  )
}
