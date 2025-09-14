#!/usr/bin/env node

/**
 * Fast Email Sequence Testing Script
 * This script allows you to test email sequences by manipulating scheduled times
 * in the database, so you don't have to wait for real-time scheduling.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testSequenceFast() {
  console.log('🚀 Fast Email Sequence Testing')
  console.log('============================\n')

  try {
    // 1. Find existing scheduled emails
    console.log('1. Finding scheduled emails...')
    const { data: schedules, error: fetchError } = await supabase
      .from('email_schedules')
      .select('*')
      .eq('status', 'pending')
      .order('scheduled_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      console.log(`   ❌ Error: ${fetchError.message}`)
      return
    }

    if (!schedules || schedules.length === 0) {
      console.log('   ℹ️  No pending email schedules found')
      console.log('   💡 Create some email sequences first using the app')
      return
    }

    console.log(`   ✅ Found ${schedules.length} pending email(s)`)
    schedules.forEach((schedule, index) => {
      console.log(`      ${index + 1}. ${schedule.subject} - scheduled for ${schedule.scheduled_at}`)
    })

    // 2. Update scheduled times to "now" for immediate processing
    console.log('\n2. Fast-forwarding scheduled times...')
    const now = new Date()
    const updates = []

    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i]
      // Space them out by 30 seconds each for testing
      const newTime = new Date(now.getTime() + (i * 30 * 1000))
      
      const { error: updateError } = await supabase
        .from('email_schedules')
        .update({ scheduled_at: newTime.toISOString() })
        .eq('id', schedule.id)

      if (updateError) {
        console.log(`   ❌ Failed to update ${schedule.id}: ${updateError.message}`)
      } else {
        console.log(`   ✅ Updated "${schedule.subject}" to ${newTime.toISOString()}`)
        updates.push({ id: schedule.id, newTime })
      }
    }

    // 3. Trigger the email processor
    console.log('\n3. Triggering email processor...')
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/cron/process`, {
        method: 'POST',
        headers: {
          'x-cron-secret': process.env.CRON_SECRET,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`   ✅ Processor response:`, result)
      } else {
        console.log(`   ❌ Processor failed: ${response.status}`)
      }
    } catch (processError) {
      console.log(`   ❌ Processor error: ${processError.message}`)
    }

    // 4. Check results
    console.log('\n4. Checking email status...')
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds

    const { data: updatedSchedules, error: checkError } = await supabase
      .from('email_schedules')
      .select('*')
      .in('id', updates.map(u => u.id))

    if (checkError) {
      console.log(`   ❌ Error checking status: ${checkError.message}`)
    } else {
      updatedSchedules?.forEach(schedule => {
        console.log(`   📧 ${schedule.subject}: ${schedule.status}${schedule.sent_at ? ` (sent: ${schedule.sent_at})` : ''}`)
      })
    }

    console.log('\n✅ Fast sequence test complete!')
    console.log('\n💡 Next steps:')
    console.log('   - Check the email dashboard at /emails')
    console.log('   - View delivery logs in the database')
    console.log('   - Test with real email providers by setting NEXT_PUBLIC_USE_MOCKS=false')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Helper function to create test sequence
async function createTestSequence() {
  console.log('🔧 Creating test email sequence...')
  
  const clientId = 'test-client-' + Date.now()
  const now = new Date()
  
  // Create a simple 3-email sequence
  const emails = [
    {
      subject: 'Welcome to Our Service',
      content: 'Thank you for joining us!',
      scheduled_at: new Date(now.getTime() + 1 * 60 * 1000).toISOString(), // 1 minute
    },
    {
      subject: 'Getting Started Guide',
      content: 'Here\'s how to get the most out of our platform.',
      scheduled_at: new Date(now.getTime() + 2 * 60 * 1000).toISOString(), // 2 minutes
    },
    {
      subject: 'Exclusive Tips & Tricks',
      content: 'Advanced features you might have missed.',
      scheduled_at: new Date(now.getTime() + 3 * 60 * 1000).toISOString(), // 3 minutes
    }
  ]

  for (const email of emails) {
    const { error } = await supabase
      .from('email_schedules')
      .insert({
        client_id: clientId,
        recipient_email: 'test@example.com',
        subject: email.subject,
        content: email.content,
        scheduled_at: email.scheduled_at,
        status: 'pending',
        cadence_type: 'single',
        created_by: '00000000-0000-0000-0000-000000000000' // placeholder
      })

    if (error) {
      console.log(`   ❌ Failed to create "${email.subject}": ${error.message}`)
    } else {
      console.log(`   ✅ Created "${email.subject}" for ${email.scheduled_at}`)
    }
  }
}

// Command line interface
const args = process.argv.slice(2)
if (args.includes('--create-test')) {
  createTestSequence()
} else {
  testSequenceFast()
}
