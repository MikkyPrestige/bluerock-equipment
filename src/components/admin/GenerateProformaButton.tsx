'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function ViewProformaLink({ documentId }: { documentId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  async function handleView() {
    setState('loading')
    try {
      const res  = await fetch(`/api/documents/${documentId}/download`, { credentials: 'include' })
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
      <button onClick={handleView} className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors duration-150">
        Failed — retry
      </button>
    )
  }

  return (
    <button
      onClick={handleView}
      disabled={state === 'loading'}
      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:text-emerald-400/40 transition-colors duration-150"
    >
      {state === 'loading' ? 'Opening…' : 'View Invoice ↗'}
    </button>
  )
}

export default function GenerateProformaButton({
  quoteId,
  hasProforma,
  currentDocumentId = null,
}: {
  quoteId: string
  hasProforma: boolean
  currentDocumentId?: string | null
}) {
  const [state, setState]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [errMsg, setErrMsg] = useState('')

  async function handleClick() {
    setState('loading')
    setErrMsg('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setErrMsg('Not signed in'); setState('error'); return }

      const res  = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pdf/proforma-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ quoteId }),
      })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error || 'Generation failed'); setState('error'); return }
      setFilePath(json.filePath)
      setDocumentId(json.documentId ?? null)
      setState('done')
    } catch {
      setErrMsg('Network error')
      setState('error')
    }
  }

  const viewDocumentId = documentId ?? currentDocumentId

  if (state === 'done') {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
          ✓ Proforma generated — <span className="font-mono text-emerald-300">{filePath}</span>
        </p>
        {viewDocumentId && <ViewProformaLink documentId={viewDocumentId} />}
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {viewDocumentId && <ViewProformaLink documentId={viewDocumentId} />}
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
          {errMsg}{' '}
          <button onClick={handleClick} className="underline hover:text-red-300 transition-colors ml-1">
            Retry
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {viewDocumentId && <ViewProformaLink documentId={viewDocumentId} />}
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className="bg-navy-800 hover:bg-navy-700 disabled:opacity-50 border border-white/15 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all duration-150"
      >
        {state === 'loading'
          ? 'Generating…'
          : hasProforma
            ? 'Regenerate Proforma'
            : 'Generate Proforma Invoice'}
      </button>
    </div>
  )
}
