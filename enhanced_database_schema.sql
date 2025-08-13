-- Enhanced Database Schema for AgentHub Conversational Flows
-- Run this in your Supabase SQL editor

-- =========================================
-- CLIENTS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    state TEXT,
    preferences JSONB DEFAULT '{}',
    last_interaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- INTERACTIONS TABLE (emails, texts, calls, notes, AI messages)
-- =========================================
CREATE TABLE IF NOT EXISTS interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT CHECK (channel IN ('email', 'sms', 'call', 'note', 'ai')) NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    metadata JSONB DEFAULT '{}', -- thread_id, message_id, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- CONTRACTS TABLE (enhanced from existing amended_contracts)
-- =========================================
CREATE TABLE IF NOT EXISTS contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    state TEXT NOT NULL,
    contract_type TEXT NOT NULL, -- Purchase Offer, Addendum, Lease, etc.
    docusign_draft_id TEXT,
    docusign_envelope_id TEXT,
    version INTEGER DEFAULT 1,
    data JSONB DEFAULT '{}', -- canonical structured contract data
    render_url TEXT, -- preview/download URL
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'completed', 'voided')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- CONTRACT EVENTS TABLE (history & ledger linkage)
-- =========================================
CREATE TABLE IF NOT EXISTS contract_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- amended, sent_for_signature, signed, etc.
    diff JSONB DEFAULT '{}', -- structured changes snapshot
    ledger_hash TEXT, -- optional hash on-chain
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
    meta JSONB DEFAULT '{}', -- listing_agent_contact, access_instructions, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- PROPERTY LISTINGS TABLE (for autocomplete and reference)
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
-- CLIENT PROPERTIES TABLE (properties client is interested in)
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
-- SCHEDULED MESSAGES TABLE (for follow-ups and reminders)
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
-- AGENT CALENDAR TABLE (for showing scheduling)
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
-- INDEXES
-- =========================================

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_agent_id ON clients(agent_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_last_interaction ON clients(last_interaction_at);

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

-- Clients policies
CREATE POLICY "Agents can manage their own clients" ON clients
    FOR ALL USING (auth.uid() = agent_id);

-- Interactions policies
CREATE POLICY "Agents can manage their own interactions" ON interactions
    FOR ALL USING (auth.uid() = agent_id);

-- Contracts policies
CREATE POLICY "Agents can manage their own contracts" ON contracts
    FOR ALL USING (auth.uid() = agent_id);

-- Contract events policies
CREATE POLICY "Agents can manage their own contract events" ON contract_events
    FOR ALL USING (auth.uid() = agent_id);

-- Showings policies
CREATE POLICY "Agents can manage their own showings" ON showings
    FOR ALL USING (auth.uid() = agent_id);

-- Property listings policies
CREATE POLICY "Agents can manage their own property listings" ON property_listings
    FOR ALL USING (auth.uid() = agent_id);

-- Client properties policies
CREATE POLICY "Agents can manage their own client properties" ON client_properties
    FOR ALL USING (auth.uid() = agent_id);

-- Scheduled messages policies
CREATE POLICY "Agents can manage their own scheduled messages" ON scheduled_messages
    FOR ALL USING (auth.uid() = agent_id);

-- Agent calendar policies
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
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_showings_updated_at BEFORE UPDATE ON showings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_listings_updated_at BEFORE UPDATE ON property_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_properties_updated_at BEFORE UPDATE ON client_properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update client's last_interaction_at when interaction is created
CREATE OR REPLACE FUNCTION update_client_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE clients 
    SET last_interaction_at = NEW.created_at
    WHERE id = NEW.client_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_client_last_interaction_trigger
    AFTER INSERT ON interactions
    FOR EACH ROW EXECUTE FUNCTION update_client_last_interaction();

-- =========================================
-- SAMPLE DATA (Optional - for testing)
-- =========================================

-- Note: Sample data insertion is commented out as it requires authenticated users
-- To add sample data, run these queries after logging in through your application:

/*
-- Insert sample property listings (run after authentication)
INSERT INTO property_listings (agent_id, address, city, state, zip_code, price, property_type, beds, baths, sqft, listing_agent_name, listing_agent_email, listing_agent_phone) VALUES 
    (auth.uid(), '123 Main St', 'Denver', 'CO', '80202', 450000.00, 'Single Family', 3, 2.0, 1500, 'John Smith', 'john@realty.com', '555-0123'),
    (auth.uid(), '456 Oak Ave', 'Denver', 'CO', '80203', 675000.00, 'Townhouse', 4, 3.0, 2200, 'Jane Doe', 'jane@realty.com', '555-0456'),
    (auth.uid(), '789 Pine Rd', 'Boulder', 'CO', '80301', 850000.00, 'Single Family', 5, 3.5, 2800, 'Bob Wilson', 'bob@realty.com', '555-0789')
ON CONFLICT DO NOTHING;

-- Insert sample client
INSERT INTO clients (agent_id, full_name, email, phone, state, preferences) VALUES 
    (auth.uid(), 'Sarah Johnson', 'sarah.johnson@email.com', '555-0100', 'CO', '{"preferred_contact": "email", "budget_max": 500000}'),
    (auth.uid(), 'Mike Chen', 'mike.chen@email.com', '555-0200', 'CO', '{"preferred_contact": "sms", "budget_max": 750000}')
ON CONFLICT DO NOTHING;
*/
