'use client'

import { useState } from 'react'
import { MILESTONE_PHASES } from '@/lib/milestones'

export default function MilestoneSwitchboard({
  quoteId,
  currentPhase,
}: {
  quoteId: string
  currentPhase: number
}) {
  const [phase, setPhase] = useState(currentPhase)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function savePhase(newPhase: number) {
    setState('saving')
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestone_phase: newPhase }),
        credentials: 'include',
      })
      if (!res.ok) { setState('error'); return }
      setPhase(newPhase)
      setState('saved')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('error')
    }
  }

  const currentLabel = MILESTONE_PHASES[phase]?.label ?? `Phase ${phase}`
  const isLast = phase >= MILESTONE_PHASES.length - 1

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Current Phase</p>
          <p className="text-base font-semibold text-gray-900">
            Phase {phase} — {currentLabel}
          </p>
        </div>
        {!isLast && (
          <button
            onClick={() => savePhase(phase + 1)}
            disabled={state === 'saving'}
            className="bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
          >
            {state === 'saving' ? 'Saving…' : `Advance to Phase ${phase + 1}`}
          </button>
        )}
        {isLast && (
          <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-2 rounded-md">
            Transaction Complete
          </span>
        )}
      </div>

      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Jump to Phase</p>
        <div className="flex flex-wrap gap-2">
          {MILESTONE_PHASES.map(({ phase: p, label }) => (
            <button
              key={p}
              onClick={() => savePhase(p)}
              disabled={state === 'saving' || p === phase}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors disabled:cursor-not-allowed ${
                p === phase
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-700'
              }`}
            >
              {p}: {label}
            </button>
          ))}
        </div>
      </div>

      {state === 'saved' && <p className="text-xs text-green-700">Phase updated.</p>}
      {state === 'error'  && <p className="text-xs text-red-600">Failed to update phase.</p>}
    </div>
  )
}
