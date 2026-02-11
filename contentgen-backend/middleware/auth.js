// Middleware de autenticacao JWT
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

// Verifica token JWT e anexa usuario em req.user
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ erro: 'Token de autenticacao nao fornecido' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({ erro: 'Usuario nao encontrado' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token invalido ou expirado' });
  }
}

module.exports = { authenticateToken };
