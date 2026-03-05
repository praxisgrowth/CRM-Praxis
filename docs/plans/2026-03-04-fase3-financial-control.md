# Fase 3 — Controle Financeiro (Asaas + MRR) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar ação "Gerar 2ª Via" no FinancialCard, histórico de cobranças Asaas no SDRQualification, e trigger SQL de auto-recálculo de MRR.

**Architecture:** Três entregas independentes. As ações financeiras usam o hook `useFinancialActions` existente que dispara webhooks n8n. O histórico de cobranças reutiliza o componente `FinancialCard` existente dentro do SDRQualification. O MRR é recalculado via trigger PostgreSQL no Supabase que reage a mudanças de status em `financial_payments`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Supabase (PostgreSQL), Lucide React, Vite

---

## Task 1: Adicionar tipo `duplicate` ao useFinancialActions

**Files:**
- Modify: `src/hooks/useFinancialActions.ts:3`

**Step 1: Editar o tipo `FinancialAction`**

Abrir `src/hooks/useFinancialActions.ts`. Na linha 3, o tipo atual é:

```typescript
export type FinancialAction = 'cancel' | 'refund' | 'postpone' | 'resend' | 'charge'
```

Alterar para:

```typescript
export type FinancialAction = 'cancel' | 'refund' | 'postpone' | 'resend' | 'charge' | 'duplicate'
```

Nenhuma outra mudança necessária — o `execute()` já monta a URL dinamicamente como `/webhook/finance/${action}`, então `duplicate` funcionará automaticamente.

**Step 2: Verificar TypeScript**

```bash
cd "CRM Praxis"
npx tsc --noEmit
```

Expected: sem erros novos.

**Step 3: Commit**

```bash
git add src/hooks/useFinancialActions.ts
git commit -m "feat(financial): add duplicate to FinancialAction type"
```

---

## Task 2: Botão "Gerar 2ª Via" no FinancialCard

**Files:**
- Modify: `src/components/financial/FinancialCard.tsx`

**Step 1: Adicionar import do ícone `Copy`**

Na linha 3 de `FinancialCard.tsx`, o import atual é:
```typescript
import {
  DollarSign, X, RefreshCw, Clock, Send, CalendarDays, Loader2, CreditCard,
} from 'lucide-react'
```

Adicionar `Copy`:
```typescript
import {
  DollarSign, X, RefreshCw, Clock, Send, CalendarDays, Loader2, CreditCard, Copy,
} from 'lucide-react'
```

**Step 2: Adicionar variável `canDuplicate` e botão**

Dentro de `PaymentRow`, após a linha que define `canResend` (linha 63):
```typescript
const canResend   = hasAsaas && (payment.status === 'PENDING' || payment.status === 'OVERDUE')
```

Adicionar:
```typescript
const canDuplicate = hasAsaas && (payment.status === 'PENDING' || payment.status === 'OVERDUE')
```

**Step 3: Atualizar condição do bloco de botões**

A condição na linha 104 é:
```typescript
{(canCancel || canRefund || canPostpone || canResend) && (
```

Alterar para:
```typescript
{(canCancel || canRefund || canPostpone || canResend || canDuplicate) && (
```

**Step 4: Inserir o botão dentro do bloco de ações**

Após o bloco `{canResend && (...)}` (que renderiza o botão "Reenviar"), adicionar:

```typescript
{canDuplicate && (
  <ActionBtn
    label="2ª Via"
    icon={Copy}
    color="#00d2ff"
    loading={isLoading('duplicate', payment.id)}
    onClick={() => runAction('duplicate')}
  />
)}
```

**Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros.

**Step 6: Verificar visual**

Iniciar o dev server (`npm run dev`) e abrir um cliente com pagamento PENDING ou OVERDUE no FinancialCard. O botão "2ª Via" deve aparecer em ciano (`#00d2ff`) junto aos outros botões de ação.

**Step 7: Commit**

```bash
git add src/components/financial/FinancialCard.tsx
git commit -m "feat(financial): add Gerar 2a Via action button"
```

---

## Task 3: Seção "Cobranças Asaas" no SDRQualification

**Files:**
- Modify: `src/components/leads/SDRQualification.tsx`

**Contexto importante:**
- `Lead` não tem `client_id`. O vínculo é por nome: `clients.name = lead.name`.
- O componente `FinancialCard` já existe em `src/components/financial/FinancialCard.tsx` e recebe `{ clientId: string }`.
- `ChevronDown` já está importado no arquivo.
- A seção vai dentro da `div` com `overflow-y-auto` (flex-1), após o bloco `ActivityTimeline` (linha 199–208).

**Step 1: Adicionar import do useEffect e FinancialCard**

O arquivo já importa `useState` de React. Adicionar `useEffect`:

```typescript
import { User, Mail, Phone, Globe, Briefcase, Target, Users, TrendingUp, Clock, UserPlus, Loader2, ChevronDown, useEffect } from 'react'
```

Atenção: `useEffect` vem de `'react'`, não de lucide. A linha de import do React provavelmente é:
```typescript
import { useState } from 'react'
```

Alterar para:
```typescript
import { useState, useEffect } from 'react'
```

Adicionar import do FinancialCard após os imports existentes:
```typescript
import { FinancialCard } from '../financial/FinancialCard'
```

**Step 2: Adicionar estados de billing no componente**

Dentro de `SDRQualification`, após os estados existentes (linha ~37–40):

```typescript
const [clientId,    setClientId]    = useState<string | null>(null)
const [billingOpen, setBillingOpen] = useState(false)
```

**Step 3: Adicionar useEffect para buscar clientId**

Após as funções `handleConvert`, `saveICP`, `handleStageChange`, antes do `return`:

```typescript
useEffect(() => {
  async function fetchClientId() {
    const { data } = await (supabase as any)
      .from('clients')
      .select('id')
      .eq('name', lead.name)
      .maybeSingle()
    setClientId(data?.id ?? null)
  }
  fetchClientId()
}, [lead.name])
```

**Step 4: Inserir seção "Cobranças Asaas" no JSX**

Localizar o bloco da `ActivityTimeline` (termina com `</div>` fechando o `p-4 mt-2`):

```tsx
<div className="p-4 mt-2">
  <div className="flex items-center gap-2 mb-3">
    <Clock size={12} className="text-purple-400" />
    <p ...>Histórico de Atividades</p>
  </div>
  <ActivityTimeline leadId={lead.id} />
</div>
```

Imediatamente APÓS esse bloco (antes do fechamento da `div` com `overflow-y-auto`), adicionar:

```tsx
{/* Cobranças Asaas */}
<div className="border-t border-white/5 mt-2">
  <button
    onClick={() => setBillingOpen(o => !o)}
    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
  >
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
        Cobranças Asaas
      </span>
      {clientId && (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(0,210,255,0.12)', color: '#00d2ff' }}
        >
          vinculado
        </span>
      )}
    </div>
    <ChevronDown
      size={12}
      className="text-slate-600 transition-transform duration-200"
      style={{ transform: billingOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
    />
  </button>

  {billingOpen && (
    <div className="px-4 pb-4">
      {clientId ? (
        <FinancialCard clientId={clientId} />
      ) : (
        <p className="text-[11px] text-slate-600 text-center py-6">
          Lead não convertido — sem cobranças vinculadas.
        </p>
      )}
    </div>
  )}
</div>
```

**Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros.

**Step 6: Verificar visual**

1. Abrir um lead já convertido em cliente (stage `fechado`) no ClientDrawer → SDRQualification
2. Rolar até o fim da coluna 3 — deve aparecer seção "Cobranças Asaas" com badge "vinculado"
3. Clicar para expandir — deve renderizar os pagamentos via `FinancialCard`
4. Abrir um lead não convertido — deve aparecer seção sem badge, ao expandir mostra mensagem

**Step 7: Commit**

```bash
git add src/components/leads/SDRQualification.tsx
git commit -m "feat(sdr): add Cobrancas Asaas section to SDRQualification"
```

---

## Task 4: SQL Trigger — MRR Auto-Recalc

**Files:**
- Create: `supabase/mrr_auto_trigger.sql`

**Contexto:**
- `financial_payments` tem colunas: `id`, `value`, `status`, `due_date`, `client_id`
- `mrr_history` tem colunas: `id`, `month` (TEXT 'YYYY-MM'), `mrr`, `meta`, `churn_rate`, `recorded_at`
- O trigger deve recalcular o MRR do mês quando um pagamento muda para RECEIVED ou CONFIRMED
- `churn_rate` não é tocado — permanece manual

**Step 1: Criar o arquivo SQL**

Criar `supabase/mrr_auto_trigger.sql` com o conteúdo:

```sql
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
```

**Step 2: Aplicar no Supabase**

Abrir o **Supabase Dashboard → SQL Editor** e colar o conteúdo do arquivo.
Executar. Expected output: sem erros, mensagens de sucesso para cada statement.

**Step 3: Verificar a constraint**

```sql
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.mrr_history'::regclass
  AND contype = 'u';
```

Expected: retorna linha com `mrr_history_month_key`.

**Step 4: Testar o trigger manualmente**

Pegar o `id` de um pagamento em status `PENDING` que tenha `due_date` preenchido:

```sql
SELECT id, status, due_date, value FROM financial_payments
WHERE status = 'PENDING' AND due_date IS NOT NULL
LIMIT 1;
```

Simular mudança de status:

```sql
UPDATE financial_payments
SET status = 'RECEIVED'
WHERE id = '<id-do-pagamento-acima>';
```

Verificar se `mrr_history` foi atualizado para o mês correspondente:

```sql
SELECT month, mrr, recorded_at FROM mrr_history
ORDER BY recorded_at DESC
LIMIT 3;
```

Expected: linha do mês do pagamento aparece com `mrr > 0` e `recorded_at` recente.

**Step 5: Reverter o pagamento de teste (se necessário)**

```sql
UPDATE financial_payments SET status = 'PENDING' WHERE id = '<id-do-pagamento>';
```

**Step 6: Commit**

```bash
git add supabase/mrr_auto_trigger.sql
git commit -m "feat(supabase): add MRR auto-recalc trigger on financial_payments"
```

---

## Checklist de Verificação Final

- [ ] Task 1: `FinancialAction` inclui `'duplicate'`, TypeScript sem erros
- [ ] Task 2: Botão "2ª Via" visível em pagamentos PENDING/OVERDUE com asaas_id
- [ ] Task 3: Seção "Cobranças Asaas" expansível no SDRQualification, funciona para leads convertidos e não convertidos
- [ ] Task 4: Trigger criado no Supabase, teste manual confirma atualização de mrr_history

## Arquivos modificados no total

| Arquivo | Tipo |
|---|---|
| `src/hooks/useFinancialActions.ts` | Editar |
| `src/components/financial/FinancialCard.tsx` | Editar |
| `src/components/leads/SDRQualification.tsx` | Editar |
| `supabase/mrr_auto_trigger.sql` | Criar |
