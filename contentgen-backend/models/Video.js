// Camada de acesso a dados - Videos
const { getDb } = require('../config/database');

// Converte snake_case do banco para camelCase
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    script: row.script,
    status: row.status,
    contentType: row.content_type || 'long',
    sceneData: row.scene_data ? JSON.parse(row.scene_data) : null,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url,
    errorMessage: row.error_message,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Busca video por ID
function findById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
  return mapRow(row);
}

// Lista videos de um projeto com filtro opcional de status
function findAllByProjectId(projectId, { limit = 50, offset = 0, status } = {}) {
  const db = getDb();

  if (status) {
    const rows = db.prepare(
      'SELECT * FROM videos WHERE project_id = ? AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(projectId, status, limit, offset);
    return rows.map(mapRow);
  }

  const rows = db.prepare(
    'SELECT * FROM videos WHERE project_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(projectId, limit, offset);
  return rows.map(mapRow);
}

// Conta videos de um projeto
function countByProjectId(projectId) {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM videos WHERE project_id = ?').get(projectId);
  return row.count;
}

// Cria novo video
function create({ projectId, title, script, status, contentType }) {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO videos (project_id, title, script, status, content_type) VALUES (?, ?, ?, ?, ?)'
  ).run(projectId, title, script || null, status || 'pending', contentType || 'long');
  return findById(result.lastInsertRowid);
}

// Atualiza video (apenas campos fornecidos)
function update(id, fields) {
  const db = getDb();
  const allowedFields = {
    title: 'title',
    script: 'script',
    status: 'status',
    contentType: 'content_type',
    sceneData: 'scene_data',
    videoUrl: 'video_url',
    thumbnailUrl: 'thumbnail_url',
    errorMessage: 'error_message',
    scheduledAt: 'scheduled_at',
    publishedAt: 'published_at',
  };

  const setClauses = [];
  const values = [];

  for (const [jsKey, dbCol] of Object.entries(allowedFields)) {
    if (fields[jsKey] !== undefined) {
      setClauses.push(`${dbCol} = ?`);
      // Serializa objetos JSON (sceneData)
      const val = (jsKey === 'sceneData' && typeof fields[jsKey] === 'object')
        ? JSON.stringify(fields[jsKey])
        : fields[jsKey];
      values.push(val);
    }
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE videos SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

// Remove video
function remove(id) {
  const db = getDb();
  db.prepare('DELETE FROM videos WHERE id = ?').run(id);
}

module.exports = { findById, findAllByProjectId, countByProjectId, create, update, remove };
