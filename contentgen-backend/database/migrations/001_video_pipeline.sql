-- Migration 001: Video generation pipeline tables
-- Adds project_settings, generation_jobs, video_assets, and expands video status

-- Configuracoes do projeto (voz, modelo, estilo de legenda, contexto)
CREATE TABLE IF NOT EXISTS project_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL UNIQUE,
    narration_voice TEXT DEFAULT 'alloy',
    narration_voice_id TEXT,
    script_model TEXT DEFAULT 'gpt-4o-mini',
    image_model TEXT DEFAULT 'flux-schnell',
    image_style TEXT DEFAULT 'cinematic',
    caption_style TEXT DEFAULT 'default',
    caption_position TEXT DEFAULT 'bottom' CHECK(caption_position IN ('top', 'center', 'bottom')),
    caption_color TEXT DEFAULT '#FFFFFF',
    caption_bg_color TEXT DEFAULT '#000000',
    context_text TEXT,
    content_language TEXT DEFAULT 'pt-BR',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_settings_project_id ON project_settings(project_id);

-- Jobs de geracao (rastreia cada etapa do pipeline)
CREATE TABLE IF NOT EXISTS generation_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    current_step TEXT DEFAULT 'queued' CHECK(current_step IN (
        'queued', 'script', 'audio', 'image_prompts', 'images', 'timestamps', 'assembly', 'captions', 'done'
    )),
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TEXT,
    completed_at TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_video_id ON generation_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);

-- Assets gerados (arquivos: audio, imagens, video, legendas)
CREATE TABLE IF NOT EXISTS video_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    asset_type TEXT NOT NULL CHECK(asset_type IN ('audio', 'image', 'video', 'subtitle', 'thumbnail')),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    mime_type TEXT,
    duration_seconds REAL,
    sort_order INTEGER DEFAULT 0,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_video_assets_video_id ON video_assets(video_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_type ON video_assets(asset_type);

-- Adicionar coluna content_type a tabela videos (long/short)
-- SQLite nao suporta ALTER TABLE ADD COLUMN com CHECK,
-- entao adicionamos sem CHECK constraint
ALTER TABLE videos ADD COLUMN content_type TEXT DEFAULT 'long';

-- Adicionar coluna scene_data para guardar o script estruturado com cenas
ALTER TABLE videos ADD COLUMN scene_data TEXT;
