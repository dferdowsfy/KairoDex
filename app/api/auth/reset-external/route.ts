import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// POST /api/auth/reset-external
// Admin-only endpoint to trigger password reset emails with proper redirects
export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const admin = supabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Admin service unavailable' }, { status: 500 })
    }

    // Get site URL from environment with appropriate fallbacks
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   process.env.NEXT_PUBLIC_AUTH_BROWSER_ORIGIN || 
                   'https://kairodex.com'
    
    // Ensure site URL doesn't end with a slash
    const baseUrl = siteUrl.replace(/\/$/, '')
    
    // Build proper redirect URL that explicitly points to the reset-password page
    const redirectTo = `${baseUrl}/reset-password?email=${encodeURIComponent(email)}&forceBrowser=1`
    
    // Send the reset password email
    const { error } = await admin.auth.resetPasswordForEmail(email, { 
      redirectTo: redirectTo
    })

    if (error) {
      console.error('Password reset email error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Password reset email sent successfully'
    })
  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}