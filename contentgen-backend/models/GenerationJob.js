// Camada de acesso a dados - Jobs de geracao de video
const { getDb } = require('../config/database');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    videoId: row.video_id,
    status: row.status,
    currentStep: row.current_step,
    progress: row.progress,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function findById(id) {
  const db = getDb();
  return mapRow(db.prepare('SELECT * FROM generation_jobs WHERE id = ?').get(id));
}

function findByVideoId(videoId) {
  const db = getDb();
  return mapRow(
    db.prepare('SELECT * FROM generation_jobs WHERE video_id = ? ORDER BY created_at DESC LIMIT 1').get(videoId)
  );
}

function findAllByVideoId(videoId) {
  const db = getDb();
  return db.prepare('SELECT * FROM generation_jobs WHERE video_id = ? ORDER BY created_at DESC').all(videoId).map(mapRow);
}

function create(videoId) {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO generation_jobs (video_id, status, current_step, started_at) VALUES (?, 'processing', 'script', datetime('now'))"
  ).run(videoId);
  return findById(result.lastInsertRowid);
}

function updateStatus(id, { status, currentStep, progress, errorMessage, metadata }) {
  const db = getDb();
  const setClauses = ["updated_at = datetime('now')"];
  const values = [];

  if (status !== undefined) {
    setClauses.push('status = ?');
    values.push(status);
    if (status === 'completed' || status === 'failed') {
      setClauses.push("completed_at = datetime('now')");
    }
  }
  if (currentStep !== undefined) {
    setClauses.push('current_step = ?');
    values.push(currentStep);
  }
  if (progress !== undefined) {
    setClauses.push('progress = ?');
    values.push(progress);
  }
  if (errorMessage !== undefined) {
    setClauses.push('error_message = ?');
    values.push(errorMessage);
  }
  if (metadata !== undefined) {
    setClauses.push('metadata = ?');
    values.push(JSON.stringify(metadata));
  }

  values.push(id);
  db.prepare(`UPDATE generation_jobs SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

// Progresso mapeado por step
const STEP_PROGRESS = {
  queued: 0,
  script: 10,
  audio: 25,
  image_prompts: 40,
  images: 55,
  timestamps: 70,
  assembly: 85,
  captions: 95,
  done: 100,
};

function getProgressForStep(step) {
  return STEP_PROGRESS[step] || 0;
}

module.exports = { findById, findByVideoId, findAllByVideoId, create, updateStatus, getProgressForStep, STEP_PROGRESS };
