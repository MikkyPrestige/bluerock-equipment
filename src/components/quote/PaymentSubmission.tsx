'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  quoteId: string
  status: string
  paymentReference: string | null
  paymentRejectionReason: string | null
}

export default function PaymentSubmission({ quoteId, status, paymentReference, paymentRejectionReason }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [reference, setReference] = useState('')
  const [fileName, setFileName]   = useState('')
  const [busy, setBusy]           = useState(false)
  const [errMsg, setErrMsg]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setBusy(true)
    setErrMsg('')
    const form = new FormData()
    form.append('payment_reference', reference)
    form.append('file', file)

    try {
      const res = await fetch(`/api/quotes/${quoteId}/payment`, {
        method: 'POST',
        body: form,
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

  if (status === 'payment_pending') {
    return (
      <div className="bg-orange-500/8 border border-orange-500/25 rounded-xl p-4">
        <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">Payment Submitted</p>
        <p className="text-white/60 text-sm leading-relaxed">
          Reference: <span className="text-white/80 font-mono">{paymentReference}</span>
        </p>
        <p className="text-[11px] text-white/30 mt-2.5">
          We&apos;re verifying your payment and will update this quote once it&apos;s confirmed.
        </p>
      </div>
    )
  }

  if (status !== 'buyer_accepted') return null

  return (
    <div className="space-y-4">
      {paymentRejectionReason && (
        <div className="bg-rose-500/8 border border-rose-500/25 rounded-xl p-4">
          <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">
            Payment Could Not Be Verified
          </p>
          <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">{paymentRejectionReason}</p>
          <p className="text-[11px] text-white/30 mt-2.5">Please review and resubmit below.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
            Payment Reference Number <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="e.g. Wire transfer confirmation number"
            required
            className="w-full bg-navy-950/60 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/20 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
            Proof of Payment <span className="text-red-400">*</span>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required
            onChange={e => setFileName(e.target.files?.[0]?.name ?? '')}
            className="w-full text-xs text-white/45 cursor-pointer
              file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-white/15
              file:text-xs file:font-semibold file:bg-navy-800 file:text-white/70
              hover:file:bg-navy-700 hover:file:text-white file:transition-colors file:cursor-pointer"
          />
          {fileName && <p className="text-[10px] text-white/30 mt-1.5 truncate">{fileName}</p>}
          <p className="text-[10px] text-white/25 mt-1.5">A payment slip or screenshot — JPEG, PNG, WEBP, or PDF, up to 5MB.</p>
        </div>

        {errMsg && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{errMsg}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 font-bold px-5 py-2.5 rounded-lg text-sm transition-colors duration-150"
        >
          {busy ? 'Submitting…' : 'Submit Payment'}
        </button>
      </form>
    </div>
  )
}
