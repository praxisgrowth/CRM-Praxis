-- =============================================================
-- MIGRATION: Add CLIENT role to user_role enum
-- Run in Supabase SQL Editor AFTER profiles_migration.sql
-- =============================================================

-- Add CLIENT value to the existing enum (idempotent)
DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'CLIENT';
EXCEPTION WHEN others THEN null; END $$;

-- Update RLS: CLIENT users can only read profiles (already covered by existing policy)
-- No changes needed to existing policies — SELECT is open to all authenticated users.

-- Update trigger to allow CLIENT role assignment during invite flow
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  -- Respect role passed in metadata (for invite flow), default to MEMBER
  BEGIN
    v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'MEMBER';
  END;

  IF v_role IS NULL THEN
    v_role := 'MEMBER';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, position, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'position',
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
