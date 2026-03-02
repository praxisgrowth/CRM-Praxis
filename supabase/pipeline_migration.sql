-- ================================================================
-- CRM Praxis · Pipeline de Vendas
-- Execute no Supabase Dashboard → SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS pipeline_deals (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title         text NOT NULL,
  company       text NOT NULL,
  contact_name  text,
  value         numeric(12,2) DEFAULT 0,
  stage         text DEFAULT 'prospeccao'
                  CHECK (stage IN ('prospeccao','reuniao','proposta','negociacao','fechado')),
  priority      text DEFAULT 'media'
                  CHECK (priority IN ('baixa','media','alta')),
  tags          text[] DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON pipeline_deals;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON pipeline_deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Seed ─────────────────────────────────────────────────────────
INSERT INTO pipeline_deals (title, company, contact_name, value, stage, priority) VALUES
  ('Gestão de Tráfego Full', 'Construmax Engenharia', 'Felipe Andrade',  12000, 'proposta',    'alta'),
  ('SEO + Conteúdo',         'FinScale Ltda',         'Mariana Souza',    8500, 'reuniao',     'media'),
  ('Inbound + CRM Setup',    'Agro Dinâmico',         'Carlos Melo',     22000, 'negociacao',  'alta'),
  ('Social Media',           'Medbyte Health',        'Julia Ferreira',   4200, 'prospeccao',  'baixa'),
  ('Brand + Site',           'LogiSmart',             'Ricardo Lopes',   18000, 'proposta',    'alta'),
  ('Consultoria Digital',    'CityFin',               'Thiago Neves',     6000, 'reuniao',     'media'),
  ('Email Marketing',        'Ecopack Brasil',        'Aline Costa',      3500, 'prospeccao',  'baixa'),
  ('Growth Hacking',         'Rápido Express',        'Breno Oliveira',  11000, 'prospeccao',  'media'),
  ('Performance Ads',        'TechVision',            'Sandra Lima',     15000, 'fechado',     'alta'),
  ('Retenção e NPS',         'Bioforma',              'Paulo Antunes',    9800, 'negociacao',  'media')
ON CONFLICT DO NOTHING;

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE pipeline_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_deals"   ON pipeline_deals FOR SELECT USING (true);
CREATE POLICY "anon_insert_deals" ON pipeline_deals FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_deals" ON pipeline_deals FOR UPDATE USING (true);
CREATE POLICY "anon_delete_deals" ON pipeline_deals FOR DELETE USING (true);
