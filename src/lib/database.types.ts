export type Trend = 'up' | 'down' | 'flat'

export type PipelineStage = Lead['stage']

export interface PipelineDeal {
  id: string
  title: string
  company: string
  contact_name: string | null
  value: number
  stage: PipelineStage
  priority: Priority
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  stage: 'prospeccao' | 'reuniao' | 'proposta' | 'negociacao' | 'fechado'
  score: number
  source: string | null
  // ─── Pipeline fields (unified_leads_migration.sql) ─────────
  title:    string | null
  value:    number
  priority: Priority | null
  company:  string | null
  tags:     string[]
  // ─── ICP fields (icp_migration.sql) ───────────────────────
  faturamento: string | null
  team_size:   string | null
  dores:       string | null
  // ──────────────────────────────────────────────────────────
  client_id?: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  segment: string | null
  mrr: number
  health_score: number
  trend: Trend
  avatar: string
  asaas_id: string | null
  // ─── Billing fields (Fase 3a) ─────────────────────
  email:      string | null
  phone:      string | null
  cpf_cnpj:   string | null
  cep:        string | null
  logradouro: string | null
  numero:     string | null
  complemento: string | null
  bairro:     string | null
  cidade:     string | null
  uf:         string | null
  // ──────────────────────────────────────────────────
  created_at: string
  updated_at: string
}

export interface MRRHistory {
  id: string
  month: string
  mrr: number
  meta: number
  recorded_at: string
}

export interface KPIMetric {
  id: string
  key: string   // 'conversion_rate' | 'sla_percent'
  value: number
  updated_at: string
}

// ─── Agency Settings ──────────────────────────────────────────
export interface AgencySettingsRow {
  id: string
  user_name: string
  user_email: string
  user_role: string
  user_phone: string
  agency_name: string
  logo_url: string | null
}

// ─── Lead Activities ───────────────────────────────────────────
export type ActivityType = 'criacao' | 'nota' | 'stage_change' | 'contato' | 'email'

export interface LeadActivity {
  id: string
  lead_id: string
  type: ActivityType
  description: string
  metadata: Record<string, unknown> | null
  created_by: string
  created_at: string
}

// ─── Asaas / Financial Payments ───────────────────────────────
export type AsaasPaymentStatus = 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED'
export type AsaasBillingType   = 'PIX' | 'BOLETO' | 'CREDIT_CARD'
export type AsaasInvoiceType   = 'ONE_OFF' | 'RECURRING'

export interface FinancialPayment {
  id:                string
  client_id:         string | null
  client_name:       string | null
  asaas_id:          string | null
  asaas_customer_id: string | null
  description:       string
  value:             number
  type:              AsaasInvoiceType
  status:            AsaasPaymentStatus
  due_date:          string | null
  payment_link:      string | null
  billing_type:      AsaasBillingType
  created_at:        string
  updated_at:        string
  clients?:          { phone?: string | null; email?: string | null } | null
}

export type SubscriptionCycle  = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED'

export interface FinancialSubscription {
  id:                string
  client_id:         string | null
  client_name:       string | null
  asaas_id:          string | null
  description:       string
  value:             number
  cycle:             SubscriptionCycle
  status:            SubscriptionStatus
  billing_type:      AsaasBillingType
  next_due_date:     string | null
  created_at:        string
  updated_at:        string
}

export type TransactionStatus = 'pago' | 'pendente' | 'atrasado'
export type TransactionType   = 'receita' | 'despesa'

export interface FinancialTransaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  category: string
  status: TransactionStatus
  date: string
  client_id: string | null
  created_at: string
}

export interface FinancialMRREntry {
  id: string
  month: string        // 'YYYY-MM' do banco ou já formatado
  mrr: number
  churn_rate: number   // campo do financial schema; 0 se não existir
  recorded_at: string
}

export type ProjectStatus = 'ativo' | 'pausado' | 'concluido' | 'atrasado'
export type TaskStatus    = 'todo' | 'in_progress' | 'waiting_client' | 'done' | 'blocked'
export type Priority      = 'baixa' | 'media' | 'alta' | 'urgente'

export interface Project {
  id: string
  name: string
  client_name: string
  status: ProjectStatus
  service_type: string | null
  sla_percent: number
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string | null
  client_id: string | null
  template_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  assignee_id: string | null
  due_date: string | null
  deadline: string | null
  estimated_hours: number
  actual_hours: number
  current_timer_start: string | null
  depends_on_id: string | null
  created_at: string
  updated_at: string
}

export interface ProjectTemplate {
  id: string
  service_type: string
  task_number: number
  title: string
  type: string
  sla_days: number
  depends_on_task_number: number | null
  depends_on_id: string | null
  created_at: string
}

export interface TaskChecklist {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  created_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  body: string
  author: string
  created_at: string
}

export interface TaskAttachment {
  id: string
  task_id: string
  name: string
  url: string
  created_at: string
}

// ─── Nexus types ──────────────────────────────────────────────
export type NexusFileType   = 'imagem' | 'copy' | 'video' | 'documento'
export type NexusFileStatus = 'pendente' | 'aprovado' | 'ajuste' | 'duvida'
export type ApprovalAction  = 'aprovado' | 'ajuste' | 'duvida' | 'sugestao'

export interface NexusFile {
  id:            string
  client_id:     string | null
  project_id:    string | null
  client_name:   string | null
  project_name:  string | null
  title:         string
  description:   string | null
  type:          NexusFileType
  url:           string | null
  thumbnail_url: string | null
  uploaded_by:   string
  status:        NexusFileStatus
  created_at:    string
  updated_at:    string
}

export interface NexusApproval {
  id:          string
  file_id:     string
  action:      ApprovalAction
  comment:     string | null
  client_name: string | null
  created_at:  string
}

export interface AuditLog {
  id:          string
  user_name:   string
  action:      string
  entity_type: string
  entity_id:   string | null
  details:     Record<string, unknown> | null
  created_at:  string
}

export interface TeamMember {
  id:         string
  name:       string
  role:       string | null
  email:      string | null
  initials:   string | null
  avatar_url: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      agency_settings: {
        Row: AgencySettingsRow
        Insert: Omit<AgencySettingsRow, 'id'>
        Update: Partial<Omit<AgencySettingsRow, 'id'>>
      }
      leads: {
        Row: Lead
        Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Lead, 'id' | 'created_at'>>
      }
      lead_activities: {
        Row: LeadActivity
        Insert: Omit<LeadActivity, 'id' | 'created_at'>
        Update: Partial<Omit<LeadActivity, 'id' | 'created_at'>>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Client, 'id' | 'created_at'>>
      }
      mrr_history: {
        Row: MRRHistory
        Insert: Omit<MRRHistory, 'id'>
        Update: Partial<Omit<MRRHistory, 'id'>>
      }
      kpi_metrics: {
        Row: KPIMetric
        Insert: Omit<KPIMetric, 'id' | 'updated_at'>
        Update: Partial<Omit<KPIMetric, 'id'>>
      }
      pipeline_deals: {
        Row: PipelineDeal
        Insert: Omit<PipelineDeal, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PipelineDeal, 'id' | 'created_at'>>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Project, 'id' | 'created_at'>>
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Task, 'id' | 'created_at'>>
      }
      project_templates: {
        Row: ProjectTemplate
        Insert: Omit<ProjectTemplate, 'id' | 'created_at'>
        Update: Partial<Omit<ProjectTemplate, 'id' | 'created_at'>>
      }
      task_checklists: {
        Row: TaskChecklist
        Insert: Omit<TaskChecklist, 'id' | 'created_at'>
        Update: Partial<Omit<TaskChecklist, 'id' | 'created_at'>>
      }
      task_comments: {
        Row: TaskComment
        Insert: Omit<TaskComment, 'id' | 'created_at'>
        Update: Partial<Omit<TaskComment, 'id' | 'created_at'>>
      }
      task_attachments: {
        Row: TaskAttachment
        Insert: Omit<TaskAttachment, 'id' | 'created_at'>
        Update: Partial<Omit<TaskAttachment, 'id' | 'created_at'>>
      }
      financial_transactions: {
        Row: FinancialTransaction
        Insert: Omit<FinancialTransaction, 'id' | 'created_at'>
        Update: Partial<Omit<FinancialTransaction, 'id' | 'created_at'>>
      }
      financial_payments: {
        Row: FinancialPayment
        Insert: Omit<FinancialPayment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<FinancialPayment, 'id' | 'created_at'>>
      }
      financial_subscriptions: {
        Row: FinancialSubscription
        Insert: Omit<FinancialSubscription, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<FinancialSubscription, 'id' | 'created_at'>>
      }
      nexus_files: {
        Row: NexusFile
        Insert: Omit<NexusFile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<NexusFile, 'id' | 'created_at'>>
      }
      nexus_approvals: {
        Row: NexusApproval
        Insert: Omit<NexusApproval, 'id' | 'created_at'>
        Update: Partial<Omit<NexusApproval, 'id' | 'created_at'>>
      }
      team_members: {
        Row: TeamMember
        Insert: Omit<TeamMember, 'id' | 'created_at'>
        Update: Partial<Omit<TeamMember, 'id' | 'created_at'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: Partial<Omit<AuditLog, 'id' | 'created_at'>>
      }
    }
  }
}
