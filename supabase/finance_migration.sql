-- ================================================================
-- CRM Praxis · Finance Migration — Asaas Integration
-- Execute no Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. Adiciona coluna asaas_id na tabela clients (idempotente)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS asaas_id TEXT;

-- 2. Tabela financial_payments — cobranças geradas via Asaas
CREATE TABLE IF NOT EXISTS public.financial_payments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID        REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name         TEXT,
  asaas_id            TEXT,                    -- ID da cobrança no Asaas (pay_xxx)
  asaas_customer_id   TEXT,                    -- ID do cliente no Asaas (cus_xxx)
  description         TEXT        NOT NULL,
  value               NUMERIC(12,2) NOT NULL,
  type                TEXT        NOT NULL DEFAULT 'ONE_OFF'
                        CHECK (type IN ('ONE_OFF', 'RECURRING')),
  status              TEXT        NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','CONFIRMED','RECEIVED','OVERDUE','REFUNDED','CANCELLED')),
  due_date            DATE,
  payment_link        TEXT,                    -- invoiceUrl retornado pelo Asaas
  billing_type        TEXT        NOT NULL DEFAULT 'PIX'
                        CHECK (billing_type IN ('PIX','BOLETO','CREDIT_CARD')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Trigger updated_at
CREATE OR REPLACE FUNCTION public.fn_financial_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_financial_payments_updated_at ON public.financial_payments;
CREATE TRIGGER trg_financial_payments_updated_at
  BEFORE UPDATE ON public.financial_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_financial_payments_updated_at();

-- 4. Índice para busca por client_id
CREATE INDEX IF NOT EXISTS idx_financial_payments_client_id
  ON public.financial_payments(client_id);

-- 5. RLS
ALTER TABLE public.financial_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_financial_payments"  ON public.financial_payments;
DROP POLICY IF EXISTS "anon_write_financial_payments" ON public.financial_payments;

CREATE POLICY "anon_read_financial_payments"
  ON public.financial_payments FOR SELECT USING (true);

CREATE POLICY "anon_write_financial_payments"
  ON public.financial_payments FOR ALL USING (true);

-- 6. Atualiza política de escrita em clients (necessária para salvar asaas_id)
DROP POLICY IF EXISTS "anon_update_clients" ON public.clients;
CREATE POLICY "anon_update_clients"
  ON public.clients FOR UPDATE USING (true);

-- 7. Notifica PostgREST
NOTIFY pgrst, 'reload schema';
