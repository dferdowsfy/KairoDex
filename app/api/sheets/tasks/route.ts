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
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const task = {
      agent_id: user.id,
      client_id: body.client_id || null,
      title: body.title?.slice(0,200) || 'Task',
      status: body.status === 'done' ? 'done' : 'open',
      due_at: body.due_at || null
    }
    const { data, error } = await supabase.from('tasks').insert(task).select().single()
    if (error) throw error
    // optional event insert (ignore failure)
    if (data?.client_id) {
      try {
        await supabase.from('events').insert({ agent_id: user.id, client_id: data.client_id, type: 'task', ref_id: data.id }).select().single()
      } catch {}
    }
    return NextResponse.json({ item: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
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
