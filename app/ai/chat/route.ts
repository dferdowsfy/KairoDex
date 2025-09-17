import { NextRequest } from 'next/server'
import { aiComplete } from '@/lib/ai'
import { inferPreferredMethod } from '@/lib/sheets'
import { supabaseServer } from '@/lib/supabaseServer'
import { getCityMarketSnapshot, looksLikeRealEstateAsk } from '@/lib/market'
import { getContextBundle } from '@/lib/websearch'

export const dynamic = 'force-dynamic'

export async function handleChatPOST(req: NextRequest) {
  try {
  const { clientId, message, intent } = await req.json()
    if (!message) {
      return new Response(JSON.stringify({ error: 'Missing message' }), { status: 400 })
    }
  let client: any = null
    let sheetRow: any = null
  let structuredNotes: any[] = []
    // Prefer Supabase AgentHub_DB as the source of truth
    if (clientId) {
      try {
        const supabase = supabaseServer()
        const { data, error } = await supabase
          .from('AgentHub_DB')
          .select('*')
          .eq('client_id', clientId)
          .maybeSingle()
        if (error) throw error
        if (data) {
          sheetRow = data
          const name = [data.name_first, data.name_last].filter(Boolean).join(' ').trim()
          client = {
            id: data.client_id || clientId,
            name: name || data.email || 'Client',
            email: data.email,
            phone: data.phone,
            stage: data.stage || 'new'
          }
        }
        // Fetch recent normalized items as structured context
        try {
          const { data: ni } = await supabase
            .from('normalized_items')
            .select('kind,title,date,status,party,tags,created_at')
            .eq('client_id', clientId)
            .order('date', { ascending: true })
            .order('created_at', { ascending: false })
            .limit(50)
          if (Array.isArray(ni)) structuredNotes = ni
        } catch {}
      } catch {}
    }
  // Try to infer an intent from free text if not provided
  const msg = String(message || '')
  const derivedIntent = (() => {
    const m = msg.toLowerCase()
    if (/next\s*steps?/.test(m)) return 'next_steps'
    if (/(follow\s?-?up|draft\s.*(email|sms|message))/.test(m)) return 'followup'
    if (/(conversation\s*starter|talking\s*points|what\s+should\s+i\s+(say|mention)|ice\s*breaker|openers?)/.test(m)) return 'conversation_starter'
    if (/(summary|summarize|status|overview)/.test(m)) return 'status'
    if (/(meeting\s*prep|agenda|prep\s*questions)/.test(m)) return 'meeting_prep'
    if (/(email|correspondence|last.*email|recent.*email|email.*history|what.*email|previous.*email)/.test(m)) return 'email_correspondence'
  if (/(market|real\s*estate|housing|home\s*prices?|inventory|days\s*on\s*market|mortgage|outlook|forecast|trend[s]?|future\b)/.test(m)) return 'market'
    return undefined
  })()

  // Fetch recent email correspondence if the user is asking about emails
  let emailHistory: any[] = []
  if (clientId && /email|correspondence|last.*email|recent.*email|email.*history/i.test(msg)) {
    try {
      const supabase = supabaseServer()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Get recent emails for this client
        const { data: emails } = await supabase
          .from('emails')
          .select('id, subject, body_md, status, sent_at, created_at, to_emails')
          .eq('client_id', clientId)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
        
        // Also check scheduled emails
        const { data: scheduledEmails } = await supabase
          .from('email_schedules')
          .select('id, email_subject, email_content, status, sent_at, created_at, recipient_email')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(5)

        emailHistory = [
          ...(emails || []).map(email => ({
            subject: email.subject,
            status: email.status,
            sent_at: email.sent_at,
            created_at: email.created_at,
            preview: email.body_md?.substring(0, 150) + '...',
            type: 'direct_email'
          })),
          ...(scheduledEmails || []).map(email => ({
            subject: email.email_subject,
            status: email.status,
            sent_at: email.sent_at,
            created_at: email.created_at,
            preview: email.email_content?.substring(0, 150) + '...',
            type: 'scheduled_email'
          }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
         .slice(0, 5)
      }
    } catch (e) {
      console.error('Failed to fetch email history:', e)
    }
  }
  
  // Try to gather market snapshot if the user asks market-related questions and we have a location.
  const locationFromRow = (() => {
    const out: { city?: string; state?: string; zip?: string } = {}
    try {
      const s: any = sheetRow || {}
      const keys = Object.keys(s)
      for (const k of keys) {
        const kn = k.toLowerCase().replace(/\s+/g, '_')
        const val = String(s[k] ?? '').trim()
        if (!out.city && /(city|town)/.test(kn)) out.city = val
        if (!out.state && /(^|_)state(_|$)|province/.test(kn)) out.state = val
        if (!out.zip && /(zip|postal)/.test(kn)) out.zip = val
        if ((!out.city || !out.state) && /location|address/.test(kn)) {
          const m = val.match(/([A-Za-z\s]+),\s*([A-Za-z]{2})(?:\s+(\d{5}))?/)
          if (m) { out.city ||= m[1]?.trim(); out.state ||= m[2]?.trim(); out.zip ||= m[3]?.trim() }
        }
      }
    } catch {}
    return out
  })()

  let marketContext: any = null
  if ((looksLikeRealEstateAsk(msg) || derivedIntent === 'market') && (locationFromRow.city || locationFromRow.zip)) {
    try {
      const snap = await getCityMarketSnapshot(locationFromRow.city, locationFromRow.state, locationFromRow.zip)
      if (snap) marketContext = snap
    } catch {}
  }
  const contextBundle = await getContextBundle(msg, sheetRow).catch(()=>null)
  if (!marketContext && contextBundle?.market) {
    marketContext = contextBundle.market
  }

  const system = `You are Kairodex’s assistant.

Core context & truthfulness
- Use only the provided CLIENT_CONTEXT. Do not invent facts or statuses.
- If DB_ROW is present, prefer its values. If a field is missing, say you don't know.
- Do NOT label a client as "do not contact" (or DNC) unless an explicit field in sheetRow says so.

If STRUCTURED_NOTES are provided, prefer them for next steps, deadlines, contacts, and concrete details. Summarize from these items rather than guessing from free text.
Keep answers concise by default: 5–8 short sentences max unless the user asks for more.

If EMAIL_HISTORY is provided and the user asks about email correspondence, last emails, or email history:
- Reference the actual email history provided in the context
- Include subject lines, dates, and status information
- Show the most recent emails first
- Distinguish between sent emails and scheduled emails

If MARKET_CONTEXT is provided OR the user asks about the real estate market, set USE_CASE to market and use it to answer.
- Keep claims grounded in MARKET_CONTEXT; do not extrapolate beyond it.
- End market answers with a short 'Sources:' line listing provided URLs when present.

Use case detection and guardrails
- First, infer USE_CASE from the user's request and CLIENT_CONTEXT. Choose one: followup, status, conversation_starter, meeting_prep, contract_amendment, market, email_correspondence, other.
- Based on USE_CASE, determine GUARDRAILS to apply in your response. Always include universal guardrails and any use-case-specific ones:
  Universal guardrails:
    • Respect explicit DNC/opt-out flags: if true, do not propose or draft outreach; provide INTERNAL guidance only.
    • Minimize PII; do not reveal or transmit sensitive info beyond what the user provided; treat emails/phones as sensitive.
    • No legal/financial advice; offer general guidance and suggest consulting a professional for legal topics.
  Use-case guardrails:
    • followup: use preferred contact method if present; if none, default to email; be brief/professional; avoid commitments not present in data.
    • status: summarize only from DB row; clearly note unknowns.
    • conversation_starter: low-pressure, 3–5 bullets; if DNC, provide INTERNAL meeting talking points only.
    • meeting_prep: provide short checklist, agenda, and 3–5 questions; avoid promises.
    • contract_amendment: avoid legal advice; outline steps, risks to confirm with a professional.
    • email_correspondence: reference EMAIL_HISTORY data only; show chronological order; include subject, date, status; do not invent email content.

Clarifying questions first when needed
- If the request is ambiguous or missing critical details for the detected USE_CASE, ask 1–3 concise clarifying questions FIRST and wait for answers. Do not produce the final output yet if key details are missing.
- If sufficient info exists, skip questions and produce the output directly.

Outreach policy
- Only block proactive outreach when the DB row explicitly marks the client as do-not-contact (e.g., do_not_contact, DNC, opt_out, unsubscribe is true/yes).
- If do-not-contact is true, still provide helpful INTERNAL guidance: meeting talking points, status summaries, and checklists for already-scheduled interactions. Do NOT draft outreach messages.
- When drafting a follow-up, use the client's preferred contact method if present (e.g., sms/text, email, phone). If not present, default to email. Keep it brief and professional.
- Assume outreach is allowed if there is no explicit DNC/opt-out flag. Never infer do-not-contact from hints or absence of data.
- If the user asks for a follow-up and no DNC flag exists, output the follow-up message directly without warnings or caveats.

Response shape
- If asking questions: start with a single sentence identifying the inferred USE_CASE, then a short list (1–3) of clarifying questions. Stop there.
- If producing the result: begin with a one-line USE_CASE label (e.g., "Use case: followup"), then apply guardrails and provide the content. Keep it concise and action-oriented.`
  const user = `CLIENT_CONTEXT (from Supabase AgentHub_DB):\n${JSON.stringify({ client, dbRow: sheetRow, structured_notes: structuredNotes, email_history: emailHistory, intent: intent || derivedIntent, dnc_explicit: !!sheetRow && (()=>{ try { const s:any = sheetRow; const keys = Object.keys(s||{}); const allowed=['do_not_contact','dnc','opt_out','optout','unsubscribe','do-not-contact']; for (const k of keys){ const kn=k.toLowerCase().replace(/\s+/g,'_'); if (allowed.includes(kn)){ const v=s[k]; if (typeof v==='string'){ if (/^(true|yes|y|1)$/i.test(v.trim())) return true } if (!!v) return true } } } catch{} return false })(), MARKET_CONTEXT: marketContext, CONTEXT_BUNDLE: contextBundle }, null, 2)}\n\nUSER:\n${message}`

    // First pass: general completion
  let response = await aiComplete(system, user, { temperature: 0.3 })
    // If intent is 'next steps', structure a clear answer from sheetRow
    if (intent === 'next_steps' || /next steps?/i.test(message)) {
      let nextAction = ''
      let dueDate = ''
      if (sheetRow) {
        // Try common column names
        const keys = Object.keys(sheetRow)
        for (const k of keys) {
          const kn = k.trim().toLowerCase()
          if (!nextAction && /next[_ ]?action|next[_ ]?step|next[_ ]?steps?/i.test(kn)) {
            nextAction = String(sheetRow[k] ?? '').trim()
          }
          if (!dueDate && (kn.includes('next_action_due') || /(due[_ ]?date|next[_ ]?due|action[_ ]?date)/i.test(kn))) {
            dueDate = String(sheetRow[k] ?? '').trim()
          }
        }
      }
      if (nextAction) {
        response = `The next step for${client?.name ? ` ${client.name}` : ' this client'} is: ${nextAction}${dueDate ? ` (due by ${dueDate})` : ''}.`
      } else {
        response = `I don’t see a specific next step for${client?.name ? ` ${client.name}` : ' this client'} in the database. Please check with your team or review the client’s details.`
      }
    }
    // Safety net and branching for DNC-aware content
    const lower = response.toLowerCase()
    const rowStr = JSON.stringify(sheetRow || {})
    const truthy = (v: any) => typeof v === 'string' ? /^(true|yes|y|1)$/i.test(v.trim()) : !!v
    const rowHasDnc = (() => {
      try {
        const obj = sheetRow || {}
        const keys = Object.keys(obj as any)
        const envKeys = (process.env.SHEET_DNC_KEYS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
        const allowed = envKeys.length ? envKeys : ['do_not_contact','dnc','opt_out','optout','unsubscribe','do-not-contact']
        for (const k of keys) {
          const kn = k.toLowerCase().replace(/\s+/g, '_')
          if (allowed.includes(kn)) {
            const v = (obj as any)[k]
            if (truthy(v)) return true
            const val = String(v ?? '').toLowerCase()
            if (/(^|\b)(true|yes|y|1|dnc|do\s*not\s*contact|opt\s*out|unsubscribe)(\b|$)/i.test(val)) return true
          }
        }
      } catch {}
      return false
    })()

    // If user asked for conversation starters, craft them explicitly with DNC-aware rules
    const wantStarters = (intent === 'conversation_starter') || (derivedIntent === 'conversation_starter')
    if (wantStarters) {
  const starterSystem = `You create concise, non-pushy conversation starters tailored to the client's context.
Constraints:
- If do-not-contact is true, only provide INTERNAL talking points suitable for an already scheduled meeting. Do NOT suggest sending messages.
- Keep each starter <= 1–2 sentences. Provide 3–5 bullets.
- Prefer STRUCTURED_NOTES when present for concrete details; otherwise prefer DB row. Do not invent.`
  const starterUser = `DNC: ${rowHasDnc}\nCLIENT_CONTEXT:\n${JSON.stringify({ client, dbRow: sheetRow, structured_notes: structuredNotes }, null, 2)}\n\nTASK: Generate ${rowHasDnc ? 'internal meeting talking points' : 'soft conversation starters'} in a friendly, low-pressure tone.`
  try { response = await aiComplete(starterSystem, starterUser, { temperature: 0.3 }) } catch {}
    }

    // If model says not to send follow-up without a DNC flag, rewrite to proceed via preferred method
  const refusalPattern = /no\s+(?:further\s+)?follow[- ]?up\s+should\s+be\s+sent|should\s+not\s+be\s+sent|do\s+not\s+send\s+(?:a\s+)?follow[- ]?up|no\s+outreach\s+should\s+be\s+made|should\s+not\s+contact|avoid\s+contacting|refrain\s+from\s+contacting|cannot\s+contact|contact\s+is\s+not\s+permitted|will\s+not\s+be\s+sent|should\s+not\s+be\s+made/i
    if (!rowHasDnc) {
      if (/(do\s*not\s*contact|\bDNC\b)/i.test(response)) {
        // Remove any sentence that claims DNC when not present in the sheet
        response = response
          .replace(/[^.!?]*do\s*not\s*contact[^.!?]*[.!?]/ig, '')
          .replace(/[^.!?]*\bDNC\b[^.!?]*[.!?]/ig, '')
          .trim()
      }
      if (refusalPattern.test(response)) {
        // Remove or neutralize refusal phrases
        response = response
          .replace(/[^.!?]*\b(no\s+outreach\s+should\s+be\s+made|should\s+not\s+contact|avoid\s+contacting|refrain\s+from\s+contacting|cannot\s+contact|contact\s+is\s+not\s+permitted|will\s+not\s+be\s+sent|should\s+not\s+be\s+made)[^.!?]*[.!?]/ig, '')
          .replace(refusalPattern, 'proceed with a brief, polite follow-up using the preferred contact method')
          .trim()
      }
      // If the intent was followup and content still looks like a refusal, provide a minimal template
      if ((intent === 'followup') && /\b(should\s+not\s+send|cannot\s+draft|unable\s+to\s+provide|refuse|no\s+outreach|should\s+not\s+contact)/i.test(response)) {
  const method = inferPreferredMethod(sheetRow)
  response = `Subject: Quick follow-up\n\nHi${(client && client.name) ? ` ${client.name.split(' ')[0]}` : ''},\n\nJust checking in to see if you had any questions or wanted to take the next step. I’m happy to help.\n\nBest,\nKairodex\n\n(${method})`
      }
      // If after scrubbing we ended up with very little content on a follow-up ask, generate a minimal follow-up
      if ((intent === 'followup') && (!response || response.replace(/\s+/g,' ').trim().length < 40)) {
  const method = inferPreferredMethod(sheetRow)
  response = `Subject: Quick follow-up\n\nHi${(client && client.name) ? ` ${client.name.split(' ')[0]}` : ''},\n\nJust checking in to see if you had any questions or wanted to take the next step. I’m happy to help.\n\nBest,\nKairodex\n\n(${method})`
      }
    } else {
      // If DNC true and the model refused, try to provide INTERNAL guidance instead of a hard refusal
      if (/\b(i'm\s+sorry|i\s+can['’]t\s+draft|cannot\s+draft|unable\s+to\s+provide)/i.test(response) && (derivedIntent || intent)) {
        const safeSystem = `Provide INTERNAL guidance only for a client marked do-not-contact: summaries, checklists, meeting talking points. Do not recommend sending messages.`
        const safeUser = `CLIENT_CONTEXT:\n${JSON.stringify({ client, dbRow: sheetRow, request: message }, null, 2)}\n\nTASK: Provide 3-5 internal talking points or a short checklist appropriate to the request.`
        try { response = await aiComplete(safeSystem, safeUser) } catch {}
      }
    }
    return new Response(JSON.stringify({ reply: response, sheetRow: !!sheetRow }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Chat failed' }), { status: 500 })
  }
}

// Keep named export compatible with Next.js route invocation
export const POST = handleChatPOST
