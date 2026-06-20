'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface WatchlistItem {
  machine_id: string
  in_comparison: boolean
  machines: {
    name: string
    brand: string
    model: string
    year: number
    price_usd: number
  } | null
}

export default function ComparisonTray() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loaded, setLoaded] = useState(false)

  const fetchComparison = useCallback(() => {
    fetch('/api/watchlist', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { watchlist: [] })
      .then(({ watchlist }: { watchlist: WatchlistItem[] }) => {
        setItems(watchlist.filter(w => w.in_comparison))
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    fetchComparison()
    window.addEventListener('comparison-updated', fetchComparison)
    return () => window.removeEventListener('comparison-updated', fetchComparison)
  }, [fetchComparison])

  async function remove(machineId: string) {
    await fetch('/api/watchlist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machine_id: machineId, in_comparison: false }),
      credentials: 'include',
    })
    setItems(prev => prev.filter(i => i.machine_id !== machineId))
    window.dispatchEvent(new CustomEvent('comparison-updated'))
  }

  if (!loaded || items.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-2xl border-t border-gray-700">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
          Compare ({items.length}/3)
        </span>

        <div className="flex-1 flex items-center gap-3 overflow-x-auto">
          {items.map(item => {
            const m = item.machines
            return (
              <div key={item.machine_id} className="flex items-center gap-2 bg-gray-800 rounded-md px-3 py-1.5 flex-shrink-0">
                <span className="text-sm font-medium text-white">
                  {m ? `${m.year} ${m.brand} ${m.model}` : item.machine_id.substring(0, 8)}
                </span>
                {m && (
                  <span className="text-xs text-gray-400">${Number(m.price_usd).toLocaleString()}</span>
                )}
                <button
                  onClick={() => remove(item.machine_id)}
                  className="text-gray-500 hover:text-white ml-1 text-base leading-none"
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            )
          })}
        </div>

        <Link
          href="/comparison"
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-md whitespace-nowrap flex-shrink-0"
        >
          View Comparison
        </Link>
      </div>
    </div>
  )
}
