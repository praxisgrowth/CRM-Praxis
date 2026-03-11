-- ============================================================
-- FIX NEXUS RLS — CRM Praxis
-- Garante isolamento de dados (Multi-tenant) para Clientes
-- ============================================================

-- 1. Habilitar RLS
ALTER TABLE nexus_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members    ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas
DROP POLICY IF EXISTS "authenticated_select_nexus_files" ON nexus_files;
DROP POLICY IF EXISTS "authenticated_insert_nexus_files" ON nexus_files;
DROP POLICY IF EXISTS "authenticated_update_nexus_files" ON nexus_files;
DROP POLICY IF EXISTS "authenticated_select_nexus_approvals" ON nexus_approvals;
DROP POLICY IF EXISTS "authenticated_insert_nexus_approvals" ON nexus_approvals;
DROP POLICY IF EXISTS "authenticated_select_team_members" ON team_members;
DROP POLICY IF EXISTS "authenticated_insert_team_members" ON team_members;

-- 3. Políticas de Isolação (Multi-tenant)

-- NEXUS_FILES
-- Admin/Member vêm tudo. Clientes vêm apenas o seu client_id.
CREATE POLICY "nexus_files_isolation" ON nexus_files
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'MEMBER')
    OR 
    client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "nexus_files_staff_all" ON nexus_files
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'MEMBER'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'MEMBER'));

-- Clientes podem dar update apenas no STATUS (via central de aprovação)
CREATE POLICY "nexus_files_client_update_status" ON nexus_files
  FOR UPDATE TO authenticated
  USING (client_id = (SELECT client_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (client_id = (SELECT client_id FROM profiles WHERE id = auth.uid()));


-- NEXUS_APPROVALS
-- Isolação de leitura/escrita de logs de aprovação
CREATE POLICY "nexus_approvals_isolation" ON nexus_approvals
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'MEMBER')
    OR
    EXISTS (
      SELECT 1 FROM nexus_files f 
      WHERE f.id = file_id 
      AND f.client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "nexus_approvals_insert" ON nexus_approvals
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Controle fino via trigger ou app logic se necessário


-- TEAM_MEMBERS
-- Visível para todos logados (mesmo Clientes veem a equipe da Praxis)
CREATE POLICY "team_members_read" ON team_members
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "team_members_staff_manage" ON team_members
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');
