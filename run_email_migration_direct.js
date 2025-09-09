#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const connectionString = `postgresql://postgres.invadbpskztiooidhyui:AH0LZ6FAAAgentHub@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

async function runEmailMigration() {
  const client = new Pool({ 
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🚀 Running email automation schema migration...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'database_migrations/email_automation_schema.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Executing SQL file directly...');
    
    // Execute the entire SQL file as one transaction
    await client.query('BEGIN');
    await client.query(sqlContent);
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    
    // Test if tables were created
    console.log('\n🔍 Checking if email automation tables exist...');
    const tableChecks = [
      'email_campaigns',
      'email_templates', 
      'email_schedules',
      'email_delivery_log',
      'email_queue'
    ];
    
    for (const tableName of tableChecks) {
      try {
        const result = await client.query(`SELECT 1 FROM ${tableName} LIMIT 1`);
        console.log(`✅ Table ${tableName}: exists and accessible`);
      } catch (err) {
        console.log(`❌ Table ${tableName}: ${err.message}`);
      }
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    
    // Show more specific error info
    if (error.position) {
      console.error(`Error at position ${error.position} in SQL`);
    }
    if (error.line) {
      console.error(`Error at line ${error.line}`);
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

runEmailMigration();
