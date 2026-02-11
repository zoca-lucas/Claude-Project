import { Link, useNavigate } from 'react-router-dom'
import { Zap, LayoutDashboard, FolderOpen, LogOut, Wand2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">ContentGen</span>
        </Link>

        <nav className="flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                to="/create"
                className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                <Wand2 className="w-4 h-4" />
                Creation Lab
              </Link>
              <Link
                to="/projects"
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                Projetos
              </Link>
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-700">
                <span className="text-sm text-gray-400">
                  {user?.name || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="text-sm bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors"
              >
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
