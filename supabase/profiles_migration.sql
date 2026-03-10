-- =============================================================
-- MIGRATION: Profiles, Auth Trigger & Task Description
-- Run once against your Supabase project (SQL Editor).
-- =============================================================

-- ── 1. Add description column to tasks ───────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description text;

-- ── 2. Role enum ─────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('ADMIN', 'MEMBER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 3. Profiles table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name   text,
  email       text,
  position    text,
  role        user_role   NOT NULL DEFAULT 'MEMBER',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 4. RLS ───────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can see the team list
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Admins can update any profile (role changes)
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ── 5. Trigger: auto-create profile on new auth user ─────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 6. Promote first user to ADMIN automatically ─────────────
-- Optional: uncomment and replace with your Supabase Auth user UUID
-- UPDATE public.profiles SET role = 'ADMIN' WHERE id = '<your-user-uuid>';

-- ── 7. Seed: if you already have team_members, migrate them ──
-- (run manually after inserting auth users)
-- INSERT INTO public.profiles (id, full_name, email, position, role)
-- SELECT gen_random_uuid(), name, email, role, 'MEMBER'
-- FROM public.team_members
-- ON CONFLICT DO NOTHING;
