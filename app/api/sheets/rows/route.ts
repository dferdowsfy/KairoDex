import { fetchSheetRows } from '@/lib/sheets'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await fetchSheetRows()
    return new Response(JSON.stringify({ count: rows.length, rows }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to fetch rows' }), { status: 500 })
  }
}
