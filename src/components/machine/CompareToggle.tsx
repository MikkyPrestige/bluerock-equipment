'use client'

import { useState } from 'react'

export default function CompareToggle({
  machineId,
  initialInComparison,
}: {
  machineId: string
  initialInComparison: boolean
}) {
  const [active, setActive] = useState(initialInComparison)
  const [loading, setLoading] = useState(false)
  const [limitHit, setLimitHit] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    setLimitHit(false)
    try {
      const res = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: machineId, in_comparison: !active }),
        credentials: 'include',
      })
      if (res.status === 409) { setLimitHit(true); return }
      if (res.ok) {
        setActive(!active)
        window.dispatchEvent(new CustomEvent('comparison-updated'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={toggle}
        disabled={loading}
        title={active ? 'Remove from comparison tray' : 'Add to comparison tray'}
        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-150 disabled:opacity-40 ${
          active
            ? 'bg-navy-700 border-white/25 text-white hover:bg-navy-800'
            : 'bg-white/5 border-white/15 text-white/50 hover:text-white/80 hover:border-white/30'
        }`}
      >
        {loading ? '…' : active ? '✓ In Tray' : '+ Compare'}
      </button>
      {limitHit && (
        <span className="text-[10px] text-red-400 mt-1">Tray full (max 3)</span>
      )}
    </div>
  )
}
