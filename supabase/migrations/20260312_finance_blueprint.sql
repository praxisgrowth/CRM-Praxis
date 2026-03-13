-- Migration: Blueprint Financeiro e Indicadores
-- Descrição: Criação da estrutura de tabelas unificada.

-- 1. Categorias de Receita e Despesa
CREATE TABLE IF NOT EXISTS finance_categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  kind        VARCHAR(20)  NOT NULL CHECK (kind IN ('income', 'expense')),
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (name, kind)
);

-- Seed de Categorias Padrão
INSERT INTO finance_categories (name, kind) VALUES
  ('GESTÃO DE TRÁFEGO', 'expense'),
  ('IMPLEMENTAÇÃO', 'expense'),
  ('SITE', 'expense'),
  ('TRAQUEAMENTO', 'expense'),
  ('SUPERVISÃO', 'expense'),
  ('COMISSÃO', 'expense'),
  ('GOOGLE MEU NEGÓCIO', 'expense'),
  ('ANÚNCIOS', 'expense'),
  ('FUNCIONÁRIO', 'expense'),
  ('FERRAMENTAS', 'expense'),
  ('SISTEMAS/SOFTWARE', 'expense'),
  ('CUSTO FIXO', 'expense'),
  ('Vendas', 'income')
ON CONFLICT (name, kind) DO NOTHING;

-- 2. Finance Parties (Contrapartes)
CREATE TABLE IF NOT EXISTS finance_parties (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(160) NOT NULL UNIQUE,
  document  VARCHAR(40),
  phone     VARCHAR(40),
  email     VARCHAR(120),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela Central: finance_transactions
CREATE TABLE IF NOT EXISTS finance_transactions (
  id                SERIAL PRIMARY KEY,
  date              DATE         NOT NULL DEFAULT CURRENT_DATE,
  payment_date      DATE,
  description       VARCHAR(255) NOT NULL,
  amount            NUMERIC(14,2) NOT NULL,
  kind              VARCHAR(20)  NOT NULL CHECK (kind IN ('income', 'expense')),
  status            VARCHAR(20)  NOT NULL DEFAULT 'PENDENTE', -- PENDENTE | ATRASADO | PAGO | CANCELADO | PRORROGADA
  vencimento        DATE,
  valor_total       NUMERIC(14,2),
  valor_parcela     NUMERIC(14,2),
  plano             VARCHAR(40),
  forma_pagamento   VARCHAR(40),
  installment_no    INTEGER,
  installment_total INTEGER,
  compra_uuid       VARCHAR(36),
  reference         VARCHAR(80),
  notes             TEXT,
  category_id       INTEGER REFERENCES finance_categories(id),
  cliente_id        UUID REFERENCES clients(id) ON DELETE SET NULL, -- Alterado para UUID compatível com CRM Praxis
  party_id          INTEGER REFERENCES finance_parties(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Índicescríticos
CREATE INDEX IF NOT EXISTS idx_fin_tx_date       ON finance_transactions(date);
CREATE INDEX IF NOT EXISTS idx_fin_tx_status     ON finance_transactions(status);
CREATE INDEX IF NOT EXISTS idx_fin_tx_vencimento ON finance_transactions(vencimento);
CREATE INDEX IF NOT EXISTS idx_fin_tx_compra_uuid ON finance_transactions(compra_uuid);
CREATE INDEX IF NOT EXISTS idx_fin_tx_kind_date  ON finance_transactions(kind, date);
CREATE INDEX IF NOT EXISTS idx_fin_tx_cliente    ON finance_transactions(cliente_id, kind);

-- 4. Contratos Recorrentes (Assinaturas)
CREATE TABLE IF NOT EXISTS finance_recurring_contracts (
  id              SERIAL PRIMARY KEY,
  cliente_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title           VARCHAR(160) NOT NULL DEFAULT 'Assinatura',
  amount          NUMERIC(14,2) NOT NULL,
  frequency       VARCHAR(20)  NOT NULL DEFAULT 'monthly',
  start_date      DATE         NOT NULL,
  next_due_date   DATE         NOT NULL,
  last_renewed_on DATE,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  plano           VARCHAR(40),
  notes           TEXT,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reccontr_cliente ON finance_recurring_contracts(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reccontr_due     ON finance_recurring_contracts(next_due_date, is_active);

-- 5. Despesas Recorrentes (Fixas)
CREATE TABLE IF NOT EXISTS finance_recurring_expenses (
  id                SERIAL PRIMARY KEY,
  category_id       INTEGER REFERENCES finance_categories(id),
  party_id          INTEGER REFERENCES finance_parties(id),
  party_name_custom VARCHAR(160),
  description       VARCHAR(255) NOT NULL,
  amount            NUMERIC(14,2) NOT NULL,
  start_date        DATE         NOT NULL,
  next_due_date     DATE         NOT NULL,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- 6. Tabela de Aprovação: compra_pendente
CREATE TABLE IF NOT EXISTS compra_pendente (
  id                  SERIAL PRIMARY KEY,
  cliente_id          UUID REFERENCES clients(id) ON DELETE SET NULL,
  criado_por_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status              VARCHAR(50) NOT NULL DEFAULT 'pendente', -- 'pendente' | 'aprovado' | 'rejeitado'
  dados_compra        JSONB,
  dados_despesas      JSONB,
  data_criacao        TIMESTAMPTZ DEFAULT NOW(),
  data_aprovacao      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_compra_pend_status  ON compra_pendente(status);
CREATE INDEX IF NOT EXISTS idx_compra_pend_cliente ON compra_pendente(cliente_id);

-- 7. RLS Policies
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compra_pendente ENABLE ROW LEVEL SECURITY;

-- Nota: Assumimos os roles 'admin' e 'authenticated' conforme padrão Supabase.
CREATE POLICY "financeiro_read" ON finance_transactions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "financeiro_write" ON finance_transactions FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "todos_podem_inserir" ON compra_pendente FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "financeiro_manage_pendentes" ON compra_pendente FOR ALL TO authenticated USING (TRUE);

-- 8. Adições à tabela Clientes para Indicadores
ALTER TABLE clients ADD COLUMN IF NOT EXISTS excluir_indicadores BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cliente_pai_id UUID REFERENCES clients(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ;
