import { FileText, Trash2, Pencil } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatDate } from '../lib/api'

export default function VideoCard({ video, onEdit, onDelete }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <StatusBadge status={video.status} type="video" />
        </div>
        <div className="flex items-center gap-1">
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
        <p className="text-sm text-gray-400 line-clamp-3 mb-3">{video.script}</p>
      )}

      <p className="text-xs text-gray-500">{formatDate(video.createdAt)}</p>
    </div>
  )
}
