'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

interface Buyer   { id: string; email: string; company_name: string | null }
interface Machine { id: string; name: string }

const TECHNICIANS = ['BlueRock Team', 'Lead Inspector', 'Senior Technician', 'Field Specialist']

const INP = [
  'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-navy-900',
  'placeholder:text-slate-400 focus:outline-none focus:border-gold-400/60',
  'focus:ring-2 focus:ring-gold-400/12 transition-all duration-150',
].join(' ')

const LBL = 'block text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2'

export default function AddWalkthroughForm({
  buyers,
  machines,
}: {
  buyers: Buyer[]
  machines: Machine[]
}) {
  const router = useRouter()
  const [mounted,     setMounted]     = useState(false)
  const [open,        setOpen]        = useState(false)
  const [buyerId,     setBuyerId]     = useState('')
  const [machineId,   setMachineId]   = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [technician,  setTechnician]  = useState(TECHNICIANS[0])
  const [calendlyUrl, setCalendlyUrl] = useState('')
  const [state,       setState]       = useState<'idle' | 'saving' | 'error'>('idle')
  const [errMsg,      setErrMsg]      = useState('')

  useEffect(() => { setMounted(true) }, [])

  function close() {
    setOpen(false)
    setBuyerId(''); setMachineId(''); setScheduledAt('')
    setCalendlyUrl(''); setTechnician(TECHNICIANS[0])
    setState('idle'); setErrMsg('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('saving')
    setErrMsg('')
    try {
      const res = await fetch('/api/admin/walkthroughs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id:           buyerId,
          machine_id:         machineId || null,
          scheduled_at:       scheduledAt,
          technician,
          calendly_event_url: calendlyUrl || null,
        }),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error || 'Save failed'); setState('error'); return }
      close()
      router.refresh()
    } catch {
      setErrMsg('Network error')
      setState('error')
    }
  }

  return (
    <>
      {/* Trigger button — always visible in page header */}
      <button
        onClick={() => setOpen(true)}
        className="bg-gold-400 hover:bg-gold-300 text-navy-950 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-150 whitespace-nowrap shadow-sm shadow-gold-400/20"
      >
        + Log Walkthrough
      </button>

      {/* Modal — portaled to document.body to escape sticky header's stacking context */}
      {mounted && open && createPortal(
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) close() }}
        >
          <div className="bg-navy-900 border border-white/8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8">
              <h3 className="font-display text-lg font-bold text-white">Log Walkthrough</h3>
              <button
                type="button"
                onClick={close}
                className="text-white/30 hover:text-white/70 transition-colors duration-150 leading-none text-xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Buyer */}
                <div className="sm:col-span-2">
                  <label className={LBL}>Buyer <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <select
                      required
                      value={buyerId}
                      onChange={e => setBuyerId(e.target.value)}
                      className={INP + ' appearance-none pr-8'}
                    >
                      <option value="">Select buyer…</option>
                      {buyers.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.company_name ? `${b.company_name} (${b.email})` : b.email}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Machine */}
                <div>
                  <label className={LBL}>Machine</label>
                  <div className="relative">
                    <select
                      value={machineId}
                      onChange={e => setMachineId(e.target.value)}
                      className={INP + ' appearance-none pr-8'}
                    >
                      <option value="">General / TBD</option>
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div>
                  <label className={LBL}>Date & Time <span className="text-red-400">*</span></label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    className={INP}
                  />
                </div>

                {/* Technician */}
                <div>
                  <label className={LBL}>Technician</label>
                  <div className="relative">
                    <select
                      value={technician}
                      onChange={e => setTechnician(e.target.value)}
                      className={INP + ' appearance-none pr-8'}
                    >
                      {TECHNICIANS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

              </div>

              {/* Calendly URL */}
              <div>
                <label className={LBL}>Booking Reference URL <span className="text-white/20 font-normal normal-case">(optional)</span></label>
                <input
                  type="url"
                  value={calendlyUrl}
                  onChange={e => setCalendlyUrl(e.target.value)}
                  placeholder="https://calendly.com/events/…"
                  className={INP}
                />
                <p className="text-[10px] text-white/25 mt-1.5">Paste from your booking confirmation email for reference</p>
              </div>

              {/* Error */}
              {state === 'error' && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{errMsg}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={state === 'saving'}
                  className="bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all duration-150"
                >
                  {state === 'saving' ? 'Saving…' : 'Log Walkthrough'}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="text-sm text-white/50 hover:text-white/80 transition-colors duration-150"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
