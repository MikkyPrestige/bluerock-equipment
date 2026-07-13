'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  quoteId: string
  status: string
  revisionReason: string | null
  proformaDocumentId: string | null
}

type ViewState = 'idle' | 'revising' | 'deltaConfirm'

interface DeltaInfo {
  deltaPercent: number
  originalEstimate: number
  finalFreightCost: number
}

export default function InvoiceReviewActions({ quoteId, status, revisionReason, proformaDocumentId }: Props) {
  const router = useRouter()
  const [view, setView]           = useState<ViewState>('idle')
  const [busy, setBusy]           = useState(false)
  const [viewingDoc, setViewingDoc] = useState(false)
  const [errMsg, setErrMsg]       = useState('')
  const [reason, setReason]       = useState('')
  const [deltaInfo, setDeltaInfo] = useState<DeltaInfo | null>(null)

  async function handleViewInvoice() {
    if (!proformaDocumentId) return
    setViewingDoc(true)
    try {
      const res = await fetch(`/api/documents/${proformaDocumentId}/download`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok && json.url) window.open(json.url, '_blank', 'noopener')
    } finally {
      setViewingDoc(false)
    }
  }

  async function handleAccept(acknowledgeDelta: boolean) {
    setBusy(true)
    setErrMsg('')
    try {
      const res = await fetch(`/api/quotes/${quoteId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledgeDelta }),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error || 'Something went wrong. Please try again.'); return }
      if (json.requiresConfirmation) {
        setDeltaInfo({
          deltaPercent: json.deltaPercent,
          originalEstimate: json.originalEstimate,
          finalFreightCost: json.finalFreightCost,
        })
        setView('deltaConfirm')
        return
      }
      router.refresh()
    } catch {
      setErrMsg('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRequestRevision(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) return
    setBusy(true)
    setErrMsg('')
    try {
      const res = await fetch(`/api/quotes/${quoteId}/request-revision`, {
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

  if (status === 'revision_requested') {
    return (
      <div className="bg-rose-500/8 border border-rose-500/25 rounded-xl p-4">
        <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Revision Requested</p>
        <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">
          {revisionReason || 'No reason was recorded.'}
        </p>
        <p className="text-[11px] text-white/30 mt-2.5">
          We&apos;re updating your invoice and will have it ready for you to review again shortly.
        </p>
      </div>
    )
  }

  if (status !== 'invoice_generated' || !proformaDocumentId) return null

  return (
    <div className="space-y-4">
      <button
        onClick={handleViewInvoice}
        disabled={viewingDoc}
        className="text-xs font-semibold text-gold-400 hover:text-gold-300 disabled:opacity-50 transition-colors duration-150"
      >
        {viewingDoc ? 'Opening…' : 'View Proforma Invoice ↗'}
      </button>

      {errMsg && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{errMsg}</p>
      )}

      {view === 'deltaConfirm' && deltaInfo && (
        <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl p-4 space-y-2.5">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Freight Cost Changed</p>
          <p className="text-white/70 text-sm leading-relaxed">
            The final freight cost (${Number(deltaInfo.finalFreightCost).toLocaleString()}) differs from the original
            estimate (${Number(deltaInfo.originalEstimate).toLocaleString()}) by{' '}
            {(deltaInfo.deltaPercent * 100).toFixed(0)}%. Please confirm you want to proceed at the revised cost.
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={() => handleAccept(true)}
              disabled={busy}
              className="bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 font-bold px-4 py-2 rounded-lg text-xs transition-colors duration-150"
            >
              {busy ? 'Confirming…' : 'Confirm & Accept Anyway'}
            </button>
            <button
              onClick={() => setView('idle')}
              disabled={busy}
              className="text-xs text-white/40 hover:text-white/70 transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {view === 'idle' && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleAccept(false)}
            disabled={busy}
            className="bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 font-bold px-5 py-2.5 rounded-lg text-sm transition-colors duration-150"
          >
            {busy ? 'Accepting…' : 'Accept Invoice'}
          </button>
          <button
            onClick={() => setView('revising')}
            disabled={busy}
            className="border border-white/15 hover:border-white/30 text-white/60 hover:text-white/85 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors duration-150"
          >
            Request Revision
          </button>
        </div>
      )}

      {view === 'revising' && (
        <form onSubmit={handleRequestRevision} className="space-y-3">
          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">
            What needs to change?
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            required
            placeholder="e.g. Freight cost seems high for this route, please recheck."
            className="w-full bg-navy-950/60 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/20 transition-colors"
          />
          <div className="flex gap-2.5">
            <button
              type="submit"
              disabled={busy || !reason.trim()}
              className="bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 font-bold px-4 py-2 rounded-lg text-xs transition-colors duration-150"
            >
              {busy ? 'Sending…' : 'Send Revision Request'}
            </button>
            <button
              type="button"
              onClick={() => { setView('idle'); setReason('') }}
              disabled={busy}
              className="text-xs text-white/40 hover:text-white/70 transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
