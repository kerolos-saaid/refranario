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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_proverbs_category ON proverbs(category);
CREATE INDEX IF NOT EXISTS idx_proverbs_spanish ON proverbs(spanish);
