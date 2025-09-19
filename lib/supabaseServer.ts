import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function supabaseServer() {
  try {
    const cookieStore = cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!,
      {
        // Provide both getAll/setAll and get/set/remove so @supabase/ssr can
        // correctly access and persist auth cookies in Next.js server handlers.
        // The supabase SSR helper accepts two possible shapes for `cookies` depending
        // on versions/typing. We implement both and cast to `any` to avoid type errors
        // while preserving runtime behavior.
        // @ts-ignore - runtime shape provided below
        cookies: ((): any => {
          const impl: any = {
            get(name: string) {
              try {
                return cookieStore.get(name)?.value
              } catch (e) {
                return undefined
              }
            },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, httpOnly: true, secure: true, sameSite: 'strict', path: '/', ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', maxAge: 0, httpOnly: true, secure: true, sameSite: 'strict', path: '/', ...options })
          }
        }

        // Newer API expects getAll/setAll
        impl.getAll = async (names?: string[]) => {
          const all = cookieStore.getAll()
          if (!names || !names.length) return all.map((c: any) => ({ name: c.name, value: c.value || '' }))
          return names.map((n: string) => ({ name: n, value: cookieStore.get(n)?.value || '' }))
        }
        impl.setAll = async (cookiesArr: Array<{ name: string; value?: string; options?: any }>) => {
          for (const c of cookiesArr) {
            cookieStore.set({ name: c.name, value: c.value || '', httpOnly: true, secure: true, sameSite: 'strict', path: '/', ...(c.options || {}) })
          }
        }

        return impl
      })()
    }
  )
  } catch (error) {
    // Fallback for edge runtime or when cookies are not available
    console.warn('supabaseServer: cookies not available, using fallback client')
    const { createClient } = require('@supabase/supabase-js')
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!
    )
  }
}
