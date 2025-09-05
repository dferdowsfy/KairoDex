import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
// uploadFileToSupabase helper not present in repo; remove import to avoid build/type errors

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServer()
    const {
      data: { user },
      error: userErr
    } = await supabase.auth.getUser()
    if (userErr) throw userErr
    if (!user?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const body = await req.json()
    const name: string = (body?.name || '').toString().trim()
    const email: string | undefined = (body?.email || '').toString().trim() || undefined
    let phone: string | undefined = (body?.phone || '').toString().trim() || undefined
    // normalize phone to digits-only for storage
    if (phone) {
      const digits = phone.replace(/\D/g, '').slice(0, 15)
      phone = digits || undefined
    }
    let budget: number | undefined = undefined
    if (body?.budget !== undefined && body?.budget !== null && String(body?.budget).trim() !== '') {
      const n = Number(String(body?.budget).replace(/[^0-9.-]/g, ''))
      if (!Number.isNaN(n)) budget = n
    }
    const stage: string = (body?.stage || 'new').toString()
    if (!name && !email && !phone) {
      return new Response(JSON.stringify({ error: 'Provide at least a name, email, or phone' }), { status: 400 })
    }
    const [first, ...rest] = name.split(/\s+/).filter(Boolean)
    const last = rest.join(' ')

    const payload: any = {
      agent_owner_user_id: user.email,
      stage,
    }
    if (first) payload.name_first = first
    if (last) payload.name_last = last
  if (email) payload.email = email
  if (phone) payload.phone = phone
  if (budget !== undefined) payload.budget = budget

    const { data, error } = await supabase.from('AgentHub_DB').insert(payload).select('*').single()
    if (error) throw error
    const id = (data as any)?.client_id || (data as any)?.id || (data as any)?.email
    return new Response(JSON.stringify({ id, row: data }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to add client' }), { status: 500 })
  }
}
