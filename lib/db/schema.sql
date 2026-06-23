-- ═══════════════════════════════════════════════════════════
-- LEX Database Schema — Supabase / PostgreSQL
-- Section 1, 3, 5, 6, 11 of the Production-Scale directive
-- Run this in Supabase SQL editor to set up all tables + RLS
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- USER PROFILES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_user_id  TEXT UNIQUE NOT NULL,
  display_name   TEXT,
  role           TEXT NOT NULL DEFAULT 'standard_user'
                   CHECK (role IN ('standard_user','premium_user','developer','admin')),
  premium_tier   TEXT CHECK (premium_tier IN ('free','pro','plus','ultra')),
  premium_until  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_id ON user_profiles(clerk_user_id);

-- ─────────────────────────────────────────
-- USER SETTINGS (synced across devices)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_user_id  TEXT UNIQUE NOT NULL REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE,
  settings       JSONB NOT NULL DEFAULT '{}',
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_clerk_id ON user_settings(clerk_user_id);

-- ─────────────────────────────────────────
-- PREMIUM ACTIVATION CODES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activation_codes (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code           TEXT UNIQUE NOT NULL,
  tier           TEXT NOT NULL CHECK (tier IN ('pro','plus','ultra')),
  duration_days  INTEGER,          -- NULL = lifetime
  label          TEXT,             -- human-readable description
  is_used        BOOLEAN NOT NULL DEFAULT FALSE,
  used_by        TEXT REFERENCES user_profiles(clerk_user_id),
  used_at        TIMESTAMPTZ,
  created_by     TEXT NOT NULL,    -- developer clerk_user_id
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  disabled       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_activation_codes_code    ON activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_is_used ON activation_codes(is_used);

-- ─────────────────────────────────────────
-- CONVERSATION HISTORY
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_history (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_user_id  TEXT NOT NULL REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE,
  messages       JSONB NOT NULL DEFAULT '[]',
  model_id       TEXT NOT NULL DEFAULT 'lex-flash',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_history_clerk_id  ON conversation_history(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_conv_history_created   ON conversation_history(created_at DESC);

-- ─────────────────────────────────────────
-- AI MEMORIES (per user)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_memories (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_user_id  TEXT NOT NULL REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  vitality       REAL NOT NULL DEFAULT 1.0,
  last_accessed  TIMESTAMPTZ DEFAULT NOW(),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_clerk_id ON user_memories(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_memories_vitality  ON user_memories(vitality DESC);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Users can only read/write their own data
-- ─────────────────────────────────────────
ALTER TABLE user_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_codes      ENABLE ROW LEVEL SECURITY;

-- user_profiles: read own row, service role full access
CREATE POLICY "users_read_own_profile"
  ON user_profiles FOR SELECT
  USING (clerk_user_id = current_setting('app.current_user_id', true));

CREATE POLICY "users_update_own_profile"
  ON user_profiles FOR UPDATE
  USING (clerk_user_id = current_setting('app.current_user_id', true));

CREATE POLICY "service_full_access_profiles"
  ON user_profiles FOR ALL
  USING (current_setting('app.service_role', true) = 'true');

-- user_settings: read/write own settings only
CREATE POLICY "users_rw_own_settings"
  ON user_settings FOR ALL
  USING (clerk_user_id = current_setting('app.current_user_id', true));

CREATE POLICY "service_full_access_settings"
  ON user_settings FOR ALL
  USING (current_setting('app.service_role', true) = 'true');

-- conversation_history: own data only
CREATE POLICY "users_rw_own_conversations"
  ON conversation_history FOR ALL
  USING (clerk_user_id = current_setting('app.current_user_id', true));

-- user_memories: own data only
CREATE POLICY "users_rw_own_memories"
  ON user_memories FOR ALL
  USING (clerk_user_id = current_setting('app.current_user_id', true));

-- activation_codes: no direct user access — service role only
CREATE POLICY "service_full_access_codes"
  ON activation_codes FOR ALL
  USING (current_setting('app.service_role', true) = 'true');

-- ─────────────────────────────────────────
-- DEVELOPER IDs (hardcoded by user ID, never by email)
-- Update this with the actual developer Clerk user IDs
-- ─────────────────────────────────────────
-- INSERT INTO user_profiles (clerk_user_id, role)
-- VALUES ('user_YOUR_DEVELOPER_CLERK_ID_HERE', 'developer')
-- ON CONFLICT (clerk_user_id) DO UPDATE SET role = 'developer';

-- ─────────────────────────────────────────
-- AUTO-UPDATE updated_at triggers
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
