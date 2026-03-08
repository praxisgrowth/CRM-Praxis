-- supabase/project_management_migration.sql
-- ═══════════════════════════════════════════════════════════
-- MIGRATION: Project Management & Onboarding Module
-- Strategy: Additive (backward-compatible)
-- ═══════════════════════════════════════════════════════════

-- 1. Make project_id nullable on tasks
ALTER TABLE tasks ALTER COLUMN project_id DROP NOT NULL;

-- 2. Add new columns to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS client_id           uuid REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_id         uuid,
  ADD COLUMN IF NOT EXISTS description         text,
  ADD COLUMN IF NOT EXISTS assignee_id         uuid REFERENCES team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deadline            timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_hours     numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_hours        numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_timer_start timestamptz,
  ADD COLUMN IF NOT EXISTS depends_on_id       uuid REFERENCES tasks(id) ON DELETE SET NULL;

-- 3. Migrate status values
UPDATE tasks SET status = CASE status
  WHEN 'pendente'     THEN 'todo'
  WHEN 'em_andamento' THEN 'in_progress'
  WHEN 'concluida'    THEN 'done'
  ELSE status
END
WHERE status IN ('pendente', 'em_andamento', 'concluida');

-- 4. Add 'urgente' to priority if using enum (if text column, skip)
-- (priority is text in this project — no action needed)

-- ═══════════════════════════════════════════════════════════
-- NEW TABLE: project_templates
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS project_templates (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type           text NOT NULL,
  task_number            int  NOT NULL,
  title                  text NOT NULL,
  type                   text NOT NULL,
  sla_days               int  NOT NULL DEFAULT 1,
  depends_on_task_number int,
  depends_on_id          uuid REFERENCES project_templates(id) ON DELETE SET NULL,
  created_at             timestamptz DEFAULT now(),
  UNIQUE (service_type, task_number)
);

-- ═══════════════════════════════════════════════════════════
-- NEW TABLE: task_checklists
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS task_checklists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title        text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- NEW TABLE: task_comments
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS task_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  body       text NOT NULL,
  author     text NOT NULL DEFAULT 'Equipe',
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- NEW TABLE: task_attachments
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS task_attachments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name       text NOT NULL,
  url        text NOT NULL,
  created_at timestamptz DEFAULT now()
);
