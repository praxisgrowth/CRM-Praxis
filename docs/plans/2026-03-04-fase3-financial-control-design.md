# Design: Fase 3 — Controle Financeiro (Asaas + MRR)

**Data:** 2026-03-04
**Status:** Aprovado

## Escopo

Três entregas independentes sobre o módulo financeiro do CRM Praxis:

1. Ação "Gerar 2ª Via" no FinancialCard
2. Histórico de cobranças Asaas no SDRQualification
3. Trigger SQL de recálculo automático do MRR

---

## 1. "Gerar 2ª Via" no FinancialCard

### Contexto

`FinancialCard.tsx` já tem botões de Cancelar, Reembolsar, Reenviar e Adiar via `useFinancialActions.ts`.
"Gerar 2ª Via" é uma ação distinta: cria nova cobrança no Asaas com os mesmos dados (novo boleto/link).

### Mudanças

**`src/hooks/useFinancialActions.ts`**
- Adiciona `'duplicate'` ao tipo `FinancialAction`

**`src/components/financial/FinancialCard.tsx`** (dentro de `PaymentRow`)
- `canDuplicate = hasAsaas && (status === 'PENDING' || status === 'OVERDUE')`
- Novo `ActionBtn`: ícone `Copy` (lucide), cor `#00d2ff`, chama `runAction('duplicate')`

### Webhook n8n

`POST ${VITE_N8N_WEBHOOK_URL}/webhook/finance/duplicate`

Payload: `{ asaas_id: string, payment_id: string }`

O n8n fica responsável por criar nova cobrança no Asaas com os dados do pagamento original.

---

## 2. Histórico de Cobranças no SDRQualification

### Contexto

`Lead` não tem `client_id`. O vínculo lead→cliente é feito por nome (`clients.name = lead.name`).
`SDRQualification.tsx` é a coluna 3 do ClientDrawer (SDR Workspace).

### Mudanças

**`src/components/leads/SDRQualification.tsx`**

- `useEffect` no mount: query `supabase.from('clients').select('id').eq('name', lead.name).single()` → armazena `clientId: string | null`
- Estado `billingOpen: boolean` (default false)
- Nova seção expansível após campos ICP, antes do botão "Converter em Cliente":
  - Header colapsável com `ChevronDown` (já importado), label "Cobranças Asaas"
  - Badge com contagem de pagamentos (zero enquanto carrega)
  - Quando expandido + `clientId` encontrado: `<FinancialCard clientId={clientId} />`
  - Quando `clientId` null: mensagem "Lead não convertido — sem cobranças vinculadas"

---

## 3. Trigger SQL: MRR Auto-Recalc

### Contexto

`mrr_history` é atualizado manualmente. O webhook Asaas atualiza `financial_payments.status`
via `handle_asaas_webhook()`. O objetivo é que o MRR seja recalculado automaticamente quando
um pagamento muda para `RECEIVED` ou `CONFIRMED`.

### Arquivo: `supabase/mrr_auto_trigger.sql`

**Função `recalc_mrr_month(p_month TEXT)`:**
- Soma `value` de `financial_payments` WHERE `status IN ('RECEIVED','CONFIRMED')` AND `to_char(due_date,'YYYY-MM') = p_month`
- Upsert em `mrr_history`: ON CONFLICT em `month` → UPDATE `mrr` + `recorded_at`
- `churn_rate` permanece inalterado no upsert (campo manual)

**Trigger `trg_payment_mrr_recalc`:**
- `AFTER UPDATE OF status ON financial_payments`
- Condição: `NEW.status IN ('RECEIVED','CONFIRMED') AND OLD.status IS DISTINCT FROM NEW.status`
- Chama `recalc_mrr_month(to_char(NEW.due_date, 'YYYY-MM'))`

### Constraint necessária

`mrr_history` precisa de `UNIQUE(month)` para o ON CONFLICT funcionar.
O script inclui `ALTER TABLE mrr_history ADD CONSTRAINT IF NOT EXISTS mrr_history_month_key UNIQUE (month)`.

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/hooks/useFinancialActions.ts` | Editar — adicionar `'duplicate'` ao tipo |
| `src/components/financial/FinancialCard.tsx` | Editar — botão Gerar 2ª Via |
| `src/components/leads/SDRQualification.tsx` | Editar — seção Cobranças Asaas |
| `supabase/mrr_auto_trigger.sql` | Criar — trigger + função |
