-- ============================================================
-- Portal Nexus · Migration
-- Tabelas: nexus_files, nexus_approvals, team_members
-- ============================================================

-- nexus_files: arquivos / mídias enviados para aprovação do cliente
CREATE TABLE IF NOT EXISTS nexus_files (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID        REFERENCES clients(id)   ON DELETE SET NULL,
  project_id    UUID        REFERENCES projects(id)  ON DELETE SET NULL,
  client_name   TEXT,
  project_name  TEXT,
  title         TEXT        NOT NULL,
  description   TEXT,
  type          TEXT        NOT NULL DEFAULT 'imagem'
                              CHECK (type IN ('imagem','copy','video','documento')),
  url           TEXT,
  thumbnail_url TEXT,
  uploaded_by   TEXT        NOT NULL DEFAULT 'Equipe Antigravity',
  status        TEXT        NOT NULL DEFAULT 'pendente'
                              CHECK (status IN ('pendente','aprovado','ajuste','duvida')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- nexus_approvals: ações de aprovação / feedback dos clientes
CREATE TABLE IF NOT EXISTS nexus_approvals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id     UUID        REFERENCES nexus_files(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL
                            CHECK (action IN ('aprovado','ajuste','duvida','sugestao')),
  comment     TEXT,
  client_name TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- team_members: equipe interna (exibição em Operação / Nexus)
CREATE TABLE IF NOT EXISTS team_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  role       TEXT,
  email      TEXT,
  initials   TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Trigger updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_nexus_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nexus_files_updated_at ON nexus_files;
CREATE TRIGGER nexus_files_updated_at
  BEFORE UPDATE ON nexus_files
  FOR EACH ROW EXECUTE FUNCTION update_nexus_files_updated_at();

-- ─── Row Level Security ───────────────────────────────────────
ALTER TABLE nexus_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members    ENABLE ROW LEVEL SECURITY;

-- nexus_files
CREATE POLICY "anon_read_nexus_files"
  ON nexus_files FOR SELECT USING (true);
CREATE POLICY "anon_insert_nexus_files"
  ON nexus_files FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_nexus_files"
  ON nexus_files FOR UPDATE USING (true);

-- nexus_approvals
CREATE POLICY "anon_read_nexus_approvals"
  ON nexus_approvals FOR SELECT USING (true);
CREATE POLICY "anon_insert_nexus_approvals"
  ON nexus_approvals FOR INSERT WITH CHECK (true);

-- team_members
CREATE POLICY "anon_read_team_members"
  ON team_members FOR SELECT USING (true);
CREATE POLICY "anon_insert_team_members"
  ON team_members FOR INSERT WITH CHECK (true);

-- ─── Seed: nexus_files ────────────────────────────────────────
INSERT INTO nexus_files (client_name, project_name, title, description, type, uploaded_by, status) VALUES
(
  'TechVision', 'Campanha Março',
  'Arte Campanha Março – Stories',
  'Layout para stories do Instagram com tema de tecnologia e inovação. Formato 9:16, identidade premium.',
  'imagem', 'Equipe Criativa', 'pendente'
),
(
  'TechVision', 'Campanha Março',
  'Copy Post LinkedIn – Tech Insights',
  'Texto de post para LinkedIn abordando tendências de IA em 2026. Tom consultivo, CTA para e-book.',
  'copy', 'Equipe Criativa', 'pendente'
),
(
  'FinScale', 'Google Ads Q1',
  'Banner Google Ads 300×250',
  'Banner display para campanha de captação de leads no mercado financeiro. Aprovado para veiculação.',
  'imagem', 'Equipe Mídia', 'aprovado'
),
(
  'Construmax', 'Vídeo Institucional',
  'Vídeo Institucional 2026',
  'Vídeo de 60s apresentando serviços da Construmax. Solicitar ajuste na trilha sonora e corte final.',
  'video', 'Equipe Vídeo', 'ajuste'
),
(
  'DataFlow', 'Social Media Abril',
  'Arte Feed Instagram – Produto',
  'Carrossel com 5 slides apresentando funcionalidades da plataforma DataFlow. Paleta azul/branco.',
  'imagem', 'Equipe Criativa', 'pendente'
),
(
  'Retail Max', 'Relatórios',
  'Relatório de Performance – Fev/2026',
  'PDF com resultados de Ads, alcance orgânico e conversões do mês. ROAS médio de 4,2x.',
  'documento', 'Equipe Analytics', 'aprovado'
),
(
  'Nexus Corp', 'E-mail Marketing',
  'Copy E-mail Promoção Semestral',
  'Template de e-mail com oferta especial para base de clientes ativos. Verificar conformidade LGPD.',
  'copy', 'Equipe Conteúdo', 'duvida'
),
(
  'Bioforma', 'Campanha Verão',
  'Arte Capa Facebook – Summer',
  'Capa para perfil do Facebook com identidade visual da campanha de verão 2026. Formato 820×312.',
  'imagem', 'Equipe Criativa', 'pendente'
);

-- ─── Seed: team_members ───────────────────────────────────────
INSERT INTO team_members (name, role, email, initials) VALUES
('Gustavo Lima',   'Gestor de Tráfego',    'gustavo@antigravity.com.br', 'GL'),
('Ana Souza',      'Designer',             'ana@antigravity.com.br',     'AS'),
('Pedro Costa',    'Copywriter',           'pedro@antigravity.com.br',   'PC'),
('Carla Mendes',   'Analista de Dados',    'carla@antigravity.com.br',   'CM'),
('Rafael Torres',  'Estrategista Digital', 'rafael@antigravity.com.br',  'RT');
