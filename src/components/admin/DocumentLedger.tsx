'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TRADE_DOC_TYPES, DOC_TYPE_LABELS } from '@/lib/milestones'

const INP = [
  'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-navy-900',
  'placeholder:text-slate-400 focus:outline-none focus:border-gold-400/60',
  'focus:ring-2 focus:ring-gold-400/12 transition-all duration-150',
].join(' ')

const LBL = 'block text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2'

export default function DocumentLedger({ quoteId }: { quoteId: string }) {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [docType,   setDocType]   = useState<string>(TRADE_DOC_TYPES[0])
  const [fileName,  setFileName]  = useState('')
  const [state,     setState]     = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [errMsg,    setErrMsg]    = useState('')
  const [uploaded,  setUploaded]  = useState<string[]>([])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setState('uploading')
    setErrMsg('')

    const form = new FormData()
    form.append('document_type', docType)
    form.append('file', file)

    try {
      const res  = await fetch(`/api/admin/quotes/${quoteId}/documents`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error || 'Upload failed'); setState('error'); return }
      setUploaded(prev => [`${DOC_TYPE_LABELS[docType]} v${json.version}`, ...prev])
      setState('done')
      if (fileRef.current) fileRef.current.value = ''
      setFileName('')
      router.refresh()
    } catch {
      setErrMsg('Network error')
      setState('error')
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Doc type */}
          <div>
            <label className={LBL}>Document Type</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className={INP}
            >
              {TRADE_DOC_TYPES.map(t => (
                <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* File picker */}
          <div>
            <label className={LBL}>PDF File</label>
            <div className="relative">
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                required
                onChange={e => {
                  setFileName(e.target.files?.[0]?.name ?? '')
                  setState('idle')
                }}
                className="w-full text-xs text-white/45 cursor-pointer
                  file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-white/15
                  file:text-xs file:font-semibold file:bg-navy-800 file:text-white/70
                  hover:file:bg-navy-700 hover:file:text-white file:transition-colors file:cursor-pointer
                  file:outline-none"
              />
              {fileName && (
                <p className="text-[10px] text-white/30 mt-1.5 truncate">{fileName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Feedback */}
        {state === 'error' && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{errMsg}</p>
        )}

        <button
          type="submit"
          disabled={state === 'uploading'}
          className="bg-navy-800 hover:bg-navy-700 disabled:opacity-50 border border-white/15 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all duration-150"
        >
          {state === 'uploading' ? 'Uploading…' : 'Upload Document'}
        </button>
      </form>

      {/* Recent uploads */}
      {uploaded.length > 0 && (
        <div className="space-y-1.5">
          {uploaded.map((name, i) => (
            <p key={i} className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
              ✓ Uploaded: {name}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
