ALTER TABLE proverbs ADD COLUMN image_job_status TEXT;
ALTER TABLE proverbs ADD COLUMN image_job_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE proverbs ADD COLUMN image_job_next_retry_at TEXT;
ALTER TABLE proverbs ADD COLUMN image_job_error TEXT;
ALTER TABLE proverbs ADD COLUMN image_prompt_hash TEXT;
