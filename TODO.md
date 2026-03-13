# CRM Praxis · Roadmap 2.0 & Backlog Completo

> Documento mestre de evolução do sistema. Consolidado com a visão de workspace de alta performance para SDRs, Operação Ágil e BI de Tráfego.

---

## Prioridade Imediata (Fase 3: Gestão de Clientes & Ciclo de Vida)

Ações necessárias para destravar o módulo financeiro e operacional.

- [ ] **Módulo de Clientes (Base Central)**:
- [x] **Módulo de Clientes — Refinamento de Onboarding**:
  - [x] Adicionar validação de CEP e preenchimento automático (ViaCEP).
  - [x] Garantir que CPF/CNPJ e Endereço sejam obrigatórios para sincronização.
- [x] **Módulo Financeiro — Controle de Sincronização**:
  - [x] [NEW] Implementar toggle "Sincronizar com Asaas" na criação de cobranças/assinaturas.
  - [x] [NEW] Permitir criação de cobranças apenas no banco de dados CRM (Manual).
- [x] **Automação de Conversão**:
  - [x] Vincular botão "Converter em Cliente" ao gatilho de criação no Asaas (via n8n).
  - [x] Debugar e finalizar workflow de disparos de cobrança.
- [ ] **Pipeline Dinâmico**:
  - [ ] Vincular seletor de estágio do Lead diretamente às colunas do Kanban.
- [x] **Controle Financeiro (Asaas Control)**:
  - [x] Implementar funcionalidade de "Cobrança Duplicada".
  - [x] Histórico de pagamentos por cliente.
  - [x] Botões de Cancelamento, Estorno e Alteração de Vencimento no CRM.
  - [x] Botão de "Segunda Via" (Reenviar Notificação).

---

## �🚀 Módulo 1 · Comercial & SDR (Workspace de Vendas)

Interface de alta conversão focada em velocidade e dados.

### 1.1 SDR Multi-Column Workspace

- [x] **Interface de 3 Colunas**:
  - [x] **Esquerda (Playbook)**: Timeline do dia + Scripts Dinâmicos com variáveis (`{{nome}}`, `{{nicho}}`).
  - [x] **Central (Omnichannel)**: Interface de chat (WhatsApp/Instagram) integrated com botões de "Resposta Rápida".
  - [x] **Direita (Qualificação)**: Formulários customizados (Faturamento, Time, Dores) e Feed de Atividades de redes sociais.

### 1.2 Kanban Inteligente (Visual 2.0)

- [x] **Global Drag & Drop**: Movimentação clicando em qualquer área do card.
- [ ] **Cards Informativos**: Indicadores visuais no footer (Mensagem nova 🟢, Ligação hoje 🔵, Barra de SLA/Tempo parado).
- [ ] **Ações em Massa**: Checkbox para disparar automações ou mudar tags em lote.
- [x] **Filtros de Origem**: Reorganização instantânea por canal (Google/Meta/Social Selling).

### 1.3 Central de Voz & IA (Auditoria)

- [ ] **Click-to-Call**: Integração com API4com para ligações via CRM.
- [ ] **AI Meeting Assistant**: Integração com Whisper para transcrição e preenchimento automático de campos de qualificação.

---

## 🛠️ Módulo 2 · Operação & Gestão de Projetos

- [x] **Módulo 2: Gestão de Projetos & Onboarding (NOVO)**:
  - [x] **Arquitetura e Banco de Dados**:
    - [x] Criar tabelas `project_templates`, `tasks_v2`, `task_checklists`, `task_comments` e `task_attachments`.
    - [x] Migrar lógica da antiga tabela `tasks` para a nova estrutura.
  - [x] **Visão Geral da Equipe**:
    - [x] Implementar `ProjectManagerPage` com toggle Lista/Kanban.
    - [x] Criar filtros globais (Responsável, Cliente, Prazo, Status).
  - [x] **Time Tracking & Performance**:
    - [x] Botão Play/Stop com lógica de `current_timer_start`.
    - [x] Cálculo de `actual_hours` vs `estimated_hours`.
    - [x] Bloqueio automático ao mudar para status "Aguardando Cliente".
  - [x] **Editor de Templates (Admin)**:
    - [x] Interface para criar tarefas padrão por tipo de serviço.
    - [x] Definição de SLA (dias), prioridade e dependências.
  - [x] **Refinamento UI/UX Operação (Interface de Alta Performance)**:
    - [x] **Navegação**: Submenus "Tarefas" e "Projetos" na Sidebar (sob "Operação").
    - [x] **Configurações**: Ícone de engrenagem com atalhos para Gestão de Templates.
    - [x] **Filtros (Listas Exatas)**:
      - Setor: Implementação, GMN, Site, Traqueamento, Tráfego, Financeiro, Vendas, Supervisão.
      - Prazo: Hoje, Amanhã, Esta Semana, Atrasadas, Futuras.
      - Status: Concluída, Pendente, Bloqueada.
    - [x] **Visual Lista**: Tabela operacional densa com colunas completas.
    - [x] **Visual Kanban**: Cards minimalistas (Título, Cliente, Responsável, Cor de Prioridade).
- [ ] **Kanban de Urgência (Ops)**: Organização por deadlines e prioridade crítica.
- [x] **Visão 360° (Client Drawer)**: Abre ao clicar na linha/nome do lead (slide-over).
- [x] **SDR Workspace (Tríplice Visualização)**:
  - [x] Coluna 1 (Playbook): Checklist D1-D6 + Scripts Dinâmicos.
  - [x] Coluna 2 (Chat Direto): Interface Omnichannel + Respostas Rápidas.
  - [x] Coluna 3 (CRM Data): Faturamento, Equipe e Botão API4com.
- [x] **Vínculo Lead-Anúncio**: Exibir UTM/Criativo de origem no card.
- [ ] **Transcrição & Nota IA**: Integração Whisper + Claude para auditoria de calls.
- [ ] **Workflow Canvas (React Flow)**: Interface visual para desenhar réguas de automação.

---

## 📊 Módulo 3 · Dashboard & BI de Tráfego

- [ ] **Funil Comparativo**: Leads vs. Agendamentos vs. Vendas por UTM (Google vs. Meta).
- [ ] **KPI cards**: Leads ativos, MRR, Taxa de conversão, % SLA
- [ ] **Widget de Forecast**: Previsão de faturamento (Valor Pipeline × Probabilidade).
- [ ] **Agency Health Score**: Gauge SVG com score 0–100.
- [ ] **Gráfico de MRR**: Histórico mensal vs. meta (AreaChart).
- [ ] **White-label Messaging**: Cobrança via WhatsApp/E-mail com branding próprio (Asaas no backend).
- [ ] **Google Sync**: Sincronização de Agenda e Histórico de E-mails.

---

## 💰 Módulo 4 · Financeiro & Documentação

- [ ] **Contrato Automático**: Gerador de PDF com dados do lead e assinatura digital.
- [ ] **White-label Messaging**: Cobrança via WhatsApp/E-mail com branding próprio (Asaas no backend).
- [ ] **Google Sync**: Sincronização de Agenda e Histórico de E-mails.

---

## 🌌 Módulo 5 · Portal Nexus (Experiência do Cliente)

> **Premissa fundamental**: O Portal Nexus é uma área **exclusiva de cada cliente**. Cada cliente tem seu login próprio, vê apenas seu projeto e aprova apenas seus conteúdos. Zero acesso cruzado entre clientes e nenhum acesso ao painel interno da Praxis.

### 5.1 · Autenticação e Acesso Multi-Tenant

- [x] **Acesso do Cliente (Login & Senha)**:
  - [x] Implementar botão "Gerar Acesso ao Portal" dentro do Detalhe do Cliente.
  - [x] Permitir que o Admin defina uma senha inicial (ou link mágico).
  - [x] **Login do Sistema**: Criar página de login `/login` com design Neon Dark.
- [x] **Infraestrutura de Convite**:
  - [x] Criar e implantar Edge Function `invite-user` no Supabase para lidar com convites de Equipe (Membro/Admin).
- [x] **Portal Nexus (Mirror View)**:
  - [x] Botão "Ver como Cliente" para Admins e Membros da Equipe.

### 5.2 · Aprovação de Conteúdo (Pelo Cliente, Não Pela Praxis)

- [x] **Central de Aprovações**: O cliente é quem aprova ou solicita revisão — com botões "Aprovar ✅" e "Pedir Revisão 🔄".
- [x] **Comentários por Item**: Campo de texto livre onde o cliente explica o que deseja alterar.
- [x] **Notificação à Praxis**: Ao reprovar, o sistema notifica a equipe via WhatsApp/e-mail com o comentário do cliente.
- [x] **Status de Aprovação Visual**: Cada peça de conteúdo exibe badge: `Pendente`, `Aprovado`, `Em Revisão`.

### 5.3 · Experiência Premium do Cliente (Fase 3)

- [ ] **Onboarding Gamificado**: Barra de progresso com "Checks" automáticos de configuração.
- [ ] **Nexus AI Tutor**: Chatbot interno que conhece o projeto e tira dúvidas do cliente.
- [x] **Brand Folder**: Repositório central para manuais, fontes e logotipos.
- [x] **Nexus Timeline**: Linha do tempo sincronizada com a Operação interna.
- [x] **Barra de Progresso**: Visualização real-time do % de conclusão do projeto.
- [x] **Aprovação de Entregáveis**: Sistema de cards com Aprovar/Ajustar/Dúvida.
- [ ] **Sugerir Ideia**: Botão para o cliente enviar novos briefings do zero.

---

## 🚀 Fase 4 · Nexus Avançado & Calendário Editorial (Próximos Passos)

Evolução para automação total, métricas de desempenho e planejamento de conteúdo.

- [ ] **Notificações Ativas (n8n)**:
  - [ ] Preparar webhooks no Supabase disparados por mudanças de status de entregáveis.
  - [ ] Fluxo n8n para avisar equipe no WhatsApp quando o cliente pedir ajuste ou dúvida.
- [ ] **Acesso & Segurança**:
  - [ ] **Magic Links**: Implementar login via e-mail sem senha (OTP Supabase) para facilitar acesso do cliente.
- [ ] **Gestão de Conteúdo & Calendário**:
  - [ ] **Calendário Editorial**: View de calendário dinâmico (grade mensal) para cliente e equipe.
  - [ ] **Modo Calendário v1**: Toggle Lista/Calendário baseado na `publish_date`.
  - [ ] **Batch Creation**: Interface para rascunhar múltiplos posts de uma vez no calendário.
  - [ ] **Versionamento**: Tabela `nexus_file_versions` para histórico (V1, V2) após revisões.
- [ ] **Métricas & SLA**:
  - [ ] **Dashboard SLA**: Painel para medir tempo médio de resposta da agência vs. tempo de aprovação do cliente.
  - [ ] **Timestamps de Performance**: Logar `enviado_para_aprovacao_em` e `respondido_pelo_cliente_em`.
- [ ] **Refinamentos de UI/UX Portal**:
  - [ ] **Botão "Sugerir Ideia"**: Permite ao cliente criar um novo briefing/card do zero.
  - [ ] **Ação "Dúvida"**: Novo status/fluxo para chat/comentário sobre itens específicos.
  - [ ] **Abas Inativas (SOON)**: Brand Folder e Métricas de Ads com selo de em breve.

---

## ⚡ Módulo 6 · Automações de Gatilho (Trigger-Action)

> Ligam os eventos do pipeline a ações automáticas — eliminando trabalho manual e acelerando o ciclo de vendas.

### 6.1 · Entrada & Qualificação Inicial

- [ ] **Novo formulário recebido** (Site / Typebot / Facebook Leads)
  - [ ] [n8n] Configurar webhook de entrada para criar card na coluna "Base".
  - [ ] Se tag = "High Ticket" → move direto para "Prospecção" + notifica SDR no WhatsApp.
- [x] **Palavra-chave no Instagram** (ex: "QUERO" em comentário)
  - [x] [UI] Criar card na coluna "Social Selling" (Concluído).
  - [ ] [n8n] Configurar workflow para escutar comentários/curtidas via Evolution API.
  - [x] [UI] Abrir Drawer com script de abordagem inicial pré-carregado.

### 6.2 · Fluxo de Prospecção (Acompanhamento)

- [ ] **SDR clica "Ligação Realizada"** e a chamada durou > 2 min
  - Move automaticamente de "Prospecção" → "Conexão".
- [ ] **Primeiro script enviado via WhatsApp** (Resposta Rápida)
  - Adiciona tag "Aguardando Resposta" + inicia cronômetro de SLA.
  - Se sem resposta em 24h → card com **borda vermelha** (SLA crítico).

### 6.3 · Agendamento & Reunião

- [ ] **Evento criado no Google Calendar** vinculado ao e-mail do lead
  - Move card para "Reunião Agendada".
- [ ] **30 min antes da reunião**
  - Envia lembrete automático de WhatsApp para o cliente (anti no-show).
- [ ] **Reunião finalizada** (status no Calendar = encerrado)
  - Move para "Proposta" + abre modal de Gerador de Contrato.

### 6.4 · Fechamento & Transição (Comercial → Operação)

- [ ] **Card movido para "Fechado (Ganho)"**
  - **Ação 1**: Cria registro no Financeiro (Asaas) + gera primeiro boleto/assinatura.
  - **Ação 2**: Cria novo Projeto na Operação com checklist de Onboarding padrão.
  - **Ação 3**: Envia mensagem de boas-vindas + link de acesso ao Portal Nexus.

---

## 🛠️ Ajustes Técnicos & Correções Imediatas (Prioridade 0)

- [x] **Global Drag & Drop**: Habilitar movimentação total no Kanban.
- [x] **Client Drawer**: Slide-over para evitar perda de contexto.
- [x] **Pipeline Dinâmico**:
  - [x] Vincular seletor de estágio do Lead diretamente às colunas do Kanban.
        ..
- [x] **Impedir dupla conversão de Lead no Pipeline**: Resolvido via `client_id` idempotency.
- [x] **Dropdown de Serviços**: Substituído texto livre por lista pré-definida no Pipeline e Lead Modal.

- [ ] **Módulo de Equipe & RBAC (Segurança)**:
  - [x] **Database**: Criar tabela `profiles` extendendo `auth.users`.
  - [x] **Gestão**: Nova tela de "Equipe" para gerenciar membros e cargos.
  - [x] **Segurança**: Bloqueio de menus sensíveis (Financeiro/Comercial/Config) para Membros.
  - [x] **Cliente**: Bloqueio total (apenas Nexus/Universidade) para Clientes.
  - [x] **Edge Function**: Implementar `invite-user` para evitar uso do dashboard do Supabase.
  - [x] **Login**: Página de Login personalizada.

- [x] **Integração de Inteligência (Tarefas Avançadas)**:
  - [ ] **Lógica**: Implementar desbloqueio de tarefas dependentes em cascata.
  - [x] **Lançamento**: Sistema de Lançamento em Lote para combos de tarefas.
  - [x] **Visual**: Visão por Cliente com Barra de Progresso do Projeto.

---

## 🎨 Design System & UX

- Utilização de **Glassmorphism** e **Azul Praxis**.
- Bibliotecas Sugeridas: `react-flow` (Workflow), `lucide-react` (Ícones), `framer-motion` (Animações).
