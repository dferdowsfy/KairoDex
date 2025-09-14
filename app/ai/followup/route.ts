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

Dear [Client Name],

I hope this message finds you well.

[Introductory sentence to set the tone.]

[Main paragraph: Clearly state the purpose of the email. Keep it concise and professional.]

[Personalization Block(s): For EACH selected focus area, create a separate short paragraph (1-2 sentences). 
Each block should be its own paragraph with blank lines before and after. 
Examples based on focus areas:
- Deadlines: "I wanted to remind you of our upcoming inspection scheduled for [date]."
- Next Steps: "Your next step is to review the property disclosure documents I'll send over."
- Appreciation: "I truly appreciate the trust you've placed in me during this important process."
- Market Update: "The current market shows strong buyer activity in your price range."
- Property Fit: "Based on your preference for move-in ready homes, I've identified several prospects."
- Financing: "Please confirm your pre-approval status with your lender by [date]."
- Call to Reply: "Could you let me know your availability for a quick call this week?"
- Availability: "I'm available for a brief discussion tomorrow at 2pm or Friday at 10am."
- Milestones: "Congratulations on completing the home inspection - we're making great progress."]

[Closing paragraph: Summarize next steps, expectations, or questions.]

Thank you for your time and attention. I look forward to your reply.

Best regards,
[Sender Name]

FORMATTING RULES:
- Use actual client name from context after "Dear"
- Each personalization block is a separate paragraph with blank lines
- ABSOLUTELY NO markdown formatting (**, *, _text_, etc.) - use ONLY plain text
- Do NOT use asterisks, underscores, or any special formatting characters
- If you want to emphasize something, use natural language instead of formatting
- Use proper line spacing between all sections
- Keep each paragraph to 1-2 sentences maximum
- Use sender's actual name in signature
- Do NOT include subject line in your response - email body only

Writing constraints:
- Use only CLIENT_CONTEXT; do not invent facts or commitments.
- Create one personalization block per selected focus area
- If key details are missing, use square-bracket placeholders like [time] or [address].
- Maintain a professional, warm tone throughout.

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

CRITICAL: Return ONLY the email body starting with "Dear [Name]". Do NOT include subject line.
Create a separate personalization paragraph for EACH focus area listed above. 
Use ONLY plain text - no asterisks, underscores, or any formatting characters.`

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
