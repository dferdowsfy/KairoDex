import type { Metadata } from 'next'
import './globals.css'
import { Inter, Sora } from 'next/font/google'
import Providers from '../lib/providers'
import { Suspense } from 'react'
import { ClientsTopBar } from '@/components/TopBar'
import InstallHint from '../components/InstallHint'
import ChatHandle from '../components/ChatHandle'
import ChatPanel from '../components/ChatPanel'
import ThemeApplier from '@/components/ThemeApplier'
import DevSWReset from '@/components/DevSWReset'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const sora = Sora({ subsets: ['latin'], variable: '--font-sora' })

export const metadata: Metadata = {
  title: 'NestAI',
  description: 'Mobile-first AI-native real estate CRM',
  manifest: '/manifest.json',
  themeColor: '#0F66FF',
  icons: [
    { rel: 'icon', url: '/icons/icon-192.png' },
    { rel: 'apple-touch-icon', url: '/icons/icon-192.png' }
  ]
}

export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
  <body className="min-h-screen bg-gradient-to-b from-white to-[color:var(--surface)] text-slate-800">
        <Providers>
          <ThemeApplier />
          {/* Dev-only: ensure PWA service worker doesn't hijack dev server */}
          <DevSWReset />
          <Suspense>
            <ClientsTopBar />
          </Suspense>
          {children}
          {/* Place chat components inside Providers so QueryClient is available */}
          <ChatHandle />
          <ChatPanel />
        </Providers>
  <InstallHint />
      </body>
    </html>
  )
}
