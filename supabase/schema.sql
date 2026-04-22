-- ============================================================
-- MargDarshan-AI — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
--
-- ⚠  This script drops and recreates the shipments table.
--    Back up any existing data before running.
-- ============================================================


-- ── 0. Drop existing objects cleanly ──────────────────────────────────────

DROP TABLE   IF EXISTS shipments CASCADE;
DROP TYPE    IF EXISTS shipment_type   CASCADE;
DROP TYPE    IF EXISTS shipment_status CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;


-- ── 1. Enum types ─────────────────────────────────────────────────────────

CREATE TYPE shipment_type AS ENUM ('land', 'water');

CREATE TYPE shipment_status AS ENUM (
  'in_transit',
  'cancelled',
  'fulfilled'
);


-- ── 2. Core shipments table ───────────────────────────────────────────────

CREATE TABLE shipments (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Human-readable identifier e.g. MD-A1B2
  display_id    TEXT            NOT NULL UNIQUE,

  -- Owner (links to Supabase auth user)
  user_id       UUID            REFERENCES auth.users(id) DEFAULT auth.uid(),

  type          shipment_type   NOT NULL DEFAULT 'land',
  vehicle_type  TEXT            NOT NULL,

  -- JSONB shape: { "name": "Mumbai", "lat": 19.076, "lng": 72.877 }
  source        JSONB           NOT NULL,
  destination   JSONB           NOT NULL,

  status        shipment_status NOT NULL DEFAULT 'in_transit',

  -- Index into the route waypoints array; updated by the simulation engine
  current_step  INTEGER         NOT NULL DEFAULT 0,

  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);


-- ── 3. Auto-update updated_at ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 4. Indexes ────────────────────────────────────────────────────────────

CREATE INDEX idx_shipments_user_id  ON shipments (user_id);
CREATE INDEX idx_shipments_status   ON shipments (status);
CREATE INDEX idx_shipments_display  ON shipments (display_id);


-- ── 5. Row-Level Security ─────────────────────────────────────────────────

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can only see / touch their own records
CREATE POLICY "owner_select" ON shipments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "owner_insert" ON shipments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_update" ON shipments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "owner_delete" ON shipments
  FOR DELETE USING (auth.uid() = user_id);


-- ── Done ──────────────────────────────────────────────────────────────────
-- Table: shipments
-- Columns: id · display_id · user_id · type · vehicle_type
--          source · destination · status · current_step
--          created_at · updated_at
