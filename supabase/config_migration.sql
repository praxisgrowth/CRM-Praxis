-- ================================================================
-- CRM Praxis · Agency Settings Migration
-- Execute no Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. Tabela de configurações da agência (single-row global)
CREATE TABLE IF NOT EXISTS public.agency_settings (
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

-- 2. Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.fn_agency_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agency_settings_updated_at ON public.agency_settings;
CREATE TRIGGER trg_agency_settings_updated_at
  BEFORE UPDATE ON public.agency_settings
  FOR EACH ROW EXECUTE FUNCTION public.fn_agency_settings_updated_at();

-- 3. RLS (padrão de desenvolvimento público)
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_agency_settings"  ON public.agency_settings;
DROP POLICY IF EXISTS "anon_write_agency_settings" ON public.agency_settings;

CREATE POLICY "anon_read_agency_settings"
  ON public.agency_settings FOR SELECT USING (true);

CREATE POLICY "anon_write_agency_settings"
  ON public.agency_settings FOR ALL USING (true);

-- 4. Storage bucket para logos
-- Execute no Supabase Dashboard → Storage → New Bucket
-- ou via SQL (requer extensão storage ativa):
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('agency', 'agency', true)
-- ON CONFLICT (id) DO NOTHING;
--
-- CREATE POLICY "anon_upload_agency" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'agency');
--
-- CREATE POLICY "anon_read_agency" ON storage.objects
--   FOR SELECT USING (bucket_id = 'agency');
