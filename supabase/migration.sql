-- ================================================================
-- CRM Praxis · Migração Inicial
-- Execute no Supabase Dashboard → SQL Editor
-- ================================================================

-- ── Leads ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  email       text,
  phone       text,
  stage       text DEFAULT 'novo'
                CHECK (stage IN ('novo','qualificado','proposta','negociacao','fechado')),
  score       integer DEFAULT 0,
  source      text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── Clients ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text NOT NULL,
  segment       text,
  mrr           numeric(10,2) DEFAULT 0,
  health_score  integer DEFAULT 0,
  trend         text DEFAULT 'flat'
                  CHECK (trend IN ('up','down','flat')),
  avatar        text NOT NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ── MRR History ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mrr_history (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  month        text NOT NULL,
  mrr          numeric(10,2) NOT NULL,
  meta         numeric(10,2) NOT NULL,
  recorded_at  date DEFAULT current_date
);

-- ── KPI Metrics ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kpi_metrics (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key         text UNIQUE NOT NULL,
  value       numeric(10,2) NOT NULL,
  updated_at  timestamptz DEFAULT now()
);

-- ── Seed: Leads ──────────────────────────────────────────────────
INSERT INTO leads (name, email, stage, score, source) VALUES
  ('Construmax Engenharia', 'contato@construmax.com', 'proposta',    94, 'LinkedIn'),
  ('FinScale Ltda',         'hello@finscale.io',      'qualificado', 88, 'Indicação'),
  ('Agro Dinâmico',         'adm@agrodinamico.com',   'negociacao',  82, 'Evento'),
  ('Medbyte Health',        'tech@medbyte.com',       'novo',        71, 'Site'),
  ('LogiSmart',             'ops@logismart.com',      'proposta',    67, 'LinkedIn'),
  ('CityFin',               'cfo@cityfin.com',        'qualificado', 59, 'Outbound'),
  ('Ecopack Brasil',        'eco@ecopack.com',        'novo',        45, 'Site'),
  ('Rápido Express',        'ti@rapidoexpress.com',   'novo',        38, 'Cold Email')
ON CONFLICT DO NOTHING;

-- ── Seed: Clients ────────────────────────────────────────────────
INSERT INTO clients (name, segment, mrr, health_score, trend, avatar) VALUES
  ('TechVision',  'SaaS',      18000, 92, 'up',   'TV'),
  ('Nexus Corp',  'Indústria', 14000, 78, 'up',   'NC'),
  ('DataFlow',    'Fintech',   22000, 65, 'flat', 'DF'),
  ('Retail Max',  'Varejo',     9000, 43, 'down', 'RM'),
  ('Bioforma',    'HealthTech',16000, 88, 'up',   'BF')
ON CONFLICT DO NOTHING;

-- ── Seed: MRR History ────────────────────────────────────────────
INSERT INTO mrr_history (month, mrr, meta, recorded_at) VALUES
  ('Ago', 62000, 60000, '2024-08-01'),
  ('Set', 67000, 65000, '2024-09-01'),
  ('Out', 71000, 70000, '2024-10-01'),
  ('Nov', 76000, 74000, '2024-11-01'),
  ('Dez', 79000, 78000, '2024-12-01'),
  ('Jan', 84000, 82000, '2025-01-01')
ON CONFLICT DO NOTHING;

-- ── Seed: KPI Metrics ────────────────────────────────────────────
INSERT INTO kpi_metrics (key, value) VALUES
  ('conversion_rate', 24),
  ('sla_percent',     97)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- ── RLS: políticas de leitura pública (ajuste conforme auth) ─────
ALTER TABLE leads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrr_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_metrics  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_leads"       ON leads        FOR SELECT USING (true);
CREATE POLICY "anon_read_clients"     ON clients      FOR SELECT USING (true);
CREATE POLICY "anon_read_mrr"         ON mrr_history  FOR SELECT USING (true);
CREATE POLICY "anon_read_kpi"         ON kpi_metrics  FOR SELECT USING (true);
