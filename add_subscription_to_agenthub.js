#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addSubscriptionToAgentHubDB() {
  try {
    console.log('🚀 Adding subscription columns to AgentHub_DB table...');
    
    // Test current structure
    console.log('\n1. Checking current table structure...');
    const { data: beforeData, error: beforeError } = await supabase
      .from('AgentHub_DB')
      .select('client_id, agent_owner_user_id, subscription_tier')
      .limit(1);
    
    if (beforeError) {
      console.error('❌ Error checking table:', beforeError.message);
      return;
    }
    
    if (beforeData && beforeData[0] && beforeData[0].hasOwnProperty('subscription_tier')) {
      console.log('✅ subscription_tier column already exists!');
    } else {
      console.log('❌ subscription_tier column does not exist - need to run migration');
    }
    
    // Since we can't run SQL directly, let's provide instructions
    console.log('\n📋 MANUAL MIGRATION REQUIRED:');
    console.log('Please run the following in your Supabase Dashboard:');
    console.log('🔗 https://supabase.com/dashboard/project/invadbpskztiooidhyui/sql');
    console.log('\n📄 Copy and paste this SQL:');
    
    const migrationSQL = `
-- Add subscription tier to AgentHub_DB table
BEGIN;

-- Create subscription_tier enum
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'professional', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add subscription_tier column to AgentHub_DB table
ALTER TABLE "AgentHub_DB" 
ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier NOT NULL DEFAULT 'free';

-- Add subscription metadata columns to AgentHub_DB
ALTER TABLE "AgentHub_DB" 
ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial', 'pending'));

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS agenthub_db_subscription_tier_idx ON "AgentHub_DB"(subscription_tier);
CREATE INDEX IF NOT EXISTS agenthub_db_subscription_status_idx ON "AgentHub_DB"(subscription_status);
CREATE INDEX IF NOT EXISTS agenthub_db_agent_owner_subscription_idx ON "AgentHub_DB"(agent_owner_user_id, subscription_tier);

-- Add comments for documentation
COMMENT ON COLUMN "AgentHub_DB".subscription_tier IS 'Subscription tier for the agent who owns this client: free, professional, or enterprise';
COMMENT ON COLUMN "AgentHub_DB".subscription_start_date IS 'When the agent''s current subscription started';
COMMENT ON COLUMN "AgentHub_DB".subscription_end_date IS 'When the agent''s current subscription expires (null for lifetime/free)';
COMMENT ON COLUMN "AgentHub_DB".subscription_status IS 'Status of the agent''s subscription: active, cancelled, expired, trial, or pending';

-- Update existing records to have default subscription tier
UPDATE "AgentHub_DB" 
SET subscription_tier = 'free', 
    subscription_status = 'trial',
    subscription_start_date = NOW()
WHERE subscription_tier IS NULL;

COMMIT;
`;
    
    console.log(migrationSQL);
    
    console.log('\n⏳ Waiting 10 seconds for you to run the migration...');
    console.log('Press Ctrl+C if you want to run it later, or wait to test...');
    
    // Wait 10 seconds then test
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('\n🧪 Testing if migration was applied...');
    const { data: afterData, error: afterError } = await supabase
      .from('AgentHub_DB')
      .select('client_id, agent_owner_user_id, subscription_tier, subscription_status')
      .limit(1);
    
    if (afterError) {
      console.error('❌ Error testing migration:', afterError.message);
      console.log('Migration may not have been applied yet.');
    } else if (afterData && afterData[0] && afterData[0].hasOwnProperty('subscription_tier')) {
      console.log('🎉 SUCCESS! Migration applied successfully!');
      console.log('✅ subscription_tier column is now available');
      console.log('Sample data:', afterData[0]);
      
      // Test filtering by subscription tier
      const { data: filterData, error: filterError } = await supabase
        .from('AgentHub_DB')
        .select('client_id, agent_owner_user_id, subscription_tier')
        .eq('subscription_tier', 'free')
        .limit(3);
      
      if (!filterError) {
        console.log(`\n📊 Found ${filterData.length} clients with 'free' tier agents`);
      }
      
    } else {
      console.log('⏳ Migration not detected yet. Please run the SQL in Supabase Dashboard.');
    }
    
    console.log('\n✨ What this migration adds:');
    console.log('• subscription_tier: free, professional, enterprise');
    console.log('• subscription_status: trial, active, cancelled, expired, pending');
    console.log('• subscription_start_date: when subscription started');
    console.log('• subscription_end_date: when subscription expires');
    console.log('• Indexes for efficient querying by tier and agent');
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

addSubscriptionToAgentHubDB();
