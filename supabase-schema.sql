-- Run in Supabase SQL Editor (no RLS, no auth — hackathon mode)

CREATE TABLE IF NOT EXISTS contributors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  market_rate NUMERIC NOT NULL DEFAULT 0,
  paid_rate NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sweat_entries (
  id TEXT PRIMARY KEY,
  contributor_id TEXT REFERENCES contributors(id),
  date DATE NOT NULL,
  hours NUMERIC NOT NULL,
  risk_multiplier NUMERIC NOT NULL DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS capital_entries (
  id TEXT PRIMARY KEY,
  contributor_id TEXT REFERENCES contributors(id),
  date DATE NOT NULL,
  amount NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS financial_snapshots (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  ebitda NUMERIC NOT NULL,
  industry_multiple NUMERIC NOT NULL
);

-- Seed data (matches app/page.js SEED constant)
INSERT INTO contributors (id, name, role, market_rate, paid_rate) VALUES
  ('a', 'Partner A', 'CEO', 150, 0),
  ('b', 'Partner B', 'CFO', 120, 0),
  ('c', 'Partner C', 'CTO', 180, 60),
  ('d', 'Partner D', 'Lead Dev', 140, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO sweat_entries (id, contributor_id, date, hours, risk_multiplier) VALUES
  ('s1', 'a', '2025-03-01', 800, 1.0),
  ('s2', 'b', '2025-04-15', 200, 1.0),
  ('s3', 'c', '2025-05-01', 600, 1.0),
  ('s4', 'd', '2025-06-01', 500, 1.5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO capital_entries (id, contributor_id, date, amount) VALUES
  ('c1', 'b', '2025-01-15', 50000),
  ('c2', 'c', '2025-02-01', 25000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO financial_snapshots (id, date, ebitda, industry_multiple) VALUES
  ('f1', '2025-06-01', 350000, 4.5),
  ('f2', '2025-12-01', 400000, 5.0)
ON CONFLICT (id) DO NOTHING;
