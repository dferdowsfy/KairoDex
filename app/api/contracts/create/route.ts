export const runtime = 'edge'

import { supabaseServer } from '@/lib/supabaseServer'

/*
POST /api/contracts/create
Body: { contractName: string, stateCode: string, countyFips?: string, content?: string }
Creates an initial version (v1) contract record scoped to the authenticated user's client context.

Jurisdiction rules:
 - stateCode required.
 - countyFips optional; if provided must be 5 digits.
 - Only allows state codes in allowed list (configurable via env CONTRACT_ALLOWED_STATES, comma-separated) otherwise rejects.

Returns: { id, contract_name, state_code, county_fips, version }
*/
export async function POST(req: Request) {
  try {
    const supabase = supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const body = await req.json().catch(()=> ({}))
    const { contractName, stateCode, countyFips, content } = body || {}
    if (!contractName || typeof contractName !== 'string') {
      return new Response(JSON.stringify({ error: 'contractName required' }), { status: 400 })
    }
    if (!stateCode || typeof stateCode !== 'string') {
      return new Response(JSON.stringify({ error: 'stateCode required' }), { status: 400 })
    }
    const allowedEnv = process.env.CONTRACT_ALLOWED_STATES || 'MD,DC,VA'
    const allowed = allowedEnv.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean)
    if (!allowed.includes(stateCode.toUpperCase())) {
      return new Response(JSON.stringify({ error: 'State not allowed', allowed }), { status: 403 })
    }
    if (countyFips && !/^[0-9]{5}$/.test(countyFips)) {
      return new Response(JSON.stringify({ error: 'countyFips must be 5 digits' }), { status: 400 })
    }

    // Insert into contract_files table; path is synthetic (no storage file yet)
  const syntheticPath = `generated/${stateCode}/${Date.now()}_${contractName.replace(/[^a-z0-9_-]+/gi,'_')}.txt`
  const defaultContent = content || `Contract: ${contractName}\nState: ${stateCode.toUpperCase()}${countyFips?`\nCounty FIPS: ${countyFips}`:''}\nCreated: ${(new Date()).toISOString()}`
  const metadata: any = { created_by: user.id, initial_content: defaultContent }

    const { data, error } = await supabase.from('contract_files').insert({
      contract_name: contractName,
      state_code: stateCode.toUpperCase(),
      county_fips: countyFips || null,
      status: 'original',
      version: 1,
      bucket: 'contracts',
      path: syntheticPath,
      mime_type: 'text/plain',
      metadata
    }).select('id, contract_name, state_code, county_fips, version').single()

    if (error) {
      return new Response(JSON.stringify({ error: 'Insert failed', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ contract: data }), { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e:any) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: e.message }), { status: 500 })
  }
}
