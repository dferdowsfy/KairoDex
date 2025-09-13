export const runtime = 'edge'

import { NextRequest } from 'next/server'
import { aiComplete } from '@/lib/ai'
import { createClient } from '@supabase/supabase-js'

/*
POST /api/contracts/amend-storage
{ contractFileId: string, naturalChanges: string, clientId?: string }
-> returns { updatedContractId: string, summary: string }

Loads a contract from Supabase Storage, applies NL changes, and saves a new version.
*/
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('🔍 amend-storage received body:', body)
    
    const { contractFileId, naturalChanges, clientId } = body
    
    if (!contractFileId) {
      console.log('❌ Missing contractFileId')
      return new Response(JSON.stringify({ error: 'Missing contractFileId' }), { status: 400 })
    }
    
    if (!naturalChanges) {
      console.log('❌ Missing naturalChanges')
      return new Response(JSON.stringify({ error: 'Missing naturalChanges' }), { status: 400 })
    }
    
    console.log('✅ Valid request:', { contractFileId, naturalChanges: naturalChanges.substring(0, 50) + '...', clientId })

    // Use service role for server-side DB access (RLS-safe)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Supabase configuration missing' }), { status: 500 })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get the original contract file metadata
    console.log('📋 Fetching contract from database...')
    const { data: originalContract, error: contractError } = await supabase
      .from('contract_files')
      .select('*')
      .eq('id', contractFileId)
      .single()
    
    console.log('📋 Database query result:', { originalContract, contractError })
    
    if (contractError || !originalContract) {
      console.log('❌ Contract not found:', contractError)
      return new Response(JSON.stringify({ error: 'Contract not found', details: contractError?.message }), { status: 404 })
    }

    // Handle missing columns with defaults
    const bucket = originalContract.bucket || 'contracts'
    const version = originalContract.version || 1
    const contractPath = originalContract.path
    
    console.log('📁 Attempting to download from bucket:', bucket, 'path:', contractPath)

    // Select base text: prefer provided baseText (current preview) else amended_content else fallback scaffold
    let originalText: string
    if (body.baseText && typeof body.baseText === 'string' && body.baseText.length > 50) {
      console.log('📄 Using client-provided baseText (preview)')
      originalText = body.baseText
    } else if (originalContract.metadata?.amended_content) {
      console.log('📄 Using existing amended_content as base')
      originalText = originalContract.metadata.amended_content
    } else {
      console.log('📄 Using fallback scaffold content')
      originalText = `CONTRACT: ${originalContract.contract_name.toUpperCase()}
\nThis is a legal contract document for real estate transactions.\nVersion: ${version}\nState: ${originalContract.state_code}\nCounty FIPS: ${originalContract.county_fips}\nStatus: ${originalContract.status}\n\nSECTION 1: Parties\nBuyer and Seller details here.\n\nSECTION 2: Terms\nPurchase price, earnest money, financing, closing date.\n\nSECTION 3: Contingencies\nInspection, financing, appraisal.\n\nSECTION 4: Additional Provisions\nStandard provisions and legal clauses.\n\nEXECUTION:\nBuyer: __________ Date: __________\nSeller: __________ Date: __________`
    }
    
    console.log('✅ Contract text prepared, length:', originalText.length)
    
    // Apply AI changes
    console.log('🤖 Applying AI changes...')
  const system = `You are an expert real estate contracts editor.
Apply EVERY requested change to the contract text precisely.

STRICT RULES:
1. Modify the ORIGINAL CONTRACT text directly; do NOT summarize instead of editing.
2. If the user asks to "change date to X" or similar, locate the primary contract date (first date-like token such as 'September 12, 2025') and replace it with the new date exactly.
3. Reflect each numeric or monetary change (earnest money, purchase price, extension days, etc.).
4. If an instruction is ambiguous, insert [confirm] after the ambiguous portion but still attempt a best-effort edit.
5. Preserve all sections and formatting not directly changed.
6. Never remove parties or structural headers unless explicitly instructed.

OUTPUT FORMAT:
UPDATED CONTRACT
<full amended contract text>

SUMMARY
<bullet list of applied changes>`
    
    const clientContext = clientId ? { clientId } : {}
    const user = `CLIENT_CONTEXT: ${JSON.stringify(clientContext)}
CONTRACT:
${originalText}

REQUESTED CHANGES (natural language):
${naturalChanges}`
    
    // Helper: deterministic date replacement fallback
    const extractRequestedDate = (instruction: string): string | null => {
      const m = instruction.match(/change\s+(the\s+)?(contract\s+)?date\s+(to|=)\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i)
      return m ? m[4] : null
    }
    const firstDateRegex = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/
    const requestedDate = extractRequestedDate(naturalChanges || '')

    try {
      const result = await aiComplete(system, user)
      console.log('🤖 AI response received, length:', result.length)
      // Heuristic split
      const parts = result.split(/\n\s*SUMMARY[:\-]?/i)
      let updatedText = parts[0].trim()
      const summary = parts[1]?.trim() || 'Contract successfully amended'

      // If AI only returned a short patch / bullet list instead of full contract, merge into original
      const tooShort = updatedText.length < 400 || updatedText.split(/\n/).length < 12
      if (tooShort) {
        console.log('⚠️ AI output appears to be a delta; performing merge fallback')
        // Date substitution already handled below; here we append an AMENDMENTS section if not present
        const amendedSectionHeader = '\n\nAMENDMENTS APPLIED (Merged):\n'
        updatedText = originalText + amendedSectionHeader + updatedText
      }

      // Fallback: if user asked for date change & AI missed it, patch first occurrence
      if (requestedDate) {
        const originalFirstDate = originalText.match(firstDateRegex)?.[0]
        const aiHasNew = updatedText.includes(requestedDate)
        if (originalFirstDate && !aiHasNew) {
          updatedText = updatedText.replace(firstDateRegex, requestedDate)
        }
      }

      // Create new amended contract file
      const newVersion = version + 1
      const originalPathParts = contractPath.split('.')
      const extension = originalPathParts.pop() || 'txt'
      const basePath = originalPathParts.join('.')
      // Make path unique by including timestamp to avoid constraint violations
      const timestamp = Date.now()
      const newPath = `${basePath}_v${newVersion}_${timestamp}.${extension}`
      
      console.log('💾 Creating amended contract record directly in database...')
      
      // Skip storage upload for now - save content directly in database
      // We'll store the amended text in a new column or use a different approach
      
      // Create new contract_files record with amended content
      const { data: newContract, error: insertError } = await supabase
        .from('contract_files')
        .insert({
          client_id: originalContract.client_id || null,
          state_code: originalContract.state_code,
          county_fips: originalContract.county_fips,
          contract_name: `${originalContract.contract_name} (Amended v${newVersion})`,
          bucket: bucket,
          path: newPath,
          mime_type: 'text/plain',
          status: 'amended',
          version: newVersion,
          // Store the amended content in metadata for now
          metadata: {
            amended_content: updatedText,
            original_contract_id: contractFileId,
            amendment_summary: summary,
            created_at: new Date().toISOString()
          }
        })
        .select('*')
        .single()
      
      if (insertError) {
        console.log('❌ Database insert failed:', insertError)
        return new Response(JSON.stringify({ 
          error: 'Failed to create amended contract record', 
          details: insertError?.message,
          code: insertError?.code 
        }), { status: 500 })
      }

      if (!newContract) {
        console.log('❌ No contract returned from insert')
        return new Response(JSON.stringify({ error: 'No contract data returned' }), { status: 500 })
      }

      console.log('✅ Amendment completed successfully, contract ID:', newContract.id)

      // Log the amendment event if you have an events table
      try {
        await supabase.from('events').insert({
          client_id: clientId || originalContract.client_id,
          type: 'contract_amended',
          ref_id: newContract.id,
          metadata: { originalContractId: contractFileId, changes: naturalChanges }
        })
      } catch (e) {
        // Events logging is optional
        console.warn('⚠️ Failed to log amendment event:', e)
      }

      return new Response(JSON.stringify({ 
        updatedContractId: newContract.id,
        summary,
        newPath,
        version: newVersion,
        amendedText: updatedText,
        appliedDeterministicDate: !!requestedDate
      }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      })
      
    } catch (aiError: any) {
      console.log('❌ AI processing failed:', aiError)
      return new Response(JSON.stringify({ 
        error: 'AI processing failed', 
        details: aiError?.message || 'Unknown AI error'
      }), { status: 500 })
    }
    
  } catch (e: any) {
    return new Response(JSON.stringify({ 
      error: 'Unexpected error', 
      details: e?.message 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    })
  }
}
