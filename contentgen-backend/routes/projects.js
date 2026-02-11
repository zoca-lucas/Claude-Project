// Rotas CRUD de projetos
const express = require('express');
const Project = require('../models/Project');
const { getDb } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateProject, validateProjectUpdate } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Todas as rotas requerem autenticacao
router.use(authenticateToken);

// GET /api/projects - Listar projetos do usuario
router.get('/', (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const projetos = Project.findAllByUserId(req.user.id, { limit, offset });
    const total = Project.countByUserId(req.user.id);

    res.json({ projetos, total, pagina: page, limite: limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/dashboard-stats - Estatisticas para o dashboard
router.get('/dashboard-stats', (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    // Total de projetos do usuario
    const projectCount = Project.countByUserId(userId);

    // Total de videos e contagem por status
    const videoStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN v.status = 'done' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN v.status = 'error' THEN 1 ELSE 0 END) as errors,
        SUM(CASE WHEN v.status IN ('video_generating','audio_generating','images_generating','video_assembling') THEN 1 ELSE 0 END) as generating,
        SUM(CASE WHEN v.status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM videos v
      INNER JOIN projects p ON v.project_id = p.id
      WHERE p.user_id = ?
    `).get(userId);

    // Videos recentes (ultimos 5 com status ativo ou concluido)
    const recentVideos = db.prepare(`
      SELECT v.id, v.title, v.status, v.content_type, v.created_at, v.video_url,
             p.id as project_id, p.name as project_name
      FROM videos v
      INNER JOIN projects p ON v.project_id = p.id
      WHERE p.user_id = ?
      ORDER BY v.created_at DESC
      LIMIT 8
    `).all(userId).map(row => ({
      id: row.id,
      title: row.title,
      status: row.status,
      contentType: row.content_type || 'long',
      createdAt: row.created_at,
      videoUrl: row.video_url,
      projectId: row.project_id,
      projectName: row.project_name,
    }));

    res.json({
      projects: {
        total: projectCount,
      },
      videos: {
        total: videoStats.total || 0,
        completed: videoStats.completed || 0,
        errors: videoStats.errors || 0,
        generating: videoStats.generating || 0,
        pending: videoStats.pending || 0,
      },
      recentVideos,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id - Obter detalhes de um projeto
router.get('/:id', (req, res, next) => {
  try {
    const project = Project.findById(req.params.id);

    if (!project || project.userId !== req.user.id) {
      throw new AppError('Projeto nao encontrado', 404);
    }

    res.json({ projeto: project });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects - Criar novo projeto
router.post('/', validateProject, (req, res, next) => {
  try {
    const { name, description, niche, targetPlatform } = req.body;

    const project = Project.create({
      userId: req.user.id,
      name,
      description,
      niche,
      targetPlatform,
    });

    res.status(201).json({ projeto: project });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id - Atualizar projeto
router.put('/:id', validateProjectUpdate, (req, res, next) => {
  try {
    const project = Project.findById(req.params.id);

    if (!project || project.userId !== req.user.id) {
      throw new AppError('Projeto nao encontrado', 404);
    }

    const { name, description, niche, targetPlatform, status } = req.body;
    const updated = Project.update(req.params.id, { name, description, niche, targetPlatform, status });

    res.json({ projeto: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id - Deletar projeto
router.delete('/:id', (req, res, next) => {
  try {
    const project = Project.findById(req.params.id);

    if (!project || project.userId !== req.user.id) {
      throw new AppError('Projeto nao encontrado', 404);
    }

    Project.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
