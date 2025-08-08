-- Update database schema for AgentHub contract amendment feature
-- Run this in your Supabase SQL editor to add missing columns

-- Add missing columns to contract_amendments table
ALTER TABLE contract_amendments 
ADD COLUMN IF NOT EXISTS jurisdiction TEXT,
ADD COLUMN IF NOT EXISTS document TEXT;

-- Add missing columns to amended_contracts table
ALTER TABLE amended_contracts 
ADD COLUMN IF NOT EXISTS jurisdiction TEXT,
ADD COLUMN IF NOT EXISTS document TEXT;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'amended_contracts' 
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contract_amendments' 
ORDER BY ordinal_position; 