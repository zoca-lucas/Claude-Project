import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Download, RefreshCw, Trash2, Image, FileText, Music, Film,
  Sparkles, Loader2, ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react'
import {
  getVideo, getGenerationStatus, startVideoGeneration, retryGeneration,
  deleteVideo, getVideoAssets, getServicesStatus,
  getVideoStatusLabel, getVideoStatusColor, formatDateTime, getStorageUrl,
} from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import VideoPlayer from '../components/VideoPlayer'
import PipelineProgress from '../components/PipelineProgress'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

export default function VideoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [video, setVideo] = useState(null)
  const [job, setJob] = useState(null)
  const [assets, setAssets] = useState(null)
  const [services, setServices] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showScript, setShowScript] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    loadData()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [id])

  async function loadData() {
    try {
      const [videoData, statusData, servicesData] = await Promise.all([
        getVideo(id),
        getGenerationStatus(id).catch(() => null),
        getServicesStatus().catch(() => null),
      ])

      setVideo(videoData.video)
      if (statusData) {
        setJob(statusData.job)
        setAssets(statusData.assets)
      }
      if (servicesData) setServices(servicesData)

      // Se esta gerando, inicia polling
      if (videoData.video && isGenerating(videoData.video.status)) {
        startPolling()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function isGenerating(status) {
    return ['video_generating', 'audio_generating', 'images_generating', 'video_assembling'].includes(status)
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const statusData = await getGenerationStatus(id)
        setJob(statusData.job)
        setAssets(statusData.assets)
        setVideo(statusData.video)

        // Para o polling quando terminar
        if (statusData.video && !isGenerating(statusData.video.status)) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      } catch {
        // ignora erros de polling
      }
    }, 3000) // Poll a cada 3 segundos
  }

  async function handleGenerate() {
    setError('')
    setGenerating(true)
    try {
      const data = await startVideoGeneration(id)
      setVideo(data.video)
      setJob(data.job)
      startPolling()
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleRetry() {
    setError('')
    setGenerating(true)
    try {
      const data = await retryGeneration(id)
      setVideo(data.video)
      setJob(data.job)
      startPolling()
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Excluir este video e todos os seus assets?')) return
    try {
      await deleteVideo(id)
      navigate(-1)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <LoadingSpinner />

  if (!video) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center">
        <h2 className="text-xl text-white mb-2">Video nao encontrado</h2>
        <Link to="/projects" className="text-primary hover:underline text-sm">Voltar</Link>
      </div>
    )
  }

  const canGenerate = services?.allConfigured && video.status === 'pending'
  const canRetry = video.status === 'error'
  const isActive = isGenerating(video.status)
  const isDone = video.status === 'done'

  return (
    <div className="max-w-6xl mx-auto p-8">
      <Link
        to={`/projects/${video.projectId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao projeto
      </Link>

      <ErrorAlert message={error} />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{video.title}</h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={video.status} type="video" />
            <span className="text-xs text-gray-500">
              {video.contentType === 'short' ? 'Video Curto' : 'Video Longo'}
            </span>
            <span className="text-xs text-gray-500">{formatDateTime(video.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canGenerate && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Gerar Video
            </button>
          )}
          {canRetry && (
            <button
              onClick={handleRetry}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Tentar Novamente
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Player */}
          <VideoPlayer videoUrl={video.videoUrl} />

          {/* Pipeline progress */}
          {(isActive || job) && (
            <PipelineProgress job={job} />
          )}

          {/* Roteiro */}
          {video.script && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <button
                onClick={() => setShowScript(!showScript)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-white">Roteiro</h3>
                </div>
                {showScript ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showScript && (
                <p className="mt-4 text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                  {video.script}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status dos servicos */}
          {!services?.allConfigured && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-400">Servicos</h3>
              </div>
              <ul className="text-xs text-gray-400 space-y-1">
                <li className={services?.openai ? 'text-green-400' : 'text-red-400'}>
                  {services?.openai ? '✓' : '✗'} OpenAI (Roteiro + Whisper)
                </li>
                <li className={services?.elevenlabs ? 'text-green-400' : 'text-red-400'}>
                  {services?.elevenlabs ? '✓' : '✗'} ElevenLabs (Narracao)
                </li>
                <li className={services?.replicate ? 'text-green-400' : 'text-red-400'}>
                  {services?.replicate ? '✓' : '✗'} Replicate (Imagens)
                </li>
                <li className={services?.ffmpeg ? 'text-green-400' : 'text-red-400'}>
                  {services?.ffmpeg ? '✓' : '✗'} FFmpeg (Montagem)
                </li>
              </ul>
            </div>
          )}

          {/* Assets - Imagens */}
          {assets?.images?.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Image className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-white">Imagens ({assets.images.length})</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {assets.images.map((img) => (
                  <div key={img.id} className="rounded-lg overflow-hidden bg-gray-900">
                    <img
                      src={getStorageUrl(img.filePath.replace(/.*\/storage/, '/storage'))}
                      alt={img.fileName}
                      className="w-full h-20 object-cover"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assets - Audio */}
          {assets?.audio?.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Music className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-white">Audio</h3>
              </div>
              <audio
                src={getStorageUrl(assets.audio[0].filePath.replace(/.*\/storage/, '/storage'))}
                controls
                className="w-full"
              />
            </div>
          )}

          {/* Download */}
          {isDone && video.videoUrl && (
            <a
              href={getStorageUrl(video.videoUrl)}
              download
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Baixar Video
            </a>
          )}

          {/* Info */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Detalhes</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd><StatusBadge status={video.status} type="video" /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Tipo</dt>
                <dd className="text-gray-300">{video.contentType === 'short' ? 'Curto' : 'Longo'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Criado em</dt>
                <dd className="text-gray-300">{formatDateTime(video.createdAt)}</dd>
              </div>
              {assets && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Assets</dt>
                  <dd className="text-gray-300">
                    {assets.images?.length || 0} imgs, {assets.audio?.length || 0} audio, {assets.videos?.length || 0} video
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
