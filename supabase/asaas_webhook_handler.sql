-- ================================================================
-- Asaas Webhook Handler
-- Procedure chamada pelo n8n (ou diretamente via API) para
-- atualizar o status de um pagamento Asaas no CRM.
--
-- Como usar (via n8n → HTTP Request para a Supabase REST API):
--   POST /rest/v1/rpc/handle_asaas_webhook
--   Authorization: Bearer <SERVICE_ROLE_KEY>
--   Content-Type: application/json
--   Body: { "asaas_event": "PAYMENT_RECEIVED", "asaas_payment_id": "pay_xxxx" }
-- ================================================================

-- ── Mapeamento de eventos Asaas → status interno ───────────────
-- PAYMENT_CREATED        → PENDING
-- PAYMENT_UPDATED        → (mantém status atual, sem-op)
-- PAYMENT_CONFIRMED      → CONFIRMED
-- PAYMENT_RECEIVED       → RECEIVED
-- PAYMENT_OVERDUE        → OVERDUE
-- PAYMENT_DELETED        → CANCELLED
-- PAYMENT_REFUNDED       → REFUNDED
-- PAYMENT_REFUND_IN_PROGRESS → REFUNDED (parcial, tratado igual)
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_asaas_webhook(
  asaas_event      TEXT,
  asaas_payment_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_status  TEXT;
  v_rows_updated INT;
  v_result      JSONB;
BEGIN

  -- 1. Mapeia o evento para o status interno
  v_new_status := CASE asaas_event
    WHEN 'PAYMENT_CREATED'              THEN 'PENDING'
    WHEN 'PAYMENT_CONFIRMED'            THEN 'CONFIRMED'
    WHEN 'PAYMENT_RECEIVED'             THEN 'RECEIVED'
    WHEN 'PAYMENT_OVERDUE'              THEN 'OVERDUE'
    WHEN 'PAYMENT_DELETED'              THEN 'CANCELLED'
    WHEN 'PAYMENT_REFUNDED'             THEN 'REFUNDED'
    WHEN 'PAYMENT_REFUND_IN_PROGRESS'   THEN 'REFUNDED'
    ELSE NULL  -- eventos desconhecidos → sem-op
  END;

  -- 2. Sem mapeamento → retorna sem fazer nada
  IF v_new_status IS NULL THEN
    RETURN jsonb_build_object(
      'ok',      false,
      'reason',  'evento_ignorado',
      'event',   asaas_event
    );
  END IF;

  -- 3. Atualiza o registro em financial_payments
  UPDATE public.financial_payments
  SET
    status     = v_new_status,
    updated_at = NOW()
  WHERE asaas_id = asaas_payment_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- 4. Constrói resposta
  IF v_rows_updated > 0 THEN
    v_result := jsonb_build_object(
      'ok',          true,
      'asaas_id',    asaas_payment_id,
      'new_status',  v_new_status,
      'event',       asaas_event
    );
  ELSE
    v_result := jsonb_build_object(
      'ok',          false,
      'reason',      'payment_nao_encontrado',
      'asaas_id',    asaas_payment_id,
      'event',       asaas_event
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Garante que apenas o service_role (n8n) pode chamar
REVOKE ALL ON FUNCTION public.handle_asaas_webhook(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_asaas_webhook(TEXT, TEXT) TO service_role;

-- ── Comentário de uso ──────────────────────────────────────────
COMMENT ON FUNCTION public.handle_asaas_webhook IS
  'Atualiza financial_payments.status com base em eventos do webhook Asaas. '
  'Chamar via n8n → HTTP Request → POST /rest/v1/rpc/handle_asaas_webhook '
  'usando o SUPABASE_SERVICE_ROLE_KEY no header Authorization.';
