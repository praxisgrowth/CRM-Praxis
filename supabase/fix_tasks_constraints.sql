-- ============================================================
-- FIX TASKS CONSTRAINTS — CRM Praxis
-- Atualiza as restrições de status e prioridade para os novos valores
-- ============================================================

-- 1. Remover restrições antigas (se existirem com nomes padrão)
-- Usamos um bloco anônimo para encontrar os nomes das constraints se não forem os padrão
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'tasks'::regclass 
          AND contype = 'c' 
          AND (conname LIKE '%status%' OR conname LIKE '%priority%')
    LOOP
        EXECUTE 'ALTER TABLE tasks DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 2. Adicionar novas restrições atualizadas
ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('todo', 'in_progress', 'waiting_client', 'done', 'blocked')),
  
  ADD CONSTRAINT tasks_priority_check 
  CHECK (priority IN ('baixa', 'media', 'alta', 'urgente'));

-- 3. Atualizar o valor padrão (opcional, mas recomendado)
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'todo';

-- 4. Garantir RLS para usuários autenticados (Equipe)
-- Permitir que qualquer membro da equipe (ADMIN/MEMBER) gerencie tarefas
DROP POLICY IF EXISTS "authenticated_all_tasks" ON tasks;
CREATE POLICY "authenticated_all_tasks" 
  ON tasks FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 5. Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';
