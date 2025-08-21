-- Add missing columns to contract_files table for contract amendments
-- Run this in your Supabase SQL Editor

-- Add missing columns
ALTER TABLE contract_files 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS client_id UUID,
ADD COLUMN IF NOT EXISTS bucket TEXT DEFAULT 'contracts',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contract_files_version ON contract_files(version);
CREATE INDEX IF NOT EXISTS idx_contract_files_client_id ON contract_files(client_id);
CREATE INDEX IF NOT EXISTS idx_contract_files_status ON contract_files(status);

-- Update existing records to have proper versions
UPDATE contract_files 
SET version = 1 
WHERE version IS NULL;

-- Update existing records to have proper bucket
UPDATE contract_files 
SET bucket = 'contracts' 
WHERE bucket IS NULL;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'contract_files' 
ORDER BY ordinal_position;
