-- Complete setup for contract amendment system
-- Run this in your Supabase SQL Editor

-- Step 1: Create the contract_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.contract_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_code VARCHAR(2) NOT NULL,
    county_fips VARCHAR(5),
    contract_name TEXT NOT NULL,
    path TEXT NOT NULL,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    status VARCHAR(20) DEFAULT 'original',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    file_size BIGINT,
    metadata JSONB
);

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contract_files_state_county ON contract_files(state_code, county_fips);
CREATE INDEX IF NOT EXISTS idx_contract_files_state ON contract_files(state_code);
CREATE INDEX IF NOT EXISTS idx_contract_files_status ON contract_files(status);

-- Step 3: Enable RLS (Row Level Security)
ALTER TABLE contract_files ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can view all contract files" ON contract_files;
DROP POLICY IF EXISTS "Users can insert contract files" ON contract_files;
DROP POLICY IF EXISTS "Users can update their own contract files" ON contract_files;

CREATE POLICY "Users can view all contract files" ON contract_files
    FOR SELECT USING (true);

CREATE POLICY "Users can insert contract files" ON contract_files
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own contract files" ON contract_files
    FOR UPDATE USING (created_by = auth.uid());

-- Step 5: Insert the Maryland contract records
-- First, delete any existing records to avoid duplicates
DELETE FROM contract_files WHERE state_code = 'MD';

-- Insert all Maryland contracts (Montgomery County FIPS: 24031)
-- Updated paths to match actual file locations in the contracts bucket
INSERT INTO public.contract_files (
  state_code,
  county_fips,
  contract_name,
  path,
  mime_type,
  status,
  created_by
) VALUES 
  -- Core Purchase Contracts
  ('MD', '24031', 'GCAAR Purchase Contract (Feb 2025)', 'gcaar_form_1301_february_2025_revisedfinal.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Buyer Broker Agreement', 'buyer-broker-agreement.pdf', 'application/pdf', 'original', auth.uid()),
  
  -- Addendums & Amendments
  ('MD', '24031', 'Seller Pays Buyer Broker Compensation Addendum', 'addendum-for-seller-to-pay-buyer-broker-compensation.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Additional Clauses Addendum (Part A)', 'addendum-of-clauses-a.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Additional Clauses Addendum (Part B)', 'addendum-of-clauses-b.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Blank Addendum Template', 'blank-addendum.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Montgomery County Jurisdictional Addendum', 'montgomery-county-jurisdictional-addendum-to-gcaar-sales-contract.pdf', 'application/pdf', 'original', auth.uid()),
  
  -- Inspection Contingencies
  ('MD', '24031', 'Home Inspection Contingency Notice/Addendum', 'home-inspection-contingency-notice-and-or-addendum.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Septic System Inspection Contingency', 'on-site-sewage-disposal-system-(-septic-)-inspection-contingency-notice-and-or-addendum.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Septic System Inspection Addendum', 'on-site-sewage-disposal-system-(septic)-inspection-addendum.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Well Water System Inspection Addendum', 'private-water-supply-system-(-well-)-inspection-addendum.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Well Water System Inspection Contingency', 'private-water-supply-system-(well)-inspection-contingency-notice-and-or-addendum.pdf', 'application/pdf', 'original', auth.uid()),
  
  -- Escrow & Legal
  ('MD', '24031', 'Escrow Agreement (Non-Broker Agent)', 'escrow-agreement-between-buyer-seller-and-non-broker-escrow-agent.pdf', 'application/pdf', 'original', auth.uid()),
  
  -- Informational
  ('MD', '24031', 'Important Real Estate Purchase Information', 'important-information-for-the-purchase-of-real-estate.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Understanding Real Estate Agent Representation', 'understanding-whom-real-estate-agents-represent.pdf', 'application/pdf', 'original', auth.uid());

-- Step 6: Verify the data was inserted
SELECT 
    state_code,
    county_fips,
    COUNT(*) as contract_count
FROM contract_files 
WHERE state_code = 'MD'
GROUP BY state_code, county_fips;

-- Step 7: Show all Maryland contracts
SELECT 
    contract_name,
    path,
    status,
    created_at
FROM contract_files 
WHERE state_code = 'MD'
ORDER BY contract_name;
