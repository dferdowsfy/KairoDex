import { NoteItem } from './types'
import { aiComplete } from './ai'

// Deterministic regex/keyword rules
const dateLike = /\b(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\b/i
const regexRules = [
  { kind: 'deadline', label: 'ratified', regex: /ratified\s*(on)?\s*([a-z0-9 ,\/-]+)/i },
  { kind: 'deadline', label: 'closing', regex: /closing\s*(on|by)?\s*([a-z0-9 ,\/-]+)/i },
  { kind: 'deadline', label: 'inspection', regex: /(inspection)\s*(within|by|on)?\s*([a-z0-9 ,\/-]+)/i },
  { kind: 'deadline', label: 'appraisal', regex: /(appraisal)\s*(by|on|after)?\s*([a-z0-9 ,\/-]+)/i },
  { kind: 'deadline', label: 'emd', regex: /(EMD)\s*(due|by|in)\s*([a-z0-9 ,\/-]+)/i },
  { kind: 'next_step', label: 'schedule inspection', regex: /schedule\s+(a\s+)?home\s*inspection|schedule\s*inspection/i },
  { kind: 'next_step', label: 'send contract', regex: /send\s+ratified\s+contract\s+to\s+(lender|title|listing agent)/i },
  { kind: 'next_step', label: 'order appraisal', regex: /order\s+appraisal/i },
  { kind: 'next_step', label: 'confirm EMD', regex: /confirm\s+EMD\s+wire/i },
  { kind: 'contact', label: 'contact', regex: /(lender|title|closer|listing agent|coordinator|inspector)\s*\(?([A-Za-z .'-]+)?\)?/i },
  { kind: 'document', label: 'document', regex: /(ratified contract|jurisdictional addendum|disclosures)/i },
  { kind: 'risk', label: 'risk', regex: /(seller delays|HOA approval risk)/i },
]

export async function parseNotes(text: string, client_id: string, user_id: string): Promise<NoteItem[]> {
  const items: NoteItem[] = []
  const now = new Date()
  const addDays = (d: number) => {
    const dt = new Date(now)
    dt.setDate(dt.getDate() + d)
    return dt.toISOString()
  }
  const push = (it: Partial<NoteItem>) => {
    items.push({
      id: '', client_id, user_id,
      kind: it.kind as NoteItem['kind'],
      title: it.title || 'Note',
      body: it.body,
      party: it.party as any,
      status: it.status as any,
      date: it.date,
      amount: it.amount,
      tags: it.tags,
      source: it.source || 'user_note',
      extra: it.extra,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  const lower = text.toLowerCase()

  // Ratified date
  const rat = text.match(/ratified\s*(?:on\s*)?([a-z0-9 ,\/\-]+)/i)
  if (rat) {
    const dtStr = (rat[1] || '').match(dateLike)?.[1]
    const dt = dtStr ? new Date(dtStr) : undefined
    push({ kind:'deadline', title: 'Ratified', date: dt && !isNaN(dt.getTime()) ? dt.toISOString(): undefined })
  }

  // EMD due in N (business )?days
  const emdDue = text.match(/EMD\s*(?:due|in|due in)\s*(?:in\s*)?(\d+)\s*(business\s+)?days(?:[^\.]*)/i)
  if (emdDue) {
    const days = parseInt(emdDue[1] || '0', 10)
    const date = days>0 ? addDays(days) : undefined
    push({ kind:'deadline', title: 'EMD due', date })
    push({ kind:'emd', title: 'Earnest Money Deposit', date })
  }

  // Inspection within N days
  const inspWin = text.match(/inspection\s*(?:within|in)\s*(\d+)\s*days/i)
  if (inspWin) {
    const days = parseInt(inspWin[1] || '0', 10)
    const date = days>0 ? addDays(days) : undefined
    push({ kind:'deadline', title: 'Inspection window', date })
    push({ kind:'inspection', title: 'Home inspection', date })
  }

  // Closing date
  const close = text.match(/closing\s*(?:on|by)?\s*([a-z0-9 ,\/\-]+)/i)
  if (close) {
    const dtStr = (close[1] || '').match(dateLike)?.[1]
    const dt = dtStr ? new Date(dtStr) : undefined
    push({ kind:'deadline', title: 'Closing', date: dt && !isNaN(dt.getTime()) ? dt.toISOString(): undefined })
  }

  // Next steps
  if (/schedule\s+(?:a\s+)?home\s*inspection|schedule\s*inspection/i.test(text)) {
    push({ kind:'next_step', title: 'Schedule inspection', status: 'todo' })
  }
  if (/order\s+appraisal/i.test(text)) {
    push({ kind:'next_step', title: 'Order appraisal', status: 'todo' })
    push({ kind:'appraisal', title: 'Appraisal' })
  }
  if (/send\s+ratified\s+contract\s+to\s+(lender|title|listing agent)/i.test(text)) {
    // Create step plus contacts if names provided
    const targets: Array<{role: NoteItem['party']; name?: string}> = []
    const roleNameRegex = /(lender|title|listing agent|coordinator|inspector)\s*\(([^)]+)\)/gi
    let m: RegExpExecArray | null
    while ((m = roleNameRegex.exec(text))) {
      const role = m[1].toLowerCase().replace(' ', '_') as any
      const name = m[2].trim()
      const party: NoteItem['party'] = role==='listing_agent'? 'listing_agent': (role as any)
      targets.push({ role: party, name })
    }
    if (!targets.length) push({ kind:'next_step', title: 'Send ratified contract', status: 'todo' })
    else {
      for (const t of targets) {
        push({ kind:'next_step', title: `Send ratified contract to ${t.name}`, status: 'todo', party: t.role })
        push({ kind:'contact', title: t.name || (t.role as string), party: t.role })
      }
    }
  }

  // Contacts standalone
  const contactOnly = /(lender|title|listing agent|coordinator|inspector)\s*\(([^)]+)\)/gi
  let c: RegExpExecArray | null
  while ((c = contactOnly.exec(text))) {
    const role = c[1].toLowerCase().replace(' ', '_')
    const party: NoteItem['party'] = role==='listing_agent'? 'listing_agent': (role as any)
    const name = c[2].trim()
    if (!items.find(x=> x.kind==='contact' && x.title===name)) push({ kind:'contact', title: name, party })
  }

  // Fallback to LLM if not enough items
  if (items.length < 2) {
    try {
      const system = 'You convert buyer-agent notes into a strict JSON array of NoteItem objects. Keep outputs concise and de-duplicated. Only include fields defined in the schema. Do not invent facts, dates, or amounts. If unknown, omit the field. Return JSON only — no markdown, no comments.'
      const prompt = `Type NoteItem: { id: string; client_id: string; user_id: string; kind: "next_step"|"deadline"|"contact"|"property"|"financing"|"inspection"|"appraisal"|"emd"|"document"|"risk"|"general_note"; title: string; body?: string; party?: "buyer"|"listing_agent"|"lender"|"title"|"coordinator"|"inspector"|"appraiser"|"client"|"other"; status?: "todo"|"scheduled"|"done"|"blocked"; date?: ISO8601; amount?: number; tags?: string[]; source: "user_note"|"scraper"|"import"|"ai_parse"; extra?: Record<string, any>; created_at: ISO8601; updated_at: ISO8601 }

Constraints:
- Output at most 7 items; prefer 3–5. Merge obvious duplicates.
- title should be short (<= 80 chars). If you include body, keep it under 140 chars.
- Only include date if it is explicit in the notes or clearly computable from explicit durations.
- Use kind accurately; prefer next_step for actionable items, deadline for due dates.
- Set source to "ai_parse" when you infer structure from free text.
- id may be empty string; client_id and user_id will be filled by the system.

Return ONLY the JSON array. Notes text:\n${text}`
      const out = await aiComplete(system, prompt, { model: process.env.OPENAI_TEXT_MODEL || process.env.AI_MODEL || 'gpt-4o-mini', temperature: 0.2 })
      const jsonStart = out.indexOf('[')
      const jsonEnd = out.lastIndexOf(']')
      const parsed = JSON.parse(out.slice(jsonStart, jsonEnd + 1))
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          ...item,
          client_id,
          user_id,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
          source: item.source || 'ai_parse',
        }))
      }
    } catch (e) {
      // fallback: store as general_note
      return [{
        id: '',
        client_id,
        user_id,
        kind: 'general_note',
        title: 'Unparsed Note',
        body: text,
        source: 'user_note',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]
    }
  }

  return items;
}
