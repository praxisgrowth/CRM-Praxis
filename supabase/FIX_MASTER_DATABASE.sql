-- =============================================================
-- MASTER DB FIX — CRM Praxis
-- Execute este bloco INTEIRO no SQL Editor do Supabase.
-- =============================================================

-- 1. Garantir que o tipo de Role existe
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('ADMIN', 'MEMBER', 'CLIENT');
EXCEPTION WHEN duplicate_object THEN 
  -- Se o tipo já existe, garante que tem o valor CLIENT
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'CLIENT';
END $$;

-- 2. Garantir que a tabela Profiles tem a estrutura correta
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Adicionar colunas individualmente de forma segura
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name  text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email      text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position   text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role       public.user_role NOT NULL DEFAULT 'MEMBER';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_id  uuid; -- Será linkado depois
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 3. Limpar políticas antigas que podem causar erros de colunas inexistentes
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

-- 4. Recriar políticas de segurança (agora com a coluna role garantida)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- 5. Fixar o seu usuário como ADMIN (GUSTAVO)
-- Tenta encontrar o usuário pelo e-mail e garantir que ele seja ADMIN
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'tizoni.gustavo@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Garante que o perfil existe e é ADMIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_user_id, 'tizoni.gustavo@gmail.com', 'Gustavo Tizoni', 'ADMIN')
    ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';
    
    RAISE NOTICE 'Acesso ADMIN garantido para Gustavo!';
  ELSE
    RAISE NOTICE 'Usuário Gustavo não encontrado no Auth. Crie a conta primeiro via Login ou pelo script de criação.';
  END IF;
END $$;
