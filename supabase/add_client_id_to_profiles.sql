-- =============================================================
-- MIGRATION: Add client_id to profiles table
-- Links CLIENT-role users to their CRM client record.
-- Run in Supabase SQL Editor after add_client_role.sql
-- =============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Index for fast lookup of profile by client
CREATE INDEX IF NOT EXISTS profiles_client_id_idx ON public.profiles(client_id);

-- RLS: CLIENT users can only read their own profile (already covered by existing policies)
-- No new policies needed — existing SELECT policy covers all authenticated users.
