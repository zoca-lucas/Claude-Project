import { AlertCircle } from 'lucide-react'

export default function ErrorAlert({ message }) {
  if (!message) return null

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
      <p className="text-sm text-red-400">{message}</p>
    </div>
  )
}
