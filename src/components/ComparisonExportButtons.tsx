'use client'

import { useState } from 'react'

interface Props {
  machineIds: string[]
  count: number
}

export default function ComparisonExportButtons({ machineIds, count }: Props) {
  const [loading, setLoading] = useState<'pdf' | 'png' | null>(null)

  async function handleExport(format: 'pdf' | 'png') {
    if (loading || count === 0 || machineIds.length === 0) return
    setLoading(format)
    try {
      const ids = machineIds.join(',')
      const res = await fetch(`/api/dashboard/comparison/export?format=${format}&machines=${ids}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `BlueRock-Comparison.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[ComparisonExport]', err)
    } finally {
      setLoading(null)
    }
  }

  const disabled = count === 0 || machineIds.length === 0

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
        title={disabled ? 'Add machines to comparison to enable export' : 'Download comparison as PDF'}
      >
        {loading === 'pdf' ? 'Generating…' : '↓ PDF'}
      </button>
      <button
        onClick={() => handleExport('png')}
        disabled={disabled || !!loading}
        className={btnClass('png')}
        title={disabled ? 'Add machines to comparison to enable export' : 'Save comparison as image'}
      >
        {loading === 'png' ? 'Generating…' : '↓ Image'}
      </button>
    </div>
  )
}
