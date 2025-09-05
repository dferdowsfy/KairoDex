import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  // Public paths bypass (auth + static assets + landing page assets)
  const publicPaths = ['/login', '/signup', '/reset-password', '/api/auth']
  const isAuthPublic = publicPaths.some((p) => path === p || path.startsWith(p + '/'))
  const isStaticAsset = (
    path.startsWith('/_next') ||
    path.startsWith('/icons') ||
    path.startsWith('/illustrations') ||
    path.startsWith('/img') ||
    path === '/kairodex.html' ||
    path === '/kairodex.css' ||
    path === '/manifest.json' ||
    path === '/sw.js' ||
    /\.(?:png|svg|jpg|jpeg|gif|webp|ico|css|js|txt|map|json|html)$/i.test(path)
  )
  if (isAuthPublic || isStaticAsset) {
    const res = NextResponse.next()
    // Minimal security headers even for public assets
    res.headers.set('Permissions-Policy', 'interest-cohort=()')
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('X-Frame-Options', 'DENY')
    res.headers.set('X-XSS-Protection', '0')
    return res
  }

  // If the request is to the root path and the user is not authenticated (no ah_last / ah_birth cookies),
  // send them to the external landing page so unauthenticated users always see the marketing site.
  const hasSession = !!(req.cookies.get('ah_last')?.value || req.cookies.get('ah_birth')?.value)
  if (path === '/' && !hasSession) {
    // External absolute redirect to the marketing domain (domain-only) so the full marketing path is hidden.
    return NextResponse.redirect('https://kairodex.com')
  }

  const now = Date.now()
  const idleMin = Number(process.env.SESSION_IDLE_MIN || 20)
  const absHours = Number(process.env.SESSION_ABS_HOURS || 24)
  const idleMs = idleMin * 60_000
  const absMs = absHours * 60 * 60_000

  const last = Number(req.cookies.get('ah_last')?.value || 0)
  const birth = Number(req.cookies.get('ah_birth')?.value || 0)

  // If not public and idle/absolute exceeded, redirect to login
  if (!isAuthPublic && ((last && now - last > idleMs) || (birth && now - birth > absMs))) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('timeout', '1')
    const redirectRes = NextResponse.redirect(loginUrl)
    redirectRes.cookies.set('ah_last', '', { path: '/', httpOnly: true, secure: true, sameSite: 'strict', maxAge: 0 })
    redirectRes.cookies.set('ah_birth', '', { path: '/', httpOnly: true, secure: true, sameSite: 'strict', maxAge: 0 })
    // Security headers
    redirectRes.headers.set('Permissions-Policy', 'interest-cohort=()')
    redirectRes.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    redirectRes.headers.set('X-Content-Type-Options', 'nosniff')
    redirectRes.headers.set('X-Frame-Options', 'DENY')
    redirectRes.headers.set('X-XSS-Protection', '0')
    return redirectRes
  }

  const res = NextResponse.next()
  // Enforce MFA cookie when required
  if (!isAuthPublic) {
    const requireMfa = req.cookies.get('ah_mfa_req')?.value === '1'
    const mfaOk = req.cookies.get('ah_mfa_ok')?.value === '1'
    if (requireMfa && !mfaOk) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('mfa', '1')
      return NextResponse.redirect(loginUrl)
    }
  }
  // Update activity cookies on any request (public or not) to keep freshness during active sessions
  res.cookies.set('ah_last', String(now), { path: '/', httpOnly: true, secure: true, sameSite: 'strict' })
  if (!birth) res.cookies.set('ah_birth', String(now), { path: '/', httpOnly: true, secure: true, sameSite: 'strict' })
  // Security headers
  res.headers.set('Permissions-Policy', 'interest-cohort=()')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-XSS-Protection', '0')
  return res
}
