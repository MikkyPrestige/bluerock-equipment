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
    try {
      await fetch('/api/watchlist', {
        method: saved ? 'DELETE' : 'POST',
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
      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-150 disabled:opacity-40 ${
        saved
          ? 'bg-gold-400/15 border-gold-400/40 text-gold-400 hover:bg-gold-400/25'
          : 'bg-white/5 border-white/15 text-white/50 hover:text-white/80 hover:border-white/30'
      }`}
    >
      {loading ? '…' : saved ? '♥ Saved' : '♡ Save'}
    </button>
  )
}
