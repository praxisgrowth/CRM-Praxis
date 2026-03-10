-- ============================================================
-- FIX PROJECT PRIVACY & RLS — CRM Praxis
-- Adiciona client_id aos projetos e restringe o acesso por cliente
-- ============================================================

-- 1. Adicionar coluna client_id à tabela projects
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- 2. Tentar vincular projetos existentes aos clientes pelo nome (best effort)
UPDATE public.projects p
SET client_id = c.id
FROM public.clients c
WHERE LOWER(TRIM(p.client_name)) = LOWER(TRIM(c.name))
  AND p.client_id IS NULL;

-- 2.1. Vincular tarefas existentes aos clientes via projetos
UPDATE public.tasks t
SET client_id = p.client_id
FROM public.projects p
WHERE t.project_id = p.id
  AND t.client_id IS NULL
  AND p.client_id IS NOT NULL;

-- 3. Atualizar o Trigger de Vendas para incluir o client_id
-- O trigger agora deve buscar o client_id associado ao deal ou lead
CREATE OR REPLACE FUNCTION public.fn_deal_closed_to_project()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage = 'fechado' AND (OLD.stage IS DISTINCT FROM 'fechado') THEN
    INSERT INTO public.projects (
      name,
      client_name,
      client_id,
      status,
      service_type,
      sla_percent,
      due_date
    )
    VALUES (
      NEW.title,
      NEW.company,
      NEW.client_id, -- Assume que pipeline_deals tem client_id
      'ativo',
      NEW.title,
      100,
      CURRENT_DATE + INTERVAL '30 days'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Rigorous RLS Policies for Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipe_all_projects" ON public.projects;
CREATE POLICY "equipe_all_projects" 
  ON public.projects FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'MEMBER')
    )
  );

DROP POLICY IF EXISTS "client_own_projects" ON public.projects;
CREATE POLICY "client_own_projects" 
  ON public.projects FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'CLIENT' AND client_id = projects.client_id
    )
  );

-- 5. Rigorous RLS Policies for Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipe_all_tasks" ON public.tasks;
CREATE POLICY "equipe_all_tasks" 
  ON public.tasks FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'MEMBER')
    )
  );

DROP POLICY IF EXISTS "client_own_tasks" ON public.tasks;
CREATE POLICY "client_own_tasks" 
  ON public.tasks FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'CLIENT' AND client_id = tasks.client_id
    )
  );

-- 6. Recarregar cache
NOTIFY pgrst, 'reload schema';
