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

async function checkAgentHubDB() {
  try {
    console.log('🔍 Checking AgentHub_DB table structure...');
    
    // Check if AgentHub_DB table exists and get its structure
    const { data, error } = await supabase
      .from('AgentHub_DB')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error accessing AgentHub_DB:', error.message);
      
      // Try to get available tables
      console.log('\n📋 Checking available tables...');
      const { data: tablesData, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (!tablesError && tablesData) {
        console.log('Available tables:', tablesData.map(t => t.table_name));
      }
      
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ AgentHub_DB table found');
      console.log('📊 Current columns:', Object.keys(data[0]));
      console.log('📝 Sample row:', data[0]);
      
      // Check if subscription_tier column already exists
      if (data[0].hasOwnProperty('subscription_tier')) {
        console.log('✅ subscription_tier column already exists');
      } else {
        console.log('❌ subscription_tier column does not exist');
      }
    } else {
      console.log('⚠️  AgentHub_DB table exists but is empty');
      
      // Try to describe table structure another way
      console.log('\n🔍 Attempting to get table schema...');
      const { data: schemaData, error: schemaError } = await supabase
        .from('AgentHub_DB')
        .select()
        .limit(0);
      
      if (schemaError) {
        console.log('Schema check failed:', schemaError.message);
      } else {
        console.log('Table accessible but no data to show structure');
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkAgentHubDB();
