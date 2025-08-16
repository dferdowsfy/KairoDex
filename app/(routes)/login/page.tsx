"use client"
export const dynamic = 'force-dynamic'
import { supabase } from '@/lib/supabaseBrowser'
import Link from 'next/link'

export default function LoginPage() {
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }
  return (
    <main className="p-6 min-h-dvh grid place-items-center">
      <div className="glass rounded-2xl p-6 w-full max-w-sm text-center">
        <div className="text-3xl font-semibold mb-2">NestAI</div>
        <p className="text-sm text-gray-400 mb-6">AI-native real estate CRM</p>
        <button onClick={signIn} className="w-full rounded-xl bg-primary/90 hover:bg-primary text-white py-3 font-medium shadow-glass focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0">Continue with Google</button>
        <p className="text-xs text-gray-500 mt-4">By continuing you agree to our <Link href="#" className="underline">Terms</Link>.</p>
      </div>
    </main>
  )
}
