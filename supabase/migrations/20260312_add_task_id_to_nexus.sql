-- Migração para vincular Nexus Files com Tarefas
ALTER TABLE public.nexus_files 
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.nexus_files.task_id IS 'Vincula o entregável à tarefa que o gerou.';
