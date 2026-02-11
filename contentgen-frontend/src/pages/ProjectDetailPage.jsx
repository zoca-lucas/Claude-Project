import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Pencil, Video, Loader2, Sparkles } from 'lucide-react'
import {
  getProject, deleteProject, updateProject,
  getVideos, createVideo, deleteVideo,
  generateVideoScript, getAiStatus,
  formatDate, getPlatformLabel,
} from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import VideoCard from '../components/VideoCard'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Status da IA
  const [aiAvailable, setAiAvailable] = useState(false)

  // Form novo video
  const [showVideoForm, setShowVideoForm] = useState(false)
  const [videoTitle, setVideoTitle] = useState('')
  const [videoScript, setVideoScript] = useState('')
  const [videoLoading, setVideoLoading] = useState(false)

  // Edicao do projeto
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  useEffect(() => {
    loadData()
    checkAiStatus()
  }, [id])

  // Limpa mensagem de sucesso apos 5 segundos
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  async function checkAiStatus() {
    try {
      const data = await getAiStatus()
      setAiAvailable(data.configurado)
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
      const data = await createVideo(id, { title: videoTitle, script: videoScript || undefined })
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
    try {
      const data = await generateVideoScript(videoId)
      // Atualiza o video na lista local
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? data.video : v))
      )
      setSuccessMsg(
        `Roteiro gerado com sucesso! (${data.ia.modelo} - ${data.ia.tokensUsados} tokens)`
      )
    } catch (err) {
      setError(err.message)
    }
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
              {aiAvailable && (
                <span className="inline-flex items-center gap-1 text-xs bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded">
                  <Sparkles className="w-3 h-3" />
                  IA Ativa
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Videos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Videos ({videos.length})</h2>
          <button
            onClick={() => setShowVideoForm(!showVideoForm)}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Video
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

        {/* Info de IA desativada */}
        {!aiAvailable && videos.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-3 mb-4">
            <p className="text-xs text-gray-500">
              <Sparkles className="w-3 h-3 inline mr-1" />
              Para gerar roteiros com IA, configure a OPENAI_API_KEY no arquivo .env do backend.
            </p>
          </div>
        )}

        {videos.length === 0 ? (
          <EmptyState
            icon={Video}
            title="Nenhum video neste projeto"
            description={aiAvailable
              ? 'Adicione um video e gere o roteiro automaticamente com IA'
              : 'Adicione videos para comecar a gerar conteudo'}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onDelete={handleDeleteVideo}
                onGenerateScript={handleGenerateScript}
                aiAvailable={aiAvailable}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
