// Rotas para geracao de video (pipeline)
const express = require('express');
const Video = require('../models/Video');
const Project = require('../models/Project');
const GenerationJob = require('../models/GenerationJob');
const VideoAsset = require('../models/VideoAsset');
const { authenticateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const pipeline = require('../services/pipeline');
const openaiService = require('../services/openai');
const elevenlabsService = require('../services/elevenlabs');
const replicateService = require('../services/replicate');
const ffmpegService = require('../services/ffmpeg');

const router = express.Router();
router.use(authenticateToken);

// Verifica ownership
function verifyVideoOwnership(req, videoId) {
  const video = Video.findById(videoId);
  if (!video) throw new AppError('Video nao encontrado', 404);
  const project = Project.findById(video.projectId);
  if (!project || project.userId !== req.user.id) {
    throw new AppError('Video nao encontrado', 404);
  }
  return { video, project };
}

// POST /api/videos/:id/generate - Iniciar geracao completa do video
router.post('/videos/:id/generate', async (req, res, next) => {
  try {
    const { video } = verifyVideoOwnership(req, req.params.id);

    // Verifica se ja tem um job em andamento
    const existingJob = GenerationJob.findByVideoId(video.id);
    if (existingJob && existingJob.status === 'processing') {
      throw new AppError('Ja existe uma geracao em andamento para este video', 409);
    }

    // Verifica servicos necessarios
    if (!openaiService.isConfigured()) {
      throw new AppError('OPENAI_API_KEY nao configurada', 400);
    }
    if (!elevenlabsService.isConfigured()) {
      throw new AppError('ELEVENLABS_API_KEY nao configurada', 400);
    }
    if (!replicateService.isConfigured()) {
      throw new AppError('REPLICATE_API_TOKEN nao configurado', 400);
    }
    if (!ffmpegService.isInstalled()) {
      throw new AppError('FFmpeg nao esta instalado. Execute: brew install ffmpeg', 400);
    }

    // Atualiza status e inicia pipeline em background
    Video.update(video.id, { status: 'video_generating' });

    // Roda em background (nao bloqueia a resposta)
    pipeline.runPipeline(video.id).catch(err => {
      console.error(`[Generation] Pipeline falhou para video #${video.id}:`, err.message);
    });

    const job = GenerationJob.findByVideoId(video.id);

    res.json({
      mensagem: 'Geracao iniciada',
      video: Video.findById(video.id),
      job,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/videos/:id/generation-status - Status da geracao
router.get('/videos/:id/generation-status', (req, res, next) => {
  try {
    verifyVideoOwnership(req, req.params.id);
    const status = pipeline.getStatus(parseInt(req.params.id));
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// POST /api/videos/:id/retry - Tentar novamente
router.post('/videos/:id/retry', async (req, res, next) => {
  try {
    const { video } = verifyVideoOwnership(req, req.params.id);

    if (video.status !== 'error') {
      throw new AppError('Somente videos com erro podem ser retentados', 400);
    }

    // Limpa erro anterior
    Video.update(video.id, { status: 'video_generating', errorMessage: null });

    // Roda em background
    pipeline.runPipeline(video.id).catch(err => {
      console.error(`[Generation] Retry falhou para video #${video.id}:`, err.message);
    });

    const job = GenerationJob.findByVideoId(video.id);

    res.json({
      mensagem: 'Retentativa iniciada',
      video: Video.findById(video.id),
      job,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/services-status - Status de todos os servicos de IA
router.get('/ai/services-status', (req, res) => {
  res.json({
    openai: openaiService.isConfigured(),
    elevenlabs: elevenlabsService.isConfigured(),
    replicate: replicateService.isConfigured(),
    ffmpeg: ffmpegService.isInstalled(),
    allConfigured: openaiService.isConfigured() &&
                   elevenlabsService.isConfigured() &&
                   replicateService.isConfigured() &&
                   ffmpegService.isInstalled(),
  });
});

// GET /api/ai/voices - Lista vozes disponiveis
router.get('/ai/voices', async (req, res, next) => {
  try {
    const voices = await elevenlabsService.listVoices();
    res.json({ voices });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
