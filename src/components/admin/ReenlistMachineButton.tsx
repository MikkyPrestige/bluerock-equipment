'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ReenlistMachineButton({ machineId }: { machineId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  async function handleClick() {
    setBusy(true)
    setErrMsg('')
    try {
      const res = await fetch(`/api/admin/machines/${machineId}/reenlist`, { method: 'POST', credentials: 'include' })
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
      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors duration-150"
    >
      {busy ? 'Re-enlisting…' : 'Re-enlist'}
    </button>
  )
}
