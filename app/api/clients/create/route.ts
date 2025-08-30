import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

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
    const phone: string | undefined = (body?.phone || '').toString().trim() || undefined
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

    const { data, error } = await supabase.from('AgentHub_DB').insert(payload).select('*').single()
    if (error) throw error
    const id = (data as any)?.client_id || (data as any)?.id || (data as any)?.email
    return new Response(JSON.stringify({ id, row: data }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to add client' }), { status: 500 })
  }
}
