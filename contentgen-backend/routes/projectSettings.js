// Rotas para configuracoes de projeto (voz, modelo, legendas, contexto)
const express = require('express');
const Project = require('../models/Project');
const ProjectSettings = require('../models/ProjectSettings');
const { authenticateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticateToken);

function verifyProjectOwnership(req, projectId) {
  const project = Project.findById(projectId);
  if (!project || project.userId !== req.user.id) {
    throw new AppError('Projeto nao encontrado', 404);
  }
  return project;
}

// GET /api/projects/:id/settings - Obter settings do projeto
router.get('/projects/:id/settings', (req, res, next) => {
  try {
    verifyProjectOwnership(req, req.params.id);
    const settings = ProjectSettings.findByProjectId(req.params.id);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id/settings - Atualizar settings
router.put('/projects/:id/settings', (req, res, next) => {
  try {
    verifyProjectOwnership(req, req.params.id);

    const {
      narrationVoice, narrationVoiceId, scriptModel, imageModel,
      imageStyle, captionStyle, captionPosition, captionColor,
      captionBgColor, contextText, contentLanguage,
    } = req.body;

    const settings = ProjectSettings.upsert(req.params.id, {
      narrationVoice, narrationVoiceId, scriptModel, imageModel,
      imageStyle, captionStyle, captionPosition, captionColor,
      captionBgColor, contextText, contentLanguage,
    });

    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
