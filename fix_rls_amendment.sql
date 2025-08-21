-- Fix RLS policies for contract amendment
-- Run this in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert contract files" ON contract_files;
DROP POLICY IF EXISTS "Users can update their own contract files" ON contract_files;

-- Create more permissive policies for contract amendments
CREATE POLICY "Anyone can insert contract files" ON contract_files
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update contract files" ON contract_files
    FOR UPDATE USING (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'contract_files';
