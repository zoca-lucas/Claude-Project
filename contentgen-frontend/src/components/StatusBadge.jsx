import {
  getProjectStatusLabel,
  getProjectStatusColor,
  getVideoStatusLabel,
  getVideoStatusColor,
} from '../lib/api'

export default function StatusBadge({ status, type = 'project' }) {
  const label = type === 'video' ? getVideoStatusLabel(status) : getProjectStatusLabel(status)
  const color = type === 'video' ? getVideoStatusColor(status) : getProjectStatusColor(status)

  return (
    <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}
