-- Database setup for AgentHub contract amendment feature
-- Run this in your Supabase SQL editor

-- Table for logging contract amendment requests
CREATE TABLE IF NOT EXISTS contract_amendments (
    id SERIAL PRIMARY KEY,
    agent_id UUID REFERENCES auth.users(id),
    client_id TEXT NOT NULL,
    original_contract TEXT NOT NULL,
    instruction TEXT NOT NULL,
    amended_contract TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for saving final amended contracts
CREATE TABLE IF NOT EXISTS amended_contracts (
    id SERIAL PRIMARY KEY,
    agent_id UUID REFERENCES auth.users(id),
    client_id TEXT NOT NULL,
    original_contract TEXT NOT NULL,
    amended_contract TEXT NOT NULL,
    instruction TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contract_amendments_agent_id ON contract_amendments(agent_id);
CREATE INDEX IF NOT EXISTS idx_contract_amendments_client_id ON contract_amendments(client_id);
CREATE INDEX IF NOT EXISTS idx_contract_amendments_created_at ON contract_amendments(created_at);

CREATE INDEX IF NOT EXISTS idx_amended_contracts_agent_id ON amended_contracts(agent_id);
CREATE INDEX IF NOT EXISTS idx_amended_contracts_client_id ON amended_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_amended_contracts_created_at ON amended_contracts(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE contract_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE amended_contracts ENABLE ROW LEVEL SECURITY;

-- Create policies for contract_amendments
CREATE POLICY "Users can view their own contract amendments" ON contract_amendments
    FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Users can insert their own contract amendments" ON contract_amendments
    FOR INSERT WITH CHECK (auth.uid() = agent_id);

-- Create policies for amended_contracts
CREATE POLICY "Users can view their own amended contracts" ON amended_contracts
    FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Users can insert their own amended contracts" ON amended_contracts
    FOR INSERT WITH CHECK (auth.uid() = agent_id); 