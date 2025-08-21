export const runtime = 'edge'

// Test endpoint to verify Supabase connection and contract_files table
export async function GET(req: Request) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ 
        error: 'Missing Supabase credentials',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      }), { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Test basic connection
    const { data: tables, error: tablesError } = await supabase
      .from('contract_files')
      .select('count', { count: 'exact', head: true })
    
    if (tablesError) {
      return new Response(JSON.stringify({
        error: 'Table access error',
        details: tablesError
      }), { status: 500 })
    }

    // Get Maryland contracts
    const { data: mdContracts, error: mdError } = await supabase
      .from('contract_files')
      .select('*')
      .eq('state_code', 'MD')
      .limit(5)

    return new Response(JSON.stringify({
      success: true,
      totalContractFiles: tables,
      mdContracts: mdContracts || [],
      mdError
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({
      error: 'Connection failed',
      details: e?.message
    }), { status: 500 })
  }
}
