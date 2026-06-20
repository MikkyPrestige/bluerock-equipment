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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-navy-900/96 backdrop-blur-md border-t border-white/10 shadow-2xl shadow-black/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-4">

        {/* Label */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/50">
            Compare{' '}
            <span className="text-gold-400">{items.length}</span>
            <span className="text-white/30">/3</span>
          </span>
        </div>

        {/* Machine chips */}
        <div className="flex-1 flex items-center gap-2.5 overflow-x-auto scrollbar-hide">
          {items.map(item => {
            const m = item.machines
            return (
              <div
                key={item.machine_id}
                className="flex items-center gap-2.5 bg-navy-800 border border-white/10 rounded-lg px-3 py-2 flex-shrink-0 min-w-0"
              >
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold leading-tight truncate max-w-[140px]">
                    {m ? `${m.year} ${m.brand} ${m.model}` : item.machine_id.slice(0, 8)}
                  </p>
                  {m && (
                    <p className="text-gold-400 text-[10px] font-medium">
                      ${Number(m.price_usd).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => remove(item.machine_id)}
                  className="text-white/25 hover:text-white/70 ml-0.5 transition-colors leading-none text-base flex-shrink-0"
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            )
          })}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 3 - items.length) }).map((_, i) => (
            <div key={i} className="w-28 h-10 rounded-lg border border-dashed border-white/10 flex-shrink-0" />
          ))}
        </div>

        <Link
          href="/comparison"
          className="bg-gold-400 hover:bg-gold-300 text-navy-950 text-sm font-bold px-6 py-2.5 rounded-lg whitespace-nowrap flex-shrink-0 transition-colors duration-150 shadow-lg shadow-black/30"
        >
          Compare Now
        </Link>
      </div>
    </div>
  )
}
