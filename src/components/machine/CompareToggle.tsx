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
        className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50 ${
          active
            ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-700'
            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500 hover:text-gray-900'
        }`}
      >
        {loading ? '…' : active ? 'In Tray' : 'Compare'}
      </button>
      {limitHit && (
        <span className="text-xs text-red-600 mt-0.5">Tray full (max 3)</span>
      )}
    </div>
  )
}
