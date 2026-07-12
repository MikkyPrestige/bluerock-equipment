'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type State = 'idle' | 'loading' | 'done' | 'error'

export default function GenerateReportButton({
  machineId,
  hasReport,
  reportUrl = null,
}: {
  machineId: string
  hasReport: boolean
  reportUrl?: string | null
}) {
  const [state, setState]   = useState<State>('idle')
  const [url, setUrl]       = useState<string | null>(null)
  const [errMsg, setErrMsg] = useState('')

  async function handleClick() {
    setState('loading')
    setErrMsg('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setErrMsg('Not signed in'); setState('error'); return }

      const res  = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pdf/inspection-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ machine_id: machineId }),
      })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error || 'Generation failed'); setState('error'); return }
      setUrl(json.url)
      setState('done')
    } catch {
      setErrMsg('Network error')
      setState('error')
    }
  }

  const viewUrl = url ?? reportUrl

  return (
    <div className="flex items-center gap-4">
      {viewUrl && (
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors duration-150"
        >
          View Report ↗
        </a>
      )}

      {state === 'error' ? (
        <span className="text-xs text-red-400">
          {errMsg}{' '}
          <button onClick={handleClick} className="underline hover:text-red-300 transition-colors">
            Retry
          </button>
        </span>
      ) : (
        <button
          onClick={handleClick}
          disabled={state === 'loading'}
          className="text-xs font-semibold text-gold-400 hover:text-gold-300 disabled:text-white/25 disabled:cursor-wait transition-colors duration-150"
        >
          {state === 'loading' ? 'Generating…' : hasReport ? 'Regenerate' : 'Generate Report'}
        </button>
      )}
    </div>
  )
}
