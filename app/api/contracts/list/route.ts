export const runtime = 'edge'

// List all available contracts for testing
export async function GET() {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Supabase configuration missing' }), { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get all contracts (include amended contracts for debugging)
    const { data, error } = await supabase
      .from('contract_files')
      .select('id, contract_name, state_code, county_fips, status, version, bucket, path, mime_type, created_at')
      .order('created_at', { ascending: false })
    
    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch contracts', details: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ contracts: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to list contracts', details: e.message }), { 
      status: 500 
    })
  }
}
