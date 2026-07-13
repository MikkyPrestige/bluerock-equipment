'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  quoteId: string
  status: string
  paymentReference: string | null
  proofDocumentId: string | null
}

export default function PaymentVerificationPanel({ quoteId, status, paymentReference, proofDocumentId }: Props) {
  const router = useRouter()
  const [busy, setBusy]           = useState(false)
  const [viewingDoc, setViewingDoc] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason]       = useState('')
  const [errMsg, setErrMsg]       = useState('')

  async function handleViewProof() {
    if (!proofDocumentId) return
    setViewingDoc(true)
    try {
      const res = await fetch(`/api/documents/${proofDocumentId}/download`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok && json.url) window.open(json.url, '_blank', 'noopener')
    } finally {
      setViewingDoc(false)
    }
  }

  async function handleConfirm() {
    setBusy(true)
    setErrMsg('')
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/confirm-payment`, { method: 'POST', credentials: 'include' })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error || 'Something went wrong. Please try again.'); return }
      router.refresh()
    } catch {
      setErrMsg('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) return
    setBusy(true)
    setErrMsg('')
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/reject-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error || 'Something went wrong. Please try again.'); return }
      router.refresh()
    } catch {
      setErrMsg('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleMarkSold() {
    setBusy(true)
    setErrMsg('')
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/mark-sold`, { method: 'POST', credentials: 'include' })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error || 'Something went wrong. Please try again.'); return }
      router.refresh()
    } catch {
      setErrMsg('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {paymentReference ? (
        <div className="bg-navy-950/50 border border-white/6 rounded-xl px-4 py-3">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Payment Reference</p>
          <p className="text-white text-sm font-semibold font-mono">{paymentReference}</p>
        </div>
      ) : (
        <p className="text-white/25 text-sm italic">No payment submitted yet.</p>
      )}

      {proofDocumentId && (
        <button
          onClick={handleViewProof}
          disabled={viewingDoc}
          className="text-xs font-semibold text-gold-400 hover:text-gold-300 disabled:opacity-50 transition-colors duration-150"
        >
          {viewingDoc ? 'Opening…' : 'View Proof of Payment ↗'}
        </button>
      )}

      {errMsg && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{errMsg}</p>
      )}

      {status === 'payment_pending' && !rejecting && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 font-bold px-5 py-2.5 rounded-lg text-sm transition-colors duration-150"
          >
            {busy ? 'Confirming…' : 'Confirm Payment'}
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={busy}
            className="border border-white/15 hover:border-white/30 text-white/60 hover:text-white/85 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors duration-150"
          >
            Reject Payment
          </button>
        </div>
      )}

      {status === 'payment_pending' && rejecting && (
        <form onSubmit={handleReject} className="space-y-3">
          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">
            What was wrong with this payment?
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            required
            placeholder="e.g. Reference number doesn't match our bank records."
            className="w-full bg-navy-950/60 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/20 transition-colors"
          />
          <div className="flex gap-2.5">
            <button
              type="submit"
              disabled={busy || !reason.trim()}
              className="bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 font-bold px-4 py-2 rounded-lg text-xs transition-colors duration-150"
            >
              {busy ? 'Sending…' : 'Send Back to Buyer'}
            </button>
            <button
              type="button"
              onClick={() => { setRejecting(false); setReason('') }}
              disabled={busy}
              className="text-xs text-white/40 hover:text-white/70 transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {status === 'payment_confirmed' && (
        <button
          onClick={handleMarkSold}
          disabled={busy}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-colors duration-150"
        >
          {busy ? 'Marking Sold…' : 'Mark as Sold'}
        </button>
      )}
    </div>
  )
}
