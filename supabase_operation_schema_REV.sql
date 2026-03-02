/*
  CRM Praxis - Módulo Operação (REVISADO)
  Execute este script para alinhar o banco com o front-end.
*/

-- 1. Dropar se existirem para recriar com os campos corretos
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.projects;

-- 2. Tabela de Projetos (Alinhada com useOperations.ts)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client_name TEXT NOT NULL, -- Simplificado conforme implementação
    status TEXT NOT NULL CHECK (status IN ('ativo', 'pausado', 'concluido', 'atrasado')),
    service_type TEXT,
    sla_percent INTEGER DEFAULT 100 CHECK (sla_percent >= 0 AND sla_percent <= 100),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Tarefas (Alinhada com useOperations.ts)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
    priority TEXT NOT NULL CHECK (priority IN ('baixa', 'media', 'alta')),
    due_date TIMESTAMPTZ,
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

-- Dados de Exemplo para Teste
INSERT INTO public.projects (id, name, client_name, status, service_type, sla_percent, due_date)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Gestão de Tráfego Full', 'TechVision', 'ativo', 'Gestão de Tráfego', 95, now() + interval '15 days'),
('22222222-2222-2222-2222-222222222222', 'Social Media & Conteúdo', 'Nexus Corp', 'ativo', 'Social Media', 78, now() + interval '5 days');

INSERT INTO public.tasks (project_id, title, status, priority)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Otimizar campanhas Google', 'em_andamento', 'alta'),
('22222222-2222-2222-2222-222222222222', 'Posts de Instagram', 'pendente', 'media');
