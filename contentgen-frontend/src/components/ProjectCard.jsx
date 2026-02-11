import { Link } from 'react-router-dom'
import { Youtube, Music2 } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatDate, getPlatformLabel } from '../lib/api'

export default function ProjectCard({ project }) {
  const PlatformIcon = project.targetPlatform === 'tiktok' ? Music2 : Youtube

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-primary/50 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <PlatformIcon className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500">{getPlatformLabel(project.targetPlatform)}</span>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <h3 className="text-white font-semibold mb-1 group-hover:text-primary transition-colors">
        {project.name}
      </h3>

      {project.description && (
        <p className="text-sm text-gray-400 line-clamp-2 mb-3">{project.description}</p>
      )}

      <div className="flex items-center gap-3 mt-auto pt-3 border-t border-gray-700/50">
        {project.niche && (
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
            {project.niche}
          </span>
        )}
        <span className="text-xs text-gray-500 ml-auto">{formatDate(project.createdAt)}</span>
      </div>
    </Link>
  )
}
