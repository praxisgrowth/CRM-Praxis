-- ============================================================
-- FIX NEXUS RLS — CRM Praxis
-- Garante que usuários autenticados possam ver e interagir no Nexus
-- ============================================================

-- 1. Habilitar RLS em todas as tabelas (caso ainda não esteja)
ALTER TABLE nexus_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members    ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas/anônimas para evitar conflitos
DROP POLICY IF EXISTS "anon_read_nexus_files" ON nexus_files;
DROP POLICY IF EXISTS "anon_insert_nexus_files" ON nexus_files;
DROP POLICY IF EXISTS "anon_update_nexus_files" ON nexus_files;

DROP POLICY IF EXISTS "anon_read_nexus_approvals" ON nexus_approvals;
DROP POLICY IF EXISTS "anon_insert_nexus_approvals" ON nexus_approvals;

DROP POLICY IF EXISTS "anon_read_team_members" ON team_members;
DROP POLICY IF EXISTS "anon_insert_team_members" ON team_members;

-- 3. Criar novas políticas baseadas em AUTENTICAÇÃO
-- nexus_files: qualquer usuário logado pode VER e EDITAR (status)
CREATE POLICY "authenticated_select_nexus_files" 
  ON nexus_files FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "authenticated_insert_nexus_files" 
  ON nexus_files FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "authenticated_update_nexus_files" 
  ON nexus_files FOR UPDATE 
  TO authenticated 
  USING (true);

-- nexus_approvals: qualquer usuário logado pode ver e registrar aprovações
CREATE POLICY "authenticated_select_nexus_approvals" 
  ON nexus_approvals FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "authenticated_insert_nexus_approvals" 
  ON nexus_approvals FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- team_members: visualização de equipe interna
CREATE POLICY "authenticated_select_team_members" 
  ON team_members FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "authenticated_insert_team_members" 
  ON team_members FOR INSERT 
  TO authenticated 
  WITH CHECK (true);
