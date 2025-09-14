#!/usr/bin/env node

/**
 * Interval-Based Email Sequence Testing
 * This script creates sequences with very short intervals (minutes instead of days)
 * and processes them automatically.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createMinuteBasedSequence() {
  console.log('⏱️  Creating Minute-Based Email Sequence')
  console.log('======================================\n')

  const testClientId = 'test-sequence-' + Date.now()
  const testEmail = 'test@example.com'
  const now = new Date()

  // Create campaign first
  const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .insert({
      name: 'Fast Test Sequence',
      description: 'Quick testing sequence with minute intervals',
      is_active: true,
      created_by: '00000000-0000-0000-0000-000000000000' // placeholder
    })
    .select()
    .single()

  if (campaignError) {
    console.log('❌ Failed to create campaign:', campaignError.message)
    return
  }

  console.log('✅ Created campaign:', campaign.name)

  // Create sequence emails with minute intervals
  const sequenceEmails = [
    {
      subject: '🎉 Welcome! Your journey starts now',
      content: `Dear Valued Client,

Welcome to our service! We're thrilled to have you on board.

This is the first email in our onboarding sequence. Over the next few minutes, you'll receive helpful information to get started.

Best regards,
Your Team`,
      delayMinutes: 0 // Send immediately
    },
    {
      subject: '📚 Quick Setup Guide',
      content: `Hello again!

Here's a quick setup guide to help you get the most out of our platform:

1. Complete your profile
2. Set your preferences  
3. Explore the dashboard

More helpful tips coming your way soon!

Best regards,
Your Team`,
      delayMinutes: 2 // 2 minutes later
    },
    {
      subject: '💡 Pro Tips for Success',
      content: `Hi there!

Now that you've had a few minutes to explore, here are some pro tips:

• Use the search feature to find anything quickly
• Set up notifications for important updates
• Check out our help center for detailed guides

You're doing great!

Best regards,
Your Team`,
      delayMinutes: 4 // 4 minutes from start
    },
    {
      subject: '🚀 You\'re all set!',
      content: `Congratulations!

You've completed our quick onboarding sequence. You should now have everything you need to succeed.

If you have any questions, don't hesitate to reach out. We're here to help!

Welcome aboard!

Best regards,
Your Team`,
      delayMinutes: 6 // 6 minutes from start
    }
  ]

  console.log('📧 Creating sequence emails...')
  
  for (const email of sequenceEmails) {
    const scheduledTime = new Date(now.getTime() + email.delayMinutes * 60 * 1000)
    
    const { error } = await supabase
      .from('email_schedules')
      .insert({
        campaign_id: campaign.id,
        client_id: testClientId,
        recipient_email: testEmail,
        subject: email.subject,
        content: email.content,
        scheduled_at: scheduledTime.toISOString(),
        status: 'pending',
        cadence_type: 'single',
        created_by: '00000000-0000-0000-0000-000000000000'
      })

    if (error) {
      console.log(`   ❌ Failed to schedule "${email.subject}": ${error.message}`)
    } else {
      console.log(`   ✅ Scheduled "${email.subject}" for ${scheduledTime.toLocaleTimeString()} (${email.delayMinutes} min delay)`)
    }
  }

  console.log('\n⏰ Starting automatic processor...')
  
  // Run processor every 30 seconds for the next 10 minutes
  let processCount = 0
  const maxProcesses = 20 // 10 minutes worth of 30-second intervals
  
  const processorInterval = setInterval(async () => {
    processCount++
    console.log(`\n🔄 Processing cycle ${processCount}/${maxProcesses}...`)
    
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
        if (result.processed > 0) {
          console.log(`   📨 Processed ${result.processed} email(s)`)
          result.results?.forEach(r => {
            console.log(`      - ${r.status}: ${r.id}`)
          })
        } else {
          console.log(`   ⏳ No emails ready to send yet`)
        }
      } else {
        console.log(`   ❌ Processor failed: ${response.status}`)
      }
    } catch (error) {
      console.log(`   ❌ Processor error: ${error.message}`)
    }

    // Check if we're done
    if (processCount >= maxProcesses) {
      clearInterval(processorInterval)
      console.log('\n✅ Automatic processing complete!')
      await showFinalResults(testClientId)
    }
  }, 30000) // Every 30 seconds

  console.log('\n💡 Tip: You can also manually trigger processing with:')
  console.log(`curl -H "x-cron-secret: ${process.env.CRON_SECRET}" "${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/cron/process"`)
}

async function showFinalResults(clientId) {
  console.log('\n📊 Final Results')
  console.log('================')
  
  const { data: schedules, error } = await supabase
    .from('email_schedules')
    .select('subject, status, scheduled_at, sent_at')
    .eq('client_id', clientId)
    .order('scheduled_at', { ascending: true })

  if (error) {
    console.log('❌ Error fetching results:', error.message)
    return
  }

  schedules?.forEach((schedule, index) => {
    const status = schedule.status === 'sent' ? '✅ SENT' : 
                   schedule.status === 'failed' ? '❌ FAILED' : 
                   '⏳ PENDING'
    const sentTime = schedule.sent_at ? ` (sent: ${new Date(schedule.sent_at).toLocaleTimeString()})` : ''
    console.log(`   ${index + 1}. ${status} ${schedule.subject}${sentTime}`)
  })

  console.log('\n🎯 Next Steps:')
  console.log('   - Check the email dashboard at /emails')
  console.log('   - View delivery logs in Supabase dashboard')
  console.log('   - Set NEXT_PUBLIC_USE_MOCKS=false to test with real email providers')
}

// Run the test
createMinuteBasedSequence().catch(console.error)
