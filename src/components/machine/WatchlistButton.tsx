'use client'

import { useState } from 'react'

export default function WatchlistButton({
  machineId,
  initialWatchlisted,
}: {
  machineId: string
  initialWatchlisted: boolean
}) {
  const [saved, setSaved] = useState(initialWatchlisted)
  const [loading, setLoading] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    const method = saved ? 'DELETE' : 'POST'
    try {
      await fetch('/api/watchlist', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: machineId }),
        credentials: 'include',
      })
      setSaved(!saved)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={saved ? 'Remove from watchlist' : 'Save to watchlist'}
      className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50 ${
        saved
          ? 'bg-blue-700 text-white border-blue-700 hover:bg-blue-800'
          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-700'
      }`}
    >
      {loading ? '…' : saved ? 'Saved' : 'Save'}
    </button>
  )
}
