#!/usr/bin/env node

/**
 * Setup feedback table in Supabase
 * Run this script to create the feedback table and policies
 */

const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

async function setupFeedbackTable() {
  const { createClient } = require('@supabase/supabase-js')
  
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    console.log('📊 Setting up feedback table...')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'setup_feedback_table.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // Try direct SQL execution if rpc doesn't work
      console.log('🔄 Trying direct SQL execution...')
      const { error: directError } = await supabase
        .from('_fake_table_')
        .select('*')
        .limit(0)
      
      // Since we can't execute arbitrary SQL directly, let's break it into parts
      console.log('ℹ️  Manual SQL execution required. Please run the following in your Supabase SQL editor:')
      console.log('📄 File: setup_feedback_table.sql')
      console.log('\nOr copy this SQL:')
      console.log('-'.repeat(50))
      console.log(sql)
      console.log('-'.repeat(50))
      
      return
    }
    
    console.log('✅ Feedback table setup completed!')
    
    // Test the table exists
    const { data: testData, error: testError } = await supabase
      .from('feedback')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.log('⚠️  Table created but there might be permission issues:', testError.message)
    } else {
      console.log('✅ Feedback table is accessible and ready!')
    }
    
  } catch (err) {
    console.error('❌ Error setting up feedback table:', err.message)
    console.log('\n📋 Please manually run the SQL from setup_feedback_table.sql in your Supabase dashboard')
  }
}

setupFeedbackTable()