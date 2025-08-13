-- Enhanced Database Schema for AgentHub Conversational Flows - SAFE VERSION
-- Run this AFTER running fix_database_schema.sql

-- =========================================
-- CLIENTS TABLE (CREATE OR ALTER)
-- =========================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    state TEXT,
    preferences JSONB DEFAULT '{}',
    last_interaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure full_name column is NOT NULL after data migration
-- (We'll make it nullable first, then update existing records, then make it NOT NULL)
DO $$ 
BEGIN 
    -- Update any existing records that might have NULL full_name
    UPDATE clients SET full_name = COALESCE(full_name, 'Unknown Client') WHERE full_name IS NULL;
    
    -- Now make it NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        ALTER TABLE clients ALTER COLUMN full_name SET NOT NULL;
    END IF;
END $$;

-- =========================================
-- INTERACTIONS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT CHECK (channel IN ('email', 'sms', 'call', 'note', 'ai')) NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- CONTRACTS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    state TEXT NOT NULL,
    contract_type TEXT NOT NULL,
    docusign_draft_id TEXT,
    docusign_envelope_id TEXT,
    version INTEGER DEFAULT 1,
    data JSONB DEFAULT '{}',
    render_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'completed', 'voided')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- CONTRACT EVENTS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS contract_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    diff JSONB DEFAULT '{}',
    ledger_hash TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- SHOWINGS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS showings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id TEXT,
    property_address TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'booked' CHECK (status IN ('booked', 'rescheduled', 'canceled', 'completed')),
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- PROPERTY LISTINGS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS property_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    mls_id TEXT,
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    price DECIMAL(12,2),
    property_type TEXT,
    beds INTEGER,
    baths DECIMAL(3,1),
    sqft INTEGER,
    status TEXT DEFAULT 'active',
    listing_agent_name TEXT,
    listing_agent_email TEXT,
    listing_agent_phone TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- CLIENT PROPERTIES TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS client_properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    property_listing_id UUID REFERENCES property_listings(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    interest_level TEXT DEFAULT 'interested' CHECK (interest_level IN ('interested', 'favorited', 'viewing', 'offer_submitted', 'under_contract', 'closed', 'passed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- SCHEDULED MESSAGES TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT CHECK (channel IN ('email', 'sms')) NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'canceled')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- =========================================
-- AGENT CALENDAR TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS agent_calendar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    event_type TEXT DEFAULT 'busy' CHECK (event_type IN ('busy', 'showing', 'meeting', 'available')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- INDEXES (CREATE IF NOT EXISTS - SAFE)
-- =========================================

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_agent_id ON clients(agent_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- Only create this index if the column exists
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'last_interaction_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_clients_last_interaction ON clients(last_interaction_at);
    END IF;
END $$;

-- Interactions indexes
CREATE INDEX IF NOT EXISTS idx_interactions_client_id ON interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_interactions_agent_id ON interactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_interactions_channel ON interactions(channel);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at);

-- Contracts indexes
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agent_id ON contracts(agent_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_docusign_envelope_id ON contracts(docusign_envelope_id);

-- Contract events indexes
CREATE INDEX IF NOT EXISTS idx_contract_events_contract_id ON contract_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_events_agent_id ON contract_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_contract_events_event_type ON contract_events(event_type);

-- Showings indexes
CREATE INDEX IF NOT EXISTS idx_showings_client_id ON showings(client_id);
CREATE INDEX IF NOT EXISTS idx_showings_agent_id ON showings(agent_id);
CREATE INDEX IF NOT EXISTS idx_showings_start_time ON showings(start_time);
CREATE INDEX IF NOT EXISTS idx_showings_status ON showings(status);

-- Property listings indexes
CREATE INDEX IF NOT EXISTS idx_property_listings_agent_id ON property_listings(agent_id);
CREATE INDEX IF NOT EXISTS idx_property_listings_mls_id ON property_listings(mls_id);
CREATE INDEX IF NOT EXISTS idx_property_listings_address ON property_listings(address);
CREATE INDEX IF NOT EXISTS idx_property_listings_status ON property_listings(status);

-- Client properties indexes
CREATE INDEX IF NOT EXISTS idx_client_properties_client_id ON client_properties(client_id);
CREATE INDEX IF NOT EXISTS idx_client_properties_property_listing_id ON client_properties(property_listing_id);
CREATE INDEX IF NOT EXISTS idx_client_properties_agent_id ON client_properties(agent_id);

-- Scheduled messages indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_agent_id ON scheduled_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_client_id ON scheduled_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_for ON scheduled_messages(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status);

-- Agent calendar indexes
CREATE INDEX IF NOT EXISTS idx_agent_calendar_agent_id ON agent_calendar(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_calendar_start_time ON agent_calendar(start_time);
CREATE INDEX IF NOT EXISTS idx_agent_calendar_end_time ON agent_calendar(end_time);

-- =========================================
-- ROW LEVEL SECURITY
-- =========================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE showings ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_calendar ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Agents can manage their own clients" ON clients;
DROP POLICY IF EXISTS "Agents can manage their own interactions" ON interactions;
DROP POLICY IF EXISTS "Agents can manage their own contracts" ON contracts;
DROP POLICY IF EXISTS "Agents can manage their own contract events" ON contract_events;
DROP POLICY IF EXISTS "Agents can manage their own showings" ON showings;
DROP POLICY IF EXISTS "Agents can manage their own property listings" ON property_listings;
DROP POLICY IF EXISTS "Agents can manage their own client properties" ON client_properties;
DROP POLICY IF EXISTS "Agents can manage their own scheduled messages" ON scheduled_messages;
DROP POLICY IF EXISTS "Agents can manage their own calendar" ON agent_calendar;

-- Create new policies
CREATE POLICY "Agents can manage their own clients" ON clients
    FOR ALL USING (auth.uid() = agent_id);

CREATE POLICY "Agents can manage their own interactions" ON interactions
    FOR ALL USING (auth.uid() = agent_id);

CREATE POLICY "Agents can manage their own contracts" ON contracts
    FOR ALL USING (auth.uid() = agent_id);

CREATE POLICY "Agents can manage their own contract events" ON contract_events
    FOR ALL USING (auth.uid() = agent_id);

CREATE POLICY "Agents can manage their own showings" ON showings
    FOR ALL USING (auth.uid() = agent_id);

CREATE POLICY "Agents can manage their own property listings" ON property_listings
    FOR ALL USING (auth.uid() = agent_id);

CREATE POLICY "Agents can manage their own client properties" ON client_properties
    FOR ALL USING (auth.uid() = agent_id);

CREATE POLICY "Agents can manage their own scheduled messages" ON scheduled_messages
    FOR ALL USING (auth.uid() = agent_id);

CREATE POLICY "Agents can manage their own calendar" ON agent_calendar
    FOR ALL USING (auth.uid() = agent_id);

-- =========================================
-- FUNCTIONS AND TRIGGERS
-- =========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_showings_updated_at BEFORE UPDATE ON showings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_property_listings_updated_at BEFORE UPDATE ON property_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_client_properties_updated_at BEFORE UPDATE ON client_properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update client's last_interaction_at when interaction is created
CREATE OR REPLACE FUNCTION update_client_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if the column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'last_interaction_at'
    ) THEN
        UPDATE clients 
        SET last_interaction_at = NEW.created_at
        WHERE id = NEW.client_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_client_last_interaction_trigger
    AFTER INSERT ON interactions
    FOR EACH ROW EXECUTE FUNCTION update_client_last_interaction();

-- =========================================
-- RECREATE TRIGGERS FOR EXISTING TABLES
-- =========================================

-- Recreate triggers for existing tables that were dropped in the fix script
DO $$ 
BEGIN 
    -- Recreate trigger for artifacts table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artifacts') THEN
        CREATE OR REPLACE TRIGGER update_artifacts_updated_at BEFORE UPDATE ON artifacts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Recreate trigger for follow_ups table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_ups') THEN
        CREATE OR REPLACE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON follow_ups
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Recreate trigger for properties table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') THEN
        CREATE OR REPLACE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =========================================
-- COMPLETION MESSAGE
-- =========================================

SELECT 'Database schema update completed successfully!' as message;
