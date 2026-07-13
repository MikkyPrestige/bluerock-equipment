'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ReleaseHoldButton({ machineId }: { machineId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  async function handleClick() {
    setBusy(true)
    setErrMsg('')
    try {
      const res = await fetch(`/api/admin/machines/${machineId}/release`, { method: 'POST', credentials: 'include' })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error || 'Something went wrong.'); return }
      router.refresh()
    } catch {
      setErrMsg('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (errMsg) {
    return <span className="text-xs text-red-400">{errMsg}</span>
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className="text-xs font-semibold text-red-400/80 hover:text-red-300 disabled:opacity-50 border border-red-400/25 hover:border-red-400/45 px-3 py-1.5 rounded-lg transition-all duration-150"
    >
      {busy ? 'Releasing…' : 'Release'}
    </button>
  )
}
