'use client'

import { useState } from 'react'

type State = 'idle' | 'loading' | 'done' | 'error'

export default function GenerateReportButton({
  machineId,
  hasReport,
}: {
  machineId: string
  hasReport: boolean
}) {
  const [state, setState] = useState<State>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const [errMsg, setErrMsg] = useState<string>('')

  async function handleClick() {
    setState('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/pdf/inspection-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: machineId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrMsg(json.error || 'Generation failed')
        setState('error')
        return
      }
      setUrl(json.url)
      setState('done')
    } catch {
      setErrMsg('Network error')
      setState('error')
    }
  }

  if (state === 'done' && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-green-700 hover:underline text-sm font-medium"
      >
        View Report
      </a>
    )
  }

  if (state === 'error') {
    return (
      <span className="text-red-600 text-xs">
        {errMsg}{' '}
        <button onClick={handleClick} className="underline">Retry</button>
      </span>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className="text-sm font-medium text-blue-700 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
    >
      {state === 'loading'
        ? 'Generating…'
        : hasReport
          ? 'Regenerate'
          : 'Generate Report'}
    </button>
  )
}
