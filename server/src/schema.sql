-- D1 Database Schema for Señor Shaعbi

-- Create proverbs table
CREATE TABLE IF NOT EXISTS proverbs (
    id TEXT PRIMARY KEY,
    spanish TEXT NOT NULL,
    arabic TEXT NOT NULL,
    english TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Wisdom',
    note TEXT,
    image TEXT,
    image_job_status TEXT,
    image_job_attempts INTEGER NOT NULL DEFAULT 0,
    image_job_next_retry_at TEXT,
    image_job_error TEXT,
    image_prompt_hash TEXT,
    image_generation_prompt TEXT,
    curator TEXT NOT NULL,
    date TEXT NOT NULL,
    bookmarked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    token_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS users_password_bump_token_version
AFTER UPDATE OF password ON users
FOR EACH ROW
WHEN NEW.password <> OLD.password
BEGIN
    UPDATE users
    SET token_version = OLD.token_version + 1
    WHERE id = OLD.id;
END;

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_proverbs_category ON proverbs(category);
CREATE INDEX IF NOT EXISTS idx_proverbs_spanish ON proverbs(spanish);
