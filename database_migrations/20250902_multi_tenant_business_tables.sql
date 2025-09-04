-- Add org_id to business tables, add versioning and audit_log
BEGIN;

-- Example: clients
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS org_id uuid;

ALTER TABLE IF EXISTS client_notes
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS version int DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

-- Ensure FK relationships
ALTER TABLE IF EXISTS clients
  ADD CONSTRAINT IF NOT EXISTS clients_org_fkey FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS client_notes
  ADD CONSTRAINT IF NOT EXISTS notes_org_fkey FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS notes_client_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  org_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Email jobs
CREATE TABLE IF NOT EXISTS email_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  run_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_org_created_at ON clients(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_client_notes_org_client ON client_notes(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_org_created_at ON client_notes(org_id, created_at);

COMMIT;
