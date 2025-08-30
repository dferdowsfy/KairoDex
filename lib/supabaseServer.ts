import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function supabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, httpOnly: true, secure: true, sameSite: 'strict', path: '/', ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', maxAge: 0, httpOnly: true, secure: true, sameSite: 'strict', path: '/', ...options })
        }
        // set and remove handled by library with HttpOnly cookies
      }
    }
  )
}
