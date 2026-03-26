CREATE TABLE IF NOT EXISTS api_rate_limits (
    rate_key TEXT PRIMARY KEY,
    policy_key TEXT NOT NULL,
    rule_key TEXT NOT NULL,
    subject TEXT NOT NULL,
    window_started_at INTEGER NOT NULL,
    window_ends_at INTEGER NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_policy ON api_rate_limits(policy_key);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window_end ON api_rate_limits(window_ends_at);
