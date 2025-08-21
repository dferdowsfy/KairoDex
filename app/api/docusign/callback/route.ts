export const runtime = 'edge'

// Simple callback to land after DocuSign OAuth consent
export async function GET(req: Request) {
  try {
    const returnTo = new URL('/tasks?quick=amend', req.url).toString()
    // We don't need to exchange code when using JWT with consent; just redirect back
    return Response.redirect(returnTo, 302)
  } catch (e: any) {
    return new Response('DocuSign consent complete. You can close this tab.', { status: 200 })
  }
}
