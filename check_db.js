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

async function checkDatabase() {
  try {
    console.log('Checking profiles table structure...');
    
    // Try to select from profiles table to see what columns exist
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error querying profiles:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Profiles table columns:', Object.keys(data[0]));
      console.log('Sample row:', data[0]);
    } else {
      console.log('Profiles table exists but is empty');
      
      // Try to see the schema
      const { data: schemaData, error: schemaError } = await supabase
        .from('profiles')
        .select()
        .limit(0);
      
      if (schemaError) {
        console.error('Error getting schema:', schemaError);
      } else {
        console.log('Table exists but no data to show structure from');
      }
    }
    
    // Try to create a test entry to see if subscription columns exist
    console.log('\nTesting subscription columns...');
    try {
      // First, let's see if we can insert with subscription fields
      const testUser = {
        id: 'test-subscription-' + Date.now(),
        subscription_tier: 'free',
        subscription_status: 'active'
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('profiles')
        .insert(testUser)
        .select();
      
      if (insertError) {
        console.error('Insert test failed (this might be expected):', insertError.message);
      } else {
        console.log('Successfully inserted test row with subscription fields:', insertData);
        
        // Clean up test row
        await supabase
          .from('profiles')
          .delete()
          .eq('id', testUser.id);
        console.log('Cleaned up test row');
      }
    } catch (testError) {
      console.error('Test insertion error:', testError.message);
    }
    
  } catch (err) {
    console.error('Error checking database:', err);
  }
}

checkDatabase();
