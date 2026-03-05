# N8N Finance Webhook — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corrigir o payload do webhook `create-charge`, adicionar date picker ao botão "2ª Via", e documentar a configuração dos nodes n8n para `create-charge` e `duplicate`.

**Architecture:** O `useBilling.ts` já chama o webhook mas envia payload incompleto (sem `payment_id`). O `FinancialCard.tsx` já tem o botão "2ª Via" mas dispara sem data. Task 1 corrige o payload. Task 2 adiciona o inline form de data (mesmo padrão do "Adiar" já existente). Task 3 cria a documentação dos nodes n8n.

**Tech Stack:** React 18, TypeScript, Vite, Supabase, Lucide React — sem test suite, verificação via `tsc --noEmit`

---

## Task 1: Corrigir payload do webhook em useBilling.ts

**Files:**
- Modify: `src/hooks/useBilling.ts`

**Contexto:** O arquivo já tem o webhook call nas linhas 40–50. O problema é que o payload enviado é incompleto — falta `payment_id`, `description`, `billing_type`, `client_name`. Para ter o `payment_id`, o INSERT precisa retornar o id com `.select('id').single()`.

**Step 1: Ler o arquivo atual**

Confirmar que a linha 23 é `const { error } = await (supabase as any)` sem `.select()`.

**Step 2: Substituir a função `createPayment`**

Localizar o bloco completo (linhas 22–51) e substituir por:

```typescript
export async function createPayment(input: CreatePaymentInput): Promise<void> {
  const { data, error } = await (supabase as any)
    .from('financial_payments')
    .insert({
      client_id:         input.client_id,
      client_name:       input.client_name,
      description:       input.description,
      value:             input.value,
      type:              'ONE_OFF',
      billing_type:      input.billing_type,
      due_date:          input.due_date,
      status:            'PENDING',
      asaas_id:          null,
      asaas_customer_id: null,
      payment_link:      null,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  // Fire-and-forget — falha silenciosa, cron de fallback recupera
  const baseUrl = (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined) ?? ''
  if (baseUrl && data?.id) {
    fetch(`${baseUrl}/webhook/finance/create-charge`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_id:   data.id,
        client_id:    input.client_id,
        client_name:  input.client_name,
        description:  input.description,
        value:        input.value,
        billing_type: input.billing_type,
        due_date:     input.due_date,
      }),
    }).catch(() => { /* silent fail */ })
  }
}
```

**Step 3: Verificar TypeScript**

```bash
cd "C:/Users/gusta/Documents/Antigravity/CRM Praxis"
npx tsc --noEmit
```

Expected: 0 erros.

**Step 4: Commit**

```bash
git add src/hooks/useBilling.ts
git commit -m "fix(billing): include payment_id and full payload in create-charge webhook"
```

---

## Task 2: Date picker inline no botão "2ª Via" (FinancialCard.tsx)

**Files:**
- Modify: `src/components/financial/FinancialCard.tsx`

**Contexto:** O botão "2ª Via" (linhas 116–124) chama `runAction('duplicate')` imediatamente sem data. O padrão do "Adiar" (linhas 38–39 para estado, 125–188 para UI) é o modelo exato a seguir. A função `runAction` já suporta `extraDate` como segundo argumento.

**Step 1: Adicionar estados `showDuplicate` e `duplicateDate`**

Localizar as linhas 38–39:
```typescript
  const [postponeDate, setPostponeDate] = useState('')
  const [showPostpone, setShowPostpone] = useState(false)
```

Adicionar APÓS essas duas linhas:
```typescript
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [duplicateDate, setDuplicateDate] = useState('')
```

**Step 2: Fechar o form ao executar duplicate com sucesso**

Localizar a linha 57:
```typescript
    if (ok && action === 'postpone') setShowPostpone(false)
```

Substituir por:
```typescript
    if (ok && action === 'postpone') setShowPostpone(false)
    if (ok && action === 'duplicate') setShowDuplicate(false)
```

**Step 3: Modificar o botão "2ª Via" para abrir o form**

Localizar o bloco (linhas 116–124):
```tsx
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

Substituir por:
```tsx
          {canDuplicate && !showDuplicate && (
            <ActionBtn
              label="2ª Via"
              icon={Copy}
              color="#00d2ff"
              loading={isLoading('duplicate', payment.id)}
              onClick={() => setShowDuplicate(true)}
            />
          )}
```

**Step 4: Adicionar o inline form de data para "2ª Via"**

Localizar o fechamento do bloco "Postpone inline form" (linha 188):
```tsx
      )}
```
Seguido de linha 189 em branco e depois o bloco do toast.

Adicionar APÓS a linha 188 (após o `)}` que fecha o showPostpone):

```tsx
      {/* Duplicate inline form */}
      {showDuplicate && (
        <div
          className="flex items-center gap-2 p-2.5 rounded-lg"
          style={{ background: 'rgba(0,210,255,0.06)', border: '1px solid rgba(0,210,255,0.2)' }}
        >
          <Copy size={13} className="text-cyan-400 flex-shrink-0" />
          <input
            type="date"
            value={duplicateDate}
            onChange={e => setDuplicateDate(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-300 outline-none"
            min={new Date().toISOString().slice(0, 10)}
          />
          <button
            disabled={!duplicateDate || isLoading('duplicate', payment.id)}
            onClick={() => runAction('duplicate', duplicateDate)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
            style={{ background: 'rgba(0,210,255,0.15)', color: '#00d2ff', border: '1px solid rgba(0,210,255,0.3)' }}
          >
            {isLoading('duplicate', payment.id)
              ? <Loader2 size={10} className="animate-spin" />
              : <Copy size={10} />
            }
            Confirmar
          </button>
          <button
            onClick={() => { setShowDuplicate(false); setDuplicateDate('') }}
            className="text-slate-600 hover:text-slate-400 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}
```

**Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 erros.

**Step 6: Verificar visualmente**

Iniciar `npm run dev`. Abrir um pagamento PENDING com `asaas_id` preenchido no FinancialCard. O botão "2ª Via" deve:
- Ao clicar: esconder o botão e mostrar o inline form em ciano
- Ao selecionar data e confirmar: disparar o webhook e fechar o form
- Botão X: fechar sem disparar

**Step 7: Commit**

```bash
git add src/components/financial/FinancialCard.tsx
git commit -m "feat(financial): add date picker to Gerar 2a Via button"
```

---

## Task 3: Documentação dos nodes n8n

**Files:**
- Create: `docs/n8n/finance-nodes.md`

**Contexto:** O workflow `praxis_finance_workflow` existe apenas dentro do n8n (não está no repositório). Este arquivo serve como guia de configuração para adicionar os dois nodes ausentes na UI do n8n.

**Step 1: Criar o arquivo**

Criar `docs/n8n/finance-nodes.md` com o seguinte conteúdo:

````markdown
# Configuração dos Nodes n8n — Financeiro

Adicionar ao workflow `praxis_finance_workflow` no n8n.

---

## Node A: create-charge

Cria uma cobrança no Asaas quando o CRM insere um novo pagamento.

### 1. Webhook Trigger

| Campo | Valor |
|---|---|
| HTTP Method | POST |
| Path | `/finance/create-charge` |
| Response Mode | Immediately |
| Response Code | 200 |

### 2. HTTP Request → Asaas (criar cobrança)

| Campo | Valor |
|---|---|
| Method | POST |
| URL | `https://api.asaas.com/v3/payments` |
| Body Content Type | JSON |

**Headers:**
```json
{ "access_token": "{{ $env.ASAAS_API_KEY }}" }
```

**Body (JSON):**
```json
{
  "customer":    "{{ $('Webhook').item.json.body.asaas_customer_id }}",
  "billingType": "{{ $('Webhook').item.json.body.billing_type }}",
  "value":       {{ $('Webhook').item.json.body.value }},
  "dueDate":     "{{ $('Webhook').item.json.body.due_date }}",
  "description": "{{ $('Webhook').item.json.body.description }}"
}
```

> Se `asaas_customer_id` não estiver disponível no payload, busque antes via `GET /customers?email=...` usando o `client_id` para localizar o cliente.

### 3. HTTP Request → Supabase PATCH (gravar asaas_id)

| Campo | Valor |
|---|---|
| Method | PATCH |
| URL | `{{ $env.SUPABASE_URL }}/rest/v1/financial_payments?id=eq.{{ $('Webhook').item.json.body.payment_id }}` |
| Body Content Type | JSON |

**Headers:**
```json
{
  "apikey": "{{ $env.SUPABASE_SERVICE_ROLE_KEY }}",
  "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}",
  "Content-Type": "application/json",
  "Prefer": "return=minimal"
}
```

**Body (JSON):**
```json
{
  "asaas_id":     "{{ $json.id }}",
  "payment_link": "{{ $json.bankSlipUrl ?? $json.invoiceUrl ?? null }}",
  "status":       "PENDING"
}
```

---

## Node B: duplicate

Gera uma 2ª via de cobrança — cria nova fatura no Asaas com nova data de vencimento e insere novo registro no Supabase.

### 1. Webhook Trigger

| Campo | Valor |
|---|---|
| HTTP Method | POST |
| Path | `/finance/duplicate` |
| Response Mode | Immediately |

**Payload recebido do front-end:**
```json
{
  "asaas_id":     "pay_xxx",
  "payment_id":   "uuid-do-registro-original",
  "new_due_date": "2026-04-10"
}
```

### 2. HTTP Request → Supabase GET (buscar original)

| Campo | Valor |
|---|---|
| Method | GET |
| URL | `{{ $env.SUPABASE_URL }}/rest/v1/financial_payments?id=eq.{{ $json.body.payment_id }}&select=*` |

**Headers:**
```json
{
  "apikey": "{{ $env.SUPABASE_SERVICE_ROLE_KEY }}",
  "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}"
}
```

### 3. HTTP Request → Asaas (criar nova cobrança)

Igual ao Node A Step 2, mas usando `new_due_date` do webhook:

```json
{
  "customer":    "{{ $('Supabase GET').item.json[0].asaas_customer_id }}",
  "billingType": "{{ $('Supabase GET').item.json[0].billing_type }}",
  "value":       {{ $('Supabase GET').item.json[0].value }},
  "dueDate":     "{{ $('Webhook').item.json.body.new_due_date }}",
  "description": "2ª Via — {{ $('Supabase GET').item.json[0].description }}"
}
```

### 4. HTTP Request → Supabase POST (inserir novo registro)

| Campo | Valor |
|---|---|
| Method | POST |
| URL | `{{ $env.SUPABASE_URL }}/rest/v1/financial_payments` |

**Headers:**
```json
{
  "apikey": "{{ $env.SUPABASE_SERVICE_ROLE_KEY }}",
  "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}",
  "Content-Type": "application/json",
  "Prefer": "return=minimal"
}
```

**Body (JSON):**
```json
{
  "client_id":         "{{ $('Supabase GET').item.json[0].client_id }}",
  "client_name":       "{{ $('Supabase GET').item.json[0].client_name }}",
  "asaas_id":          "{{ $('Asaas Create').item.json.id }}",
  "asaas_customer_id": "{{ $('Supabase GET').item.json[0].asaas_customer_id }}",
  "description":       "2ª Via — {{ $('Supabase GET').item.json[0].description }}",
  "value":             {{ $('Supabase GET').item.json[0].value }},
  "type":              "{{ $('Supabase GET').item.json[0].type }}",
  "billing_type":      "{{ $('Supabase GET').item.json[0].billing_type }}",
  "due_date":          "{{ $('Webhook').item.json.body.new_due_date }}",
  "status":            "PENDING",
  "payment_link":      "{{ $('Asaas Create').item.json.bankSlipUrl ?? $('Asaas Create').item.json.invoiceUrl ?? null }}"
}
```

---

## Variáveis de Ambiente (n8n)

Configurar em **Settings → Variables** no n8n:

| Variável | Valor |
|---|---|
| `ASAAS_API_KEY` | Chave da API Asaas (sandbox ou produção) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (não a anon key) |
````

**Step 2: Verificar que o arquivo foi criado corretamente**

Checar que o arquivo existe em `docs/n8n/finance-nodes.md`.

**Step 3: Commit**

```bash
git add docs/n8n/finance-nodes.md
git commit -m "docs(n8n): add node configuration guide for create-charge and duplicate"
```

---

## Checklist de Verificação Final

- [ ] Task 1: `createPayment` envia `payment_id` + payload completo; `tsc --noEmit` passa
- [ ] Task 2: Botão "2ª Via" abre date picker, fecha ao confirmar/cancelar; `tsc --noEmit` passa
- [ ] Task 3: `docs/n8n/finance-nodes.md` criado com configs de Node A e Node B

## Arquivos modificados

| Arquivo | Tipo |
|---|---|
| `src/hooks/useBilling.ts` | Editar |
| `src/components/financial/FinancialCard.tsx` | Editar |
| `docs/n8n/finance-nodes.md` | Criar |
