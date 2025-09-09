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

async function verifyEmailTables() {
  console.log('🔍 Verifying Email Automation Tables...\n');
  
  const tablesToCheck = [
    { name: 'email_templates', description: 'Reusable email templates' },
    { name: 'email_campaigns', description: 'Email campaign configurations' },
    { name: 'email_schedules', description: 'Individual scheduled emails' },
    { name: 'email_delivery_log', description: 'Email delivery tracking' },
    { name: 'email_queue', description: 'Email processing queue' }
  ];
  
  let allTablesExist = true;
  
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table.name}: ${error.message}`);
        allTablesExist = false;
      } else {
        console.log(`✅ ${table.name}: ${table.description}`);
      }
    } catch (err) {
      console.log(`❌ ${table.name}: ${err.message}`);
      allTablesExist = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allTablesExist) {
    console.log('🎉 SUCCESS! All email automation tables are ready!');
    console.log('\n📧 Your email automation system is now fully operational!');
    console.log('🚀 You can now:');
    console.log('   • Create email campaigns with cadence scheduling');
    console.log('   • Send personalized follow-up emails');
    console.log('   • Track email delivery and engagement');
    console.log('   • Use email templates for common scenarios');
  } else {
    console.log('⚠️  Some tables are missing. Please run the SQL schema in Supabase.');
    console.log('\n📋 To complete setup:');
    console.log('   1. Open Supabase SQL Editor');
    console.log('   2. Copy and paste the email_automation_manual.sql content');
    console.log('   3. Run the query to create all tables');
  }
}

verifyEmailTables().catch(console.error);
