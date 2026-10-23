-- Ongrywolf Multi-Bot Platform Database Schema

-- 1. Table to store authorized staff work logs (Manager Bot)
CREATE TABLE IF NOT EXISTS work_logs (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(32) NOT NULL,
    channel_id VARCHAR(32) NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    username VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_logs_guild_id ON work_logs (guild_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_user_id ON work_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_created_at ON work_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_logs_guild_user ON work_logs (guild_id, user_id);

-- 2. Guild Configuration Settings (e.g. dedicated log channel)
CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id VARCHAR(32) PRIMARY KEY,
    log_channel_id VARCHAR(32),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

-- 3. Multi-Bot Configurations and State Registry
CREATE TABLE IF NOT EXISTS bot_configurations (
    bot_id VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    desired_enabled BOOLEAN NOT NULL DEFAULT true,
    observed_state VARCHAR(20) NOT NULL DEFAULT 'offline',
    status_text VARCHAR(255) NOT NULL DEFAULT 'Hosting on Ongrywolf',
    status_type VARCHAR(50) NOT NULL DEFAULT 'Custom',
    assigned_commands TEXT[] NOT NULL DEFAULT '{}',
    last_started_at TIMESTAMP WITH TIME ZONE,
    last_status_update_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    last_error TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_bot_configs_enabled ON bot_configurations (desired_enabled);

-- 4. Customer and Staff Orders System (Orders Bot)
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(32) NOT NULL,
    channel_id VARCHAR(32) NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    username VARCHAR(100) NOT NULL,
    item_details TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_guild_id ON orders (guild_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
