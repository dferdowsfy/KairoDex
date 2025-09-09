const { createClient } = require('@supabase/supabase-js')

async function testEmailSystem() {
  console.log('🧪 Testing Email System...')
  console.log('==========================')
  
  try {
    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Supabase environment variables not found')
      console.log('   Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
      return
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Test 1: Check email tables exist
    console.log('\n1. Checking email tables...')
    const tables = ['email_templates', 'email_campaigns', 'email_schedules', 'email_delivery_log', 'email_queue']
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`)
      } else {
        console.log(`   ✅ ${table}: Available`)
      }
    }
    
    // Test 2: Check if there are any clients for testing
    console.log('\n2. Checking test data...')
    const { data: clients, error: clientError } = await supabase.from('clients').select('*').limit(5)
    
    if (clientError) {
      console.log(`   ❌ Clients table: ${clientError.message}`)
    } else {
      console.log(`   ✅ Found ${clients?.length || 0} clients for testing`)
      if (clients && clients.length > 0) {
        clients.forEach(client => {
          console.log(`      - ${client.name} (${client.email})`)
        })
      }
    }
    
    // Test 3: Check email schedules
    console.log('\n3. Checking email schedules...')
    const { data: schedules, error: scheduleError } = await supabase
      .from('email_schedules')
      .select('*')
      .limit(5)
    
    if (scheduleError) {
      console.log(`   ❌ Email schedules: ${scheduleError.message}`)
    } else {
      console.log(`   ✅ Found ${schedules?.length || 0} scheduled emails`)
      if (schedules && schedules.length > 0) {
        schedules.forEach(schedule => {
          console.log(`      - ${schedule.email_subject} (${schedule.status}) - ${schedule.scheduled_at}`)
        })
      }
    }
    
    // Test 4: Check delivery logs
    console.log('\n4. Checking delivery logs...')
    const { data: logs, error: logError } = await supabase
      .from('email_delivery_log')
      .select('*')
      .limit(5)
    
    if (logError) {
      console.log(`   ❌ Delivery logs: ${logError.message}`)
    } else {
      console.log(`   ✅ Found ${logs?.length || 0} delivery log entries`)
      if (logs && logs.length > 0) {
        logs.forEach(log => {
          console.log(`      - Attempt ${log.attempt_number}: ${log.status} at ${log.attempted_at}`)
        })
      }
    }
    
    // Test 5: Environment check
    console.log('\n5. Environment configuration...')
    const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS
    const smtpHost = process.env.SMTP_HOST
    const cronSecret = process.env.CRON_SECRET
    
    console.log(`   📧 Use Mocks: ${useMocks || 'not set (defaults to true)'}`)
    console.log(`   🌐 SMTP Host: ${smtpHost || 'not configured'}`)
    console.log(`   🔐 Cron Secret: ${cronSecret ? 'configured' : 'not set'}`)
    
    if (useMocks === 'false' && !smtpHost) {
      console.log(`   ⚠️  Warning: Mocks disabled but no SMTP configured`)
    }
    
    console.log('\n🎯 Email System Test Complete!')
    console.log('===============================')
    
    if (useMocks !== 'false') {
      console.log('💡 Tips:')
      console.log('   - Set NEXT_PUBLIC_USE_MOCKS=false for real email delivery')
      console.log('   - Configure SMTP settings in .env.local')
      console.log('   - Visit /emails dashboard to see the email interface')
      console.log('   - Use cadence scheduler to create email campaigns')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
if (require.main === module) {
  testEmailSystem().then(() => process.exit(0))
}

module.exports = { testEmailSystem }
