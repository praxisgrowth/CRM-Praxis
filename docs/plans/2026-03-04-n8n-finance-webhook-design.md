# Design: Fluxo Financeiro n8n — Webhooks de Cobrança

**Data:** 2026-03-04
**Status:** Aprovado

## Escopo

Três entregas para completar o ciclo de vida de cobranças entre CRM Praxis e Asaas via n8n:

1. `useBilling.ts` — chamada imediata ao webhook após insert no Supabase
2. `FinancialCard.tsx` — date picker inline no botão "2ª Via"
3. JSON de configuração dos nodes n8n para `create-charge` e `duplicate`

---

## 1. useBilling.ts — Webhook instantâneo após insert

### Fluxo atual
`createPayment()` só faz INSERT em `financial_payments` sem retornar o id.

### Fluxo novo
1. INSERT com `.select('id').single()` → recupera `id` do novo registro
2. Chama `POST ${VITE_N8N_WEBHOOK_URL}/webhook/finance/create-charge`:
```json
{
  "payment_id":  "<id do registro recém-criado>",
  "client_id":   "...",
  "client_name": "...",
  "description": "...",
  "value":       1500,
  "billing_type": "PIX",
  "due_date":    "2026-03-10"
}
```
3. Erro no webhook é silenciado — cobrança fica com `asaas_id = null` para o cron de fallback

### Variável de ambiente
`VITE_N8N_WEBHOOK_URL` já existe no `.env`.

---

## 2. FinancialCard.tsx — Date picker no botão "2ª Via"

### Comportamento atual
`canDuplicate` chama `runAction('duplicate')` imediatamente (sem data).

### Comportamento novo
- Clicar em "2ª Via" → exibe inline form idêntico ao "Adiar" (já existe no componente)
- Campos: `showDuplicate: boolean`, `duplicateDate: string`
- Confirmar → `runAction('duplicate', duplicateDate)` → envia `new_due_date` no payload
- `useFinancialActions.ts` não muda — já suporta `new_due_date`

### Payload enviado ao n8n
```json
{ "asaas_id": "pay_xxx", "payment_id": "uuid", "new_due_date": "2026-04-10" }
```

---

## 3. Configuração dos nodes n8n

### Node A: create-charge

**Webhook trigger**
- Method: POST
- Path: `/finance/create-charge`
- Response mode: Immediately

**HTTP Request → Asaas**
- Method: POST
- URL: `https://api.asaas.com/v3/payments`
- Headers: `access_token: {{ $env.ASAAS_API_KEY }}`
- Body:
```json
{
  "customer":    "{{ $json.body.asaas_customer_id }}",
  "billingType": "{{ $json.body.billing_type }}",
  "value":       {{ $json.body.value }},
  "dueDate":     "{{ $json.body.due_date }}",
  "description": "{{ $json.body.description }}"
}
```

**HTTP Request → Supabase PATCH**
- Method: PATCH
- URL: `{{ $env.SUPABASE_URL }}/rest/v1/financial_payments?id=eq.{{ $json.body.payment_id }}`
- Headers: `apikey`, `Authorization: Bearer <SERVICE_ROLE_KEY>`, `Content-Type: application/json`
- Body: `{ "asaas_id": "{{ $asaasResponse.id }}", "payment_link": "{{ $asaasResponse.bankSlipUrl }}" }`

---

### Node B: duplicate

**Webhook trigger**
- Method: POST
- Path: `/finance/duplicate`
- Response mode: Immediately

**HTTP Request → Supabase GET (buscar original)**
- Method: GET
- URL: `{{ $env.SUPABASE_URL }}/rest/v1/financial_payments?id=eq.{{ $json.body.payment_id }}&select=*`
- Headers: `apikey`, `Authorization`

**HTTP Request → Asaas (criar nova cobrança)**
- Method: POST
- URL: `https://api.asaas.com/v3/payments`
- Body igual ao Node A, mas `dueDate = {{ $json.body.new_due_date }}`

**HTTP Request → Supabase INSERT (novo registro)**
- Method: POST
- URL: `{{ $env.SUPABASE_URL }}/rest/v1/financial_payments`
- Body: cópia do original com `asaas_id` da nova cobrança, `due_date = new_due_date`, `status = PENDING`

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/hooks/useBilling.ts` | Editar — select id + chamada webhook |
| `src/components/financial/FinancialCard.tsx` | Editar — date picker no botão 2ª Via |
| `docs/n8n/finance-nodes.md` | Criar — JSON de configuração dos nodes n8n |
