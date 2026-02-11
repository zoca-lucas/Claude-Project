import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Film, Video, Sparkles, Loader2,
  CheckCircle2, FileText, Wand2, Rocket, ChevronDown, AlertCircle,
} from 'lucide-react'
import {
  getProjects, createProject, createVideo, generateVideoScript,
  startVideoGeneration, getServicesStatus, getAiStatus,
} from '../lib/api'
import ErrorAlert from '../components/ErrorAlert'

const STEPS = [
  { id: 1, label: 'Configurar', icon: Film },
  { id: 2, label: 'Roteiro', icon: FileText },
  { id: 3, label: 'Gerar', icon: Rocket },
]

export default function CreationLabPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedProjectId = searchParams.get('project')

  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Step 1 state
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProjectId || '')
  const [newProjectName, setNewProjectName] = useState('')
  const [createNewProject, setCreateNewProject] = useState(!preselectedProjectId)
  const [contentType, setContentType] = useState('long')
  const [videoTitle, setVideoTitle] = useState('')

  // Step 2 state
  const [scriptMode, setScriptMode] = useState('ai') // 'ai' | 'manual'
  const [manualScript, setManualScript] = useState('')
  const [generatedScript, setGeneratedScript] = useState('')
  const [generatingScript, setGeneratingScript] = useState(false)

  // Step 3 state
  const [createdVideoId, setCreatedVideoId] = useState(null)
  const [services, setServices] = useState(null)
  const [aiAvailable, setAiAvailable] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationStarted, setGenerationStarted] = useState(false)

  // Load projects and services on mount
  useEffect(() => {
    loadInitialData()
  }, [])

  async function loadInitialData() {
    try {
      const [projData, servData, aiData] = await Promise.all([
        getProjects(1, 100).catch(() => ({ projetos: [] })),
        getServicesStatus().catch(() => null),
        getAiStatus().catch(() => ({ configurado: false })),
      ])
      setProjects(projData.projetos || [])
      setServices(servData)
      setAiAvailable(aiData.configurado)
      if (projData.projetos?.length === 0) {
        setCreateNewProject(true)
      }
    } catch {
      // silent
    }
  }

  // ============================
  // STEP 1: Configurar
  // ============================
  function canAdvanceStep1() {
    if (!videoTitle.trim()) return false
    if (createNewProject && !newProjectName.trim()) return false
    if (!createNewProject && !selectedProjectId) return false
    return true
  }

  // ============================
  // STEP 2: Roteiro
  // ============================
  async function handleGenerateScript() {
    setError('')
    setGeneratingScript(true)
    try {
      // First, create the video to get an ID for script generation
      const projectId = await ensureProject()
      const videoData = await createVideo(projectId, {
        title: videoTitle.trim(),
        script: undefined,
        contentType,
      })
      setCreatedVideoId(videoData.video.id)

      // Now generate script with AI
      const scriptData = await generateVideoScript(videoData.video.id)
      setGeneratedScript(scriptData.video.script)
    } catch (err) {
      setError(err.message)
    } finally {
      setGeneratingScript(false)
    }
  }

  function getActiveScript() {
    if (scriptMode === 'ai') return generatedScript
    return manualScript
  }

  function canAdvanceStep2() {
    return getActiveScript().trim().length > 20
  }

  // ============================
  // STEP 3: Gerar
  // ============================
  async function ensureProject() {
    if (!createNewProject && selectedProjectId) {
      return selectedProjectId
    }
    // Create new project
    const projData = await createProject({
      name: newProjectName.trim(),
      description: '',
      niche: '',
      targetPlatform: contentType === 'short' ? 'tiktok' : 'youtube',
    })
    const newId = projData.projeto.id
    setSelectedProjectId(newId)
    setCreateNewProject(false)
    return newId
  }

  async function handleConfirmAndCreate() {
    setError('')
    setLoading(true)
    try {
      const script = getActiveScript()

      if (createdVideoId) {
        // Video already created (from AI script generation), just update script if manual
        if (scriptMode === 'manual') {
          // We need to create a new video since the AI one might have a different script
          const projectId = await ensureProject()
          const videoData = await createVideo(projectId, {
            title: videoTitle.trim(),
            script,
            contentType,
          })
          setCreatedVideoId(videoData.video.id)
        }
      } else {
        // Create the video now
        const projectId = await ensureProject()
        const videoData = await createVideo(projectId, {
          title: videoTitle.trim(),
          script,
          contentType,
        })
        setCreatedVideoId(videoData.video.id)
      }

      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleStartGeneration() {
    if (!createdVideoId) return
    setError('')
    setGenerating(true)
    try {
      await startVideoGeneration(createdVideoId)
      setGenerationStarted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  // ============================
  // NAVIGATION
  // ============================
  function handleNext() {
    if (step === 1 && canAdvanceStep1()) {
      setStep(2)
    } else if (step === 2 && canAdvanceStep2()) {
      handleConfirmAndCreate()
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1)
  }

  // ============================
  // RENDER
  // ============================
  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Back link */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Dashboard
      </Link>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-violet-400" />
          Creation Lab
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Crie videos faceless com IA em poucos passos</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const StepIcon = s.icon
          const isActive = step === s.id
          const isDone = step > s.id

          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                    : isDone
                    ? 'bg-green-600/10 text-green-400 border border-green-500/20'
                    : 'bg-gray-800/50 text-gray-500 border border-gray-700/50'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.id}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight className={`w-4 h-4 flex-shrink-0 ${step > s.id ? 'text-green-500' : 'text-gray-600'}`} />
              )}
            </div>
          )
        })}
      </div>

      <ErrorAlert message={error} />

      {/* Step Content */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        {/* ====== STEP 1: Configurar ====== */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Configurar Video</h2>
              <p className="text-sm text-gray-400">Defina o tipo e o projeto para o video</p>
            </div>

            {/* Tipo de conteudo */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Tipo de conteudo</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setContentType('long')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    contentType === 'long'
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-gray-600 bg-gray-900 hover:border-gray-500'
                  }`}
                >
                  <Film className={`w-6 h-6 mb-2 ${contentType === 'long' ? 'text-violet-400' : 'text-gray-500'}`} />
                  <h3 className={`font-medium text-sm ${contentType === 'long' ? 'text-violet-300' : 'text-gray-300'}`}>
                    Long-Form
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">8-12 min, YouTube</p>
                </button>
                <button
                  type="button"
                  onClick={() => setContentType('short')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    contentType === 'short'
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-gray-600 bg-gray-900 hover:border-gray-500'
                  }`}
                >
                  <Video className={`w-6 h-6 mb-2 ${contentType === 'short' ? 'text-violet-400' : 'text-gray-500'}`} />
                  <h3 className={`font-medium text-sm ${contentType === 'short' ? 'text-violet-300' : 'text-gray-300'}`}>
                    Short-Form
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">30-60s, TikTok/Reels</p>
                </button>
              </div>
            </div>

            {/* Titulo */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Titulo / Tema do video *</label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Ex: Os 5 habitos que mudaram minha produtividade"
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Projeto */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Projeto</label>

              {projects.length > 0 && (
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setCreateNewProject(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      !createNewProject
                        ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                        : 'border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    Projeto existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateNewProject(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      createNewProject
                        ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                        : 'border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    Novo projeto
                  </button>
                </div>
              )}

              {!createNewProject ? (
                <div className="relative">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none appearance-none"
                  >
                    <option value="">Selecione um projeto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              ) : (
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Nome do novo projeto"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                />
              )}
            </div>
          </div>
        )}

        {/* ====== STEP 2: Roteiro ====== */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Roteiro do Video</h2>
              <p className="text-sm text-gray-400">
                Gere com IA ou escreva seu proprio roteiro para "{videoTitle}"
              </p>
            </div>

            {/* Modo toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScriptMode('ai')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  scriptMode === 'ai'
                    ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                    : 'border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-500'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Gerar com IA
              </button>
              <button
                type="button"
                onClick={() => setScriptMode('manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  scriptMode === 'manual'
                    ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                    : 'border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-500'
                }`}
              >
                <FileText className="w-4 h-4" />
                Escrever manualmente
              </button>
            </div>

            {scriptMode === 'ai' ? (
              <div className="space-y-4">
                {!aiAvailable && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-300">
                      Configure OPENAI_API_KEY no .env para gerar roteiros com IA
                    </p>
                  </div>
                )}

                {!generatedScript ? (
                  <div className="text-center py-8">
                    <Sparkles className="w-10 h-10 text-violet-400/50 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm mb-4">
                      A IA vai gerar um roteiro otimizado com marcacao de cenas
                    </p>
                    <button
                      onClick={handleGenerateScript}
                      disabled={generatingScript || !aiAvailable}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingScript ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Gerando roteiro...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          Gerar Roteiro com IA
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400 font-medium">Roteiro gerado!</span>
                      </div>
                      <button
                        onClick={handleGenerateScript}
                        disabled={generatingScript}
                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        Regenerar
                      </button>
                    </div>
                    <textarea
                      value={generatedScript}
                      onChange={(e) => setGeneratedScript(e.target.value)}
                      rows={12}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white font-mono focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none resize-none leading-relaxed"
                    />
                    <p className="text-xs text-gray-500">
                      {generatedScript.length} caracteres — Voce pode editar o roteiro acima
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={manualScript}
                  onChange={(e) => setManualScript(e.target.value)}
                  placeholder={`Escreva o roteiro do video aqui...\n\nDica: Use [CENA 1], [CENA 2], etc. para marcar as cenas.`}
                  rows={12}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 font-mono focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none resize-none leading-relaxed"
                />
                <p className="text-xs text-gray-500">
                  {manualScript.length} caracteres — minimo 20 caracteres
                </p>
              </div>
            )}
          </div>
        )}

        {/* ====== STEP 3: Gerar ====== */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Tudo Pronto!</h2>
              <p className="text-sm text-gray-400">Revise e inicie a geracao do video</p>
            </div>

            {/* Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-400">Titulo</span>
                <span className="text-sm text-white font-medium">{videoTitle}</span>
              </div>
              <div className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-400">Tipo</span>
                <span className="text-sm text-white">{contentType === 'short' ? 'Short-Form' : 'Long-Form'}</span>
              </div>
              <div className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-400">Roteiro</span>
                <span className="text-sm text-white">{getActiveScript().length} caracteres</span>
              </div>
              <div className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-400">Pipeline</span>
                <span className={`text-sm ${services?.allConfigured ? 'text-green-400' : 'text-amber-400'}`}>
                  {services?.allConfigured ? 'Todos servicos ativos' : 'Alguns servicos faltando'}
                </span>
              </div>
            </div>

            {/* Pipeline steps preview */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-3">Etapas do pipeline</h3>
              <div className="space-y-2">
                {[
                  { label: 'Gerar narracao (TTS)', status: services?.elevenlabs || services?.minimax },
                  { label: 'Gerar prompts de imagem', status: true, note: services?.openai ? 'OpenAI' : 'Local' },
                  { label: 'Gerar imagens por cena', status: services?.replicate || services?.minimax },
                  { label: 'Gerar timestamps para legendas', status: true, note: services?.openai ? 'Whisper' : 'Estimativa local' },
                  { label: 'Montar video (FFmpeg)', status: services?.ffmpeg },
                  { label: 'Gravar legendas estilizadas', status: services?.ffmpeg },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {item.status ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    )}
                    <span className={item.status ? 'text-gray-300' : 'text-gray-500'}>
                      {item.label}
                      {item.note && <span className="text-gray-500 ml-1">({item.note})</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {!generationStarted ? (
              <div className="flex gap-3">
                <button
                  onClick={handleStartGeneration}
                  disabled={generating || !services?.allConfigured}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      Iniciar Geracao
                    </>
                  )}
                </button>
                <button
                  onClick={() => navigate(`/videos/${createdVideoId}`)}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                >
                  Ver Detalhes
                </button>
              </div>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Geracao iniciada com sucesso!</span>
                </div>
                <p className="text-sm text-gray-400">
                  O pipeline esta processando. Acompanhe o progresso na pagina de detalhes.
                </p>
                <button
                  onClick={() => navigate(`/videos/${createdVideoId}`)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  Acompanhar Progresso
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      {step < 3 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <button
            onClick={handleNext}
            disabled={
              (step === 1 && !canAdvanceStep1()) ||
              (step === 2 && !canAdvanceStep2()) ||
              loading
            }
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : step === 2 ? (
              <>
                Confirmar e Criar
                <CheckCircle2 className="w-4 h-4" />
              </>
            ) : (
              <>
                Proximo
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
