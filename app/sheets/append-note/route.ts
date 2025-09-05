import { NextRequest } from 'next/server'
import { appendNoteToSheet } from '@/lib/sheetsWrite'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { clientId, note } = await req.json()
    if (!clientId || !note) return new Response(JSON.stringify({ error: 'Missing clientId or note' }), { status: 400 })

  // Support multiple env var names for compatibility
  const sheetId = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_SHEET_ID || process.env.GOOGLE_SHEET_ID
  const gid = process.env.GOOGLE_SHEETS_GID ?? process.env.GOOGLE_SHEET_GID ?? '0'
    if (!sheetId) return new Response(JSON.stringify({ error: 'GOOGLE_SHEETS_ID not configured' }), { status: 500 })

    await appendNoteToSheet({ sheetId, gid, rowMatch: clientId, note })
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to append note' }), { status: 500 })
  }
}
