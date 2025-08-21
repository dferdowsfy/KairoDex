-- Add missing columns to contract_files table
ALTER TABLE public.contract_files 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS client_id UUID,
ADD COLUMN IF NOT EXISTS bucket VARCHAR(100) DEFAULT 'contracts';

-- Update existing records to have version 1 and bucket 'contracts'
UPDATE contract_files 
SET version = 1, bucket = 'contracts' 
WHERE version IS NULL OR bucket IS NULL;

-- Verify the changes
SELECT id, contract_name, version, bucket, status 
FROM contract_files 
LIMIT 5;
