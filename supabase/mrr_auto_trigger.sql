-- ================================================================
-- MRR Auto-Recalc Trigger
-- Recalcula mrr_history automaticamente quando um pagamento
-- financial_payments muda para RECEIVED ou CONFIRMED via webhook Asaas.
-- ================================================================

-- ── 1. Garantir UNIQUE constraint em mrr_history.month ─────────
ALTER TABLE public.mrr_history
  ADD CONSTRAINT IF NOT EXISTS mrr_history_month_key UNIQUE (month);

-- ── 2. Função de recálculo ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalc_mrr_month(p_month TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mrr NUMERIC;
BEGIN
  -- Soma todos os pagamentos RECEIVED ou CONFIRMED cujo due_date pertence ao mês
  SELECT COALESCE(SUM(value), 0)
  INTO   v_mrr
  FROM   public.financial_payments
  WHERE  status IN ('RECEIVED', 'CONFIRMED')
    AND  to_char(due_date::date, 'YYYY-MM') = p_month;

  -- Upsert: insere novo mês ou atualiza MRR do mês existente
  -- churn_rate não é tocado no UPDATE (permanece como estava)
  INSERT INTO public.mrr_history (month, mrr, meta, churn_rate, recorded_at)
  VALUES (p_month, v_mrr, 0, 0, NOW())
  ON CONFLICT (month) DO UPDATE
    SET mrr         = EXCLUDED.mrr,
        recorded_at = NOW();
END;
$$;

-- ── 3. Função de trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_payment_mrr_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Só age quando status muda para RECEIVED ou CONFIRMED
  IF NEW.status IN ('RECEIVED', 'CONFIRMED')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.due_date IS NOT NULL
  THEN
    PERFORM public.recalc_mrr_month(to_char(NEW.due_date::date, 'YYYY-MM'));
  END IF;
  RETURN NEW;
END;
$$;

-- ── 4. Criar trigger ───────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_payment_mrr_recalc ON public.financial_payments;

CREATE TRIGGER trg_payment_mrr_recalc
  AFTER UPDATE OF status
  ON public.financial_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_payment_mrr_recalc();

-- ── Comentários ────────────────────────────────────────────────
COMMENT ON FUNCTION public.recalc_mrr_month IS
  'Recalcula e faz upsert em mrr_history para o mês informado (YYYY-MM). '
  'Soma financial_payments com status RECEIVED ou CONFIRMED.';

COMMENT ON TRIGGER trg_payment_mrr_recalc ON public.financial_payments IS
  'Dispara recalc_mrr_month quando status muda para RECEIVED ou CONFIRMED.';
