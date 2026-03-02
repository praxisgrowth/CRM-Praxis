/*
  CRM Praxis - Módulo Operação
  Execute este script no SQL Editor do seu projeto Supabase.
*/

-- 1. Tabela de Projetos
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('ativo', 'pausado', 'concluido')),
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,
    sla_health INTEGER DEFAULT 100 CHECK (sla_health >= 0 AND sla_health <= 100),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Tarefas
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Public Write Projects" ON public.projects FOR ALL USING (true);

CREATE POLICY "Public Read Tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Public Write Tasks" ON public.tasks FOR ALL USING (true);
