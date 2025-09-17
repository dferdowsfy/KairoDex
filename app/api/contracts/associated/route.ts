export const runtime = 'edge'

import { supabaseServer } from '@/lib/supabaseServer'

// Returns contracts the current user has associated (via AgentHub_DB.agent_contract_ids) or all if query=all for admin.
export async function GET(req: Request) {
  try {
    const supabase = supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const search = new URL(req.url).searchParams.get('q')?.toLowerCase() || ''

    // Use service role for broader access to contract_files
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) throw new Error('Supabase config missing')
    const serviceSupabase = createClient(supabaseUrl, serviceKey)

    // Fetch AgentHub_DB row for this agent owner using the authenticated user ID
    const { data: agentRows, error: agentErr } = await supabase.from('AgentHub_DB').select('id, agent_contract_ids, agent_owner_user_id').eq('agent_owner_user_id', user.id).limit(1)
    if (agentErr) {
      // Log error server-side for debugging, then fall back to recent contracts so the UI remains usable.
      console.error('Failed to load AgentHub_DB row for user', user.id, agentErr)
      const { data: recent, error: recentErr } = await serviceSupabase.from('contract_files').select('id, contract_name, state_code, status, version, created_at').neq('status','amended').order('created_at',{ ascending:false }).limit(25)
      if (recentErr) {
        // If both agent lookup and recent fetch fail, return an empty contracts array (avoid 500 to keep UI stable)
        console.error('Failed to fetch recent contract_files fallback', recentErr)
        return new Response(JSON.stringify({ contracts: [] }), { status: 200, headers:{'Content-Type':'application/json'} })
      }
      return new Response(JSON.stringify({ contracts: recent, fallback: true }), { status: 200, headers:{'Content-Type':'application/json'} })
    }
    const agent = agentRows?.[0]
    const ids: string[] = agent?.agent_contract_ids || []
    if (!ids.length) {
      // Fallback: offer recent original contracts as selectable templates
      const { data: recent, error: recentErr } = await serviceSupabase.from('contract_files').select('id, contract_name, state_code, status, version, created_at').neq('status','amended').order('created_at',{ ascending:false }).limit(25)
      if (recentErr) return new Response(JSON.stringify({ contracts: [] }), { status: 200 })
      return new Response(JSON.stringify({ contracts: recent, fallback: true }), { status: 200, headers:{'Content-Type':'application/json'} })
    }

    let query = serviceSupabase.from('contract_files').select('id, contract_name, state_code, status, version, created_at').in('id', ids)
    if (search) {
      // client-side filter after fetch (Supabase edge function constraint) to keep simple
      const { data, error } = await query
      if (error) return new Response(JSON.stringify({ error: 'Query failed', details: error.message }), { status: 500 })
      const filtered = data.filter(c => c.contract_name.toLowerCase().includes(search))
      return new Response(JSON.stringify({ contracts: filtered }), { status: 200, headers: { 'Content-Type':'application/json' } })
    }
    const { data, error } = await query
    if (error) return new Response(JSON.stringify({ error: 'Query failed', details: error.message }), { status: 500 })
    return new Response(JSON.stringify({ contracts: data }), { status: 200, headers: { 'Content-Type':'application/json' } })
  } catch (e:any) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: e.message }), { status: 500 })
  }
}
