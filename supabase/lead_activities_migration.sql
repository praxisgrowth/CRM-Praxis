-- ================================================================
-- CRM Praxis · Lead Activities Migration
-- Execute no Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. Tabela de Atividades do Lead
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type        TEXT NOT NULL
                CHECK (type IN ('criacao', 'nota', 'stage_change', 'contato', 'email')),
  description TEXT NOT NULL,
  metadata    JSONB,
  created_by  TEXT NOT NULL DEFAULT 'Sistema',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id
  ON public.lead_activities(lead_id, created_at DESC);

-- 2. RLS (padrão de desenvolvimento público)
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_lead_activities"  ON public.lead_activities;
DROP POLICY IF EXISTS "anon_write_lead_activities" ON public.lead_activities;

CREATE POLICY "anon_read_lead_activities"
  ON public.lead_activities FOR SELECT USING (true);

CREATE POLICY "anon_write_lead_activities"
  ON public.lead_activities FOR ALL USING (true);

-- 3. Trigger: cria atividade 'criacao' automaticamente em cada novo lead
CREATE OR REPLACE FUNCTION public.fn_lead_created_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.lead_activities (lead_id, type, description, created_by)
  VALUES (NEW.id, 'criacao', 'Lead criado no sistema.', 'Sistema');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lead_created_activity ON public.leads;
CREATE TRIGGER trg_lead_created_activity
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.fn_lead_created_activity();

-- 4. Seed: garante atividade inicial para leads já existentes sem atividade
INSERT INTO public.lead_activities (lead_id, type, description, created_by, created_at)
SELECT
  l.id,
  'criacao',
  'Lead criado no sistema.',
  'Sistema',
  l.updated_at
FROM public.leads l
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_activities la WHERE la.lead_id = l.id
);
