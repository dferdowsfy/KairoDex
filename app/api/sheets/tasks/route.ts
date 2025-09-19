import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

// Basic tasks API to support QuickTaskForm
export async function GET(req: NextRequest) {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId') || undefined
  try {
    let q = supabase.from('tasks').select('*').eq('agent_id', user.id)
    if (clientId) q = q.eq('client_id', clientId)
    const { data, error } = await q.order('due_at', { ascending: true })
    if (error) throw error
    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Auth error in task creation:', authError)
      return NextResponse.json({ error: 'Authentication failed', details: authError.message }, { status: 401 })
    }
    
    if (!user) {
      console.error('No user found in task creation')
      return NextResponse.json({ error: 'No authenticated user found' }, { status: 401 })
    }
    
    const body = await req.json().catch(() => ({}))
    console.log('Task creation request:', { user: user.id, body })
    
    const task = {
      agent_id: user.id,
      client_id: body.client_id || null,
      title: body.title?.slice(0,200) || 'Task',
      status: body.status === 'done' ? 'done' : 'open',
      due_at: body.due_at || null
    }
    
    console.log('Inserting task:', task)
    const { data, error } = await supabase.from('tasks').insert(task).select().single()
    
    if (error) {
      console.error('Task insert error:', error)
      throw error
    }
    
    console.log('Task created successfully:', data)
    // optional event insert (ignore failure)
    if (data?.client_id) {
      try {
        await supabase.from('events').insert({ agent_id: user.id, client_id: data.client_id, type: 'task', ref_id: data.id }).select().single()
      } catch {}
    }
    return NextResponse.json({ item: data })
  } catch (e: any) {
    console.error('Task creation failed:', e)
    return NextResponse.json({ 
      error: e.message || 'Failed to create task',
      details: e.code || 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const id = body.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const update: any = {}
    if (body.status) update.status = body.status === 'done' ? 'done' : 'open'
    if (body.snooze_minutes) {
      const d = new Date(); d.setMinutes(d.getMinutes()+Number(body.snooze_minutes)); update.due_at = d.toISOString()
    }
    const { error } = await supabase.from('tasks').update(update).eq('id', id).eq('agent_id', user.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
