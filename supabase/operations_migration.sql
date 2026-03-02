-- ================================================================
-- CRM Praxis · Módulo de Operação
-- Execute no Supabase Dashboard → SQL Editor
-- ================================================================

-- ── Projects ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text NOT NULL,
  client_name  text NOT NULL,
  status       text DEFAULT 'ativo'
                 CHECK (status IN ('ativo', 'pausado', 'concluido', 'atrasado')),
  service_type text,
  sla_percent  integer DEFAULT 100
                 CHECK (sla_percent BETWEEN 0 AND 100),
  due_date     date,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- ── Tasks ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
  title       text NOT NULL,
  status      text DEFAULT 'pendente'
                CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
  priority    text DEFAULT 'media'
                CHECK (priority IN ('baixa', 'media', 'alta')),
  due_date    date,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── Auto-update trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Seed: Projects ────────────────────────────────────────────────
INSERT INTO projects (id, name, client_name, status, service_type, sla_percent, due_date) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Gestão de Tráfego Full',         'TechVision',  'ativo',    'Gestão de Tráfego',             95, '2025-03-15'),
  ('a1000000-0000-0000-0000-000000000002', 'Social Media & Conteúdo',         'Nexus Corp',  'ativo',    'Social Media',                  78, '2025-02-28'),
  ('a1000000-0000-0000-0000-000000000003', 'Automação de Chatbot com IA',     'DataFlow',    'pausado',  'Automação de Chatbot com IA',   62, '2025-04-10'),
  ('a1000000-0000-0000-0000-000000000004', 'Landing Page + CRO',              'Retail Max',  'atrasado', 'Landing Page',                  41, '2025-01-31'),
  ('a1000000-0000-0000-0000-000000000005', 'Assessoria Comercial Google Ads', 'Bioforma',    'ativo',    'Assessoria Comercial Google',   92, '2025-03-30')
ON CONFLICT DO NOTHING;

-- ── Seed: Tasks ───────────────────────────────────────────────────
INSERT INTO tasks (project_id, title, status, priority) VALUES
  -- TechVision
  ('a1000000-0000-0000-0000-000000000001', 'Criar campanhas Google Ads',           'concluida',    'alta'),
  ('a1000000-0000-0000-0000-000000000001', 'Configurar pixel e eventos Meta',      'concluida',    'alta'),
  ('a1000000-0000-0000-0000-000000000001', 'Relatório de performance semanal',     'em_andamento', 'media'),
  ('a1000000-0000-0000-0000-000000000001', 'Otimização de audiências lookalike',   'pendente',     'media'),

  -- Nexus Corp
  ('a1000000-0000-0000-0000-000000000002', 'Calendário editorial janeiro',         'concluida',    'alta'),
  ('a1000000-0000-0000-0000-000000000002', 'Produção de posts semana 1',           'em_andamento', 'alta'),
  ('a1000000-0000-0000-0000-000000000002', 'Produção de posts semana 2',           'em_andamento', 'media'),
  ('a1000000-0000-0000-0000-000000000002', 'Relatório mensal de engajamento',      'pendente',     'baixa'),

  -- DataFlow
  ('a1000000-0000-0000-0000-000000000003', 'Mapeamento de fluxos de atendimento',  'concluida',    'alta'),
  ('a1000000-0000-0000-0000-000000000003', 'Integração com WhatsApp Business API', 'em_andamento', 'alta'),
  ('a1000000-0000-0000-0000-000000000003', 'Treinamento do modelo de IA',          'pendente',     'alta'),

  -- Retail Max
  ('a1000000-0000-0000-0000-000000000004', 'Briefing e wireframe aprovado',        'concluida',    'alta'),
  ('a1000000-0000-0000-0000-000000000004', 'Desenvolvimento frontend',             'pendente',     'alta'),
  ('a1000000-0000-0000-0000-000000000004', 'Testes de conversão (A/B)',            'pendente',     'media'),
  ('a1000000-0000-0000-0000-000000000004', 'Publicação e DNS',                     'pendente',     'baixa'),

  -- Bioforma
  ('a1000000-0000-0000-0000-000000000005', 'Auditoria de conta Google Ads',        'concluida',    'alta'),
  ('a1000000-0000-0000-0000-000000000005', 'Reestruturação de campanhas Search',   'concluida',    'alta'),
  ('a1000000-0000-0000-0000-000000000005', 'Configuração de campanhas Display',    'concluida',    'media'),
  ('a1000000-0000-0000-0000-000000000005', 'Relatório de ROAS e otimizações',      'em_andamento', 'media')
ON CONFLICT DO NOTHING;

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_projects" ON projects FOR SELECT USING (true);
CREATE POLICY "anon_read_tasks"    ON tasks    FOR SELECT USING (true);
CREATE POLICY "anon_write_projects" ON projects FOR ALL USING (true);
CREATE POLICY "anon_write_tasks"    ON tasks    FOR ALL USING (true);
