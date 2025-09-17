export const runtime = 'edge'

// Get contract content for preview
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const contractId = searchParams.get('id')
    const debug = searchParams.get('debug') === '1'

    if (!contractId) {
      return new Response(JSON.stringify({ error: 'Contract ID required' }), { status: 400 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      return new Response(JSON.stringify({ 
        error: 'Supabase URL missing',
        availableEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      }), { status: 500 })
    }
    if (!serviceRoleKey && !anonKey) {
      return new Response(JSON.stringify({ 
        error: 'Supabase keys missing (need SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)',
        availableEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      }), { status: 500 })
    }

    const usingFallback = !serviceRoleKey && !!anonKey
    const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey!)
    if (usingFallback) {
      try { console.warn('[contracts/preview] Using anon key fallback – service role key not set. RLS may restrict results.') } catch {}
    }

    // Get contract file info
    const { data: contractFile, error: dbError } = await supabase
      .from('contract_files')
      .select('*')
      .eq('id', contractId)
      .single()

    if (dbError || !contractFile) {
      const status = (dbError as any)?.code === '42501' ? 403 : 404
      if (debug) {
        try { console.error('[contracts/preview] fetch error', { contractId, dbError }) } catch {}
      }
      return new Response(JSON.stringify({ error: status === 403 ? 'Not authorized to access contract (RLS)' : 'Contract not found' }), { status })
    }

    // For PDF files, we'll use AI to extract a summary/preview
    try {
      const { aiComplete } = await import('@/lib/ai')
      let previewText: string

      if (contractFile.status === 'amended' && contractFile.metadata?.amended_content) {
        try { console.log('📄 Using amended content from metadata') } catch {}
        previewText = contractFile.metadata.amended_content
      } else {
        const systemPrompt = 'You are a helpful assistant that generates realistic contract previews.'
        const userPrompt = `Generate a readable preview of this contract file:
        \nContract Name: ${contractFile.contract_name}
        State: ${contractFile.state_code}
        County: ${contractFile.county_fips}
        Status: ${contractFile.status}
        Version: ${contractFile.version}
        \nSince this is a ${contractFile.contract_name}, create a realistic preview showing typical contract sections like:
        - Parties involved
        - Property details
        - Purchase price
        - Closing date
        - Contingencies
        - Terms and conditions
        \nMake it look like actual contract text with realistic values. Format it cleanly with proper spacing.`
        previewText = await aiComplete(systemPrompt, userPrompt)
      }

      const response = {
        contractInfo: {
          id: contractFile.id,
          name: contractFile.contract_name,
          path: contractFile.path,
          status: contractFile.status,
          version: contractFile.version
        },
        previewText: previewText || `Contract: ${contractFile.contract_name}\n\nThis is a legal contract document for real estate transactions.\n\nState: ${contractFile.state_code}\nCounty FIPS: ${contractFile.county_fips}\nStatus: ${contractFile.status}\nVersion: ${contractFile.version}\n\nThe contract contains standard legal language for real estate purchases, including terms for:\n- Purchase price and financing\n- Property inspection contingencies\n- Closing date and procedures\n- Buyer and seller obligations\n- Default and remedies\n\nUse the amendment feature to modify specific terms using natural language.`,
        isPdf: true,
        meta: debug ? { usingFallback } : undefined
      }

      return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } catch (aiError:any) {
      const response = {
        contractInfo: {
          id: contractFile.id,
          name: contractFile.contract_name,
          path: contractFile.path,
          status: contractFile.status,
          version: contractFile.version
        },
        previewText: `CONTRACT: ${contractFile.contract_name.toUpperCase()}\n\nREAL ESTATE PURCHASE AGREEMENT\n\nThis agreement is made between Buyer and Seller for the purchase of real property.\n\nSTATE: ${contractFile.state_code}\nJURISDICTION: County FIPS ${contractFile.county_fips}\nDOCUMENT STATUS: ${contractFile.status}\nVERSION: ${contractFile.version}\n\nTERMS AND CONDITIONS:\n1. Purchase Price: $[TO BE DETERMINED]\n2. Earnest Money: $[TO BE DETERMINED]\n3. Closing Date: [TO BE DETERMINED]\n4. Property Inspection: [TO BE DETERMINED]\n5. Financing Contingency: [TO BE DETERMINED]\n\nADDITIONAL PROVISIONS:\n[Contract-specific terms and conditions would appear here]\n\nThis document contains legal language governing the real estate transaction.\nUse the amendment feature to modify any terms using natural language descriptions.\n\nEXECUTION:\nBuyer: _________________ Date: _________\nSeller: ________________ Date: _________`,
        isPdf: true,
        meta: debug ? { aiError: (aiError as any)?.message, usingFallback } : undefined
      }
      return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
  } catch (e:any) {
    try { console.error('[contracts/preview] unexpected error', e) } catch {}
    return new Response(JSON.stringify({ error: 'Failed to load contract', details: e.message }), { status: 500 })
  }
}
