#!/usr/bin/env node

/**
 * Setup feedback table using individual queries
 */

require('dotenv').config({ path: '.env.local' })

async function setupFeedbackTable() {
  const { createClient } = require('@supabase/supabase-js')
  
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })
  
  try {
    console.log('📊 Creating feedback table...')
    
    // Create the table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.feedback (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        user_email text NOT NULL,
        rating integer CHECK (rating >= 1 AND rating <= 10),
        liked text[] DEFAULT '{}',
        disliked text[] DEFAULT '{}',
        message text,
        feedback_id text NOT NULL UNIQUE,
        status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
        email_sent_at timestamp with time zone,
        email_error text,
        user_agent text,
        ip_address inet,
        source text DEFAULT 'feedback_widget'
      );
    `
    
    const { error: createError } = await supabase.rpc('exec_sql', { query: createTableSQL })
    
    if (createError && !createError.message.includes('already exists')) {
      console.log('⚠️  Could not create table via RPC. Manual creation needed.')
      console.log('📋 Please run this SQL in your Supabase SQL editor:')
      console.log(createTableSQL)
      return
    }
    
    console.log('✅ Table creation completed (or already exists)')
    
    // Test if we can access the table
    const { data, error } = await supabase
      .from('feedback')
      .select('id')
      .limit(1)
    
    if (error) {
      console.log('❌ Table access test failed:', error.message)
      console.log('📋 Please manually run the SQL from setup_feedback_table.sql')
    } else {
      console.log('✅ Feedback table is accessible!')
    }
    
  } catch (err) {
    console.error('❌ Setup error:', err.message)
  }
}

setupFeedbackTable()