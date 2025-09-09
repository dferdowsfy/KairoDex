import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { sanitizeEmailBody } from '@/lib/emailSanitizer'

// Disable caching for dynamic campaign data
export const revalidate = 0

// GET /api/email/campaigns - List email campaigns
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const clientId = url.searchParams.get('client_id')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    let query = supabase
      .from('email_campaigns')
      .select(`
        *,
        clients:client_id (
          id,
          name,
          email
        ),
        email_schedules (
          id,
          scheduled_at,
          status,
          cadence_type
        )
      `)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data: campaigns, error } = await query

    if (error) {
      console.error('Error fetching campaigns:', error)
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Unexpected error in GET /api/email/campaigns:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/email/campaigns - Create new email campaign
export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
  const { 
      client_id, 
      title, 
      content, 
      tone = 'professional', 
      instruction,
      template_used,
      ai_generated = true 
    } = body

    // Validate required fields
    if (!client_id || !title || !content) {
      return NextResponse.json({ 
        error: 'Missing required fields: client_id, title, content' 
      }, { status: 400 })
    }

    // Verify client exists and belongs to user
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, email')
      .eq('id', client_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Invalid client_id' }, { status: 400 })
    }

  // Sanitize body to avoid duplicated inline Subject line
  const cleanedContent = sanitizeEmailBody(title, content)

  // Create campaign
    const { data: campaign, error } = await supabase
      .from('email_campaigns')
      .insert({
        client_id,
    title,
    content: cleanedContent,
        tone,
        instruction,
        template_used,
        ai_generated,
        created_by: user.id
      })
      .select(`
        *,
        clients:client_id (
          id,
          name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error creating campaign:', error)
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/email/campaigns:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
