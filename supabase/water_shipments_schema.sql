-- ============================================================
-- MargDarshan-AI — Water Shipments Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Water Ports (Indian coasts) ───────────────────────────────
CREATE TABLE IF NOT EXISTS water_ports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  city          TEXT NOT NULL,
  region        TEXT NOT NULL, -- 'west', 'east', 'south', 'north'
  lat           FLOAT NOT NULL,
  lng           FLOAT NOT NULL,
  type          TEXT NOT NULL, -- 'major', 'minor', 'inland'
  max_draft_m   FLOAT DEFAULT 12.5,
  cargo_types   TEXT[] DEFAULT ARRAY['bulk', 'container', 'tanker', 'general'],
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Vessel Types for Water Shipments ──────────────────────────
CREATE TABLE IF NOT EXISTS water_vessels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  vessel_type   TEXT NOT NULL, -- 'container', 'bulk_carrier', 'tanker', 'general_cargo', 'roro'
  dwt_tons      FLOAT NOT NULL, -- deadweight tonnage
  speed_knots   FLOAT NOT NULL,
  fuel_consumption_t_per_day FLOAT DEFAULT 25,
  fuel_type     TEXT DEFAULT 'HFO', -- Heavy Fuel Oil
  fuel_cost_per_ton FLOAT DEFAULT 600,
  is_available  BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Water Routes (pre-calculated sea routes) ──────────────────
CREATE TABLE IF NOT EXISTS water_routes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_port_id   UUID REFERENCES water_ports(id),
  destination_port_id UUID REFERENCES water_ports(id),
  distance_nm   FLOAT NOT NULL,
  waypoints     JSONB NOT NULL, -- array of {lat, lng, name}
  season        TEXT DEFAULT 'all', -- 'monsoon', 'post_monsoon', 'summer', 'all'
  avg_weather_risk FLOAT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Water Shipment Cost Breakdowns ────────────────────────────
CREATE TABLE IF NOT EXISTS water_shipment_costs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id   UUID REFERENCES shipments(id) ON DELETE CASCADE,
  vessel_id     UUID REFERENCES water_vessels(id),
  route_id      UUID REFERENCES water_routes(id),
  fuel_cost     FLOAT NOT NULL,
  port_fees     FLOAT NOT NULL,
  crew_cost     FLOAT NOT NULL,
  insurance     FLOAT NOT NULL,
  misc_cost     FLOAT NOT NULL,
  total_cost    FLOAT NOT NULL,
  cost_per_ton  FLOAT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tidal/Current Data Cache ──────────────────────────────────
CREATE TABLE IF NOT EXISTS marine_conditions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat           FLOAT NOT NULL,
  lng           FLOAT NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL,
  wave_height_m FLOAT,
  wave_direction_deg FLOAT,
  current_speed_knots FLOAT,
  current_direction_deg FLOAT,
  wind_speed_knots FLOAT,
  wind_direction_deg FLOAT,
  sea_state_code INT,
  temperature_c FLOAT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes for Performance ───────────────────────────────────
CREATE INDEX idx_water_ports_lat_lng ON water_ports (lat, lng);
CREATE INDEX idx_water_ports_region ON water_ports (region);
CREATE INDEX idx_water_routes_origin ON water_routes (origin_port_id);
CREATE INDEX idx_water_routes_destination ON water_routes (destination_port_id);
CREATE INDEX idx_marine_conditions_coords ON marine_conditions (lat, lng);
CREATE INDEX idx_marine_conditions_timestamp ON marine_conditions (timestamp DESC);

-- ── Seed Data: Major Indian Ports ──────────────────────────────
INSERT INTO water_ports (name, city, region, lat, lng, type, max_draft_m, cargo_types) VALUES
  ('Mumbai Port', 'Mumbai', 'west', 18.9399, 72.8355, 'major', 12.5, ARRAY['bulk', 'container', 'tanker']),
  ('Kolkata Port', 'Kolkata', 'east', 22.5726, 88.3639, 'major', 11.0, ARRAY['bulk', 'container']),
  ('Kochi Port', 'Kochi', 'south', 9.9312, 76.2673, 'major', 12.0, ARRAY['container', 'general']),
  ('Visakhapatnam Port', 'Visakhapatnam', 'east', 17.7011, 83.2992, 'major', 12.5, ARRAY['bulk', 'container']),
  ('Chennai Port', 'Chennai', 'south', 13.0827, 80.2707, 'major', 11.0, ARRAY['container', 'bulk']),
  ('Mormugao Port', 'Goa', 'west', 15.4189, 73.7975, 'major', 10.5, ARRAY['bulk', 'general']),
  ('Kandla Port', 'Gujarat', 'west', 22.0183, 69.6049, 'major', 13.0, ARRAY['bulk', 'container', 'tanker']),
  ('Paradip Port', 'Odisha', 'east', 19.7638, 86.6310, 'major', 12.0, ARRAY['bulk', 'container']),
  ('Mangaluru Port', 'Mangaluru', 'south', 12.9141, 74.8560, 'minor', 10.0, ARRAY['general', 'bulk']),
  ('Port Blair Port', 'Port Blair', 'north', 11.6234, 92.7265, 'minor', 8.5, ARRAY['general', 'container']),
  ('Jawaharlal Nehru Port', 'Mumbai', 'west', 19.0176, 72.9781, 'major', 14.0, ARRAY['container', 'general']),
  ('Ennore Port', 'Chennai', 'south', 13.2115, 80.3200, 'minor', 9.0, ARRAY['bulk'])
ON CONFLICT (name) DO NOTHING;

-- ── Seed Data: Vessel Types ────────────────────────────────────
INSERT INTO water_vessels (name, vessel_type, dwt_tons, speed_knots, fuel_consumption_t_per_day, fuel_cost_per_ton) VALUES
  ('MV Ever Given', 'container', 220000, 22, 280, 650),
  ('MV Sargasso', 'bulk_carrier', 180000, 14, 45, 600),
  ('MT Prestige', 'tanker', 150000, 15, 50, 620),
  ('MV Celtic', 'general_cargo', 45000, 14, 35, 580),
  ('MV Asian', 'roro', 55000, 20, 40, 590),
  ('MV Bulkocean', 'bulk_carrier', 95000, 13, 28, 595),
  ('MV Samyam', 'container', 120000, 19, 120, 640)
ON CONFLICT (name) DO NOTHING;

-- ✓ Water shipment tables created
