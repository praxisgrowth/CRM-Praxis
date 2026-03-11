# Fase 5 & 6 — UTM Tracking, Webhook Reprovação, SLA Dashboard

**Data:** 2026-03-11
**Status:** Aprovado

---

## Contexto

Auditoria identificou 3 lacunas críticas nas fases 5 (Portal Nexus) e 6 (Operação). Este spec cobre as 3 features independentes.

---

## Feature A · UTM Tracking (Vínculo Lead-Anúncio)

### Objetivo
Permitir rastrear a origem de marketing de cada lead (utm_source, utm_medium, utm_campaign, utm_content, utm_term), com preenchimento automático quando disponível e edição manual pelo SDR.

### Componentes

**1. Migration SQL** — `supabase/utm_migration.sql`
- Adiciona 5 colunas `text nullable` à tabela `leads`:
  - `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`

**2. `src/lib/database.types.ts`**
- Adiciona os 5 campos UTM à interface `Lead`

**3. `src/hooks/useLeads.ts`**
- Adiciona os 5 campos UTM a `NewLeadInput`

**4. `src/components/leads/NewLeadModal.tsx`**
- Nova seção colapsável "UTM / Origem" no final do formulário
- 5 campos text, estilo visual discreto (fundo levemente mais escuro, label menor)
- Inicialmente colapsada para não poluir o fluxo principal

**5. `src/components/leads/SDRQualification.tsx`**
- Nova seção "Rastreamento de Origem" no final do drawer
- Campos pré-preenchidos com dados do lead (híbrido: read + editável)
- Ao salvar, chama `updateLead` com os 5 campos UTM
- Estilo sutil: agrupados, fonte menor, visualmente separados do diagnóstico ICP

### Data Flow
```
Lead criado (form/URL) → utm_* salvos na tabela leads
SDR abre drawer → SDRQualification lê utm_* do lead
SDR edita → updateLead persiste no Supabase
```

---

## Feature B · Webhook de Notificação de Reprovação

### Objetivo
Quando um cliente clica "Pedir Ajuste" no Portal Nexus, notificar a equipe via n8n com detalhes do arquivo e comentário.

### Componentes

**`src/hooks/useNexus.ts`** — função `requestAdjustment`

Após o insert em `nexus_approvals`, disparar POST fire-and-forget:

```
URL: ${VITE_N8N_WEBHOOK_URL}/webhook/nexus/file-adjustment
Method: POST
Headers: { 'Content-Type': 'application/json' }
Body: {
  file_id: string,
  file_name: string,   // buscado de files[] no estado local
  client_name: string, // do nexus_approvals
  comment: string
}
```

**Tratamento de erro:** `try/catch` silencioso — falha no webhook não bloqueia a ação do cliente. Log de erro no console apenas.

### Data Flow
```
Cliente clica "Pedir Ajuste" → requestAdjustment(fileId, comment)
  → UPDATE nexus_files SET status='ajuste'
  → INSERT nexus_approvals
  → POST /webhook/nexus/file-adjustment (fire-and-forget)
  → n8n notifica equipe via WhatsApp/email
```

---

## Feature C · SLA Dashboard

### Objetivo
Exibir métricas de performance operacional no Dashboard para ADMIN/MEMBER, abaixo dos KPIs existentes.

### Componentes

**1. `src/hooks/useSLAMetrics.ts`** — hook que calcula 2 métricas:

- **Tempo médio de entrega da agência:**
  - Query: projetos com `status = 'concluido'`
  - Cálculo: média de `(updated_at - created_at)` em dias
  - Retorna: `avgDeliveryDays: number | null`, `projectCount: number`

- **Tempo médio de aprovação do cliente:**
  - Query: join `nexus_files` + `nexus_approvals` onde `action = 'aprovado'`
  - Cálculo: média de `(nexus_approvals.created_at - nexus_files.created_at)` em horas
  - Retorna: `avgApprovalHours: number | null`, `approvalCount: number`

**2. `src/components/dashboard/SLADashboard.tsx`** — seção "Performance & SLA"
- 2 cards glassmorphism estilo design system (fundo praxis-dark, bordas rgba)
- Card 1: "Entrega Média" — X dias (ícone Clock, cor praxis-blue)
- Card 2: "Aprovação Média" — X horas (ícone CheckCircle, cor praxis-purple)
- Cada card mostra contagem de amostras (`n=X`)
- Loading skeleton enquanto carrega
- Estado vazio se `n=0`: "Sem dados suficientes"

**3. `src/pages/Dashboard.tsx`**
- Importa `SLADashboard`
- Renderiza abaixo dos KPI cards existentes
- Guard: `profile?.role === 'ADMIN' || profile?.role === 'MEMBER'`

### Design System
- Fundo cards: `rgba(255,255,255,0.03)`, borda `rgba(255,255,255,0.08)`
- Métricas: fonte grande (32px), cor accent
- Labels: `text-slate-500`, uppercase, tracking-wide
- Consistente com KPI cards do Dashboard existente

---

## Ordem de Execução

Features A e B são independentes — executar em paralelo.
Feature C é independente — executar após A e B (ou em paralelo).

---

## Fora de Escopo

- Captura automática de UTMs via URL params (YAGNI — SDR preenche manualmente)
- Retry logic no webhook n8n
- SLA por tipo de serviço ou por setor (fase futura)
- Configuração do workflow n8n (responsabilidade do usuário)
