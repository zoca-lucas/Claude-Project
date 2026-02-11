import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <h1 className="text-6xl font-bold text-gray-600 mb-4">404</h1>
      <p className="text-lg text-gray-400 mb-6">Pagina nao encontrada</p>
      <Link
        to="/dashboard"
        className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        Voltar ao Dashboard
      </Link>
    </div>
  )
}
