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
  "value":       "{{ $('Webhook').item.json.body.value }}",
  "dueDate":     "{{ $('Webhook').item.json.body.due_date }}",
  "description": "{{ $('Webhook').item.json.body.description }}"
}
```

> Se `asaas_customer_id` não estiver no payload, busque antes via `GET /customers?email=...` usando o `client_id` para localizar o cliente no Asaas.

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
  "asaas_id":     "{{ $('Asaas Create Charge').item.json.id }}",
  "payment_link": "{{ $('Asaas Create Charge').item.json.bankSlipUrl ?? $('Asaas Create Charge').item.json.invoiceUrl ?? null }}",
  "status":       "PENDING"
}
```

---

## Node B: duplicate

Gera uma 2ª via — cria nova fatura no Asaas com nova data de vencimento e insere novo registro no Supabase.

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
| URL | `{{ $env.SUPABASE_URL }}/rest/v1/financial_payments?id=eq.{{ $('Webhook').item.json.body.payment_id }}&select=*` |

**Headers:**
```json
{
  "apikey": "{{ $env.SUPABASE_SERVICE_ROLE_KEY }}",
  "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}"
}
```

### 3. HTTP Request → Asaas (criar nova cobrança)

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
  "customer":    "{{ $('Supabase GET').item.json[0].asaas_customer_id }}",
  "billingType": "{{ $('Supabase GET').item.json[0].billing_type }}",
  "value":       "{{ $('Supabase GET').item.json[0].value }}",
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
  "asaas_id":          "{{ $('Asaas Duplicate').item.json.id }}",
  "asaas_customer_id": "{{ $('Supabase GET').item.json[0].asaas_customer_id }}",
  "description":       "2ª Via — {{ $('Supabase GET').item.json[0].description }}",
  "value":             "{{ $('Supabase GET').item.json[0].value }}",
  "type":              "{{ $('Supabase GET').item.json[0].type }}",
  "billing_type":      "{{ $('Supabase GET').item.json[0].billing_type }}",
  "due_date":          "{{ $('Webhook').item.json.body.new_due_date }}",
  "status":            "PENDING",
  "payment_link":      "{{ $('Asaas Duplicate').item.json.bankSlipUrl ?? $('Asaas Duplicate').item.json.invoiceUrl ?? null }}"
}
```

---

## Variáveis de Ambiente (n8n)

Configurar em **Settings → Variables** no n8n:

| Variável | Valor |
|---|---|
| `ASAAS_API_KEY` | Chave da API Asaas (sandbox ou produção) |
| `SUPABASE_URL` | URL do projeto Supabase (ex: `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **não use a anon key** |

---

## Notas de Implementação

- Os node names usados nas expressões (`$('Webhook')`, `$('Supabase GET')`, `$('Asaas Duplicate')`) devem corresponder exatamente aos nomes configurados nos nodes do workflow.
- Para o Node A, o `asaas_customer_id` é necessário para criar a cobrança no Asaas. Se o payload não incluir este campo (pagamentos antigos), adicione um node intermediário que busca o cliente via `GET /customers?email=<email>`.
- O campo `payment_link` retornado pelo Asaas varia por tipo de cobrança: `bankSlipUrl` (boleto), `invoiceUrl` (PIX/cartão). Use operador `??` (nullish coalescing) no n8n com Code node se necessário.
