// Camada de acesso a dados - Configuracoes do Projeto
const { getDb } = require('../config/database');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    narrationVoice: row.narration_voice,
    narrationVoiceId: row.narration_voice_id,
    scriptModel: row.script_model,
    imageModel: row.image_model,
    imageStyle: row.image_style,
    captionStyle: row.caption_style,
    captionPosition: row.caption_position,
    captionColor: row.caption_color,
    captionBgColor: row.caption_bg_color,
    contextText: row.context_text,
    contentLanguage: row.content_language,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Busca settings de um projeto (cria default se nao existir)
function findByProjectId(projectId) {
  const db = getDb();
  let row = db.prepare('SELECT * FROM project_settings WHERE project_id = ?').get(projectId);

  if (!row) {
    // Cria settings padrao
    db.prepare('INSERT INTO project_settings (project_id) VALUES (?)').run(projectId);
    row = db.prepare('SELECT * FROM project_settings WHERE project_id = ?').get(projectId);
  }

  return mapRow(row);
}

// Atualiza settings (upsert)
function upsert(projectId, fields) {
  const db = getDb();

  // Garante que existe
  findByProjectId(projectId);

  const allowedFields = {
    narrationVoice: 'narration_voice',
    narrationVoiceId: 'narration_voice_id',
    scriptModel: 'script_model',
    imageModel: 'image_model',
    imageStyle: 'image_style',
    captionStyle: 'caption_style',
    captionPosition: 'caption_position',
    captionColor: 'caption_color',
    captionBgColor: 'caption_bg_color',
    contextText: 'context_text',
    contentLanguage: 'content_language',
  };

  const setClauses = [];
  const values = [];

  for (const [jsKey, dbCol] of Object.entries(allowedFields)) {
    if (fields[jsKey] !== undefined) {
      setClauses.push(`${dbCol} = ?`);
      values.push(fields[jsKey]);
    }
  }

  if (setClauses.length === 0) return findByProjectId(projectId);

  setClauses.push("updated_at = datetime('now')");
  values.push(projectId);

  db.prepare(`UPDATE project_settings SET ${setClauses.join(', ')} WHERE project_id = ?`).run(...values);
  return findByProjectId(projectId);
}

module.exports = { findByProjectId, upsert };
