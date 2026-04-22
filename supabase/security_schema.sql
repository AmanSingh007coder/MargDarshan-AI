-- ============================================================
-- MargDarshan-AI — Security Tables
-- Run in Supabase SQL Editor
-- ============================================================

-- Security events logged by the honeypot middleware
CREATE TABLE IF NOT EXISTS security_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address     TEXT NOT NULL,
  method         TEXT NOT NULL,
  path           TEXT NOT NULL,
  query_string   TEXT,
  user_agent     TEXT,
  attack_types   TEXT[],
  risk_score     INTEGER NOT NULL DEFAULT 0,
  body_sample    TEXT,
  headers_sample TEXT
);

CREATE INDEX IF NOT EXISTS security_events_ip_idx        ON security_events (ip_address);
CREATE INDEX IF NOT EXISTS security_events_risk_idx      ON security_events (risk_score DESC);
CREATE INDEX IF NOT EXISTS security_events_created_idx   ON security_events (created_at DESC);

-- Auto-delete events older than 90 days (keep the table lean)
-- Supabase doesn't have native TTL, so schedule a cron or run manually:
-- DELETE FROM security_events WHERE created_at < now() - interval '90 days';

-- Blocked IP addresses
CREATE TABLE IF NOT EXISTS blocked_ips (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip         TEXT UNIQUE NOT NULL,
  reason     TEXT,
  active     BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS blocked_ips_ip_idx ON blocked_ips (ip);

-- RLS: only service role (backend) can write; authenticated users can read
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read security_events"
  ON security_events FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read blocked_ips"
  ON blocked_ips FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage blocked_ips"
  ON blocked_ips FOR ALL
  USING (auth.role() = 'authenticated');

-- Allow backend service role to insert
-- (service_role key bypasses RLS by default in Supabase)

CREATE POLICY "Backend can insert security_events"
  ON security_events FOR INSERT
  WITH CHECK (true);
