// Rotas CRUD de projetos
const express = require('express');
const Project = require('../models/Project');
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
