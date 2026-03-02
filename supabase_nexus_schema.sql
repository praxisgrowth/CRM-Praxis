/*
  CRM Praxis - Portal Nexus
  Execute este script no SQL Editor do seu projeto Supabase.
*/

-- 1. Enum para Tipos de Arquivo
DO $$ BEGIN
    CREATE TYPE nexus_file_type AS ENUM ('imagem', 'copy', 'video', 'documento');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Enum para Status de Aprovação
DO $$ BEGIN
    CREATE TYPE nexus_file_status AS ENUM ('pendente', 'aprovado', 'ajuste', 'duvida');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabela de Arquivos do Nexus
CREATE TABLE IF NOT EXISTS public.nexus_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type nexus_file_type NOT NULL DEFAULT 'imagem',
    status nexus_file_status NOT NULL DEFAULT 'pendente',
    url TEXT, -- Link para o arquivo (Storage ou Externo)
    thumbnail_url TEXT,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.leads(id) ON DELETE CASCADE, -- Referenciando leads (que viram clientes)
    uploaded_by TEXT NOT NULL DEFAULT 'Sistema',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Histórico de Aprovações/Comentários
CREATE TABLE IF NOT EXISTS public.nexus_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES public.nexus_files(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- aprovado, ajuste, duvida, sugestao
    comment TEXT,
    user_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security)
ALTER TABLE public.nexus_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Nexus Files" ON public.nexus_files FOR SELECT USING (true);
CREATE POLICY "Public Write Nexus Files" ON public.nexus_files FOR ALL USING (true);

CREATE POLICY "Public Read Nexus Approvals" ON public.nexus_approvals FOR SELECT USING (true);
CREATE POLICY "Public Write Nexus Approvals" ON public.nexus_approvals FOR ALL USING (true);

-- Dados de Exemplo para Teste
INSERT INTO public.nexus_files (title, description, type, status, uploaded_by)
VALUES 
('Logo Principal - Versão Dark', 'Arquivo final da logo para aprovação.', 'imagem', 'pendente', 'Design Team'),
('Copy de Lançamento - Março', 'Texto para os ads de Facebook/Instagram.', 'copy', 'pendente', 'Copywriter'),
('Vídeo Teaser Institucional', 'Primeiro corte do vídeo manifesto.', 'video', 'pendente', 'Edição');
