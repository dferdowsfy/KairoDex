-- Ensure AgentHub_DB has a Notes_Inputted column for raw note history
-- Run this in Supabase SQL editor

-- 1) Add the column as jsonb if missing
ALTER TABLE public."AgentHub_DB"
ADD COLUMN IF NOT EXISTS "Notes_Inputted" jsonb DEFAULT '[]'::jsonb;

-- 1a) Ensure table can publish updates under logical replication
-- Supabase Realtime/publications require a replica identity for UPDATE/DELETE
-- This prevents: 55000 cannot update table because it does not have a replica identity and publishes updates
ALTER TABLE public."AgentHub_DB" REPLICA IDENTITY FULL;

-- 2) Optional: backfill nulls
UPDATE public."AgentHub_DB" SET "Notes_Inputted" = '[]'::jsonb WHERE "Notes_Inputted" IS NULL;

-- 3) Index for faster reads (GIN works well for jsonb containment ops)
CREATE INDEX IF NOT EXISTS agenthub_db_notes_inputted_gin ON public."AgentHub_DB" USING GIN (("Notes_Inputted"));

-- 4) RLS policy keyed to name_first/name_last, comparing to JWT metadata
-- Requires the JWT to include first_name/last_name (either at root or under user_metadata)
DO $$
BEGIN
  -- Drop the previous owner-based policy if present
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'AgentHub_DB' AND policyname = 'update_notes_inputted_owner'
  ) THEN
    DROP POLICY update_notes_inputted_owner ON public."AgentHub_DB";
  END IF;

  -- Create a name-based update policy if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'AgentHub_DB' AND policyname = 'update_notes_inputted_by_name'
  ) THEN
    CREATE POLICY update_notes_inputted_by_name ON public."AgentHub_DB"
      FOR UPDATE TO authenticated
      USING (
        lower(coalesce(name_first, '')) = lower(coalesce(auth.jwt() ->> 'first_name', auth.jwt() -> 'user_metadata' ->> 'first_name', ''))
        AND lower(coalesce(name_last, '')) = lower(coalesce(auth.jwt() ->> 'last_name', auth.jwt() -> 'user_metadata' ->> 'last_name', ''))
      )
      WITH CHECK (
        lower(coalesce(name_first, '')) = lower(coalesce(auth.jwt() ->> 'first_name', auth.jwt() -> 'user_metadata' ->> 'first_name', ''))
        AND lower(coalesce(name_last, '')) = lower(coalesce(auth.jwt() ->> 'last_name', auth.jwt() -> 'user_metadata' ->> 'last_name', ''))
      );
  END IF;
END $$;
