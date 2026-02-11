// Rotas CRUD de videos + geracao de roteiro com IA
const express = require('express');
const Video = require('../models/Video');
const Project = require('../models/Project');
const { authenticateToken } = require('../middleware/auth');
const { validateVideo, validateVideoUpdate } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');
const openaiService = require('../services/openai');

const router = express.Router();

// Todas as rotas requerem autenticacao
router.use(authenticateToken);

// Verifica se o usuario eh dono do projeto
function verifyProjectOwnership(req, projectId) {
  const project = Project.findById(projectId);
  if (!project || project.userId !== req.user.id) {
    throw new AppError('Projeto nao encontrado', 404);
  }
  return project;
}

// Verifica se o usuario eh dono do video (via projeto pai)
function verifyVideoOwnership(req, videoId) {
  const video = Video.findById(videoId);
  if (!video) {
    throw new AppError('Video nao encontrado', 404);
  }
  verifyProjectOwnership(req, video.projectId);
  return video;
}

// GET /api/projects/:projectId/videos - Listar videos de um projeto
router.get('/projects/:projectId/videos', (req, res, next) => {
  try {
    verifyProjectOwnership(req, req.params.projectId);

    const { status } = req.query;
    const videos = Video.findAllByProjectId(req.params.projectId, { status });
    const total = Video.countByProjectId(req.params.projectId);

    res.json({ videos, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/videos/:id - Obter detalhes de um video
router.get('/videos/:id', (req, res, next) => {
  try {
    const video = verifyVideoOwnership(req, req.params.id);
    res.json({ video });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:projectId/videos - Criar novo video
router.post('/projects/:projectId/videos', validateVideo, (req, res, next) => {
  try {
    verifyProjectOwnership(req, req.params.projectId);

    const { title, script } = req.body;
    const video = Video.create({
      projectId: req.params.projectId,
      title,
      script,
    });

    res.status(201).json({ video });
  } catch (err) {
    next(err);
  }
});

// PUT /api/videos/:id - Atualizar video
router.put('/videos/:id', validateVideoUpdate, (req, res, next) => {
  try {
    verifyVideoOwnership(req, req.params.id);

    const { title, script, status } = req.body;
    const updated = Video.update(req.params.id, { title, script, status });

    res.json({ video: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/videos/:id - Deletar video
router.delete('/videos/:id', (req, res, next) => {
  try {
    verifyVideoOwnership(req, req.params.id);
    Video.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/status - Verificar se IA esta configurada
router.get('/ai/status', (req, res) => {
  res.json({
    configurado: openaiService.isConfigured(),
    modelo: 'gpt-4o-mini',
  });
});

// POST /api/videos/:id/generate-script - Gerar roteiro com IA
router.post('/videos/:id/generate-script', async (req, res, next) => {
  try {
    if (!openaiService.isConfigured()) {
      throw new AppError('OPENAI_API_KEY nao configurada. Adicione no arquivo .env do backend.', 400);
    }

    const video = verifyVideoOwnership(req, req.params.id);
    const project = Project.findById(video.projectId);

    // Gera o roteiro usando OpenAI
    const result = await openaiService.generateScript({
      title: video.title,
      niche: project.niche,
      platform: project.targetPlatform,
      description: project.description,
    });

    // Atualiza o video com o roteiro gerado e muda status
    const updated = Video.update(req.params.id, {
      script: result.script,
      status: 'script_generated',
    });

    res.json({
      video: updated,
      ia: {
        modelo: result.model,
        tokensUsados: result.tokensUsed,
      },
    });
  } catch (err) {
    // Se for erro da OpenAI, formata melhor
    if (err.status === 401) {
      return next(new AppError('Chave da OpenAI invalida. Verifique no .env.', 401));
    }
    if (err.status === 429) {
      return next(new AppError('Limite de requisicoes da OpenAI atingido. Tente novamente em alguns minutos.', 429));
    }
    next(err);
  }
});

module.exports = router;
