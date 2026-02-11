// Rotas de autenticacao - registro, login, perfil
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');

const router = express.Router();

// POST /api/auth/register - Registrar novo usuario
router.post('/register', validateRegister, (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Verificar se email ja esta em uso
    const existingUser = User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ erro: 'Email ja esta em uso' });
    }

    // Hash da senha
    const passwordHash = bcrypt.hashSync(password, config.BCRYPT_ROUNDS);

    // Criar usuario
    const user = User.create({ email, passwordHash, name });

    // Gerar token JWT
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    res.status(201).json({ usuario: user, token });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login - Fazer login
router.post('/login', validateLogin, (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario com password_hash
    const userRow = User.findByEmail(email);
    if (!userRow) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    // Verificar senha
    const validPassword = bcrypt.compareSync(password, userRow.password_hash);
    if (!validPassword) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    // Buscar usuario sem password_hash
    const user = User.findById(userRow.id);

    // Gerar token JWT
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    res.json({ usuario: user, token });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me - Obter dados do usuario autenticado
router.get('/me', authenticateToken, (req, res) => {
  res.json({ usuario: req.user });
});

// PUT /api/auth/me - Atualizar perfil
router.put('/me', authenticateToken, (req, res, next) => {
  try {
    const { name } = req.body;
    const user = User.update(req.user.id, { name });
    res.json({ usuario: user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
