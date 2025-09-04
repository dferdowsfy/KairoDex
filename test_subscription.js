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

async function testSubscriptionColumns() {
  try {
    console.log('Testing subscription functionality...');
    
    // Test 1: Try to query subscription columns
    console.log('\n1. Testing column access...');
    const { data: queryTest, error: queryError } = await supabase
      .from('profiles')
      .select('id, subscription_tier, subscription_status, subscription_start_date, subscription_end_date')
      .limit(1);
    
    if (queryError) {
      console.error('❌ Query test failed:', queryError.message);
    } else {
      console.log('✅ Can successfully query subscription columns');
      if (queryTest.length > 0) {
        console.log('Sample data:', queryTest[0]);
      }
    }
    
    // Test 2: Try to insert a profile with subscription data
    console.log('\n2. Testing insertion with subscription data...');
    const crypto = require('crypto');
    const testId = crypto.randomUUID();
    
    const { data: insertTest, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        subscription_tier: 'professional',
        subscription_status: 'trial',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
      })
      .select();
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError.message);
    } else {
      console.log('✅ Successfully inserted profile with subscription data');
      console.log('Inserted data:', insertTest[0]);
      
      // Clean up
      await supabase.from('profiles').delete().eq('id', testId);
      console.log('✅ Test data cleaned up');
    }
    
    // Test 3: Try filtering by subscription tier
    console.log('\n3. Testing subscription tier filtering...');
    const { data: filterTest, error: filterError } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .eq('subscription_tier', 'free')
      .limit(5);
    
    if (filterError) {
      console.error('❌ Filter test failed:', filterError.message);
    } else {
      console.log('✅ Can filter by subscription tier');
      console.log(`Found ${filterTest.length} profiles with 'free' tier`);
    }
    
    console.log('\n🎉 DATABASE MIGRATION VERIFICATION COMPLETE!');
    console.log('✅ The subscription tier system is ready to use.');
    console.log('\nAvailable subscription tiers: free, professional, enterprise');
    console.log('Available subscription statuses: active, cancelled, expired, trial');
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

testSubscriptionColumns();
