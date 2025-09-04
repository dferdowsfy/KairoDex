import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    const admin = supabaseAdmin()
    // list users (first 100)
    // supabase-js v2 uses auth.admin.listUsers
    const res: any = await admin.auth.admin.listUsers({ perPage: 100 })
    if (res.error) return new Response(JSON.stringify({ error: res.error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    const users = res.data?.map((u: any) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      role: (u.app_metadata && u.app_metadata.role) || (u.user_metadata && u.user_metadata.role) || 'user',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      disabled: !!u.disabled
    })) || []
    return new Response(JSON.stringify({ users }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, action, payload } = body || {}
    if (!id || !action) return new Response(JSON.stringify({ error: 'Missing id or action' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    const admin = supabaseAdmin()
    if (action === 'update') {
      // payload may contain { role, disabled }
      const update: any = {}
      if (payload?.disabled !== undefined) update.disabled = !!payload.disabled
      if (payload?.role) update.app_metadata = { ...(payload.app_metadata || {}), role: payload.role }
      const res: any = await admin.auth.admin.updateUserById(id, update)
      if (res.error) return new Response(JSON.stringify({ error: res.error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ user: res.user || res.data || null }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    const admin = supabaseAdmin()
    const res: any = await admin.auth.admin.deleteUser(id)
    if (res.error) return new Response(JSON.stringify({ error: res.error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
