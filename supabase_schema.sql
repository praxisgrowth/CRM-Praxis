/*
  CRM Praxis - Database Migration
  Execute este script no SQL Editor do seu projeto Supabase.
*/

-- 1. Tabela de Pipeline de Negócios (Kanban)
CREATE TABLE IF NOT EXISTS public.pipeline_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    contact_name TEXT,
    value NUMERIC DEFAULT 0,
    stage TEXT NOT NULL CHECK (stage IN ('prospeccao', 'reuniao', 'proposta', 'negociacao', 'fechado')),
    priority TEXT NOT NULL CHECK (priority IN ('baixa', 'media', 'alta')),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Leads (Prospecção Geral)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    stage TEXT NOT NULL CHECK (stage IN ('novo', 'qualificado', 'proposta', 'negociacao', 'fechado')),
    score INTEGER DEFAULT 0,
    source TEXT,
    client_id UUID REFERENCES public.clients(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Clientes Ativos
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    segment TEXT,
    mrr NUMERIC DEFAULT 0,
    health_score INTEGER DEFAULT 100,
    trend TEXT CHECK (trend IN ('up', 'down', 'flat')),
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS (Row Level Security) - Por enquanto permitindo acesso público para facilitar o dev
ALTER TABLE public.pipeline_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Criar políticas para permitir acesso anônimo (MUDAR EM PRODUÇÃO)
CREATE POLICY "Public Read" ON public.pipeline_deals FOR SELECT USING (true);
CREATE POLICY "Public Write" ON public.pipeline_deals FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON public.pipeline_deals FOR UPDATE USING (true);
CREATE POLICY "Public Delete" ON public.pipeline_deals FOR DELETE USING (true);

CREATE POLICY "Public Read" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Public Write" ON public.leads FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read" ON public.clients FOR SELECT USING (true);

-- Dados Iniciais para testes (Opcional)
INSERT INTO public.pipeline_deals (title, company, contact_name, value, stage, priority)
VALUES 
('Gestão de Tráfego Full', 'Construmax', 'Felipe Andrade', 12000, 'proposta', 'alta'),
('SEO + Conteúdo', 'FinScale', 'Mariana Souza', 8500, 'reuniao', 'media');
