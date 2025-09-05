import { fetchSheetRows, sheetRowToClient, fetchSheetGrid } from '@/lib/sheets'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || undefined
    const email = (searchParams.get('email') || undefined)?.trim().toLowerCase()

    // No auth context: do not return any clients
    if (!email && !userId) {
      return new Response(JSON.stringify({ items: [] }), { status: 200 })
    }

    // Column-based filter: Column C (index 2) must match the user's email/identifier
    // Data columns for client info: D (index 3) through AJ (index 35)
    const { header, rows } = await fetchSheetGrid()
    let filteredArrays = rows
    if (email) {
      filteredArrays = filteredArrays.filter(r => (r[2] || '').trim().toLowerCase() === email)
    } else if (userId) {
      // If only userId provided, try to match Column C with userId as a fallback identifier
      filteredArrays = filteredArrays.filter(r => (r[2] || '').trim().toLowerCase() === userId.trim().toLowerCase())
    }

    // Map back to objects using the header so existing sheetRowToClient can work
    const objects = filteredArrays.map(arr => {
      const obj: Record<string, string> = {}
      header.forEach((key, idx) => { obj[key] = arr[idx] ?? '' })
      return obj as any
    })
    const clients = objects.map(sheetRowToClient)
    return new Response(JSON.stringify({ items: clients }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to read sheet' }), { status: 500 })
  }
}
