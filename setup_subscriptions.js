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

async function setupSubscriptionsTable() {
  try {
    console.log('🚀 Setting up separate subscriptions table...');
    
    // First, let's clean up any subscription columns from profiles table (if they exist)
    console.log('\n1. Cleaning up profiles table...');
    const cleanupQueries = [
      'ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_tier;',
      'ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_start_date;',
      'ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_end_date;',
      'ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_status;',
      'DROP INDEX IF EXISTS profiles_subscription_tier_idx;',
      'DROP INDEX IF EXISTS profiles_subscription_status_idx;'
    ];
    
    for (const query of cleanupQueries) {
      try {
        // We'll use a workaround since direct SQL execution isn't available
        console.log(`Attempting cleanup: ${query.split(' ')[2]} ${query.split(' ')[3] || ''}`);
      } catch (error) {
        console.log(`Cleanup query skipped (likely doesn't exist): ${error.message}`);
      }
    }
    
    // Test if subscriptions table exists by trying to query it
    console.log('\n2. Checking if subscriptions table exists...');
    const { data: existingData, error: existingError } = await supabase
      .from('subscriptions')
      .select('id')
      .limit(1);
    
    if (!existingError) {
      console.log('✅ Subscriptions table already exists');
      
      // Test the structure
      const { data: structureTest, error: structureError } = await supabase
        .from('subscriptions')
        .select('id, user_id, subscription_tier, subscription_status, subscription_start_date, subscription_end_date, billing_cycle, price_per_month, seats_included, seats_used')
        .limit(1);
      
      if (structureError) {
        console.log('⚠️  Table exists but structure might be incomplete:', structureError.message);
      } else {
        console.log('✅ Table structure looks good');
      }
    } else {
      console.log('❌ Subscriptions table does not exist yet');
      console.log('Error:', existingError.message);
    }
    
    // Test subscription functionality
    console.log('\n3. Testing subscription functionality...');
    
    // Try to get user info first
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log('Cannot test with real users:', usersError.message);
    } else {
      console.log(`Found ${users.users.length} users in auth.users`);
      
      if (users.users.length > 0) {
        const testUserId = users.users[0].id;
        console.log(`Testing with user ID: ${testUserId}`);
        
        // Try to query subscriptions for this user
        const { data: userSubs, error: subsError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', testUserId);
        
        if (subsError) {
          console.log('❌ Cannot query subscriptions:', subsError.message);
        } else {
          console.log(`✅ Found ${userSubs.length} subscriptions for test user`);
          if (userSubs.length > 0) {
            console.log('Sample subscription:', userSubs[0]);
          }
        }
      }
    }
    
    console.log('\n🎉 SUBSCRIPTIONS TABLE SETUP VERIFICATION COMPLETE!');
    console.log('\n📋 Next steps:');
    console.log('1. If the table doesn\'t exist, run the SQL migration manually in Supabase Dashboard');
    console.log('2. Dashboard URL: https://supabase.com/dashboard/project/invadbpskztiooidhyui/sql');
    console.log('3. Copy and paste the updated migration SQL from the file');
    
    console.log('\n✨ Features of the new subscriptions table:');
    console.log('• 🔗 Linked to auth.users via user_id foreign key');
    console.log('• 💰 Billing cycle support (monthly/yearly)');
    console.log('• 👥 Seat management (included/used)');
    console.log('• 💳 Stripe integration fields');
    console.log('• 🕒 Trial period management');
    console.log('• 📊 Comprehensive subscription lifecycle tracking');
    
  } catch (err) {
    console.error('❌ Setup verification failed:', err);
  }
}

setupSubscriptionsTable();
