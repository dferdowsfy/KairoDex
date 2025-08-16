export const runtime = 'edge'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}))
  console.log('telemetry', payload)
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
