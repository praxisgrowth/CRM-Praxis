-- supabase/deliverable_intent_migration.sql
-- Adiciona intenção de entregável diretamente nas tarefas (Opção B)
-- Execute no Supabase SQL Editor

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS catalog_item_id uuid
    REFERENCES deliverable_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deliverable_type text
    CHECK (deliverable_type IN ('imagem', 'copy', 'video', 'documento'));

COMMENT ON COLUMN tasks.catalog_item_id IS
  'FK para deliverable_catalog — registra a intenção de entregável no momento da criação da tarefa';

COMMENT ON COLUMN tasks.deliverable_type IS
  'Tipo do entregável planejado: imagem | copy | video | documento';
