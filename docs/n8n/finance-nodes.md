# Nós do n8n para Importação (Fluxo Financeiro)

Copie o bloco JSON inteiro de cada seção abaixo e cole (Ctrl+V) diretamente na tela de edição do seu workflow `praxis_finance_workflow` no n8n.

### 1. Webhook: Criar Cobrança (Substitui o antigo Cron)

Este nó vai receber os disparos instantâneos do CRM quando uma cobrança avulsa for criada. Religue ele aos nós que criam Cliente e Cobrança no Asaas.

```json
{
  "nodes": [
    {
      "parameters": {
        "path": "finance/create-charge",
        "responseMode": "lastNode",
        "options": {}
      },
      "name": "Webhook — Create Charge",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [-1480, 1580]
    }
  ]
}
```

### 2. Webhook: Criar Assinatura (Substitui o antigo Cron)

Este nó vai receber os disparos instantâneos do CRM quando uma assinatura for criada. Religue ele aos nós que criam Cliente e Assinatura no Asaas.

```json
{
  "nodes": [
    {
      "parameters": {
        "path": "finance/create-subscription",
        "responseMode": "lastNode",
        "options": {}
      },
      "name": "Webhook — Create Subscription",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [-1480, 1780]
    }
  ]
}
```

### 3. Webhook: Nova Funcionalidade (Gerar 2ª Via / Duplicate)

Este nó recebe o clique do CRM para duplicar a cobrança. Você precisará conectá-lo a um nó do Supabase para buscar os detalhes originais da cobrança (`payment_id`) e depois enviar as requisições de criação pro Asaas com a `new_due_date` que chega no JSON.

```json
{
  "nodes": [
    {
      "parameters": {
        "path": "finance/duplicate",
        "responseMode": "lastNode",
        "options": {}
      },
      "name": "Webhook — 2ª Via (Duplicate)",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [420, 1560]
    }
  ]
}
```
