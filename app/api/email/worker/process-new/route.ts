import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { sendEmail } from '@/lib/emailProviders'

// Verify cron secret for security
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = request.headers.get('x-cron-secret')
  const expectedSecret = process.env.CRON_SECRET || 'dev-secret'
  return cronSecret === expectedSecret
}

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from a legitimate cron job
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = supabaseServer()
    let processed = 0
    let errors: string[] = []

    // Get pending email schedules that should be sent now
    const now = new Date().toISOString()
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_schedules')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          company
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .limit(50) // Process in batches
    
    if (fetchError) {
      console.error('Error fetching pending emails:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch pending emails' }, { status: 500 })
    }

    console.log(`Found ${pendingEmails?.length || 0} pending emails to process`)

    // Process each email
    for (const emailSchedule of pendingEmails || []) {
      try {
        const client = emailSchedule.clients
        const recipientEmail = emailSchedule.recipient_email || client?.email
        
        if (!recipientEmail) {
          console.error(`No recipient email for schedule ${emailSchedule.id}`)
          errors.push(`No recipient email for schedule ${emailSchedule.id}`)
          continue
        }

  console.log(`Sending email to ${recipientEmail}: ${emailSchedule.subject}`)

        // Send the email using the real email provider
        const startTime = Date.now()
        const result = await sendEmail({
          to: recipientEmail,
          subject: emailSchedule.subject,
          content: emailSchedule.content,
          fromEmail: (emailSchedule as any).from_email,
          fromName: (emailSchedule as any).from_name,
          replyTo: (emailSchedule as any).reply_to || (emailSchedule as any).from_email
        })
        const deliveryTime = Date.now() - startTime

        // Log the delivery attempt
        const { error: logError } = await supabase
          .from('email_delivery_log')
          .insert({
            schedule_id: emailSchedule.id,
            attempt_number: 1, // TODO: Track retry attempts
            status: result.success ? 'success' : 'failed',
            provider_response: {
              messageId: result.messageId,
              provider: result.provider,
              error: result.error
            },
            attempted_at: new Date().toISOString(),
            delivery_time_ms: deliveryTime
          })

        if (logError) {
          console.error('Error logging delivery:', logError)
          errors.push(`Failed to log delivery for ${emailSchedule.id}`)
        }

        // Update the email schedule status
        const { error: updateError } = await supabase
          .from('email_schedules')
          .update({
            status: result.success ? 'sent' : 'failed',
            sent_at: result.success ? new Date().toISOString() : null,
            error_message: result.error || null
          })
          .eq('id', emailSchedule.id)

        if (updateError) {
          console.error('Error updating schedule status:', updateError)
          errors.push(`Failed to update status for ${emailSchedule.id}`)
        } else if (result.success) {
          processed++
          console.log(`✅ Successfully sent email to ${recipientEmail}`)
        } else {
          console.log(`❌ Failed to send email to ${recipientEmail}: ${result.error}`)
          errors.push(`Failed to send to ${recipientEmail}: ${result.error}`)
        }

      } catch (error) {
        console.error(`Error processing email ${emailSchedule.id}:`, error)
        errors.push(`Error processing ${emailSchedule.id}: ${error}`)
      }
    }

    const response = {
      processed,
      total: pendingEmails?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }

    console.log('Email processing complete:', response)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Email worker process error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
