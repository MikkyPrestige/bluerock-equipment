'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Pagination from '@/components/ui/Pagination'
import { DOC_TYPE_LABELS } from '@/lib/milestones'

const PAGE_SIZE = 5

interface VaultDocument {
  id: string
  document_type: string
  version: number
  file_path: string
  superseded_at: string | null
  created_at: string
}

interface Props {
  activeQuoteId: string | null
}

function DownloadButton({ docId }: { docId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  async function handleDownload() {
    setState('loading')
    try {
      const res  = await fetch(`/api/documents/${docId}/download`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok || !json.url) { setState('error'); return }
      window.open(json.url, '_blank', 'noopener')
      setState('idle')
    } catch {
      setState('error')
    }
  }

  if (state === 'error') {
    return (
      <button onClick={() => setState('idle')} className="text-xs text-red-400 hover:text-red-300 transition-colors">
        Failed — retry
      </button>
    )
  }

  return (
    <button
      onClick={handleDownload}
      disabled={state === 'loading'}
      className="text-xs font-semibold text-gold-400 hover:text-gold-300 disabled:text-white/25 transition-colors duration-150"
    >
      {state === 'loading' ? 'Generating…' : 'Download'}
    </button>
  )
}

export default function VaultCard({ activeQuoteId }: Props) {
  const [documents,   setDocuments]  = useState<VaultDocument[]>([])
  const [totalCount,  setTotalCount] = useState(0)
  const [page,        setPage]       = useState(0)
  const [loading,     setLoading]    = useState(true)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const fetchPage = useCallback(async (p: number) => {
    if (!activeQuoteId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/documents?quote_id=${activeQuoteId}&page=${p}&page_size=${PAGE_SIZE}&active_only=true`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const { documents: docs, totalCount: total } = await res.json()
        setDocuments(docs as VaultDocument[])
        setTotalCount(total as number)
        setPage(p)
      }
    } finally {
      setLoading(false)
    }
  }, [activeQuoteId])

  useEffect(() => {
    if (!activeQuoteId) { setLoading(false); return }
    fetchPage(0)
  }, [activeQuoteId, fetchPage])

  if (!activeQuoteId) {
    return (
      <p className="text-white/20 text-sm">
        Documents will appear here once your Proforma Invoice is issued.
      </p>
    )
  }

  if (loading) {
    return (
      <div className="space-y-2.5">
        {[1, 2].map(i => (
          <div key={i} className="h-12 rounded-xl bg-white/4 animate-pulse" />
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <p className="text-white/20 text-sm">
        No documents yet for this transaction.
      </p>
    )
  }

  return (
    <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
      <div className="space-y-2 mb-2">
        {documents.map(doc => (
          <div
            key={doc.id}
            className="flex items-center justify-between py-2.5 border-b border-white/6 last:border-0"
          >
            <div className="min-w-0">
              <p className="text-white/70 text-xs font-semibold truncate">
                {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
              </p>
              <p className="text-white/25 text-[10px] mt-0.5">
                v{doc.version} &middot;{' '}
                {new Date(doc.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                {doc.superseded_at && (
                  <span className="ml-1 text-white/20 italic">superseded</span>
                )}
              </p>
            </div>
            <DownloadButton docId={doc.id} />
          </div>
        ))}
      </div>

      {totalCount > PAGE_SIZE && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPrevious={() => fetchPage(page - 1)}
          onNext={() => fetchPage(page + 1)}
          showingFrom={page * PAGE_SIZE + 1}
          showingTo={Math.min((page + 1) * PAGE_SIZE, totalCount)}
          totalCount={totalCount}
          label="documents"
        />
      )}

      <div className="pt-3 mt-1 border-t border-white/6">
        <Link
          href="/dashboard/documents"
          className="text-xs text-gold-400 hover:text-gold-300 transition-colors"
        >
          View all documents →
        </Link>
      </div>
    </div>
  )
}
