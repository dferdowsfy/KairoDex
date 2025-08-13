-- Fix Database Schema - Add Missing Columns and Handle Existing Tables
-- Run this in your Supabase SQL editor BEFORE running the main schema

-- =========================================
-- HANDLE EXISTING TABLES - ADD MISSING COLUMNS
-- =========================================

-- Add missing column to clients table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'last_interaction_at'
    ) THEN
        ALTER TABLE clients ADD COLUMN last_interaction_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add missing columns to other tables that might exist
DO $$ 
BEGIN 
    -- Check if clients table exists and add missing columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        -- Add full_name if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'clients' AND column_name = 'full_name'
        ) THEN
            ALTER TABLE clients ADD COLUMN full_name TEXT;
        END IF;
        
        -- Add state if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'clients' AND column_name = 'state'
        ) THEN
            ALTER TABLE clients ADD COLUMN state TEXT;
        END IF;
        
        -- Add preferences if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'clients' AND column_name = 'preferences'
        ) THEN
            ALTER TABLE clients ADD COLUMN preferences JSONB DEFAULT '{}';
        END IF;
    END IF;
END $$;

-- =========================================
-- CLEAN UP EXISTING TRIGGERS AND FUNCTIONS
-- =========================================

-- Drop existing triggers if they exist (including existing ones)
DO $$ 
BEGIN 
    -- Drop triggers from existing tables that might be using update_updated_at_column()
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artifacts') THEN
        DROP TRIGGER IF EXISTS update_artifacts_updated_at ON artifacts;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_ups') THEN
        DROP TRIGGER IF EXISTS update_follow_ups_updated_at ON follow_ups;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') THEN
        DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
    END IF;
    
    -- Drop triggers from new conversational flow tables if they exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interactions') THEN
        DROP TRIGGER IF EXISTS update_client_last_interaction_trigger ON interactions;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
        DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'showings') THEN
        DROP TRIGGER IF EXISTS update_showings_updated_at ON showings;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_listings') THEN
        DROP TRIGGER IF EXISTS update_property_listings_updated_at ON property_listings;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_properties') THEN
        DROP TRIGGER IF EXISTS update_client_properties_updated_at ON client_properties;
    END IF;
END $$;

-- Drop existing functions if they exist (using CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS update_client_last_interaction() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- =========================================
-- MESSAGE TO USER
-- =========================================

-- This script prepares your database for the main schema
-- After running this, run the enhanced_database_schema.sql file
SELECT 'Database preparation complete. Now run enhanced_database_schema.sql' as message;
