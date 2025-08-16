import { NextRequest } from 'next/server'
import { findSheetRowForClientId } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  // Read client id from query string: /api/sheets/client?id=...
  try {
    const url = new URL(_req.url)
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })
    const row = await findSheetRowForClientId(id)
    return new Response(JSON.stringify({ row }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed' }), { status: 500 })
  }
}
