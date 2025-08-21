-- Fix RLS policies for contract amendments
-- Run this in your Supabase SQL Editor AFTER running add_missing_columns.sql

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "authenticated_users_can_manage_contracts" ON contract_files;
DROP POLICY IF EXISTS "Users can view contracts" ON contract_files;
DROP POLICY IF EXISTS "Users can insert contracts" ON contract_files;
DROP POLICY IF EXISTS "Users can update contracts" ON contract_files;

-- Create a permissive policy for development/testing
-- NOTE: In production, you should make this more restrictive based on your auth requirements
CREATE POLICY "allow_all_operations_on_contracts" 
ON contract_files 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'contract_files';

-- Show current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'contract_files';
