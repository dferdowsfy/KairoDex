import { google } from 'googleapis'

// Auth via service account JSON provided in env GOOGLE_SERVICE_ACCOUNT or individual vars
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
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  } as any)
}

export interface AppendNoteParams {
  sheetId: string
  gid?: string | number
  rowMatch: string // client id to locate row by client_id or id columns
  note: string
}

// Finds the row index by client_id or id and appends a timestamped note in column Y
export async function appendNoteToSheet({ sheetId, gid = 0, rowMatch, note }: AppendNoteParams) {
  const auth = getJwt()
  const sheets = google.sheets({ version: 'v4', auth })

  // 1) Read the tab values to locate row by client_id or id
  const { data: meta } = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const sheet = meta.sheets?.find(s => String(s.properties?.sheetId) === String(gid)) || meta.sheets?.[0]
  const title = sheet?.properties?.title
  if (!title) throw new Error('Sheet tab not found')

  const read = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${title}!A:Z` })
  const rows = read.data.values || []
  if (rows.length === 0) throw new Error('Sheet has no rows')
  const header = rows[0].map(h => (h || '').toString().trim().toLowerCase())
  const idIdx = header.indexOf('id')
  const clientIdIdx = header.indexOf('client_id')
  const yIdx = 24 - 1 // Column Y is 25th letter, zero-based index 24

  let targetRow = -1
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const idVal = (r[idIdx] || '').toString().trim()
    const cIdVal = (r[clientIdIdx] || '').toString().trim()
    if (idVal === rowMatch || cIdVal === rowMatch) { targetRow = i; break }
  }
  if (targetRow === -1) throw new Error('Client row not found in sheet')

  // 2) Compose timestamped note and write to Column Y
  const ts = new Date().toISOString()
  const existingCellRange = `${title}!Y${targetRow + 1}`
  const existing = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: existingCellRange })
  const existingVal = existing.data.values?.[0]?.[0] || ''
  const val = existingVal ? `${existingVal}\n[${ts}] ${note}` : `[${ts}] ${note}`
  const rowNumber = targetRow + 1 // 1-based for A1 notation
  const range = `${title}!Y${rowNumber}`
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[val]] }
  })
}
