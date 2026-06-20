'use client'

import { useState } from 'react'

export default function GenerateProformaButton({
  quoteId,
  hasProforma,
}: {
  quoteId: string
  hasProforma: boolean
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [errMsg, setErrMsg] = useState('')

  async function handleClick() {
    setState('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/pdf/proforma-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) {
        setErrMsg(json.error || 'Generation failed')
        setState('error')
        return
      }
      setFilePath(json.filePath)
      setState('done')
    } catch {
      setErrMsg('Network error')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <span className="text-sm text-green-700 font-medium">
        Proforma generated — {filePath}
      </span>
    )
  }

  if (state === 'error') {
    return (
      <span className="text-sm text-red-600">
        {errMsg}{' '}
        <button onClick={handleClick} className="underline">Retry</button>
      </span>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
    >
      {state === 'loading'
        ? 'Generating…'
        : hasProforma
          ? 'Regenerate Proforma'
          : 'Generate Proforma Invoice'}
    </button>
  )
}
