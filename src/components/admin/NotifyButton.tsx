'use client'

import { useState } from 'react'

export default function NotifyButton({
  buyerId,
  buyerEmail,
  companyName,
  machineName,
  machineCategory,
}: {
  buyerId: string
  buyerEmail: string
  companyName: string | null
  machineName: string
  machineCategory: string
}) {
  const [state,  setState]  = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleNotify() {
    setState('sending')
    setErrMsg('')
    try {
      const res  = await fetch('/api/admin/notify/arrival', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id:         buyerId,
          buyer_email:      buyerEmail,
          company_name:     companyName,
          machine_name:     machineName,
          machine_category: machineCategory,
        }),
        credentials: 'include',
      })
      if (res.ok) {
        setState('sent')
      } else {
        const json = await res.json().catch(() => ({}))
        setErrMsg(json.error ?? 'Unknown error')
        setState('error')
      }
    } catch {
      setErrMsg('Network error')
      setState('error')
    }
  }

  if (state === 'sent') {
    return <span className="text-xs font-semibold text-emerald-400">✓ Notified</span>
  }

  if (state === 'error') {
    return (
      <div className="space-y-1">
        <button
          onClick={handleNotify}
          className="text-xs text-red-400 hover:text-red-300 transition-colors font-semibold"
        >
          Failed — retry
        </button>
        {errMsg && (
          <p className="text-[10px] text-red-400/70 max-w-[200px] leading-tight">{errMsg}</p>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={handleNotify}
      disabled={state === 'sending'}
      className="text-xs font-semibold text-gold-400 hover:text-gold-300 disabled:text-white/25 disabled:cursor-wait transition-colors duration-150"
    >
      {state === 'sending' ? 'Sending…' : 'Notify'}
    </button>
  )
}
