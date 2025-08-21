export const runtime = 'edge'

// Get states that have contracts in the database
export async function GET() {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Supabase configuration missing' }), { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get distinct states that have contracts
    const { data, error } = await supabase
      .from('contract_files')
      .select('state_code')
      .neq('state_code', null)
    
    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch states' }), { status: 500 })
    }

    // Get unique state codes
    const uniqueStates = [...new Set(data.map(item => item.state_code))].sort()
    
    return new Response(JSON.stringify({ states: uniqueStates }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to fetch available states', details: e.message }), { 
      status: 500 
    })
  }
}
