# Design: Billing Drawer — Módulo Financeiro Fase 2

**Data:** 2026-03-03
**Status:** Aprovado

## Contexto

Substituir a lógica de faturamento direto (`asaasProvider.ts`) por um fluxo assíncrono via Supabase + n8n. O frontend insere registros com `asaas_id = null`; o n8n detecta e processa com o Asaas.

## Arquitetura de Componentes

```
src/components/financial/
├── BillingDrawer.tsx           # Drawer principal (slide-in da direita)
├── BillingOneOffForm.tsx       # Formulário de Cobrança Única
├── BillingSubscriptionForm.tsx # Formulário de Assinatura Recorrente
└── Toast.tsx                   # Componente Toast reutilizável (neon dark)

src/hooks/
└── useBilling.ts               # createPayment() e createSubscription()

src/pages/
└── Financial.tsx               # Adiciona botão + remove lógica asaasProvider
```

## Fluxo de Dados

1. `Financial.tsx` mantém `useState<boolean>(drawerOpen)`
2. `BillingDrawer` carrega clientes via `supabase.from('clients').select('id, name')` no mount
3. Submit → `useBilling.createPayment()` ou `useBilling.createSubscription()`
4. Insert com `asaas_id = null` — n8n processa em seguida
5. Sucesso → fecha drawer + dispara Toast

## UI/UX

- **Drawer:** `fixed right-0 top-0 h-full w-[420px]`, background `rgba(8,12,20,0.97)`, borda esquerda `rgba(0,210,255,0.2)`, animação `slide-in-right`
- **Tabs:** Única / Assinatura — tab ativa com borda bottom `--neon-cyan`
- **Campos comuns:** Cliente (combobox com filtro local), Valor (máscara BRL), Descrição, Meio de Pagamento (toggle PIX/Boleto/Cartão)
- **Condicional Única:** Data de Vencimento
- **Condicional Assinatura:** Ciclo (Semanal, Quinzenal, Mensal, Trimestral, Semestral, Anual)
- **Submit:** gradiente cyan→violet, spinner `Loader2` durante loading

## Dados Inseridos

### `financial_payments` (Única)
```ts
{ client_id, client_name, description, value, type: 'ONE_OFF',
  billing_type, due_date, status: 'PENDING', asaas_id: null, asaas_customer_id: null }
```

### `financial_subscriptions` (Assinatura)
```ts
{ client_id, client_name, description, value, billing_type,
  cycle, status: 'ACTIVE', asaas_id: null, asaas_customer_id: null }
```

## Mudanças no Financial.tsx

- Remover: `invoiceData`, `handleGenerateInvoice`, import de `asaasProvider`
- Adicionar: botão "Nova Cobrança" → abre `BillingDrawer`
- Tabela: badge laranja "Pendente Asaas" quando `asaas_id === null`

## Badge "Pendente Asaas"

Cor `--neon-orange`, ícone `Clock` do Lucide. Some automaticamente quando n8n preencher `asaas_id`.
