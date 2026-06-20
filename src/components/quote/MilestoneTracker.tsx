import { MILESTONE_PHASES } from '@/lib/milestones'

export default function MilestoneTracker({ currentPhase }: { currentPhase: number }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start min-w-[560px]">
        {MILESTONE_PHASES.map(({ phase, label, description }, index) => {
          const done    = phase < currentPhase
          const current = phase === currentPhase
          const future  = phase > currentPhase

          return (
            <div key={phase} className="flex items-start flex-1">
              {/* Step */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  done    ? 'bg-blue-700 border-blue-700 text-white' :
                  current ? 'bg-white border-blue-700 text-blue-700' :
                            'bg-white border-gray-300 text-gray-400'
                }`}>
                  {done ? '✓' : phase}
                </div>
                <div className="mt-2 text-center w-20">
                  <p className={`text-xs font-semibold leading-tight ${
                    current ? 'text-blue-700' : done ? 'text-gray-700' : 'text-gray-400'
                  }`}>
                    {label}
                  </p>
                  {current && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-tight">{description}</p>
                  )}
                </div>
              </div>

              {/* Connector */}
              {index < MILESTONE_PHASES.length - 1 && (
                <div className={`flex-1 h-0.5 mt-4 mx-1 transition-colors ${
                  done ? 'bg-blue-700' : 'bg-gray-200'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
