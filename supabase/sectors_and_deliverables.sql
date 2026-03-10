-- ============================================================
-- Fase 3 (Operação & Nexus) — Sectors + Deliverable Catalog
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Tabela de Setores
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sectors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  color      text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sectors_authenticated" ON sectors
  FOR ALL USING (auth.role() = 'authenticated');

-- Seed: setores padrão
INSERT INTO sectors (name, color) VALUES
  ('Google Ads',    '#4285f4'),
  ('Site',          '#10b981'),
  ('SEO',           '#f59e0b'),
  ('Social Media',  '#8b5cf6'),
  ('Traqueamento',  '#f97316'),
  ('Email',         '#06b6d4'),
  ('Google Meu Negócio', '#34a853'),
  ('Financeiro',    '#14b8a6'),
  ('Gestão de Tráfego', '#3b82f6'),
  ('Implementação', '#6366f1'),
  ('Supervisão',    '#94a3b8')
ON CONFLICT (name) DO NOTHING;


-- 2. Catálogo de Deliverables
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deliverable_catalog (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id   uuid REFERENCES sectors(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  type        text NOT NULL DEFAULT 'documento'
                   CHECK (type IN ('imagem', 'copy', 'video', 'documento')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deliverable_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliverable_catalog_authenticated" ON deliverable_catalog
  FOR ALL USING (auth.role() = 'authenticated');

-- Seed: deliverables padrão por setor
INSERT INTO deliverable_catalog (sector_id, name, description, type)
SELECT s.id, d.name, d.description, d.type
FROM sectors s
JOIN (VALUES
  ('Google Ads',   'Criativo de Imagem (Feed)',      'Arte estática para campanha de feed',      'imagem'),
  ('Google Ads',   'Copy de Anúncio',                'Texto headline + descrição do anúncio',    'copy'),
  ('Google Ads',   'Relatório Mensal Google Ads',    'PDF com métricas e resultados do mês',     'documento'),
  ('Google Ads',   'Vídeo para YouTube Ads',         'Vídeo de 15-30s para anúncio',            'video'),
  ('Site',         'Wireframe de Página',            'Esboço de estrutura da página',            'documento'),
  ('Site',         'Banner Principal (Hero)',        'Imagem do banner principal do site',       'imagem'),
  ('Social Media', 'Artes para Feed Instagram',     'Pack de artes para postagem',              'imagem'),
  ('Social Media', 'Copy de Legenda',               'Textos para postagem orgânica',            'copy'),
  ('Social Media', 'Stories Animado',               'Vídeo/gif para stories',                  'video'),
  ('Email',        'Template de E-mail Marketing',  'Layout HTML do e-mail',                    'documento'),
  ('Email',        'Copy de E-mail',                'Texto do corpo do e-mail',                 'copy')
) AS d(sector_name, name, description, type) ON s.name = d.sector_name
ON CONFLICT DO NOTHING;


-- 3. Adicionar sector_id em nexus_files (opcional — para filtro por setor)
-- ─────────────────────────────────────────────────────────────
-- Apenas roda se a coluna ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nexus_files' AND column_name = 'sector_id'
  ) THEN
    ALTER TABLE nexus_files ADD COLUMN sector_id uuid REFERENCES sectors(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nexus_files' AND column_name = 'catalog_item_id'
  ) THEN
    ALTER TABLE nexus_files ADD COLUMN catalog_item_id uuid REFERENCES deliverable_catalog(id);
  END IF;
END $$;
