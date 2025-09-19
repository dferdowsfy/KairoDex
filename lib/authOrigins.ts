// Central place to define which origin we want Supabase auth emails to open in a regular browser.
// If you install the PWA at the root origin (https://kairodex.com) and want email links to open
// outside the standalone window, point them to a different origin/subdomain (commonly www. or auth.).
// Configure via env: NEXT_PUBLIC_AUTH_BROWSER_ORIGIN
// Fallback logic:
//  - In production (NODE_ENV=production): default to https://www.kairodex.com
//  - In development: default to http://localhost:3000 so local emails open your dev server.

const defaultProd = 'https://www.kairodex.com'
const defaultDev = 'http://localhost:3000'
const isProd = process.env.NODE_ENV === 'production'
let origin = process.env.NEXT_PUBLIC_AUTH_BROWSER_ORIGIN || (isProd ? defaultProd : defaultDev)
origin = origin.replace(/\/$/, '')
export const AUTH_BROWSER_ORIGIN = origin

if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_AUTH_BROWSER_ORIGIN) {
	// eslint-disable-next-line no-console
	console.warn('[authOrigins] Using development fallback AUTH_BROWSER_ORIGIN:', AUTH_BROWSER_ORIGIN, '\nSet NEXT_PUBLIC_AUTH_BROWSER_ORIGIN to override.')
}

export const buildResetPasswordUrl = (email: string) => `${AUTH_BROWSER_ORIGIN}/reset-password?email=${encodeURIComponent(email)}`
export const buildEmailConfirmUrl = () => `${AUTH_BROWSER_ORIGIN}/login?confirmed=1`
