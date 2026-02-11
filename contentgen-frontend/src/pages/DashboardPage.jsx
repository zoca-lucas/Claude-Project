import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderOpen, Video, Wand2, ArrowRight, Sparkles, CheckCircle2,
  AlertCircle, Loader2, Clock, Film, Play,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardStats, getServicesStatus, formatDate, getVideoStatusLabel, getVideoStatusColor } from '../lib/api'
import StatsCard from '../components/StatsCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [services, setServices] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDashboardStats().catch(() => null),
      getServicesStatus().catch(() => null),
    ])
      .then(([statsData, servData]) => {
        setStats(statsData)
        setServices(servData)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const displayName = user?.name || user?.email?.split('@')[0] || 'Usuario'
  const hasVideos = stats?.videos?.total > 0
  const generatingCount = stats?.videos?.generating || 0

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Ola, {displayName}!</h1>
        <p className="text-gray-400 mt-1">Bem-vindo ao ContentGen. Crie videos faceless com IA.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Projetos"
          value={stats?.projects?.total || 0}
          icon={FolderOpen}
          color="text-primary"
        />
        <StatsCard
          title="Total de Videos"
          value={stats?.videos?.total || 0}
          icon={Video}
          color="text-blue-400"
        />
        <StatsCard
          title="Concluidos"
          value={stats?.videos?.completed || 0}
          icon={CheckCircle2}
          color="text-green-400"
        />
        <StatsCard
          title={generatingCount > 0 ? 'Gerando Agora' : 'Pendentes'}
          value={generatingCount > 0 ? generatingCount : (stats?.videos?.pending || 0)}
          icon={generatingCount > 0 ? Loader2 : Clock}
          color={generatingCount > 0 ? 'text-violet-400' : 'text-gray-400'}
        />
      </div>

      {/* Pipeline status banner */}
      {services && (
        <div className={`rounded-xl border p-4 mb-8 ${
          services.allConfigured
            ? 'bg-green-500/5 border-green-500/20'
            : 'bg-amber-500/5 border-amber-500/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                services.allConfigured ? 'bg-green-500/10' : 'bg-amber-500/10'
              }`}>
                {services.allConfigured ? (
                  <Sparkles className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div>
                <h3 className={`text-sm font-medium ${services.allConfigured ? 'text-green-400' : 'text-amber-400'}`}>
                  {services.allConfigured ? 'Pipeline Completo' : 'Pipeline Incompleto'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {services.allConfigured
                    ? 'Todos os servicos de IA estao configurados. Voce pode gerar videos completos.'
                    : 'Configure as API keys no .env para ativar todos os servicos.'
                  }
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3 text-xs">
              <span className={services.openai ? 'text-green-400' : 'text-red-400'}>
                {services.openai ? '●' : '○'} OpenAI
              </span>
              <span className={(services.elevenlabs || services.minimax) ? 'text-green-400' : 'text-red-400'}>
                {(services.elevenlabs || services.minimax) ? '●' : '○'} TTS
              </span>
              <span className={(services.replicate || services.minimax) ? 'text-green-400' : 'text-red-400'}>
                {(services.replicate || services.minimax) ? '●' : '○'} Images
              </span>
              <span className={services.ffmpeg ? 'text-green-400' : 'text-red-400'}>
                {services.ffmpeg ? '●' : '○'} FFmpeg
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/create"
          className="bg-violet-600/10 border border-violet-500/20 rounded-xl p-5 hover:border-violet-500/40 transition-all group"
        >
          <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-violet-500/20 transition-colors">
            <Wand2 className="w-5 h-5 text-violet-400" />
          </div>
          <h3 className="text-white font-medium text-sm">Creation Lab</h3>
          <p className="text-xs text-gray-500 mt-0.5">Criar novo video com IA</p>
        </Link>

        <Link
          to="/projects/new"
          className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-primary/50 transition-all group"
        >
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-white font-medium text-sm">Novo Projeto</h3>
          <p className="text-xs text-gray-500 mt-0.5">Organizar videos em campanha</p>
        </Link>

        <Link
          to="/projects"
          className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-blue-500/50 transition-all group"
        >
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-500/20 transition-colors">
            <Film className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-white font-medium text-sm">Meus Projetos</h3>
          <p className="text-xs text-gray-500 mt-0.5">Ver todos os projetos</p>
        </Link>
      </div>

      {/* Recent Videos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Videos Recentes</h2>
          {hasVideos && (
            <Link to="/projects" className="text-sm text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {!hasVideos ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Video className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-1">Nenhum video criado ainda</p>
            <p className="text-xs text-gray-500 mb-4">Use o Creation Lab para criar seu primeiro video faceless</p>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              Criar Primeiro Video
            </Link>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Video</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-3 py-3 hidden sm:table-cell">Projeto</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-3 py-3 hidden md:table-cell">Data</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-3 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {stats.recentVideos.map((video) => (
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
                      <span className="text-xs text-gray-500 ml-2">
                        {video.contentType === 'short' ? 'Short' : 'Long'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 hidden sm:table-cell">
                      <Link
                        to={`/projects/${video.projectId}`}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        {video.projectName}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-gray-500">{formatDate(video.createdAt)}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={video.status} type="video" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/videos/${video.id}`}
                        className="text-xs text-gray-500 hover:text-violet-400 transition-colors"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
