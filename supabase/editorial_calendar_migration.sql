-- supabase/editorial_calendar_migration.sql

-- 1. New table for editorial lines (managed in Settings)
CREATE TABLE IF NOT EXISTS editorial_lines (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  ord   int  NOT NULL DEFAULT 0
);

-- 2. Add columns to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS publish_date       date,
  ADD COLUMN IF NOT EXISTS editorial_line_id  uuid
    REFERENCES editorial_lines(id) ON DELETE SET NULL;

-- 3. Seed default editorial lines
INSERT INTO editorial_lines (name, color, ord) VALUES
  ('Institucional', '#6366f1', 0),
  ('Educativo',     '#3b82f6', 1),
  ('Promocional',   '#f59e0b', 2),
  ('Engajamento',   '#10b981', 3)
ON CONFLICT DO NOTHING;
