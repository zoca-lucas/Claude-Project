// Middleware de validacao de entrada com express-validator
const { body, validationResult } = require('express-validator');

// Verifica resultado da validacao e retorna 400 se houver erros
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ erro: 'Dados invalidos', detalhes: errors.array() });
  }
  next();
}

// Regras de validacao para registro
const validateRegister = [
  body('email').isEmail().withMessage('Email invalido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter no minimo 6 caracteres'),
  body('name').optional().isString().trim(),
  handleValidation,
];

// Regras de validacao para login
const validateLogin = [
  body('email').isEmail().withMessage('Email invalido'),
  body('password').notEmpty().withMessage('Senha e obrigatoria'),
  handleValidation,
];

// Regras de validacao para criar/atualizar projeto
const validateProject = [
  body('name').notEmpty().withMessage('Nome do projeto e obrigatorio').trim(),
  body('description').optional().isString().trim(),
  body('niche').optional().isString().trim(),
  body('targetPlatform').optional().isIn(['youtube', 'tiktok']).withMessage('Plataforma deve ser youtube ou tiktok'),
  handleValidation,
];

// Regras de validacao para atualizar projeto (todos campos opcionais)
const validateProjectUpdate = [
  body('name').optional().notEmpty().withMessage('Nome nao pode ser vazio').trim(),
  body('description').optional().isString().trim(),
  body('niche').optional().isString().trim(),
  body('targetPlatform').optional().isIn(['youtube', 'tiktok']).withMessage('Plataforma deve ser youtube ou tiktok'),
  body('status').optional().isIn(['active', 'paused', 'archived']).withMessage('Status invalido'),
  handleValidation,
];

// Regras de validacao para criar video
const validateVideo = [
  body('title').notEmpty().withMessage('Titulo do video e obrigatorio').trim(),
  body('script').optional().isString(),
  handleValidation,
];

// Regras de validacao para atualizar video
const validateVideoUpdate = [
  body('title').optional().notEmpty().withMessage('Titulo nao pode ser vazio').trim(),
  body('script').optional().isString(),
  body('status').optional().isIn(['pending', 'script_generated', 'video_generating', 'done', 'error']).withMessage('Status invalido'),
  handleValidation,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateProject,
  validateProjectUpdate,
  validateVideo,
  validateVideoUpdate,
};
