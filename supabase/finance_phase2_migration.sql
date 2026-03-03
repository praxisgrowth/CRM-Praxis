-- ================================================================
-- CRM Praxis · Finance Migration (Fase 2)
-- Geração Manual e Suporte a Assinaturas (Recorrência)
-- ================================================================

-- 1. Tabela financial_subscriptions (Para gerenciar a regra recorrente)
CREATE TABLE IF NOT EXISTS public.financial_subscriptions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID        REFERENCES public.clients(id) ON DELETE CASCADE,
  client_name         TEXT,
  asaas_id            TEXT,                    -- ID da assinatura no Asaas (sub_xxx)
  description         TEXT        NOT NULL,
  value               NUMERIC(12,2) NOT NULL,
  cycle               TEXT        NOT NULL DEFAULT 'MONTHLY'
                        CHECK (cycle IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY')),
  status              TEXT        NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
  billing_type        TEXT        NOT NULL DEFAULT 'PIX'
                        CHECK (billing_type IN ('PIX','BOLETO','CREDIT_CARD')),
  next_due_date       DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Modifica financial_payments para suportar vínculo com assinaturas
ALTER TABLE public.financial_payments
  ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.financial_subscriptions(id) ON DELETE CASCADE;

-- 3. Trigger updated_at para subscriptions
CREATE OR REPLACE FUNCTION public.fn_financial_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_financial_subscriptions_updated_at ON public.financial_subscriptions;
CREATE TRIGGER trg_financial_subscriptions_updated_at
  BEFORE UPDATE ON public.financial_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.fn_financial_subscriptions_updated_at();

-- 4. RLS para subscriptions
ALTER TABLE public.financial_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_subscriptions" ON public.financial_subscriptions;
CREATE POLICY "allow_all_subscriptions"
  ON public.financial_subscriptions FOR ALL USING (true);

-- 5. Comentário de uso para o n8n
COMMENT ON TABLE public.financial_subscriptions IS 'Gerencia contratos recorrentes que o n8n sincroniza com Asaas.';
