-- Fix RLS policy to allow public access to contract_files
-- Run this in your Supabase SQL Editor

-- Drop the restrictive policy and create a more permissive one
DROP POLICY IF EXISTS "Users can view all contract files" ON contract_files;

-- Create a policy that allows anyone to view contract files
CREATE POLICY "Public read access to contract files" ON contract_files
    FOR SELECT USING (true);

-- Verify the policy is working
SELECT * FROM contract_files WHERE state_code = 'MD' LIMIT 3;
