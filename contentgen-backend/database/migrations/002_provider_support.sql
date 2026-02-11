ALTER TABLE project_settings ADD COLUMN tts_provider TEXT DEFAULT 'elevenlabs' CHECK(tts_provider IN ('elevenlabs', 'minimax'));
ALTER TABLE project_settings ADD COLUMN image_provider TEXT DEFAULT 'replicate' CHECK(image_provider IN ('replicate', 'minimax'));
ALTER TABLE project_settings ADD COLUMN video_provider TEXT DEFAULT 'ffmpeg' CHECK(video_provider IN ('ffmpeg', 'minimax'));
ALTER TABLE project_settings ADD COLUMN minimax_voice_id TEXT;
ALTER TABLE project_settings ADD COLUMN video_resolution TEXT DEFAULT '1080P';
ALTER TABLE project_settings ADD COLUMN video_duration INTEGER DEFAULT 6;
