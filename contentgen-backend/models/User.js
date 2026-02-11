// Camada de acesso a dados - Usuarios
const { getDb } = require('../config/database');

// Converte snake_case do banco para camelCase
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Busca usuario por email (inclui password_hash para autenticacao)
function findByEmail(email) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  return row || null;
}

// Busca usuario por ID (sem password_hash)
function findById(id) {
  const db = getDb();
  const row = db.prepare('SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?').get(id);
  return mapRow(row);
}

// Cria novo usuario
function create({ email, passwordHash, name }) {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  ).run(email, passwordHash, name || null);
  return findById(result.lastInsertRowid);
}

// Atualiza dados do usuario
function update(id, { name }) {
  const db = getDb();
  db.prepare(
    "UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(name, id);
  return findById(id);
}

// Remove usuario
function remove(id) {
  const db = getDb();
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

module.exports = { findByEmail, findById, create, update, remove, mapRow };
