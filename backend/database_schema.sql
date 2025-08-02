-- User Authentication and Settings Database Schema
-- Run these SQL commands in your Supabase SQL editor

-- 1. Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User settings table for theme customization and preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    theme_colors JSONB DEFAULT '{
        "background": "#0B1F33",
        "cardBackground": "rgba(255, 255, 255, 0.1)",
        "cardBorder": "rgba(255, 255, 255, 0.2)",
        "primaryButton": "#1E85F2",
        "secondaryButton": "#10B981",
        "textPrimary": "#F8EEDB",
        "textSecondary": "#9CA3AF"
    }',
    text_sizes JSONB DEFAULT '{
        "emailBody": "14px",
        "subject": "16px",
        "labels": "12px"
    }',
    preferences JSONB DEFAULT '{
        "autoSave": true,
        "emailNotifications": true
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. Update existing tables to reference users
-- Add user_id column to client_notes if it doesn't exist
ALTER TABLE client_notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id column to agent_messages if it doesn't exist
ALTER TABLE agent_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id column to generated_messages if it doesn't exist
ALTER TABLE generated_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_user_id ON client_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_user_id ON agent_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_messages_user_id ON generated_messages(user_id);

-- 5. Create RLS (Row Level Security) policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_messages ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Client notes policies
CREATE POLICY "Users can view own client notes" ON client_notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own client notes" ON client_notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own client notes" ON client_notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own client notes" ON client_notes
    FOR DELETE USING (auth.uid() = user_id);

-- Agent messages policies
CREATE POLICY "Users can view own agent messages" ON agent_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agent messages" ON agent_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent messages" ON agent_messages
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agent messages" ON agent_messages
    FOR DELETE USING (auth.uid() = user_id);

-- Generated messages policies
CREATE POLICY "Users can view own generated messages" ON generated_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated messages" ON generated_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generated messages" ON generated_messages
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated messages" ON generated_messages
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 