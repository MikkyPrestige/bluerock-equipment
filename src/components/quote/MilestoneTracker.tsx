import { MILESTONE_PHASES } from '@/lib/milestones'

export default function MilestoneTracker({ currentPhase }: { currentPhase: number }) {
  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className="flex items-start min-w-[560px]">
        {MILESTONE_PHASES.map(({ phase, label, description }, index) => {
          const done    = phase < currentPhase
          const current = phase === currentPhase
          const future  = phase > currentPhase

          return (
            <div key={phase} className="flex items-start flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                {/* Step circle */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  done    ? 'bg-gold-400 border-gold-400 text-navy-950' :
                  current ? 'bg-transparent border-gold-400 text-gold-400' :
                            'bg-transparent border-white/15 text-white/25'
                }`}>
                  {done ? '✓' : phase}
                </div>

                {/* Label */}
                <div className="mt-2 text-center w-20">
                  <p className={`text-xs font-semibold leading-tight ${
                    current ? 'text-gold-400' :
                    done    ? 'text-white/55' :
                              'text-white/20'
                  }`}>
                    {label}
                  </p>
                  {current && (
                    <p className="text-[10px] text-white/35 mt-0.5 leading-tight">{description}</p>
                  )}
                </div>
              </div>

              {/* Connector */}
              {index < MILESTONE_PHASES.length - 1 && (
                <div className={`flex-1 h-0.5 mt-4 mx-1 transition-colors ${
                  done ? 'bg-gold-400' : 'bg-white/8'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
