export const runtime = 'edge'

// List all available contracts for testing
export async function GET(request: Request) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    // Try multiple environment variable patterns for Netlify compatibility
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase config missing:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey,
        envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      })
      return new Response(JSON.stringify({ 
        error: 'Supabase configuration missing',
        details: `Missing: ${!supabaseUrl ? 'URL ' : ''}${!supabaseKey ? 'KEY' : ''}`,
        availableEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Parse query params
    const url = new URL(request.url)
    const clientId = url.searchParams.get('clientId')
    
    // Get contracts, optionally filtered by client
    let query = supabase
      .from('contract_files')
      .select('id, contract_name, state_code, county_fips, status, version, bucket, path, mime_type, created_at, client_id')
      .order('created_at', { ascending: false })
    
    if (clientId) {
      query = query.eq('client_id', clientId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Supabase query error:', error)
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch contracts', 
        details: error.message 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ contracts: data || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to list contracts', details: e.message }), { 
      status: 500 
    })
  }
}
