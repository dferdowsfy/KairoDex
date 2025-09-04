import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  // adapt RequestCookies to the callable shape expected by createServerComponentClient
  const supabase = createServerComponentClient({ cookies: () => (req.cookies as any) })
  // assume OrgId is provided via cookie or header—prefer cookie set on sign-in
  const orgId = req.cookies.get('org_id')?.value
  if (!orgId) return NextResponse.json({ error: 'org_id missing' }, { status: 400 })

  // Read table name from env (server-side). Fallback to AgentHub_DB for compatibility.
  const TABLE = process.env.SUPABASE_CLIENTS_TABLE || process.env.NEXT_PUBLIC_SUPABASE_CLIENTS_TABLE || 'AgentHub_DB'
  const { data, error } = await supabase.from(TABLE).select('*').eq('org_id', orgId).limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies: () => (req.cookies as any) })
    const body = await req.json()
    const clientId = (body?.client_id || '').toString()
    if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 })
    const orgId = req.cookies.get('org_id')?.value
    if (!orgId) return NextResponse.json({ error: 'org_id missing' }, { status: 400 })

    const TABLE = process.env.SUPABASE_CLIENTS_TABLE || process.env.NEXT_PUBLIC_SUPABASE_CLIENTS_TABLE || 'AgentHub_DB'
    const payload: any = {}
    if (body?.email !== undefined) payload.email = body.email || null
    if (body?.phone !== undefined) {
      const digits = String(body.phone).replace(/\D/g, '').slice(0, 15)
      payload.phone = digits || null
    }
    if (body?.budget !== undefined) {
      const n = Number(String(body.budget).replace(/[^0-9.-]/g, ''))
      payload.budget = Number.isNaN(n) ? null : n
    }

    if (!Object.keys(payload).length) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

    const { data, error } = await supabase.from(TABLE).update(payload).eq('client_id', clientId).eq('org_id', orgId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Update failed' }, { status: 500 })
  }
}
