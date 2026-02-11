import { Play, Download, Maximize2 } from 'lucide-react'
import { getStorageUrl } from '../lib/api'

export default function VideoPlayer({ videoUrl, thumbnail, className = '' }) {
  if (!videoUrl) {
    return (
      <div className={`bg-gray-900 rounded-xl flex items-center justify-center aspect-video ${className}`}>
        <div className="text-center">
          <Play className="w-12 h-12 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Video ainda nao gerado</p>
        </div>
      </div>
    )
  }

  const src = videoUrl.startsWith('http') ? videoUrl : getStorageUrl(videoUrl)

  return (
    <div className={`relative bg-gray-900 rounded-xl overflow-hidden ${className}`}>
      <video
        src={src}
        controls
        className="w-full aspect-video"
        poster={thumbnail ? getStorageUrl(thumbnail) : undefined}
        preload="metadata"
      >
        Seu navegador nao suporta video HTML5.
      </video>
    </div>
  )
}
