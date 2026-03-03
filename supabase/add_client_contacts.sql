-- ================================================================
-- CRM Praxis · Add Client Contact Columns
-- Execute no Supabase Dashboard → SQL Editor
-- ================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Adiciona comentário para documentação
COMMENT ON COLUMN public.clients.email IS 'E-mail do cliente para notificações financeiras.';
COMMENT ON COLUMN public.clients.phone IS 'WhatsApp do cliente (formato DDI+DDD+Número).';

-- Notifica PostgREST
NOTIFY pgrst, 'reload schema';
