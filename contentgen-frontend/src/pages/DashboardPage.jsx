import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, Video, Plus, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getProjects, formatDate } from '../lib/api'
import StatsCard from '../components/StatsCard'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

export default function DashboardPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProjects(1, 5)
      .then((data) => {
        setProjects(data.projetos)
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const displayName = user?.name || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Ola, {displayName}!</h1>
        <p className="text-gray-400 mt-1">Bem-vindo ao ContentGen. Gerencie seus projetos de conteudo.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatsCard title="Total de Projetos" value={total} icon={FolderOpen} color="text-primary" />
        <StatsCard
          title="Projetos Ativos"
          value={projects.filter((p) => p.status === 'active').length}
          icon={FolderOpen}
          color="text-green-400"
        />
        <StatsCard title="Videos" value="-" icon={Video} color="text-blue-400" />
      </div>

      {/* Acoes rapidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          to="/projects/new"
          className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-primary/50 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-white font-medium">Novo Projeto</h3>
            <p className="text-sm text-gray-400">Criar uma nova campanha de conteudo</p>
          </div>
        </Link>

        <Link
          to="/projects"
          className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-primary/50 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-medium">Meus Projetos</h3>
            <p className="text-sm text-gray-400">Ver todos os projetos</p>
          </div>
        </Link>
      </div>

      {/* Projetos recentes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Projetos Recentes</h2>
          {total > 5 && (
            <Link to="/projects" className="text-sm text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <FolderOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">Nenhum projeto ainda</p>
            <Link
              to="/projects/new"
              className="inline-flex bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Criar primeiro projeto
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl px-5 py-4 hover:border-primary/50 transition-all"
              >
                <div>
                  <h3 className="text-white font-medium">{project.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(project.createdAt)}</p>
                </div>
                <StatusBadge status={project.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
