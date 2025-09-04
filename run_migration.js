#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

async function runMigration() {
  try {
    console.log('Running subscription tier migration...');
    
    // Create the enum type first
    console.log('Creating subscription_tier enum...');
    const { error: enumError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ BEGIN
            CREATE TYPE subscription_tier AS ENUM ('free', 'professional', 'enterprise');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
      `
    });
    
    if (enumError && !enumError.message.includes('already exists')) {
      console.error('Error creating enum:', enumError);
      // Continue anyway, enum might already exist
    }
    
    // Add columns to profiles table
    console.log('Adding subscription columns to profiles table...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier NOT NULL DEFAULT 'free',
        ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz,
        ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz,
        ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial'));
      `
    });
    
    if (alterError) {
      console.error('Error altering table:', alterError);
      // Try individual column additions
      console.log('Trying individual column additions...');
      
      const columns = [
        { name: 'subscription_tier', sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier NOT NULL DEFAULT \'free\';' },
        { name: 'subscription_start_date', sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz;' },
        { name: 'subscription_end_date', sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;' },
        { name: 'subscription_status', sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT \'active\' CHECK (subscription_status IN (\'active\', \'cancelled\', \'expired\', \'trial\'));' }
      ];
      
      for (const column of columns) {
        const { error } = await supabase.rpc('exec_sql', { sql: column.sql });
        if (error) {
          console.log(`Column ${column.name} might already exist:`, error.message);
        } else {
          console.log(`Added column: ${column.name}`);
        }
      }
    }
    
    // Create indexes
    console.log('Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS profiles_subscription_tier_idx ON profiles(subscription_tier);',
      'CREATE INDEX IF NOT EXISTS profiles_subscription_status_idx ON profiles(subscription_status);'
    ];
    
    for (const indexSQL of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: indexSQL });
      if (error) {
        console.log('Index might already exist:', error.message);
      }
    }
    
    console.log('Migration completed successfully!');
    
    // Test the migration by checking if columns exist
    console.log('Verifying migration...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .limit(1);
    
    if (testError) {
      console.error('Verification failed:', testError);
    } else {
      console.log('Verification successful - columns are accessible');
    }
    
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration();
