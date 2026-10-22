-- Work Logs Database Schema
-- Table to store authorized staff work logs

CREATE TABLE IF NOT EXISTS work_logs (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(32) NOT NULL,
    channel_id VARCHAR(32) NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    username VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

-- Indexes to optimize queries for future features (!logs, filter by user, date range)
CREATE INDEX IF NOT EXISTS idx_work_logs_guild_id ON work_logs (guild_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_user_id ON work_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_created_at ON work_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_logs_guild_user ON work_logs (guild_id, user_id);

-- Guild Configuration Settings (e.g. dedicated log channel)
CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id VARCHAR(32) PRIMARY KEY,
    log_channel_id VARCHAR(32),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);
