import { NextRequest } from 'next/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

function getJwt() {
  const saJSON = process.env.GOOGLE_SERVICE_ACCOUNT
  let clientEmail: string | undefined
  let privateKey: string | undefined
  if (saJSON) {
    const parsed = JSON.parse(saJSON)
    clientEmail = parsed.client_email
    privateKey = parsed.private_key
  } else {
    clientEmail = process.env.GOOGLE_CLIENT_EMAIL
    privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  }
  if (!clientEmail || !privateKey) throw new Error('Missing Google service account credentials')
  return new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] } as any)
}

async function getSheetTitle(sheets: any, sheetId: string, gid?: string | number) {
  const { data: meta } = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const sheet = meta.sheets?.find((s: any) => String(s.properties?.sheetId) === String(gid)) || meta.sheets?.[0]
  const title = sheet?.properties?.title
  if (!title) throw new Error('Sheet tab not found')
  return title
}

// POST: create a task; GET: list tasks; PATCH: update (complete/snooze)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId') || undefined
    const sheetId = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_SHEET_ID || process.env.GOOGLE_SHEET_ID
    const gid = process.env.GOOGLE_SHEETS_GID ?? process.env.GOOGLE_SHEET_GID ?? '0'
    if (!sheetId) return new Response(JSON.stringify({ error: 'GOOGLE_SHEETS_ID not configured' }), { status: 500 })

    const auth = getJwt()
    const sheets = google.sheets({ version: 'v4', auth })
    const title = await getSheetTitle(sheets, sheetId, gid)

    // Read columns: we assume AF holds tasks JSON string; A:AF for header check
    const read = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${title}!A:AF` })
    const rows = read.data.values || []
    if (rows.length === 0) return new Response(JSON.stringify({ items: [] }), { status: 200 })
    const header = rows[0].map((h: any) => (h || '').toString().trim().toLowerCase())
    const idIdx = header.indexOf('id')
    const clientIdIdx = header.indexOf('client_id')
    const afIdx = 32 - 1 // Column AF is 32nd letter, zero-based index 31

    const items: any[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      const idVal = (r[idIdx] || '').toString().trim()
      const cIdVal = (r[clientIdIdx] || '').toString().trim()
      if (!clientId || idVal === clientId || cIdVal === clientId) {
        const json = (r[afIdx] || '').toString().trim()
        if (json) {
          try { items.push(...JSON.parse(json)) } catch { /* ignore malformed */ }
        }
      }
    }
    return new Response(JSON.stringify({ items }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to list tasks' }), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { client_id, title, due_at, status = 'open' } = body || {}
    if (!title) return new Response(JSON.stringify({ error: 'Missing title' }), { status: 400 })

    const sheetId = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_SHEET_ID || process.env.GOOGLE_SHEET_ID
    const gid = process.env.GOOGLE_SHEETS_GID ?? process.env.GOOGLE_SHEET_GID ?? '0'
    if (!sheetId) return new Response(JSON.stringify({ error: 'GOOGLE_SHEETS_ID not configured' }), { status: 500 })

    const auth = getJwt()
    const sheets = google.sheets({ version: 'v4', auth })
    const titleName = await getSheetTitle(sheets, sheetId, gid)

    // Read rows to locate the row to write tasks to (match by id or client_id)
    const read = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${titleName}!A:AF` })
    const rows = read.data.values || []
    if (rows.length === 0) throw new Error('Sheet has no rows')
    const header = rows[0].map((h: any) => (h || '').toString().trim().toLowerCase())
    const idIdx = header.indexOf('id')
    const clientIdIdx = header.indexOf('client_id')
    const afIdx = 32 - 1 // Column AF index 31

    let targetRow = -1
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      const idVal = (r[idIdx] || '').toString().trim()
      const cIdVal = (r[clientIdIdx] || '').toString().trim()
      if ((client_id && (idVal === client_id || cIdVal === client_id)) || (!client_id && i === 1)) { targetRow = i; break }
    }
    if (targetRow === -1) throw new Error('Client row not found to save task')

    const existing = rows[targetRow]?.[afIdx] || ''
    let list: any[] = []
    if (existing) {
      try { list = JSON.parse(existing) } catch { list = [] }
    }
    const task = { id: crypto.randomUUID(), client_id, title, due_at, status, created_at: new Date().toISOString() }
    list.push(task)

    const range = `${titleName}!AF${targetRow + 1}`
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[JSON.stringify(list)]] }
    })

    return new Response(JSON.stringify({ item: task }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to create task' }), { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, client_id, status, snooze_minutes } = body || {}
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })

    const sheetId = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_SHEET_ID || process.env.GOOGLE_SHEET_ID
    const gid = process.env.GOOGLE_SHEETS_GID ?? process.env.GOOGLE_SHEET_GID ?? '0'
    if (!sheetId) return new Response(JSON.stringify({ error: 'GOOGLE_SHEETS_ID not configured' }), { status: 500 })

    const auth = getJwt()
    const sheets = google.sheets({ version: 'v4', auth })
    const titleName = await getSheetTitle(sheets, sheetId, gid)

    const read = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${titleName}!A:AF` })
    const rows = read.data.values || []
    if (rows.length === 0) throw new Error('Sheet has no rows')
    const header = rows[0].map((h: any) => (h || '').toString().trim().toLowerCase())
    const idIdx = header.indexOf('id')
    const clientIdIdx = header.indexOf('client_id')
    const afIdx = 32 - 1

    let targetRow = -1
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      const idVal = (r[idIdx] || '').toString().trim()
      const cIdVal = (r[clientIdIdx] || '').toString().trim()
      if ((client_id && (idVal === client_id || cIdVal === client_id)) || (!client_id && i === 1)) { targetRow = i; break }
    }
    if (targetRow === -1) throw new Error('Client row not found to update task')

    const existing = rows[targetRow]?.[afIdx] || ''
    let list: any[] = []
    if (existing) {
      try { list = JSON.parse(existing) } catch { list = [] }
    }
    const idx = list.findIndex((t: any) => t.id === id)
    if (idx === -1) return new Response(JSON.stringify({ error: 'Task not found' }), { status: 404 })

    if (typeof snooze_minutes === 'number') {
      const due = new Date(Date.now() + snooze_minutes * 60_000).toISOString()
      list[idx].due_at = due
    }
    if (status) list[idx].status = status

    const range = `${titleName}!AF${targetRow + 1}`
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[JSON.stringify(list)]] }
    })

    return new Response(JSON.stringify({ item: list[idx] }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to update task' }), { status: 500 })
  }
}
