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

async function createEmailTables() {
  try {
    console.log('Creating email automation tables step by step...');
    
    // Create tables one by one with simple DDL
    const tables = [
      {
        name: 'email_campaigns',
        sql: `
          CREATE TABLE IF NOT EXISTS email_campaigns (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            subject_template TEXT NOT NULL,
            body_template TEXT NOT NULL,
            cadence_type VARCHAR(50) DEFAULT 'weekly' CHECK (cadence_type IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'custom')),
            cadence_interval INTEGER DEFAULT 7,
            status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
            start_date TIMESTAMP WITH TIME ZONE,
            end_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'email_templates',
        sql: `
          CREATE TABLE IF NOT EXISTS email_templates (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            subject_template TEXT NOT NULL,
            body_template TEXT NOT NULL,
            template_type VARCHAR(50) DEFAULT 'general' CHECK (template_type IN ('general', 'followup', 'reminder', 'welcome', 'custom')),
            is_system BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'email_schedules',
        sql: `
          CREATE TABLE IF NOT EXISTS email_schedules (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
            client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
            scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            recipient_email VARCHAR(255) NOT NULL,
            recipient_name VARCHAR(255),
            status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
            sent_at TIMESTAMP WITH TIME ZONE,
            error_message TEXT,
            retry_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'email_delivery_log',
        sql: `
          CREATE TABLE IF NOT EXISTS email_delivery_log (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            schedule_id UUID NOT NULL REFERENCES email_schedules(id) ON DELETE CASCADE,
            attempt_number INTEGER NOT NULL DEFAULT 1,
            status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'failed', 'bounced', 'delivered', 'opened', 'clicked')),
            provider VARCHAR(50),
            provider_message_id VARCHAR(255),
            provider_response TEXT,
            error_message TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'email_queue',
        sql: `
          CREATE TABLE IF NOT EXISTS email_queue (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            schedule_id UUID NOT NULL REFERENCES email_schedules(id) ON DELETE CASCADE,
            priority INTEGER DEFAULT 100,
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            next_retry_at TIMESTAMP WITH TIME ZONE,
            last_error TEXT,
            status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
            processed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      }
    ];
    
    // Create each table
    for (const table of tables) {
      console.log(`Creating table: ${table.name}`);
      try {
        // Use direct PostgreSQL connection if available
        const { data, error } = await supabase
          .from('_dummy_table_that_does_not_exist')
          .select('*')
          .limit(0);
        
        // If we get here, we can try creating via REST API
        console.log(`Attempting to create ${table.name} via REST API...`);
        
        // For now, let's create a simpler approach - just log the SQL
        console.log(`SQL for ${table.name}:`);
        console.log(table.sql);
        console.log('---');
        
      } catch (error) {
        console.log(`Error with ${table.name}:`, error.message);
      }
    }
    
    console.log('\n📝 Next steps:');
    console.log('1. Copy the SQL statements above');
    console.log('2. Go to your Supabase dashboard > SQL Editor');
    console.log('3. Paste and run each CREATE TABLE statement');
    console.log('4. Then run the RLS policies and indexes');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createEmailTables();
