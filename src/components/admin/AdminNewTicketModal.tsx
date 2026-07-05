'use client'

import { useState } from 'react'
import SupportModalShell from '@/components/dashboard/SupportModalShell'

const INP = [
  'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-navy-900',
  'placeholder:text-slate-400 focus:outline-none focus:border-gold-400/60',
  'focus:ring-2 focus:ring-gold-400/12 transition-all duration-150',
].join(' ')

const LBL = 'block text-[11px] font-bold text-white/45 uppercase tracking-widest mb-2'

export default function AdminNewTicketModal({
  buyerId,
  buyerLabel,
  onClose,
  onCreated,
}: {
  buyerId: string
  buyerLabel: string
  onClose: () => void
  onCreated: (ticketId: string) => void
}) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim()) return

    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch('/api/admin/support-tickets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_id: buyerId, subject: subject.trim(), message: message.trim() || undefined }),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) {
        setSubmitError(json.error ?? 'Failed to create ticket')
        setSubmitting(false)
        return
      }
      onCreated(json.ticket.id)
    } catch {
      setSubmitError('Network error')
      setSubmitting(false)
    }
  }

  return (
    <SupportModalShell title={`New Ticket — ${buyerLabel}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={LBL}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            required
            maxLength={200}
            className={INP}
            placeholder="e.g. Update on your proforma invoice"
            autoFocus
          />
        </div>

        <div>
          <label className={LBL}>Initial Message (optional)</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            className={`${INP} resize-y min-h-[120px]`}
            placeholder="Leave blank to open an empty ticket…"
          />
        </div>

        {submitError && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !subject.trim()}
          className="w-full bg-gold-400 hover:bg-gold-300 disabled:opacity-60 disabled:cursor-not-allowed text-navy-950 font-bold px-8 py-3 rounded-xl text-sm transition-colors duration-150 shadow-lg shadow-black/20 flex items-center gap-2.5 justify-center"
        >
          {submitting && <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin flex-shrink-0" />}
          {submitting ? 'Creating…' : 'Create Ticket'}
        </button>
      </form>
    </SupportModalShell>
  )
}
