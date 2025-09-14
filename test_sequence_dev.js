#!/usr/bin/env node

/**
 * Development Mode Sequence Testing
 * This creates a special development mode where sequences run every few minutes
 * instead of days/weeks for testing purposes.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Development mode cadence mappings (minutes instead of days/weeks)
const DEV_CADENCE_MAP = {
  'weekly': 2,        // 2 minutes instead of 7 days
  'biweekly': 4,      // 4 minutes instead of 14 days  
  'monthly': 6,       // 6 minutes instead of 30 days
  'every_other_month': 8,  // 8 minutes instead of 60 days
  'quarterly': 10,    // 10 minutes instead of 90 days
  'custom': (data) => {
    // Convert custom intervals to minutes for testing
    if (data?.customEvery) {
      const { n, unit } = data.customEvery
      switch (unit) {
        case 'days': return n * 0.5  // Half minute per day
        case 'weeks': return n * 2   // 2 minutes per week
        case 'months': return n * 5  // 5 minutes per month
        default: return 1
      }
    }
    return 1
  }
}

async function createDevSequence() {
  console.log('🧪 Development Mode Sequence Creator')
  console.log('===================================\n')

  const testClientId = 'dev-sequence-' + Date.now()
  
  // Create a realistic sequence but with dev timing
  const sequence = [
    {
      subject: 'Welcome to Our Real Estate Journey!',
      content: `Dear ${testClientId.split('-').pop()},

Thank you for choosing us for your real estate needs! We're excited to help you find your perfect home.

Over the next few minutes (simulating weeks), you'll receive helpful information about:
- Market updates
- Available properties  
- Financing options
- Next steps in your journey

Let's get started!

Best regards,
Your Real Estate Team`,
      cadence: 'single',
      delayMinutes: 0
    },
    {
      subject: 'Market Update: Great Opportunities Await',
      content: `Hi there!

The market has some exciting developments this week:

🏠 New listings in your preferred area
📈 Interest rates remain favorable  
💰 Great financing options available
📅 Perfect time to schedule viewings

Would you like to see some properties this weekend?

Best regards,
Your Real Estate Team`,
      cadence: 'weekly',
      delayMinutes: DEV_CADENCE_MAP.weekly
    },
    {
      subject: 'Exclusive Property Matches Found!',
      content: `Exciting news!

We've found several properties that match your criteria:

🎯 3-bedroom home in Oak Valley - $450K
🎯 Modern condo downtown - $320K  
🎯 Family home with pool - $520K

Each property has been pre-screened to meet your requirements. 

Ready to schedule some viewings?

Best regards,
Your Real Estate Team`,
      cadence: 'biweekly', 
      delayMinutes: DEV_CADENCE_MAP.biweekly
    },
    {
      subject: 'Financing Pre-Approval Update',
      content: `Important update on your financing:

✅ Your credit score qualifies for excellent rates
✅ Pre-approval amount confirmed
✅ Multiple lender options available
📋 Final documentation ready for review

This puts you in a strong position to make competitive offers!

Let's discuss your financing strategy.

Best regards,
Your Real Estate Team`,
      cadence: 'monthly',
      delayMinutes: DEV_CADENCE_MAP.monthly  
    },
    {
      subject: 'Market Insights & Next Quarter Planning',
      content: `As we enter the new quarter, here's what to expect:

📊 Market trends favoring buyers
🏡 Inventory levels increasing
💡 Strategic timing recommendations
📝 Updated property search criteria

This is an excellent time to make your move!

Ready to take the next step?

Best regards,
Your Real Estate Team`,
      cadence: 'quarterly',
      delayMinutes: DEV_CADENCE_MAP.quarterly
    }
  ]

  console.log('📧 Creating development sequence...')
  const now = new Date()
  
  for (let i = 0; i < sequence.length; i++) {
    const email = sequence[i]
    const scheduledTime = new Date(now.getTime() + email.delayMinutes * 60 * 1000)
    
    const { error } = await supabase
      .from('email_schedules')
      .insert({
        client_id: testClientId,
        recipient_email: 'dev-test@example.com',
        subject: email.subject,
        content: email.content,
        scheduled_at: scheduledTime.toISOString(),
        status: 'pending',
        cadence_type: email.cadence,
        cadence_data: email.cadence === 'custom' ? { customEvery: { n: 1, unit: 'weeks' } } : null,
        created_by: '00000000-0000-0000-0000-000000000000'
      })

    if (error) {
      console.log(`   ❌ Failed to create "${email.subject}": ${error.message}`)
    } else {
      console.log(`   ✅ Created "${email.subject}" (${email.cadence}) - ${scheduledTime.toLocaleTimeString()}`)
    }
  }

  console.log('\n🎯 Development sequence created!')
  console.log(`📅 Timeline: ${sequence.length} emails over ${Math.max(...sequence.map(s => s.delayMinutes))} minutes`)
  console.log(`🆔 Client ID: ${testClientId}`)
  
  console.log('\n🚀 Start processing with:')
  console.log('   ./test_sequence_manual.sh')
  console.log('   OR')
  console.log('   node test_sequence_intervals.js')

  return testClientId
}

async function showSequenceStatus(clientId) {
  const { data: schedules, error } = await supabase
    .from('email_schedules')
    .select('subject, status, scheduled_at, sent_at, cadence_type')
    .eq('client_id', clientId)
    .order('scheduled_at', { ascending: true })

  if (error) {
    console.log('❌ Error:', error.message)
    return
  }

  console.log('\n📊 Sequence Status:')
  schedules?.forEach((schedule, index) => {
    const status = schedule.status === 'sent' ? '✅' : 
                   schedule.status === 'pending' ? '⏳' : '❌'
    const time = schedule.sent_at ? 
      `sent: ${new Date(schedule.sent_at).toLocaleTimeString()}` :
      `scheduled: ${new Date(schedule.scheduled_at).toLocaleTimeString()}`
    
    console.log(`   ${index + 1}. ${status} [${schedule.cadence_type}] ${schedule.subject} (${time})`)
  })
}

// Command line interface
const args = process.argv.slice(2)
if (args.includes('--status') && args[1]) {
  showSequenceStatus(args[1])
} else if (args.includes('--help')) {
  console.log('Usage:')
  console.log('  node test_sequence_dev.js                 # Create new dev sequence')
  console.log('  node test_sequence_dev.js --status <id>   # Check sequence status')
} else {
  createDevSequence()
}
