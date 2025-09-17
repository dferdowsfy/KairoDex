-- Add contracts association column to AgentHub_DB
-- Stores array of contract_file ids the agent/user has associated.
ALTER TABLE "AgentHub_DB"
  ADD COLUMN IF NOT EXISTS agent_contract_ids text[] DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN "AgentHub_DB".agent_contract_ids IS 'List of contract_files.id values associated with this agent/user scope';

CREATE INDEX IF NOT EXISTS agenthub_db_agent_contract_ids_gin ON "AgentHub_DB" USING gin(agent_contract_ids);
