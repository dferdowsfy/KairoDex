import { findSheetRowForClientId, sheetRowToClient } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })
    }
    const row = await findSheetRowForClientId(id)
    if (!row) {
      return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404 })
    }
    const client = sheetRowToClient(row)
    // Ensure id is set from request if missing in sheet
    if (!(client as any).id) (client as any).id = id
    return new Response(JSON.stringify({ row, client }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to fetch sheet row' }), { status: 500 })
  }
}
