export const runtime = 'edge'

import { NextRequest } from 'next/server'
import { aiComplete } from '@/lib/ai'
import { findSheetRowByHints, sheetRowToClient } from '@/lib/sheets'
import { supabaseServer } from '@/lib/supabaseServer'

export async function handleFollowupGET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    if (!clientId) return new Response(JSON.stringify({ messages: [] }), { status: 200, headers: { 'Content-Type':'application/json' } })
    const supabase = supabaseServer()
    const { data, error } = await supabase.from('messages').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    if (error) throw error
    return new Response(JSON.stringify({ messages: data || [] }), { status: 200, headers: { 'Content-Type':'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ messages: [], error: e?.message }), { status: 200, headers: { 'Content-Type':'application/json' } })
  }
}

export async function handleFollowupPOST(req: NextRequest) {
  try {
  const { clientId, channel, instruction, save, userId, focusAreas, tone } = await req.json()
    if (!['email', 'sms'].includes(channel)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
    }

    // Fetch client context if provided
  let client: any = null
  let sheetRow: any | null = null
  let structuredNotes: any[] = []
    if (clientId) {
  // Sheets row for this client (match by id/email/name)
  try { sheetRow = await findSheetRowByHints({ id: clientId }) } catch {}
  if (sheetRow) client = sheetRowToClient(sheetRow)
  // Also load structured normalized items from Supabase
  try {
    const supabase = supabaseServer()
    const { data: ni } = await supabase
      .from('normalized_items')
      .select('kind,title,date,status,party,tags,created_at')
      .eq('client_id', clientId)
      .order('date', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(50)
    if (Array.isArray(ni)) structuredNotes = ni
  } catch {}
    }

  const system = `You are Kairodex's assistant writing personalized client communications.

CRITICAL REQUIREMENTS:
- You MUST use the actual CLIENT_CONTEXT data provided. DO NOT create generic marketing content about trends or strategies.
- Reference specific client details like their name, company, recent interactions, or project status from the context.
- If the client context shows specific activities, notes, or deadlines, reference those directly.
- Write as if you personally know this client and their current situation.
- Keep it conversational and specific to their circumstances.

MANDATORY EMAIL FORMAT - Follow this EXACT structure:

ONLY RETURN THE EMAIL BODY - DO NOT include subject line or "Subject:" in your response.

Hi [Client Name],

I hope this message finds you well.

[Introductory sentence to set the tone and provide context.]

[Main paragraph: State the purpose clearly in 2-3 sentences. Then add a blank line.]

[Personalization Block 1: Create a separate paragraph for the first focus area. Limit to 2-3 sentences. End with a blank line.]

[Personalization Block 2: Create another separate paragraph for the second focus area. Limit to 2-3 sentences. End with a blank line.]

[Continue for each selected focus area...]

[Closing paragraph: End with a question or call to action in 1-2 sentences.]

CRITICAL PARAGRAPH STRUCTURE:
- Each paragraph must be separated by a blank line
- Use actual line breaks between paragraphs - do not write everything as one continuous sentence
- After every 2-3 sentences, insert a blank line to start a new paragraph
- Each focus area gets its own paragraph with proper spacing

FORMATTING RULES:
- ALWAYS start with "Hi [Client Name]," - use the exact client name from context after "Hi"
- CRITICAL: Each paragraph must be separated by actual blank lines (use \n\n between paragraphs)
- Write each paragraph on its own with proper line breaks - do NOT run sentences together
- Limit each paragraph to 2-3 sentences maximum for better readability
- After every 2-3 sentences, you MUST add a blank line and start a new paragraph
- ABSOLUTELY NO markdown formatting (**, *, _text_, etc.) - use ONLY plain text
- Do NOT use asterisks, underscores, or any special formatting characters
- Do NOT end with "Best regards" or formal closings - end with a simple question or statement
- Use proper line spacing between all sections
- Do NOT include subject line in your response - email body only
- NEVER include URLs, links, source citations, or references in parentheses like ((https://...))
- Do NOT include any web addresses, citations, or source attributions
- Keep all content clean and professional without external references

Writing constraints:
- Use only CLIENT_CONTEXT; do not invent facts or commitments.
- Create one personalization block per selected focus area
- If key details are missing, use square-bracket placeholders like [time] or [address].
- Maintain a professional, warm tone throughout.
- NEVER include URLs, source links, citations, or web references in any format
- Keep content clean and professional without external source attributions

Grounding:
- Prefer STRUCTURED_NOTES (normalized items) and then fields from SHEET_ROW when present. If a field is unknown, omit it.
- If a do-not-contact flag is true, do not draft outreach; instead, return a short internal checklist.`
  const clientContext = clientId ? { client, lastNotes: [], sheetRow, structured_notes: structuredNotes } : { client: null, lastNotes: [], sheetRow: null, structured_notes: [] }

    const selectedFocusAreas = focusAreas || []
    const clientName = client?.name || sheetRow?.name || '[Client Name]'
    
    const prompt = `CLIENT_CONTEXT:\n${JSON.stringify(clientContext, null, 2)}
    
Channel: ${channel}
Tone: ${tone || 'professional'}
Client Name: ${clientName}
Selected Focus Areas: ${selectedFocusAreas.join(', ')}

INSTRUCTIONS: 
${instruction ?? 'Draft a professional follow-up email using the exact template format with personalization blocks for each selected focus area.'}

CRITICAL: Return ONLY the email body starting with "Hi [Client Name],". Do NOT include subject line.
Create a separate paragraph for EACH focus area with proper blank lines between them.
Use ONLY plain text - no asterisks, underscores, or any formatting characters.
ENSURE proper paragraph structure with 2-3 sentences per paragraph followed by blank lines.
NEVER include URLs, links, source citations, or any external references - keep content clean and professional.
Do NOT end with "Best regards" or formal signatures - end naturally with a question or statement.`

  // Debug logging (remove in production)
  console.log('EMAIL GENERATION DEBUG:')
  console.log('Client ID:', clientId)
  console.log('Client Context:', JSON.stringify(clientContext, null, 2))
  console.log('Instruction:', instruction)

  // Call AI using provider selected via env keys
  const draft: string = await aiComplete(system, prompt, { temperature: 0.3 })

  // Optional persistence
  if (save && clientId) {
    try {
      const supabase = supabaseServer()
      const { data: msg, error } = await supabase.from('messages').insert({ client_id: clientId, agent_id: userId || 'agent', direction: 'out', channel, body: draft }).select('*').single()
      if (!error) {
        // also log to events if table exists
        try { await supabase.from('events').insert({ client_id: clientId, agent_id: userId || 'agent', type: 'message', ref_id: msg?.id, meta: { channel } }) } catch {}
      }
    } catch {}
  }

    const nextInfoNeeded = draft.includes('Next info needed:')
      ? draft.split('Next info needed:')[1]?.trim()
      : undefined

  return new Response(JSON.stringify({ draft, nextInfoNeeded }), { status: 200, headers: { 'Content-Type':'application/json' } })
  } catch (e: any) {
  return new Response(JSON.stringify({ error: 'Unexpected', details: e?.message }), { status: 500, headers: { 'Content-Type':'application/json' } })
  }
}

// keep named exports compatible with Next.js route handler API
export const GET = handleFollowupGET
export const POST = handleFollowupPOST
