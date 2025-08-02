const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = 'https://invadbpskztiooidhyui.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_KEY not found in environment variables');
  console.log('Please add your Supabase anon key to the .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🚀 Setting up database tables for contract amendment feature...\n');

  try {
    // Create contract_amendments table
    console.log('📋 Creating contract_amendments table...');
    const { error: amendmentsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS contract_amendments (
          id SERIAL PRIMARY KEY,
          agent_id UUID REFERENCES auth.users(id),
          client_id TEXT NOT NULL,
          original_contract TEXT NOT NULL,
          instruction TEXT NOT NULL,
          amended_contract TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (amendmentsError) {
      console.log('⚠️  Note: contract_amendments table creation failed. You may need to create it manually in Supabase SQL editor.');
      console.log('   Error:', amendmentsError.message);
    } else {
      console.log('✅ contract_amendments table created successfully');
    }

    // Create amended_contracts table
    console.log('📋 Creating amended_contracts table...');
    const { error: contractsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS amended_contracts (
          id SERIAL PRIMARY KEY,
          agent_id UUID REFERENCES auth.users(id),
          client_id TEXT NOT NULL,
          original_contract TEXT NOT NULL,
          amended_contract TEXT NOT NULL,
          instruction TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (contractsError) {
      console.log('⚠️  Note: amended_contracts table creation failed. You may need to create it manually in Supabase SQL editor.');
      console.log('   Error:', contractsError.message);
    } else {
      console.log('✅ amended_contracts table created successfully');
    }

    console.log('\n🎉 Database setup completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Restart your backend server: npm run dev');
    console.log('2. Test the contract amendment feature');
    console.log('3. If you encounter any issues, run the SQL commands manually in Supabase SQL editor');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n📋 Manual setup required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Open the SQL editor');
    console.log('3. Run the commands from database_setup.sql');
  }
}

setupDatabase(); 