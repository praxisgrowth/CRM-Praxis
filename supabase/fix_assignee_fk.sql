-- ============================================================
-- FIX TASKS ASSIGNEE_ID FOREIGN KEY — CRM Praxis
-- Corrigindo conflito de tabelas (team_members vs profiles)
-- ============================================================

-- 1. Remover as constraints que apontam para team_members
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'tasks'::regclass 
          AND contype = 'f' 
          AND (conname LIKE '%assignee%')
    LOOP
        EXECUTE 'ALTER TABLE tasks DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 2. Garantir que a coluna aponte para a tabela de PROFILES (que usa o Auth UUID)
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assignee_id_fkey
  FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Limpeza Final: Remover status antigos da tabela team_members se não forem mais usados
-- (Opcional, mas ajuda a evitar confusão futura)

-- 4. Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';
