// Camada de acesso a dados - Projetos
const { getDb } = require('../config/database');

// Converte snake_case do banco para camelCase
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    niche: row.niche,
    targetPlatform: row.target_platform,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Busca projeto por ID
function findById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  return mapRow(row);
}

// Lista todos os projetos de um usuario com paginacao
function findAllByUserId(userId, { limit = 20, offset = 0 } = {}) {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(userId, limit, offset);
  return rows.map(mapRow);
}

// Conta total de projetos de um usuario
function countByUserId(userId) {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM projects WHERE user_id = ?').get(userId);
  return row.count;
}

// Cria novo projeto
function create({ userId, name, description, niche, targetPlatform }) {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO projects (user_id, name, description, niche, target_platform) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, name, description || null, niche || null, targetPlatform || 'youtube');
  return findById(result.lastInsertRowid);
}

// Atualiza projeto (apenas campos fornecidos)
function update(id, fields) {
  const db = getDb();
  const allowedFields = {
    name: 'name',
    description: 'description',
    niche: 'niche',
    targetPlatform: 'target_platform',
    status: 'status',
  };

  const setClauses = [];
  const values = [];

  for (const [jsKey, dbCol] of Object.entries(allowedFields)) {
    if (fields[jsKey] !== undefined) {
      setClauses.push(`${dbCol} = ?`);
      values.push(fields[jsKey]);
    }
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

// Remove projeto (cascade deleta videos associados)
function remove(id) {
  const db = getDb();
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}

module.exports = { findById, findAllByUserId, countByUserId, create, update, remove };
