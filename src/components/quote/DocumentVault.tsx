'use client'

import { useState } from 'react'
import { DOC_TYPE_LABELS } from '@/lib/milestones'

interface VaultDocument {
  id: string
  document_type: string
  version: number
  file_path: string
  superseded_at: string | null
  created_at: string
}

function DownloadButton({ docId }: { docId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  async function handleDownload() {
    setState('loading')
    try {
      const res = await fetch(`/api/documents/${docId}/download`, { credentials: 'include' })
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
      <button onClick={() => setState('idle')} className="text-xs text-red-600 hover:underline">
        Failed — retry
      </button>
    )
  }

  return (
    <button
      onClick={handleDownload}
      disabled={state === 'loading'}
      className="text-xs font-medium text-blue-700 hover:underline disabled:text-gray-400"
    >
      {state === 'loading' ? 'Generating link…' : 'Download'}
    </button>
  )
}

export default function DocumentVault({ documents }: { documents: VaultDocument[] }) {
  if (documents.length === 0) {
    return <p className="text-sm text-gray-400">No documents available yet.</p>
  }

  // Group by document_type, active version first
  const grouped = documents.reduce<Record<string, VaultDocument[]>>((acc, doc) => {
    if (!acc[doc.document_type]) acc[doc.document_type] = []
    acc[doc.document_type].push(doc)
    return acc
  }, {})

  // Sort each group: active first (null superseded_at), then by version desc
  for (const type in grouped) {
    grouped[type].sort((a, b) => {
      if (!a.superseded_at && b.superseded_at) return -1
      if (a.superseded_at && !b.superseded_at) return 1
      return b.version - a.version
    })
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, docs]) => {
        const active    = docs.filter(d => !d.superseded_at)
        const superseded = docs.filter(d => !!d.superseded_at)

        return (
          <div key={type} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {DOC_TYPE_LABELS[type] ?? type}
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {active.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Version {doc.version}
                      <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Current</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(doc.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                    </p>
                  </div>
                  <DownloadButton docId={doc.id} />
                </div>
              ))}

              {superseded.length > 0 && (
                <details className="px-4 py-2">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                    {superseded.length} superseded version{superseded.length > 1 ? 's' : ''}
                  </summary>
                  <div className="mt-2 space-y-2">
                    {superseded.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between opacity-60">
                        <p className="text-xs text-gray-500">
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
    </div>
  )
}
