-- Debug: Check RLS policies and test visibility of amended contracts
-- Run this in your Supabase SQL Editor to diagnose the issue

-- 1. Check current RLS policies on contract_files
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'contract_files';

-- 2. Check if amended contracts actually exist in the database
SELECT id, contract_name, status, version, created_at 
FROM contract_files 
WHERE status = 'amended'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check total count by status
SELECT status, COUNT(*) as count
FROM contract_files 
GROUP BY status;

-- 4. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'contract_files';

-- 5. Test specific amended contract
SELECT id, contract_name, status, version, state_code, county_fips
FROM contract_files 
WHERE id = 'd8331cc2-e4ef-41cb-9e1c-5692c6063457';
