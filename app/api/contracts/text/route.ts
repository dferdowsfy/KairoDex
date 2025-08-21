export const runtime = 'edge'

// Minimal placeholder endpoint to satisfy module requirements
export async function GET() {
	return new Response(JSON.stringify({
		message: 'This endpoint is a placeholder. Use /api/contracts/preview or /api/contracts/pdf instead.'
	}), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}))
	return new Response(JSON.stringify({
		error: 'Not implemented',
		received: body || null
	}), { status: 501, headers: { 'Content-Type': 'application/json' } })
}
