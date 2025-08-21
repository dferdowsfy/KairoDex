-- Add sample contracts for Washington DC and Virginia
-- Remove California contracts if any exist
-- Run this in your Supabase SQL Editor

-- First, let's remove any California contracts (state_code = 'CA')
DELETE FROM contract_files WHERE state_code = 'CA';

-- Add Washington DC contracts
INSERT INTO contract_files (
  state_code, 
  county_fips, 
  contract_name, 
  bucket, 
  path, 
  mime_type, 
  status, 
  version,
  created_at,
  updated_at
) VALUES
  ('DC', '11001', 'DC Residential Purchase Agreement', 'contracts', 'dc-residential-purchase-agreement.pdf', 'application/pdf', 'original', 1, NOW(), NOW()),
  ('DC', '11001', 'DC Property Disclosure Statement', 'contracts', 'dc-property-disclosure-statement.pdf', 'application/pdf', 'original', 1, NOW(), NOW()),
  ('DC', '11001', 'DC Condominium Addendum', 'contracts', 'dc-condominium-addendum.pdf', 'application/pdf', 'original', 1, NOW(), NOW()),
  ('DC', '11001', 'DC Lead-Based Paint Disclosure', 'contracts', 'dc-lead-based-paint-disclosure.pdf', 'application/pdf', 'original', 1, NOW(), NOW()),
  ('DC', '11001', 'DC First Right of Refusal Addendum', 'contracts', 'dc-first-right-of-refusal-addendum.pdf', 'application/pdf', 'original', 1, NOW(), NOW());

-- Add Virginia contracts  
INSERT INTO contract_files (
  state_code, 
  county_fips, 
  contract_name, 
  bucket, 
  path, 
  mime_type, 
  status, 
  version,
  created_at,
  updated_at
) VALUES
  ('VA', '51059', 'Virginia Residential Purchase Agreement', 'contracts', 'va-residential-purchase-agreement.pdf', 'application/pdf', 'original', 1, NOW(), NOW()),
  ('VA', '51059', 'Virginia Property Condition Disclosure', 'contracts', 'va-property-condition-disclosure.pdf', 'application/pdf', 'original', 1, NOW(), NOW()),
  ('VA', '51059', 'Virginia Residential Lease Agreement', 'contracts', 'va-residential-lease-agreement.pdf', 'application/pdf', 'original', 1, NOW(), NOW()),
  ('VA', '51059', 'Virginia Home Inspection Contingency', 'contracts', 'va-home-inspection-contingency.pdf', 'application/pdf', 'original', 1, NOW(), NOW()),
  ('VA', '51059', 'Virginia Financing Contingency Addendum', 'contracts', 'va-financing-contingency-addendum.pdf', 'application/pdf', 'original', 1, NOW(), NOW()),
  ('VA', '51153', 'Virginia Beach Purchase Contract', 'contracts', 'va-beach-purchase-contract.pdf', 'application/pdf', 'original', 1, NOW(), NOW()),
  ('VA', '51153', 'Virginia Beach Condo Association Addendum', 'contracts', 'va-beach-condo-association-addendum.pdf', 'application/pdf', 'original', 1, NOW(), NOW());

-- Verify the new contracts were added
SELECT state_code, county_fips, contract_name, status, version 
FROM contract_files 
WHERE state_code IN ('DC', 'VA') 
ORDER BY state_code, contract_name;
