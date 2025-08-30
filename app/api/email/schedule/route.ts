export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const supabase = supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const job = { ...payload, user_id: user.id }
    const { data, error } = await supabase.from('email_jobs').insert(job).select('*').single()
    if (error) throw error
    return new Response(JSON.stringify({ job: data }), { status: 200 })
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected' }), { status: 500 })
  }
}
