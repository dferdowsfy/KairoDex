import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Inter, Sora } from 'next/font/google'
import Providers from '../lib/providers'
import { Suspense } from 'react'
import { ClientsTopBar } from '@/components/TopBar'
import InstallHint from '../components/InstallHint'
import ChatMount from '@/components/ChatMount'
import ThemeApplier from '@/components/ThemeApplier'
import DevSWReset from '@/components/DevSWReset'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const sora = Sora({ subsets: ['latin'], variable: '--font-sora' })

export const metadata: Metadata = {
  title: 'NestAI',
  description: 'Mobile-first AI-native real estate CRM',
  manifest: '/manifest.json',
  icons: [
    { rel: 'icon', url: '/icons/icon-192.png' },
    { rel: 'apple-touch-icon', url: '/icons/icon-192.png' }
  ]
}

export const viewport: Viewport = {
  themeColor: '#0F66FF'
}

export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
  <body className="text-white antialiased" style={{ background: 'var(--page-bg)' }}>
        <Providers>
          <ThemeApplier />
          {/* Dev-only: ensure PWA service worker doesn't hijack dev server */}
          <DevSWReset />
          <Suspense>
            <ClientsTopBar />
          </Suspense>
          {children}
          {/* Chat UI hidden on auth pages via ChatMount */}
          <ChatMount />
        </Providers>
  <InstallHint />
      </body>
    </html>
  )
}
