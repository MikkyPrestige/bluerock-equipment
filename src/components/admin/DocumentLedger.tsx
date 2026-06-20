'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TRADE_DOC_TYPES, DOC_TYPE_LABELS } from '@/lib/milestones'

export default function DocumentLedger({ quoteId }: { quoteId: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState<string>(TRADE_DOC_TYPES[0])
  const [fileName, setFileName] = useState<string>('')
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [uploaded, setUploaded] = useState<string[]>([])

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
      const res = await fetch(`/api/admin/quotes/${quoteId}/documents`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) {
        setErrMsg(json.error || 'Upload failed')
        setState('error')
        return
      }
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
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Document Type
            </label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TRADE_DOC_TYPES.map(t => (
                <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              PDF File
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              required
              onChange={e => setFileName(e.target.files?.[0]?.name ?? '')}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
            />
            {fileName && <p className="text-xs text-gray-400 mt-0.5">{fileName}</p>}
          </div>
        </div>

        {state === 'error' && <p className="text-sm text-red-600">{errMsg}</p>}

        <button
          type="submit"
          disabled={state === 'uploading'}
          className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          {state === 'uploading' ? 'Uploading…' : 'Upload Document'}
        </button>
      </form>

      {uploaded.length > 0 && (
        <div className="space-y-1">
          {uploaded.map((name, i) => (
            <p key={i} className="text-xs text-green-700">
              Uploaded: {name}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
