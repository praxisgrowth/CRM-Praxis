-- ================================================================
-- CRM Praxis · Phase 3b: Database Fixes & Audit Log
-- Adiciona campos faltantes e estabelece a tabela de auditoria
-- ================================================================

-- 1. Adiciona coluna 'complemento' na tabela de clientes
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS complemento TEXT;

-- 2. Cria tabela de Logs de Auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name   TEXT NOT NULL DEFAULT 'Sistema/Admin',
    action      TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id   TEXT,
    details     JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Ativa RLS e Políticas para audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir inserção pública de logs" ON public.audit_logs;
CREATE POLICY "Permitir inserção pública de logs" 
  ON public.audit_logs FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura pública de logs" ON public.audit_logs;
CREATE POLICY "Permitir leitura pública de logs" 
  ON public.audit_logs FOR SELECT 
  USING (true);

-- 4. Notifica PostgREST
NOTIFY pgrst, 'reload schema';
