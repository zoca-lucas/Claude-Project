import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'

const STEPS = [
  { key: 'script', label: 'Roteiro', icon: '1' },
  { key: 'audio', label: 'Audio', icon: '2' },
  { key: 'image_prompts', label: 'Prompts', icon: '3' },
  { key: 'images', label: 'Imagens', icon: '4' },
  { key: 'timestamps', label: 'Legendas', icon: '5' },
  { key: 'assembly', label: 'Montagem', icon: '6' },
  { key: 'captions', label: 'Finalizar', icon: '7' },
]

const STEP_ORDER = ['queued', 'script', 'audio', 'image_prompts', 'images', 'timestamps', 'assembly', 'captions', 'done']

export default function PipelineProgress({ job }) {
  if (!job) return null

  const currentStepIdx = STEP_ORDER.indexOf(job.currentStep)
  const isFailed = job.status === 'failed'
  const isCompleted = job.status === 'completed'

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Pipeline de Geracao</h3>
        <span className="text-xs text-gray-400">
          {isCompleted ? '100%' : `${job.progress || 0}%`}
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="w-full bg-gray-700 rounded-full h-2 mb-5">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            isFailed ? 'bg-red-500' : isCompleted ? 'bg-green-500' : 'bg-violet-500'
          }`}
          style={{ width: `${isCompleted ? 100 : job.progress || 0}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const stepIdx = STEP_ORDER.indexOf(step.key)
          const isActive = stepIdx === currentStepIdx
          const isPast = stepIdx < currentStepIdx || isCompleted
          const isError = isFailed && isActive

          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${isError ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/50' :
                  isPast ? 'bg-green-500/20 text-green-400' :
                  isActive ? 'bg-violet-500/20 text-violet-400 ring-2 ring-violet-500/50' :
                  'bg-gray-700 text-gray-500'}
              `}>
                {isError ? (
                  <XCircle className="w-4 h-4" />
                ) : isPast ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  step.icon
                )}
              </div>
              <span className={`text-[10px] font-medium ${
                isError ? 'text-red-400' :
                isPast ? 'text-green-400' :
                isActive ? 'text-violet-400' :
                'text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mensagem de erro */}
      {isFailed && job.errorMessage && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <p className="text-xs text-red-400">{job.errorMessage}</p>
        </div>
      )}
    </div>
  )
}
