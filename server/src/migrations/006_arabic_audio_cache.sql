ALTER TABLE proverbs ADD COLUMN arabic_audio_url TEXT;
ALTER TABLE proverbs ADD COLUMN arabic_audio_object_key TEXT;
ALTER TABLE proverbs ADD COLUMN arabic_audio_text_hash TEXT;
ALTER TABLE proverbs ADD COLUMN arabic_audio_status TEXT;
ALTER TABLE proverbs ADD COLUMN arabic_audio_error TEXT;
ALTER TABLE proverbs ADD COLUMN arabic_audio_model TEXT;
ALTER TABLE proverbs ADD COLUMN arabic_audio_voice_id TEXT;
ALTER TABLE proverbs ADD COLUMN arabic_audio_content_type TEXT;
ALTER TABLE proverbs ADD COLUMN arabic_audio_created_at TEXT;
ALTER TABLE proverbs ADD COLUMN arabic_audio_updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_proverbs_arabic_audio_status ON proverbs(arabic_audio_status);
