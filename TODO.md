# CRM Praxis · Roadmap 2.0 & Backlog Completo

> Documento mestre de evolução do sistema. Consolidado com a visão de workspace de alta performance para SDRs, Operação Ágil e BI de Tráfego.

---

## � Prioridade Imediata (Fase 3: Gestão de Clientes & Ciclo de Vida)

Ações necessárias para destravar o módulo financeiro e operacional.

- [ ] **Módulo de Clientes (Base Central)**:
  - Criar aba "Clientes" que lista registros da tabela `clients`.
  - Formulário de Onboarding Completo (CPF/CNPJ, Endereço, Faturamento).
- [ ] **Automação de Conversão**:
  - Programar botão "Converter em Cliente" no Lead Drawer.
  - Gatilho Kanban: Conversão automática ao mover Deal para "Fechado".
- [ ] **Pipeline Dinâmico**:
  - Vincular seletor de estágio do Lead diretamente às colunas do Kanban.
- [ ] **Controle Financeiro (Asaas Control)**:
  - Botões de Cancelamento, Estorno e Alteração de Vencimento no CRM.
  - Botão de "Segunda Via" (Reenviar Notificação).

---

## �🚀 Módulo 1 · Comercial & SDR (Workspace de Vendas)

Interface de alta conversão focada em velocidade e dados.

### 1.1 SDR Multi-Column Workspace

- [ ] **Interface de 3 Colunas**:
  - **Esquerda (Playbook)**: Timeline do dia + Scripts Dinâmicos com variáveis (`{{nome}}`, `{{nicho}}`).
  - **Central (Omnichannel)**: Interface de chat (WhatsApp/Instagram) integrada com botões de "Resposta Rápida".
  - **Direita (Qualificação)**: Formulários customizados (Faturamento, Time, Dores) e Feed de Atividades de redes sociais.

### 1.2 Kanban Inteligente (Visual 2.0)

- [x] **Global Drag & Drop**: Movimentação clicando em qualquer área do card.
- [ ] **Cards Informativos**: Indicadores visuais no footer (Mensagem nova 🟢, Ligação hoje 🔵, Barra de SLA/Tempo parado).
- [ ] **Ações em Massa**: Checkbox para disparar automações ou mudar tags em lote.
- [ ] **Filtros de Origem**: Reorganização instantânea por canal (Google/Meta/Social Selling).

### 1.3 Central de Voz & IA (Auditoria)

- [ ] **Click-to-Call**: Integração com API4com para ligações via CRM.
- [ ] **AI Meeting Assistant**: Integração com Whisper para transcrição e preenchimento automático de campos de qualificação.

---

## 🛠️ Módulo 2 · Operação & Gestão de Projetos

- [ ] **Kanban de Urgência (Ops)**: Organização por deadlines e prioridade crítica.
- [x] **Visão 360° (Client Drawer)**: Abre ao clicar na linha/nome do lead (slide-over).
- [ ] **SDR Workspace (Tríplice Visualização)**:
  - Coluna 1 (Playbook): Checklist D1-D6 + Scripts Dinâmicos.
  - Coluna 2 (Chat Direto): Interface Omnichannel + Respostas Rápidas.
  - Coluna 3 (CRM Data): Faturamento, Equipe e Botão API4com.
- [ ] **Vínculo Lead-Anúncio**: Exibir UTM/Criativo de origem no card.
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

- [ ] **Login de Cliente**: Criar rota pública `/portal/:client_id` com autenticação via Supabase Auth (e-mail + link mágico).
- [ ] **Isolamento de Dados (RLS)**: Cada cliente enxerga **apenas** seus registros (via Row Level Security vinculada ao `client_id`).
- [ ] **Contas Separadas do Painel Interno**: Nenhum cliente pode acessar as rotas do CRM (Pipeline, Operações, Financeiro).
- [ ] **Gerenciamento de Clientes**: Tela interna para criar/convidar clientes via e-mail (a Praxis gera o acesso, o cliente acessa).

### 5.2 · Aprovação de Conteúdo (Pelo Cliente, Não Pela Praxis)

- [ ] **Central de Aprovações**: O cliente é quem aprova ou solicita revisão — com botões "Aprovar ✅" e "Pedir Revisão 🔄".
- [ ] **Comentários por Item**: Campo de texto livre onde o cliente explica o que deseja alterar.
- [ ] **Notificação à Praxis**: Ao reprovar, o sistema notifica a equipe via WhatsApp/e-mail com o comentário do cliente.
- [ ] **Status de Aprovação Visual**: Cada peça de conteúdo exibe badge: `Pendente`, `Aprovado`, `Em Revisão`.

### 5.3 · Experiência Premium do Cliente

- [ ] **Onboarding Gamificado**: Barra de progresso com "Checks" automáticos de configuração.
- [ ] **Nexus AI Tutor**: Chatbot interno que conhece o projeto e tira dúvidas do cliente.
- [x] **Brand Folder**: Repositório central para manuais, fontes e logotipos.
- [x] **Nexus Timeline**: Linha do tempo sincronizada com a Operação interna.

---

## ⚡ Módulo 6 · Automações de Gatilho (Trigger-Action)

> Ligam os eventos do pipeline a ações automáticas — eliminando trabalho manual e acelerando o ciclo de vendas.

### 6.1 · Entrada & Qualificação Inicial

- [ ] **Novo formulário recebido** (Site / Typebot / Facebook Leads)
  - Cria card na coluna "Base".
  - Se tag = "High Ticket" → move direto para "Prospecção" + notifica SDR no WhatsApp.
- [ ] **Palavra-chave no Instagram** (ex: "QUERO" em comentário)
  - Cria card na coluna "Social Selling".
  - Abre Drawer com script de abordagem inicial pré-carregado.

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
- [ ] **Financeiro (Fase 2 - Outbound)**: Configurar n8n para polling de novas cobranças. [EM PROGRESSO]
- [ ] **Ativar Botões**: "Novo Lead" e "Novo Projeto" (validar persistência real no Supabase).
- [ ] **Configurações**: Corrigir persistência do formulário e upload de logotipo.
- [ ] **Dropdown de Serviços**: Substituir texto livre por lista pré-definida no Pipeline.

---

## 🎨 Design System & UX

- Utilização de **Glassmorphism** e **Azul Praxis**.
- Bibliotecas Sugeridas: `react-flow` (Workflow), `lucide-react` (Ícones), `framer-motion` (Animações).
