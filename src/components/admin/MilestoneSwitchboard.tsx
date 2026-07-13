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
  const [errMsg, setErrMsg] = useState('')

  async function savePhase(newPhase: number) {
    setState('saving')
    setErrMsg('')
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestone_phase: newPhase }),
        credentials: 'include',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setErrMsg(json?.error || 'Failed to update phase. Please try again.')
        setState('error')
        return
      }
      setPhase(newPhase)
      setState('saved')
      setTimeout(() => setState('idle'), 2500)
    } catch {
      setErrMsg('Network error — please try again.')
      setState('error')
    }
  }

  const currentLabel = MILESTONE_PHASES[phase]?.label ?? `Phase ${phase}`
  const isLast = phase >= MILESTONE_PHASES.length - 1

  return (
    <div className="space-y-5">

      {/* Current phase + advance button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5">Current Phase</p>
          <p className="text-base font-semibold text-white">
            Phase {phase} <span className="text-white/45">—</span> {currentLabel}
          </p>
        </div>

        {!isLast ? (
          <button
            onClick={() => savePhase(phase + 1)}
            disabled={state === 'saving'}
            className="bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors duration-150 shadow-md shadow-black/20 whitespace-nowrap flex-shrink-0"
          >
            {state === 'saving' ? 'Saving…' : `Advance to Phase ${phase + 1}`}
          </button>
        ) : (
          <span className="bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-4 py-2.5 rounded-xl text-sm font-semibold">
            ✓ Transaction Complete
          </span>
        )}
      </div>

      {/* Jump to phase */}
      <div>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Jump to Phase</p>
        <div className="flex flex-wrap gap-2">
          {MILESTONE_PHASES.map(({ phase: p, label }) => (
            <button
              key={p}
              onClick={() => savePhase(p)}
              disabled={state === 'saving' || p === phase}
              title={label}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 disabled:cursor-not-allowed ${
                p === phase
                  ? 'bg-gold-400/15 border-gold-400/40 text-gold-400 font-bold'
                  : 'border-white/12 text-white/35 hover:border-white/30 hover:text-white/65'
              }`}
            >
              {p}: {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {state === 'saved' && (
        <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
          ✓ Phase updated.
        </p>
      )}
      {state === 'error' && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
          {errMsg}
        </p>
      )}
    </div>
  )
}
