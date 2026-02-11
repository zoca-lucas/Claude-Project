const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
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

export async function getDashboardStats() {
  return apiFetch('/projects/dashboard-stats')
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

// === Project Settings ===
export async function getProjectSettings(projectId) {
  return apiFetch(`/projects/${projectId}/settings`)
}

export async function updateProjectSettings(projectId, settings) {
  return apiFetch(`/projects/${projectId}/settings`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}

// === Videos ===
export async function getVideos(projectId, status) {
  const params = status ? `?status=${status}` : ''
  return apiFetch(`/projects/${projectId}/videos${params}`)
}

export async function getVideo(id) {
  return apiFetch(`/videos/${id}`)
}

export async function createVideo(projectId, { title, script, contentType }) {
  return apiFetch(`/projects/${projectId}/videos`, {
    method: 'POST',
    body: JSON.stringify({ title, script, contentType }),
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

export async function getServicesStatus() {
  return apiFetch('/ai/services-status')
}

export async function getAiVoices(provider) {
  const params = provider ? `?provider=${provider}` : ''
  return apiFetch(`/ai/voices${params}`)
}

export async function generateVideoScript(videoId) {
  return apiFetch(`/videos/${videoId}/generate-script`, { method: 'POST' })
}

// === Pipeline de video ===
export async function startVideoGeneration(videoId) {
  return apiFetch(`/videos/${videoId}/generate`, { method: 'POST' })
}

export async function getGenerationStatus(videoId) {
  return apiFetch(`/videos/${videoId}/generation-status`)
}

export async function retryGeneration(videoId) {
  return apiFetch(`/videos/${videoId}/retry`, { method: 'POST' })
}

// === Assets ===
export async function getVideoAssets(videoId, type) {
  const params = type ? `?type=${type}` : ''
  return apiFetch(`/videos/${videoId}/assets${params}`)
}

export function getAssetStreamUrl(assetId) {
  const token = localStorage.getItem(TOKEN_KEY)
  return `${API_BASE}/assets/${assetId}/stream?token=${token}`
}

export function getAssetDownloadUrl(assetId) {
  const token = localStorage.getItem(TOKEN_KEY)
  return `${API_BASE}/assets/${assetId}/download?token=${token}`
}

export function getStorageUrl(relativePath) {
  return `${BACKEND_BASE}${relativePath}`
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
    audio_generating: 'Gerando Audio',
    images_generating: 'Gerando Imagens',
    images_done: 'Imagens Prontas',
    video_generating: 'Gerando Video',
    video_assembling: 'Montando Video',
    done: 'Concluido',
    error: 'Erro',
  }
  return labels[status] || status
}

export function getVideoStatusColor(status) {
  const colors = {
    pending: 'bg-gray-500/10 text-gray-400',
    script_generated: 'bg-blue-500/10 text-blue-400',
    audio_generating: 'bg-violet-500/10 text-violet-400',
    images_generating: 'bg-amber-500/10 text-amber-400',
    images_done: 'bg-cyan-500/10 text-cyan-400',
    video_generating: 'bg-yellow-500/10 text-yellow-400',
    video_assembling: 'bg-orange-500/10 text-orange-400',
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

export function formatDateTime(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export { TOKEN_KEY, API_BASE, BACKEND_BASE }
