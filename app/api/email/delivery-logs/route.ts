import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer()
    
    // Get delivery logs with related schedule info
    const { data: logs, error } = await supabase
      .from('email_delivery_log')
      .select(`
        *,
        email_schedules (
          id,
          email_subject,
          recipient_email,
          clients (
            name,
            email
          )
        )
      `)
      .order('attempted_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching delivery logs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      logs: logs || [],
      count: logs?.length || 0
    })

  } catch (error) {
    console.error('Delivery logs API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
