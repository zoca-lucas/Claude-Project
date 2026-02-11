const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
const TOKEN_KEY = 'contentgen_token'

// Wrapper para fetch com token e tratamento de erros
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)

  const headers = { ...options.headers }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })

  // Logout automatico em 401
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    window.dispatchEvent(new Event('auth:logout'))
    throw new Error('Sessao expirada. Faca login novamente.')
  }

  // DELETE retorna 204 sem body
  if (res.status === 204) return null

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.erro || 'Erro desconhecido')
  }

  return data
}

// === Auth ===
export async function login(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function register(email, password, name) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })
}

export async function getMe() {
  return apiFetch('/auth/me')
}

export async function updateMe(name) {
  return apiFetch('/auth/me', {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
}

// === Projetos ===
export async function getProjects(page = 1, limit = 20) {
  return apiFetch(`/projects?page=${page}&limit=${limit}`)
}

export async function getProject(id) {
  return apiFetch(`/projects/${id}`)
}

export async function createProject({ name, description, niche, targetPlatform }) {
  return apiFetch('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, description, niche, targetPlatform }),
  })
}

export async function updateProject(id, fields) {
  return apiFetch(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  })
}

export async function deleteProject(id) {
  return apiFetch(`/projects/${id}`, { method: 'DELETE' })
}

// === Videos ===
export async function getVideos(projectId, status) {
  const params = status ? `?status=${status}` : ''
  return apiFetch(`/projects/${projectId}/videos${params}`)
}

export async function getVideo(id) {
  return apiFetch(`/videos/${id}`)
}

export async function createVideo(projectId, { title, script }) {
  return apiFetch(`/projects/${projectId}/videos`, {
    method: 'POST',
    body: JSON.stringify({ title, script }),
  })
}

export async function updateVideo(id, fields) {
  return apiFetch(`/videos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  })
}

export async function deleteVideo(id) {
  return apiFetch(`/videos/${id}`, { method: 'DELETE' })
}

// === IA / Geracao ===
export async function getAiStatus() {
  return apiFetch('/ai/status')
}

export async function generateVideoScript(videoId) {
  return apiFetch(`/videos/${videoId}/generate-script`, { method: 'POST' })
}

// === Helpers ===
export function getProjectStatusLabel(status) {
  const labels = {
    active: 'Ativo',
    paused: 'Pausado',
    archived: 'Arquivado',
  }
  return labels[status] || status
}

export function getProjectStatusColor(status) {
  const colors = {
    active: 'bg-green-500/10 text-green-400',
    paused: 'bg-yellow-500/10 text-yellow-400',
    archived: 'bg-gray-500/10 text-gray-400',
  }
  return colors[status] || 'bg-gray-500/10 text-gray-400'
}

export function getVideoStatusLabel(status) {
  const labels = {
    pending: 'Pendente',
    script_generated: 'Script Pronto',
    video_generating: 'Gerando Video',
    done: 'Concluido',
    error: 'Erro',
  }
  return labels[status] || status
}

export function getVideoStatusColor(status) {
  const colors = {
    pending: 'bg-gray-500/10 text-gray-400',
    script_generated: 'bg-blue-500/10 text-blue-400',
    video_generating: 'bg-yellow-500/10 text-yellow-400',
    done: 'bg-green-500/10 text-green-400',
    error: 'bg-red-500/10 text-red-400',
  }
  return colors[status] || 'bg-gray-500/10 text-gray-400'
}

export function getPlatformLabel(platform) {
  return platform === 'tiktok' ? 'TikTok' : 'YouTube'
}

export function formatDate(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export { TOKEN_KEY }
