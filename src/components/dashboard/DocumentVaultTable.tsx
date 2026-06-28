'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DOC_TYPE_LABELS } from '@/lib/milestones'

export type DocumentRow = {
  id: string
  quote_id: string
  document_type: string
  version: number
  superseded_at: string | null
  created_at: string
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

export default function DocumentVaultTable({ documents }: { documents: DocumentRow[] }) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-white/25 text-lg mb-2">No documents yet</p>
        <p className="text-white/15 text-sm">Documents will appear here once your Proforma Invoice is issued.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {documents.map(doc => (
        <div
          key={doc.id}
          className="bg-navy-900 border border-white/8 rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
        >
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm">
              {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Link
                href={`/dashboard/quotes/${doc.quote_id}`}
                className="text-white/30 text-xs font-mono hover:text-gold-400 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                PRF-{doc.quote_id.slice(0, 8).toUpperCase()}
              </Link>
              <span className="text-white/15 text-xs">·</span>
              <span className="text-white/25 text-xs">v{doc.version}</span>
              <span className="text-white/15 text-xs">·</span>
              <span className="text-white/25 text-xs">
                {new Date(doc.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
              </span>
            </div>
          </div>
          <DownloadButton docId={doc.id} />
        </div>
      ))}
    </div>
  )
}
