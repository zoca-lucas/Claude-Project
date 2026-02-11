import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, Pencil, Video, Loader2, Sparkles, Play, Settings, Eye,
  Film, RefreshCw, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react'
import {
  getProject, deleteProject, updateProject,
  getVideos, createVideo, deleteVideo,
  generateVideoScript, getAiStatus, getServicesStatus,
  startVideoGeneration, retryGeneration,
  formatDate, formatDateTime, getPlatformLabel,
  getVideoStatusLabel, getVideoStatusColor,
} from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'
import ProjectSettingsPanel from '../components/ProjectSettingsPanel'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Status dos servicos de IA
  const [aiAvailable, setAiAvailable] = useState(false)
  const [servicesStatus, setServicesStatus] = useState(null)

  // Form novo video
  const [showVideoForm, setShowVideoForm] = useState(false)
  const [videoTitle, setVideoTitle] = useState('')
  const [videoScript, setVideoScript] = useState('')
  const [videoContentType, setVideoContentType] = useState('long')
  const [videoLoading, setVideoLoading] = useState(false)

  // Edicao do projeto
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // Loading por video
  const [generatingIds, setGeneratingIds] = useState(new Set())

  useEffect(() => {
    loadData()
    checkServices()
  }, [id])

  // Limpa mensagem de sucesso apos 5 segundos
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  async function checkServices() {
    try {
      const [aiData, servData] = await Promise.all([
        getAiStatus().catch(() => ({ configurado: false })),
        getServicesStatus().catch(() => null),
      ])
      setAiAvailable(aiData.configurado)
      setServicesStatus(servData)
    } catch {
      setAiAvailable(false)
    }
  }

  async function loadData() {
    try {
      const [projData, vidData] = await Promise.all([
        getProject(id),
        getVideos(id),
      ])
      setProject(projData.projeto)
      setVideos(vidData.videos)
      setEditName(projData.projeto.name)
      setEditDesc(projData.projeto.description || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteProject() {
    if (!confirm('Tem certeza que deseja excluir este projeto? Todos os videos serao deletados.')) return
    try {
      await deleteProject(id)
      navigate('/projects')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleUpdateProject(e) {
    e.preventDefault()
    try {
      const data = await updateProject(id, { name: editName, description: editDesc })
      setProject(data.projeto)
      setEditing(false)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCreateVideo(e) {
    e.preventDefault()
    setVideoLoading(true)
    try {
      const data = await createVideo(id, {
        title: videoTitle,
        script: videoScript || undefined,
        contentType: videoContentType,
      })
      setVideos((prev) => [data.video, ...prev])
      setVideoTitle('')
      setVideoScript('')
      setShowVideoForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setVideoLoading(false)
    }
  }

  async function handleDeleteVideo(videoId) {
    if (!confirm('Excluir este video?')) return
    try {
      await deleteVideo(videoId)
      setVideos((prev) => prev.filter((v) => v.id !== videoId))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleGenerateScript(videoId) {
    setError('')
    setGeneratingIds(prev => new Set([...prev, videoId]))
    try {
      const data = await generateVideoScript(videoId)
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? data.video : v))
      )
      setSuccessMsg(
        `Roteiro gerado com sucesso! (${data.ia.modelo} - ${data.ia.tokensUsados} tokens)`
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setGeneratingIds(prev => { const s = new Set(prev); s.delete(videoId); return s })
    }
  }

  async function handleStartGeneration(videoId) {
    setError('')
    setGeneratingIds(prev => new Set([...prev, videoId]))
    try {
      const data = await startVideoGeneration(videoId)
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? data.video : v))
      )
      setSuccessMsg('Geracao de video iniciada!')
    } catch (err) {
      setError(err.message)
    } finally {
      setGeneratingIds(prev => { const s = new Set(prev); s.delete(videoId); return s })
    }
  }

  async function handleRetry(videoId) {
    setError('')
    setGeneratingIds(prev => new Set([...prev, videoId]))
    try {
      const data = await retryGeneration(videoId)
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? data.video : v))
      )
      setSuccessMsg('Retentativa iniciada!')
    } catch (err) {
      setError(err.message)
    } finally {
      setGeneratingIds(prev => { const s = new Set(prev); s.delete(videoId); return s })
    }
  }

  function isGeneratingStatus(status) {
    return ['video_generating', 'audio_generating', 'images_generating', 'video_assembling'].includes(status)
  }

  if (loading) return <LoadingSpinner />

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center">
        <h2 className="text-xl text-white mb-2">Projeto nao encontrado</h2>
        <Link to="/projects" className="text-primary hover:underline text-sm">
          Voltar para projetos
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Projetos
      </Link>

      <ErrorAlert message={error} />

      {/* Mensagem de sucesso */}
      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-400">{successMsg}</p>
        </div>
      )}

      {/* Header do projeto */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
        {editing ? (
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-lg font-semibold focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              placeholder="Descricao..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            />
            <div className="flex gap-2">
              <button type="submit" className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm transition-colors">
                Salvar
              </button>
              <button type="button" onClick={() => setEditing(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-xl font-bold text-white">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-gray-400 mt-1">{project.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={project.status} />
              <span className="text-xs text-gray-500">{getPlatformLabel(project.targetPlatform)}</span>
              {project.niche && (
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{project.niche}</span>
              )}
              <span className="text-xs text-gray-500">Criado em {formatDate(project.createdAt)}</span>
              {servicesStatus?.allConfigured && (
                <span className="inline-flex items-center gap-1 text-xs bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded">
                  <Sparkles className="w-3 h-3" />
                  Pipeline Ativo
                </span>
              )}
              {aiAvailable && !servicesStatus?.allConfigured && (
                <span className="inline-flex items-center gap-1 text-xs bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded">
                  <Sparkles className="w-3 h-3" />
                  IA Ativa
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Project Settings (Providers) */}
      <div className="mb-8">
        <ProjectSettingsPanel projectId={id} />
      </div>

      {/* Content Queue (Videos) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Content Queue ({videos.length})</h2>
          <button
            onClick={() => setShowVideoForm(!showVideoForm)}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar +
          </button>
        </div>

        {/* Form novo video */}
        {showVideoForm && (
          <form onSubmit={handleCreateVideo} className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Titulo *</label>
              <input
                type="text"
                placeholder="Titulo do video"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Tipo de conteudo</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setVideoContentType('long')}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                    videoContentType === 'long'
                      ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                      : 'border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <Film className="w-5 h-5 mx-auto mb-1" />
                  Long-Form
                  <span className="block text-xs mt-0.5 opacity-60">8-12 min</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVideoContentType('short')}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                    videoContentType === 'short'
                      ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                      : 'border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <Video className="w-5 h-5 mx-auto mb-1" />
                  Short-Form
                  <span className="block text-xs mt-0.5 opacity-60">30-60s</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Script (opcional)
                {aiAvailable && (
                  <span className="text-violet-400 ml-1">— ou gere com IA depois</span>
                )}
              </label>
              <textarea
                placeholder="Roteiro do video..."
                value={videoScript}
                onChange={(e) => setVideoScript(e.target.value)}
                rows={4}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={videoLoading}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {videoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Criar Video
              </button>
              <button
                type="button"
                onClick={() => setShowVideoForm(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Info de servicos nao configurados */}
        {!servicesStatus?.allConfigured && videos.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-3 mb-4">
            <p className="text-xs text-gray-500">
              <Sparkles className="w-3 h-3 inline mr-1" />
              {!aiAvailable
                ? 'Configure as API keys no .env do backend para ativar a geracao com IA.'
                : 'Para gerar videos completos, configure pelo menos um provider de TTS (ElevenLabs ou MiniMax) e um de imagens (Replicate ou MiniMax) no .env.'}
            </p>
          </div>
        )}

        {videos.length === 0 ? (
          <EmptyState
            icon={Video}
            title="Nenhum video neste projeto"
            description={servicesStatus?.allConfigured
              ? 'Crie um video e gere conteudo faceless automaticamente com IA'
              : 'Adicione videos para comecar a gerar conteudo'}
          />
        ) : (
          /* TABLE VIEW - Calliope-style */
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Video</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-3 py-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-3 py-3">Data</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-3 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => {
                  const isGen = generatingIds.has(video.id)
                  const isActive = isGeneratingStatus(video.status)
                  const canGenerateScript = aiAvailable && video.status === 'pending' && !video.script
                  const canGenerateVideo = servicesStatus?.allConfigured && (video.status === 'pending' || video.status === 'script_generated')
                  const canRetry = video.status === 'error'

                  return (
                    <tr
                      key={video.id}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/videos/${video.id}`}
                          className="text-sm text-white font-medium hover:text-violet-400 transition-colors"
                        >
                          {video.title}
                        </Link>
                        {video.script && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {video.script.substring(0, 80)}...
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs text-gray-400">
                          {video.contentType === 'short' ? 'Short' : 'Long'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs text-gray-500">{formatDate(video.createdAt)}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusBadge status={video.status} type="video" />
                        {isActive && (
                          <Loader2 className="w-3 h-3 text-violet-400 animate-spin inline ml-1.5" />
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {canGenerateVideo && (
                            <button
                              onClick={() => handleStartGeneration(video.id)}
                              disabled={isGen}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                              title="Gerar video completo com IA"
                            >
                              {isGen ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              Gerar Video
                            </button>
                          )}
                          {canGenerateScript && !canGenerateVideo && (
                            <button
                              onClick={() => handleGenerateScript(video.id)}
                              disabled={isGen}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                              title="Gerar apenas roteiro"
                            >
                              {isGen ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              Gerar Script
                            </button>
                          )}
                          {canRetry && (
                            <button
                              onClick={() => handleRetry(video.id)}
                              disabled={isGen}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Retry
                            </button>
                          )}
                          <Link
                            to={`/videos/${video.id}`}
                            className="p-1.5 text-gray-500 hover:text-white rounded transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDeleteVideo(video.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
