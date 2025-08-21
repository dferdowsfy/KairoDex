// Minimal Google Sheets integration via public CSV export
// Configure with either GOOGLE_SHEETS_PUBLIC_CSV_URL or GOOGLE_SHEETS_ID (+ optional GOOGLE_SHEETS_GID)


export interface SheetRow {
  [key: string]: string | number | boolean | null
}

function getCsvUrl() {
  const direct = process.env.GOOGLE_SHEETS_PUBLIC_CSV_URL
  if (direct) return direct
  // Support both GOOGLE_SHEETS_ID and legacy GOOGLE_SHEETS_SHEET_ID
  const id = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_SHEET_ID || process.env.GOOGLE_SHEET_ID
  if (!id) return null
  const gid = process.env.GOOGLE_SHEETS_GID ?? process.env.GOOGLE_SHEET_GID ?? '0'
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
}

// Tiny CSV parser that handles quoted fields and commas
function parseCsv(csv: string): string[][] {
  const rows: string[][] = []
  let i = 0
  let field = ''
  let row: string[] = []
  let inQuotes = false
  while (i < csv.length) {
    const c = csv[i]
    if (inQuotes) {
      if (c === '"') {
        if (csv[i + 1] === '"') { field += '"'; i += 2; continue } // escaped quote
        inQuotes = false; i++; continue
      } else { field += c; i++; continue }
    } else {
      if (c === '"') { inQuotes = true; i++; continue }
      if (c === ',') { row.push(field); field = ''; i++; continue }
      if (c === '\n' || c === '\r') {
        // normalize newlines; finish row only on \n
        if (c === '\r' && csv[i + 1] === '\n') { i += 2 } else { i++ }
        row.push(field); field = ''
        rows.push(row); row = []
        continue
      }
      field += c; i++
    }
  }
  // last field
  row.push(field)
  rows.push(row)
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim() !== ''))
}

export async function fetchSheetRows(): Promise<SheetRow[]> {
  const url = getCsvUrl()
  if (!url) throw new Error('Missing GOOGLE_SHEETS_PUBLIC_CSV_URL or GOOGLE_SHEETS_ID env')
  const resp = await fetch(url, { cache: 'no-store' })
  if (!resp.ok) throw new Error(`Failed to fetch sheet CSV: ${resp.status} ${resp.statusText}`)
  const text = await resp.text()
  const grid = parseCsv(text)
  if (grid.length === 0) return []
  const header = grid[0].map(h => h.trim())
  return grid.slice(1).map(cells => {
    const obj: SheetRow = {}
    header.forEach((key, idx) => {
      obj[key] = (cells[idx] ?? '').trim()
    })
    return obj
  })
}

// Returns the header and the remaining rows as raw arrays for index-based access
export async function fetchSheetGrid(): Promise<{ header: string[]; rows: string[][] }> {
  const url = getCsvUrl()
  if (!url) throw new Error('Missing GOOGLE_SHEETS_PUBLIC_CSV_URL or GOOGLE_SHEETS_ID env')
  const resp = await fetch(url, { cache: 'no-store' })
  if (!resp.ok) throw new Error(`Failed to fetch sheet CSV: ${resp.status} ${resp.statusText}`)
  const text = await resp.text()
  const grid = parseCsv(text)
  if (grid.length === 0) return { header: [], rows: [] }
  const header = grid[0].map(h => h.trim())
  const rows = grid.slice(1).map(r => r.map(c => (c ?? '').trim()))
  return { header, rows }
}

// Attempt to locate the sheet row for a given client id by matching id/email/name
export async function findSheetRowForClientId(clientId: string): Promise<SheetRow | null> {
  const rows = await fetchSheetRows()
  const norm = (s?: string | null) => (s ?? '').toString().trim().toLowerCase()
  for (const r of rows) {
  if (norm(r['id'] as any) === norm(clientId)) return r
  if (norm(r['client_id'] as any) === norm(clientId)) return r
  }
  return null
}

export async function findSheetRowByHints(hints: { id?: string; email?: string; name?: string }): Promise<SheetRow | null> {
  const rows = await fetchSheetRows()
  const norm = (s?: string | null) => (s ?? '').toString().trim().toLowerCase()
  const id = hints.id && norm(hints.id)
  const email = hints.email && norm(hints.email)
  const name = hints.name && norm(hints.name)

  for (const r of rows) {
    if (id && (norm(r['id'] as any) === id || norm(r['client_id'] as any) === id)) return r
  }
  if (email) {
    for (const r of rows) if (norm(r['email'] as any) === email) return r
  }
  if (name) {
    for (const r of rows) {
      const composed = [r['name_first'], r['name_last']].filter(Boolean).join(' ')
      if (norm(composed) === name || norm(r['name'] as any) === name) return r
    }
  }
  return null
}

// Normalize common column names to get a client's preferred contact method value, if present.
export function getPreferredContactMethod(row: SheetRow | null | undefined): string {
  if (!row) return ''
  const candidates = [
    'preferred_contact_method', 'preferred contact method', 'preferred_contact', 'preferred contact',
    'preferred_communication', 'preferred communication',
    'preferred_channel', 'preferred channel',
    'contact_preference', 'contact preference',
    'communication_preference', 'communication preference',
    'preferred_method', 'preferred method'
  ]
  const keys = Object.keys(row as any)
  for (const k of keys) {
    const kn = k.trim().toLowerCase()
    if (candidates.includes(kn)) {
      const val = String((row as any)[k] ?? '').trim()
      if (val) return val
    }
  }
  return ''
}

// Collapse the preferred contact value into one of: 'SMS' | 'phone' | 'email'
export function inferPreferredMethod(row: SheetRow | null | undefined): 'SMS' | 'phone' | 'email' {
  const raw = getPreferredContactMethod(row).toLowerCase()
  if (/(sms|text|txt)/i.test(raw)) return 'SMS'
  if (/(phone|call|voice)/i.test(raw)) return 'phone'
  // default
  return 'email'
}

// Map a sheet row to our client shape (best-effort). Unrecognized fields are kept as metadata.
export function sheetRowToClient(row: SheetRow) {
  const parseNum = (v: any) => {
    const n = Number((v ?? '').toString().replace(/[$,]/g, ''))
    return Number.isFinite(n) ? n : undefined
  }
  const stageRaw = (row['stage'] as string)?.toLowerCase().replace(/\s+/g, '_')
  const stageMap: Record<string, string> = {
    'prospect': 'new',
    'new': 'new',
    'nurture': 'nurture',
    'active_buyer': 'touring',
    'touring': 'touring',
    'offer': 'offer',
    'under_contract': 'under_contract',
    'closed': 'closed',
    'lost': 'lost'
  }
  const normalizedStage = (stageMap[stageRaw || ''] || 'new') as any
  const zipList = (row['zip_codes'] as string)?.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)
  const name = [row['name_first'], row['name_last']].filter(Boolean).join(' ').trim() || (row['name'] as string) || ''
  const client = {
    id: (row['client_id'] as string) || (row['id'] as string) || undefined,
    name,
    email: (row['email'] as string) || undefined,
    phone: (row['phone'] as string) || undefined,
    stage: normalizedStage,
    preferences: {
      budget_min: parseNum(row['budget_min']),
      budget_max: parseNum(row['budget_max']),
      locations: zipList,
      must: undefined,
      nice: undefined
    }
  }
  return client
}
