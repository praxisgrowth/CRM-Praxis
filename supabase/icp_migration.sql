-- ================================================================
-- CRM Praxis · ICP Migration — SDR Qualification fields
-- Execute no Supabase Dashboard → SQL Editor
-- ================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS faturamento TEXT,
  ADD COLUMN IF NOT EXISTS team_size   TEXT,
  ADD COLUMN IF NOT EXISTS dores       TEXT;

-- Notifica PostgREST para recarregar schema
NOTIFY pgrst, 'reload schema';
