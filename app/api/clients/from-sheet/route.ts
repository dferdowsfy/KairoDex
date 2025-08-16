import { fetchSheetRows, sheetRowToClient } from '@/lib/sheets'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || undefined
    const rows = await fetchSheetRows()
    const filtered = userId
      ? rows.filter(r => {
          const v = (r['agent_owner_user_id'] as any)?.toString().trim().toLowerCase()
          return v && v === userId.trim().toLowerCase()
        })
      : rows
    const clients = filtered.map(sheetRowToClient)
    return new Response(JSON.stringify({ items: clients }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to read sheet' }), { status: 500 })
  }
}
