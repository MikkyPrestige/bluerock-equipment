'use client'

import { useState } from 'react'
import Pagination from '@/components/ui/Pagination'
import { DOC_TYPE_LABELS } from '@/lib/milestones'

interface VaultDocument {
  id: string
  document_type: string
  version: number
  file_path: string
  superseded_at: string | null
  created_at: string
}

interface Props {
  quoteId:          string
  initialDocuments: VaultDocument[]
  totalCount:       number
  pageSize:         number
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

export default function DocumentVault({ quoteId, initialDocuments, totalCount, pageSize }: Props) {
  const [documents,    setDocuments]    = useState<VaultDocument[]>(initialDocuments)
  const [page,         setPage]         = useState(0)
  const [pageLoading,  setPageLoading]  = useState(false)
  const [docTotal]                      = useState(totalCount)

  const totalPages = Math.max(1, Math.ceil(docTotal / pageSize))

  async function fetchPage(p: number) {
    setPageLoading(true)
    try {
      const res = await fetch(
        `/api/documents?quote_id=${quoteId}&page=${p}&page_size=${pageSize}`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const { documents: docs } = await res.json()
        setDocuments(docs as VaultDocument[])
        setPage(p)
      }
    } finally {
      setPageLoading(false)
    }
  }

  if (documents.length === 0 && docTotal === 0) {
    return <p className="text-sm text-white/25 italic">No documents available yet.</p>
  }

  const grouped = documents.reduce<Record<string, VaultDocument[]>>((acc, doc) => {
    if (!acc[doc.document_type]) acc[doc.document_type] = []
    acc[doc.document_type].push(doc)
    return acc
  }, {})

  for (const type in grouped) {
    grouped[type].sort((a, b) => {
      if (!a.superseded_at && b.superseded_at) return -1
      if (a.superseded_at && !b.superseded_at) return 1
      return b.version - a.version
    })
  }

  return (
    <div className={`space-y-3 ${pageLoading ? 'opacity-60 pointer-events-none' : ''}`}>
      {Object.entries(grouped).map(([type, docs]) => {
        const active     = docs.filter(d => !d.superseded_at)
        const superseded = docs.filter(d => !!d.superseded_at)

        return (
          <div key={type} className="border border-white/8 rounded-xl overflow-hidden">
            <div className="bg-navy-800 px-4 py-2.5 border-b border-white/8">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {DOC_TYPE_LABELS[type] ?? type}
              </p>
            </div>

            <div className="divide-y divide-white/6">
              {active.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-4 py-3 bg-navy-900">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">Version {doc.version}</p>
                      <span className="text-[10px] font-bold bg-gold-400/15 border border-gold-400/25 text-gold-400 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    </div>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {new Date(doc.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                    </p>
                  </div>
                  <DownloadButton docId={doc.id} />
                </div>
              ))}

              {superseded.length > 0 && (
                <details className="px-4 py-2.5 bg-navy-900">
                  <summary className="text-[10px] text-white/25 cursor-pointer hover:text-white/45 transition-colors">
                    {superseded.length} superseded version{superseded.length > 1 ? 's' : ''}
                  </summary>
                  <div className="mt-2.5 space-y-2.5">
                    {superseded.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between opacity-40">
                        <p className="text-xs text-white/50">
                          Version {doc.version} &mdash; superseded{' '}
                          {new Date(doc.superseded_at!).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                        </p>
                        <DownloadButton docId={doc.id} />
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        )
      })}

      {docTotal > pageSize && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPrevious={() => fetchPage(page - 1)}
          onNext={() => fetchPage(page + 1)}
          showingFrom={page * pageSize + 1}
          showingTo={Math.min((page + 1) * pageSize, docTotal)}
          totalCount={docTotal}
          label="documents"
        />
      )}
    </div>
  )
}
