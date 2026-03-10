-- =============================================================
-- MIGRATION CONSOLIDADA — CRM Praxis Auth & RBAC
-- Execute TODO este bloco no SQL Editor do Supabase de uma vez.
-- =============================================================

-- ── 1. Enum user_role (ADMIN | MEMBER | CLIENT) ───────────────
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('ADMIN', 'MEMBER', 'CLIENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Adicionar CLIENT se o enum já existia apenas com ADMIN/MEMBER
DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'CLIENT';
EXCEPTION WHEN others THEN null; END $$;

-- ── 2. Tabela profiles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Garantir que todas as colunas existam (resiliente a tabelas pré-existentes)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name  text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email      text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position   text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role       public.user_role NOT NULL DEFAULT 'MEMBER';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_id  uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Índice de performance
CREATE INDEX IF NOT EXISTS profiles_client_id_idx ON public.profiles(client_id);

-- ── 3. RLS ────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem ler profiles
DO $$ BEGIN
  CREATE POLICY "profiles_select_authenticated"
    ON public.profiles FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Apenas ADMINs podem atualizar qualquer profile
DO $$ BEGIN
  CREATE POLICY "profiles_update_admin"
    ON public.profiles FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'ADMIN'
      )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Usuário pode atualizar o próprio profile
DO $$ BEGIN
  CREATE POLICY "profiles_update_self"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 4. Trigger: cria profile automático no cadastro ──────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  -- Respeitar a role passada no metadata (fluxo de convite)
  BEGIN
    v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'MEMBER';
  END;

  IF v_role IS NULL THEN
    v_role := 'MEMBER';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, position, role, client_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'position',
    v_role,
    CASE
      WHEN NEW.raw_user_meta_data->>'client_id' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'client_id')::uuid
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Criar/substituir trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 5. Coluna description na tabela tasks ─────────────────────
DO $$ BEGIN
  ALTER TABLE public.tasks ADD COLUMN description text;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ── 6. FK assignee_id → profiles ─────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey
    FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;
