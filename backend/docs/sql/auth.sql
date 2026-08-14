-- SmallWorld Auth schema for TencentDB for PostgreSQL
-- Module 1 target. Current runtime still uses backend/data.json.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  social_intent TEXT NOT NULL DEFAULT '',
  profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT users_status_check CHECK (status IN ('active', 'disabled', 'deleted')),
  CONSTRAINT users_display_name_length CHECK (char_length(display_name) BETWEEN 2 AND 24)
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT NOT NULL DEFAULT '',
  CONSTRAINT auth_sessions_device_id_length CHECK (char_length(device_id) <= 120)
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_device ON auth_sessions(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active ON auth_sessions(user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS user_social_metrics (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  attendance_count INTEGER NOT NULL DEFAULT 0,
  repeat_places JSONB NOT NULL DEFAULT '[]'::jsonb,
  graph_diversity NUMERIC(4, 3) NOT NULL DEFAULT 0.450,
  review_stability NUMERIC(4, 3) NOT NULL DEFAULT 0.600,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_social_metrics_non_negative CHECK (attendance_count >= 0),
  CONSTRAINT user_social_metrics_graph_range CHECK (graph_diversity >= 0 AND graph_diversity <= 1),
  CONSTRAINT user_social_metrics_review_range CHECK (review_stability >= 0 AND review_stability <= 1)
);

CREATE TABLE IF NOT EXISTS auth_login_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  device_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_login_audit_email_created ON auth_login_audit(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_login_audit_ip_created ON auth_login_audit(ip_address, created_at DESC);
