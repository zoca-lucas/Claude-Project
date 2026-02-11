import { useState } from 'react'
import { FileText, Trash2, Pencil, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatDate } from '../lib/api'

export default function VideoCard({ video, onEdit, onDelete, onGenerateScript, aiAvailable }) {
  const [expanded, setExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    if (!onGenerateScript) return
    setGenerating(true)
    try {
      await onGenerateScript(video.id)
    } finally {
      setGenerating(false)
    }
  }

  const canGenerate = aiAvailable && video.status === 'pending' && !video.script

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <StatusBadge status={video.status} type="video" />
        </div>
        <div className="flex items-center gap-1">
          {canGenerate && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              title="Gerar roteiro com IA"
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {generating ? 'Gerando...' : 'Gerar Roteiro'}
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(video)}
              className="p-1.5 text-gray-500 hover:text-primary rounded transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(video.id)}
              className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <h4 className="text-white font-medium mb-2">{video.title}</h4>

      {video.script && (
        <div className="mb-3">
          <p className={`text-sm text-gray-400 whitespace-pre-line ${expanded ? '' : 'line-clamp-3'}`}>
            {video.script}
          </p>
          {video.script.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 mt-1 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Ver menos' : 'Ver roteiro completo'}
            </button>
          )}
        </div>
      )}

      {!video.script && video.status === 'pending' && (
        <p className="text-sm text-gray-500 italic mb-3">Sem roteiro. Gere com IA ou adicione manualmente.</p>
      )}

      {video.status === 'script_generated' && (
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles className="w-3 h-3 text-blue-400" />
          <span className="text-xs text-blue-400">Roteiro gerado por IA</span>
        </div>
      )}

      <p className="text-xs text-gray-500">{formatDate(video.createdAt)}</p>
    </div>
  )
}
