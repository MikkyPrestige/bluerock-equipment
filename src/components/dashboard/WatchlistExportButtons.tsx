'use client'

import { useState } from 'react'

export default function WatchlistExportButtons({ count }: { count: number }) {
  const [loading, setLoading] = useState<'pdf' | 'png' | null>(null)

  async function handleExport(format: 'pdf' | 'png') {
    if (loading || count === 0) return
    setLoading(format)
    try {
      const res = await fetch(`/api/dashboard/watchlist/export?format=${format}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      // Filename comes from Content-Disposition; set a fallback too
      a.download = `BlueRock-Watchlist.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[WatchlistExport]', err)
    } finally {
      setLoading(null)
    }
  }

  const disabled = count === 0

  const btnClass = (fmt: 'pdf' | 'png') =>
    [
      'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150',
      disabled
        ? 'border-white/10 text-white/20 cursor-not-allowed'
        : loading === fmt
          ? 'border-gold-400/40 text-gold-400/60 cursor-wait'
          : 'border-gold-400/40 text-gold-400 hover:bg-gold-400/10 hover:border-gold-400/70',
    ].join(' ')

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleExport('pdf')}
        disabled={disabled || !!loading}
        className={btnClass('pdf')}
        title={disabled ? 'Save machines to enable export' : 'Download watchlist as PDF'}
      >
        {loading === 'pdf' ? 'Generating…' : '↓ PDF'}
      </button>
      <button
        onClick={() => handleExport('png')}
        disabled={disabled || !!loading}
        className={btnClass('png')}
        title={disabled ? 'Save machines to enable export' : 'Save watchlist as image'}
      >
        {loading === 'png' ? 'Generating…' : '↓ Image'}
      </button>
    </div>
  )
}
