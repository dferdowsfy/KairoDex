-- Ensure required columns and indexes exist on public."AgentHub_DB"
-- Safe: uses IF NOT EXISTS and updates NULLs only when present
-- Run this in the Supabase SQL editor (or as a migration) as a one-off

-- 0) Ensure uuid generator
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Core identifier
ALTER TABLE public."AgentHub_DB"
  ADD COLUMN IF NOT EXISTS client_id UUID DEFAULT gen_random_uuid();

-- Backfill any missing client_id values
UPDATE public."AgentHub_DB" SET client_id = gen_random_uuid() WHERE client_id IS NULL;

-- 2) Common agent / contact fields
ALTER TABLE public."AgentHub_DB"
  ADD COLUMN IF NOT EXISTS agent_owner_user_id TEXT,
  ADD COLUMN IF NOT EXISTS name_first TEXT,
  ADD COLUMN IF NOT EXISTS name_last TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- 3) Notes history as jsonb (some code already has a migration for this, but re-ensure)
ALTER TABLE public."AgentHub_DB"
  ADD COLUMN IF NOT EXISTS "Notes_Inputted" jsonb DEFAULT '[]'::jsonb;

-- Backfill Notes_Inputted nulls to empty array
UPDATE public."AgentHub_DB" SET "Notes_Inputted" = '[]'::jsonb WHERE "Notes_Inputted" IS NULL;

-- 4) Timestamps
ALTER TABLE public."AgentHub_DB"
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 5) Ensure replica identity for updates (helps realtime replication)
ALTER TABLE public."AgentHub_DB" REPLICA IDENTITY FULL;

-- 6) Indexes for common queries
-- Ensure GIN operator classes for non-jsonb types (text[] needs btree_gin)
CREATE EXTENSION IF NOT EXISTS btree_gin;

CREATE INDEX IF NOT EXISTS idx_agenthub_email_lower ON public."AgentHub_DB" (lower(email));
CREATE INDEX IF NOT EXISTS idx_agenthub_owner ON public."AgentHub_DB" (agent_owner_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agenthub_client_id_unique ON public."AgentHub_DB" (client_id);
CREATE INDEX IF NOT EXISTS idx_agenthub_tags_gin ON public."AgentHub_DB" USING GIN (tags);
CREATE INDEX IF NOT EXISTS agenthub_db_notes_inputted_gin ON public."AgentHub_DB" USING GIN (("Notes_Inputted"));

-- 7) Optional: updated_at trigger (updates timestamp on row changes)
-- Create or replace the trigger function at top-level (avoid creating it inside a DO block)
CREATE OR REPLACE FUNCTION agenthub_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

-- Recreate the trigger (safe to DROP and CREATE; if it didn't exist, DROP will do nothing)
DROP TRIGGER IF EXISTS agenthub_update_timestamp ON public."AgentHub_DB";
CREATE TRIGGER agenthub_update_timestamp
  BEFORE UPDATE ON public."AgentHub_DB"
  FOR EACH ROW EXECUTE FUNCTION agenthub_set_updated_at();

-- End of migration
