-- ============================================================
-- Patch: alinha a tabela leads ao schema esperado pelo código
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Adiciona colunas faltantes (ignora se já existirem)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS phone       TEXT,
  ADD COLUMN IF NOT EXISTS stage       TEXT NOT NULL DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS score       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Constraint de valores válidos para stage
ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_stage_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_stage_check
  CHECK (stage IN ('novo','qualificado','proposta','negociacao','fechado'));

-- Trigger de auto-update em updated_at
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_leads_updated_at();

-- Notifica o PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
