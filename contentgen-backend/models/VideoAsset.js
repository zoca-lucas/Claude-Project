// Camada de acesso a dados - Assets de video (arquivos gerados)
const { getDb } = require('../config/database');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    videoId: row.video_id,
    assetType: row.asset_type,
    filePath: row.file_path,
    fileName: row.file_name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    durationSeconds: row.duration_seconds,
    sortOrder: row.sort_order,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    createdAt: row.created_at,
  };
}

function findById(id) {
  const db = getDb();
  return mapRow(db.prepare('SELECT * FROM video_assets WHERE id = ?').get(id));
}

function findByVideoId(videoId, assetType) {
  const db = getDb();
  if (assetType) {
    return db.prepare(
      'SELECT * FROM video_assets WHERE video_id = ? AND asset_type = ? ORDER BY sort_order ASC'
    ).all(videoId, assetType).map(mapRow);
  }
  return db.prepare(
    'SELECT * FROM video_assets WHERE video_id = ? ORDER BY asset_type, sort_order ASC'
  ).all(videoId).map(mapRow);
}

function create({ videoId, assetType, filePath, fileName, fileSize, mimeType, durationSeconds, sortOrder, metadata }) {
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO video_assets (video_id, asset_type, file_path, file_name, file_size, mime_type, duration_seconds, sort_order, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    videoId,
    assetType,
    filePath,
    fileName,
    fileSize || 0,
    mimeType || null,
    durationSeconds || null,
    sortOrder || 0,
    metadata ? JSON.stringify(metadata) : null
  );
  return findById(result.lastInsertRowid);
}

// Remove todos os assets de um video (ou de um tipo)
function removeByVideoId(videoId, assetType) {
  const db = getDb();
  if (assetType) {
    db.prepare('DELETE FROM video_assets WHERE video_id = ? AND asset_type = ?').run(videoId, assetType);
  } else {
    db.prepare('DELETE FROM video_assets WHERE video_id = ?').run(videoId);
  }
}

function remove(id) {
  const db = getDb();
  db.prepare('DELETE FROM video_assets WHERE id = ?').run(id);
}

module.exports = { findById, findByVideoId, create, removeByVideoId, remove };
