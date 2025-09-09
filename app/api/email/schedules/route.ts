import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

// Helper function to generate cadence dates
function generateCadenceDates(
  startDate: Date,
  cadenceType: string,
  cadenceData: any,
  count: number = 6
): Date[] {
  const dates: Date[] = []
  let currentDate = new Date(startDate)
  
  for (let i = 0; i < count; i++) {
    dates.push(new Date(currentDate))
    
    switch (cadenceType) {
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7)
        break
      case 'biweekly':
        currentDate.setDate(currentDate.getDate() + 14)
        break
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1)
        break
      case 'every_other_month':
        currentDate.setMonth(currentDate.getMonth() + 2)
        break
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + 3)
        break
      case 'custom':
        const { n, unit } = cadenceData.customEvery || { n: 1, unit: 'weeks' }
        switch (unit) {
          case 'days':
            currentDate.setDate(currentDate.getDate() + n)
            break
          case 'weeks':
            currentDate.setDate(currentDate.getDate() + (n * 7))
            break
          case 'months':
            currentDate.setMonth(currentDate.getMonth() + n)
            break
        }
        break
      default:
        // Single - only one date
        return dates
    }
  }
  
  return dates
}

// GET /api/email/schedules - List scheduled emails
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const campaignId = url.searchParams.get('campaign_id')
    const clientId = url.searchParams.get('client_id')
    const status = url.searchParams.get('status')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    let query = supabase
      .from('email_schedules')
      .select(`
        *,
        email_campaigns (
          id,
          title,
          content,
          tone
        ),
        clients:client_id (
          id,
          name,
          email
        ),
        email_delivery_log (
          id,
          status,
          attempted_at,
          delivered_at,
          error_message
        )
      `)
      .eq('created_by', user.id)
      .order('scheduled_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }
    if (clientId) {
      query = query.eq('client_id', clientId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: schedules, error } = await query

    if (error) {
      console.error('Error fetching schedules:', error)
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
    }

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error('Unexpected error in GET /api/email/schedules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/email/schedules - Create scheduled emails
export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
  const { 
      campaign_id,
      client_id,
      scheduled_at,
      cadence_type = 'single',
      cadence_data = {},
      subject,
      content,
      count = 1
    } = body

    // Validate required fields
    if (!campaign_id || !client_id || !scheduled_at) {
      return NextResponse.json({ 
        error: 'Missing required fields: campaign_id, client_id, scheduled_at' 
      }, { status: 400 })
    }

    // Verify campaign exists and belongs to user
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('id, title, content, tone')
      .eq('id', campaign_id)
      .eq('created_by', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Invalid campaign_id' }, { status: 400 })
    }

    // Verify client exists and get email
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email')
      .eq('id', client_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Invalid client_id' }, { status: 400 })
    }

    if (!client.email) {
      return NextResponse.json({ error: 'Client has no email address' }, { status: 400 })
    }

    // Generate schedule dates based on cadence
    const startDate = new Date(scheduled_at)
    const scheduleDates = cadence_type === 'single' 
      ? [startDate]
      : generateCadenceDates(startDate, cadence_type, cadence_data, count)

    // Create schedule records
    // Capture sender context
    const userEmail = (user as any).email || undefined
    const meta: any = (user as any).user_metadata || {}
    const userName = meta.full_name || meta.name || undefined

    const scheduleInserts = scheduleDates.map((date, index) => ({
      campaign_id,
      client_id,
      scheduled_at: date.toISOString(),
      cadence_type,
      cadence_data,
      subject: subject || campaign.title,
      content: content || campaign.content,
      recipient_email: client.email,
      from_email: userEmail,
      from_name: userName,
      reply_to: userEmail,
      created_by: user.id
    }))

    const { data: schedules, error: insertError } = await supabase
      .from('email_schedules')
      .insert(scheduleInserts)
      .select(`
        *,
        email_campaigns (
          id,
          title,
          content,
          tone
        ),
        clients:client_id (
          id,
          name,
          email
        )
      `)

    if (insertError) {
      console.error('Error creating schedules:', insertError)
      return NextResponse.json({ error: 'Failed to create schedules' }, { status: 500 })
    }

    // Add to email queue for processing
    const queueInserts = schedules.map(schedule => ({
      schedule_id: schedule.id,
      priority: 5
    }))

    const { error: queueError } = await supabase
      .from('email_queue')
      .insert(queueInserts)

    if (queueError) {
      console.error('Error adding to queue:', queueError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ 
      schedules,
      message: `Created ${schedules.length} email schedule(s)`
    }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/email/schedules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/email/schedules/[id] - Update scheduled email
export async function PUT(request: NextRequest) {
  try {
    const supabase = supabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const scheduleId = url.pathname.split('/').pop()
    
    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { scheduled_at, subject, content, status } = body

    const updates: any = {}
    if (scheduled_at) updates.scheduled_at = scheduled_at
    if (subject) updates.subject = subject
    if (content) updates.content = content
    if (status) updates.status = status

    const { data: schedule, error } = await supabase
      .from('email_schedules')
      .update(updates)
      .eq('id', scheduleId)
      .eq('created_by', user.id)
      .select(`
        *,
        email_campaigns (
          id,
          title,
          content,
          tone
        ),
        clients:client_id (
          id,
          name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error updating schedule:', error)
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
    }

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error('Unexpected error in PUT /api/email/schedules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
