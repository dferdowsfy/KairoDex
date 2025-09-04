-- Add budget column to AgentHub_DB if missing
ALTER TABLE IF EXISTS public."AgentHub_DB"
  ADD COLUMN IF NOT EXISTS budget numeric;

-- No backfill needed; keep NULL for existing rows
