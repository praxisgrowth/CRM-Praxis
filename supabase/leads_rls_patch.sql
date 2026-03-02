-- ============================================================
-- Patch: habilitar CRUD anônimo em leads + tabela agency_settings
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- ─── Leads: adicionar policies de escrita ─────────────────────
-- (a policy de SELECT anon_read_leads já existe da migration.sql)

CREATE POLICY IF NOT EXISTS "anon_insert_leads"
  ON leads FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "anon_update_leads"
  ON leads FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "anon_delete_leads"
  ON leads FOR DELETE USING (true);

-- ─── agency_settings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agency_settings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name    TEXT        NOT NULL DEFAULT 'Gustavo Moura',
  user_email   TEXT        NOT NULL DEFAULT 'gustavo@praxis.com',
  user_role    TEXT        NOT NULL DEFAULT 'CEO & Founder',
  user_phone   TEXT        NOT NULL DEFAULT '',
  agency_name  TEXT        NOT NULL DEFAULT 'Praxis CRM',
  logo_url     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_agency_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agency_settings_updated_at ON agency_settings;
CREATE TRIGGER agency_settings_updated_at
  BEFORE UPDATE ON agency_settings
  FOR EACH ROW EXECUTE FUNCTION update_agency_settings_updated_at();

ALTER TABLE agency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "anon_read_settings"
  ON agency_settings FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "anon_insert_settings"
  ON agency_settings FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "anon_update_settings"
  ON agency_settings FOR UPDATE USING (true);

-- Seed: uma linha padrão (ignora se já existir)
INSERT INTO agency_settings (user_name, user_email, user_role, agency_name)
VALUES ('Gustavo Moura', 'gustavo@praxis.com', 'CEO & Founder', 'Praxis CRM')
ON CONFLICT DO NOTHING;
