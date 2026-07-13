'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ArchiveQuoteButton({ quoteId, archived }: { quoteId: string; archived: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/${archived ? 'unarchive' : 'archive'}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs font-semibold transition-colors duration-150 disabled:opacity-50 whitespace-nowrap ${
        archived ? 'text-emerald-400 hover:text-emerald-300' : 'text-white/35 hover:text-red-300'
      }`}
    >
      {loading ? '…' : archived ? 'Unarchive' : 'Archive'}
    </button>
  )
}
