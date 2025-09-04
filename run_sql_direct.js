#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runDirectSQL() {
  try {
    console.log('Running SQL commands directly...');
    
    // Use the direct query method
    const queries = [
      // Create enum type
      `DO $$ BEGIN
          CREATE TYPE subscription_tier AS ENUM ('free', 'professional', 'enterprise');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;`,
      
      // Add columns
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier NOT NULL DEFAULT 'free';`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz;`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial'));`,
      
      // Create indexes
      `CREATE INDEX IF NOT EXISTS profiles_subscription_tier_idx ON profiles(subscription_tier);`,
      `CREATE INDEX IF NOT EXISTS profiles_subscription_status_idx ON profiles(subscription_status);`
    ];
    
    for (let i = 0; i < queries.length; i++) {
      console.log(`Running query ${i + 1}/${queries.length}...`);
      try {
        // Try using the REST API directly with raw SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({
            sql: queries[i]
          })
        });
        
        if (response.ok) {
          console.log(`Query ${i + 1} executed successfully`);
        } else {
          const errorText = await response.text();
          console.log(`Query ${i + 1} failed: ${errorText}`);
        }
      } catch (error) {
        console.log(`Query ${i + 1} error:`, error.message);
      }
    }
    
    console.log('All queries attempted. Checking if changes took effect...');
    
    // Test if we can now use the subscription columns
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .limit(0); // Just to test the columns exist
    
    if (error) {
      console.error('Verification failed - columns may not exist yet:', error.message);
      console.log('\nYou may need to run this SQL manually in the Supabase Dashboard:');
      console.log('Dashboard URL: https://supabase.com/dashboard/project/invadbpskztiooidhyui/sql');
      console.log('\nSQL to run:');
      console.log(queries.join('\n\n'));
    } else {
      console.log('SUCCESS! Subscription columns are now available.');
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

runDirectSQL();
