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
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleNotify() {
    setState('sending')
    try {
      const res = await fetch('/api/admin/notify/arrival', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: buyerId,
          buyer_email: buyerEmail,
          company_name: companyName,
          machine_name: machineName,
          machine_category: machineCategory,
        }),
        credentials: 'include',
      })
      setState(res.ok ? 'sent' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'sent') {
    return <span className="text-xs font-medium text-green-700">Notified</span>
  }
  if (state === 'error') {
    return (
      <button onClick={handleNotify} className="text-xs text-red-600 hover:underline">
        Failed — retry
      </button>
    )
  }

  return (
    <button
      onClick={handleNotify}
      disabled={state === 'sending'}
      className="text-xs font-medium text-blue-700 hover:underline disabled:text-gray-400"
    >
      {state === 'sending' ? 'Sending…' : 'Notify'}
    </button>
  )
}
