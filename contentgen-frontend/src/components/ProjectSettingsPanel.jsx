import { useState, useEffect } from 'react'
import { Settings, Volume2, Image, Film, Save, Loader2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { getProjectSettings, updateProjectSettings, getAiVoices, getServicesStatus } from '../lib/api'

export default function ProjectSettingsPanel({ projectId, onClose }) {
  const [settings, setSettings] = useState(null)
  const [voices, setVoices] = useState({ elevenlabs: [], minimax: [] })
  const [services, setServices] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    loadData()
  }, [projectId])

  async function loadData() {
    try {
      const [settingsData, voicesData, servicesData] = await Promise.all([
        getProjectSettings(projectId),
        getAiVoices(),
        getServicesStatus(),
      ])
      setSettings(settingsData)
      setVoices({
        elevenlabs: voicesData.elevenlabs || voicesData.voices || [],
        minimax: voicesData.minimax || [],
      })
      setServices(servicesData)
    } catch (err) {
      console.error('Erro ao carregar settings:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const updated = await updateProjectSettings(projectId, settings)
      setSettings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Erro ao salvar settings:', err)
    } finally {
      setSaving(false)
    }
  }

  function updateField(field, value) {
    setSettings(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  if (loading) {
    return (
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando configuracoes...
        </div>
      </div>
    )
  }

  if (!settings) return null

  const currentVoices = settings.ttsProvider === 'minimax' ? voices.minimax : voices.elevenlabs

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-gray-200">Configuracoes do Projeto</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-5">
          {/* Provider de TTS */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-2">
              <Volume2 className="w-3.5 h-3.5" />
              Narracao (TTS)
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => updateField('ttsProvider', 'elevenlabs')}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  settings.ttsProvider === 'elevenlabs'
                    ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                }`}
              >
                ElevenLabs
                {services?.elevenlabs && <span className="ml-1 text-green-400">●</span>}
              </button>
              <button
                onClick={() => updateField('ttsProvider', 'minimax')}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  settings.ttsProvider === 'minimax'
                    ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                }`}
              >
                MiniMax
                {services?.minimax && <span className="ml-1 text-green-400">●</span>}
              </button>
            </div>

            {/* Voz */}
            <select
              value={settings.ttsProvider === 'minimax' ? (settings.minimaxVoiceId || '') : (settings.narrationVoiceId || '')}
              onChange={(e) => {
                if (settings.ttsProvider === 'minimax') {
                  updateField('minimaxVoiceId', e.target.value)
                } else {
                  updateField('narrationVoiceId', e.target.value)
                }
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500"
            >
              <option value="">Voz padrao</option>
              {currentVoices.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.description ? `— ${v.description}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Provider de Imagens */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-2">
              <Image className="w-3.5 h-3.5" />
              Geracao de Imagens
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => updateField('imageProvider', 'replicate')}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  settings.imageProvider === 'replicate'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                }`}
              >
                Replicate (FLUX)
                {services?.replicate && <span className="ml-1 text-green-400">●</span>}
              </button>
              <button
                onClick={() => updateField('imageProvider', 'minimax')}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  settings.imageProvider === 'minimax'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                }`}
              >
                MiniMax
                {services?.minimax && <span className="ml-1 text-green-400">●</span>}
              </button>
            </div>

            {/* Modelo de imagem (so para Replicate) */}
            {settings.imageProvider === 'replicate' && (
              <select
                value={settings.imageModel || 'flux-schnell'}
                onChange={(e) => updateField('imageModel', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500"
              >
                <option value="flux-schnell">FLUX Schnell (rapido, barato)</option>
                <option value="flux-dev">FLUX Dev (qualidade media)</option>
                <option value="flux-pro">FLUX Pro (melhor qualidade)</option>
              </select>
            )}

            {/* Estilo de imagem */}
            <select
              value={settings.imageStyle || 'cinematic'}
              onChange={(e) => updateField('imageStyle', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500 mt-2"
            >
              <option value="cinematic">Cinematico</option>
              <option value="photorealistic">Foto-realista</option>
              <option value="digital-art">Arte Digital</option>
              <option value="3d-render">3D Render</option>
              <option value="anime">Anime</option>
              <option value="oil-painting">Pintura a Oleo</option>
              <option value="watercolor">Aquarela</option>
              <option value="minimalist">Minimalista</option>
            </select>
          </div>

          {/* Provider de Video */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-2">
              <Film className="w-3.5 h-3.5" />
              Montagem de Video
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => updateField('videoProvider', 'ffmpeg')}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  settings.videoProvider === 'ffmpeg'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                }`}
              >
                FFmpeg (Slideshow)
                {services?.ffmpeg && <span className="ml-1 text-green-400">●</span>}
              </button>
              <button
                onClick={() => updateField('videoProvider', 'minimax')}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  settings.videoProvider === 'minimax'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                }`}
              >
                MiniMax (I2V)
                {services?.minimax && <span className="ml-1 text-green-400">●</span>}
              </button>
            </div>

            {/* Configuracoes MiniMax Video */}
            {settings.videoProvider === 'minimax' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Resolucao</label>
                  <select
                    value={settings.videoResolution || '1080P'}
                    onChange={(e) => updateField('videoResolution', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="1080P">1080P (Full HD)</option>
                    <option value="768P">768P</option>
                    <option value="512P">512P</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Duracao do clip</label>
                  <select
                    value={settings.videoDuration || 6}
                    onChange={(e) => updateField('videoDuration', parseInt(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value={6}>6 segundos</option>
                    <option value={10}>10 segundos</option>
                  </select>
                </div>
              </div>
            )}

            {settings.videoProvider === 'minimax' && (
              <p className="text-xs text-gray-500 mt-2">
                Image-to-Video: cada imagem de cena gera um clip com movimento cinematico via IA.
                Mais lento mas com resultado superior ao slideshow.
              </p>
            )}
          </div>

          {/* Legendas */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-2 block">Posicao das Legendas</label>
            <div className="grid grid-cols-3 gap-2">
              {['top', 'center', 'bottom'].map(pos => (
                <button
                  key={pos}
                  onClick={() => updateField('captionPosition', pos)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    settings.captionPosition === pos
                      ? 'border-green-500 bg-green-500/10 text-green-300'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {pos === 'top' ? 'Topo' : pos === 'center' ? 'Centro' : 'Baixo'}
                </button>
              ))}
            </div>
          </div>

          {/* Idioma */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-2 block">Idioma do conteudo</label>
            <select
              value={settings.contentLanguage || 'pt-BR'}
              onChange={(e) => updateField('contentLanguage', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500"
            >
              <option value="pt-BR">Portugues (BR)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Espanol</option>
            </select>
          </div>

          {/* Contexto */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-2 block">Contexto adicional (opcional)</label>
            <textarea
              value={settings.contextText || ''}
              onChange={(e) => updateField('contextText', e.target.value)}
              placeholder="Tom de voz, estilo do canal, informacoes extras..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          {/* Botao Salvar */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : saved ? (
              <><CheckCircle2 className="w-4 h-4 text-green-400" /> Salvo!</>
            ) : (
              <><Save className="w-4 h-4" /> Salvar Configuracoes</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
