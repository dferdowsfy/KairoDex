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
import StickyActionBar from '@/components/StickyActionBar'
import FooterMount from '@/components/FooterMount'
import { usePathname } from 'next/navigation'
import CanvasScaler from '@/components/CanvasScaler'
import A11yAnnouncer from '@/components/A11yAnnouncer'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const sora = Sora({ subsets: ['latin'], variable: '--font-sora' })

export const metadata: Metadata = {
  title: 'Kairodex',
  description: 'Mobile-first AI-native real estate CRM',
  manifest: '/manifest.json',
  icons: [
  { rel: 'icon', url: '/kairodex-logo.png' },
    { rel: 'apple-touch-icon', url: '/icons/icon-192.png' },
    { rel: 'icon', url: '/icons/icon-192.png' }
  ]
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F66FF'
}

export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`} data-theme="light">
  <body className="bg-page text-ink antialiased">
        <Providers>
          <ThemeApplier />
          {/* Dev-only: ensure PWA service worker doesn't hijack dev server */}
          <DevSWReset />
          <CanvasScaler>
            <Suspense>
              <ClientsTopBar />
            </Suspense>
            {children}
            {/* Footer hidden on /login and /signup */}
            <FooterMount />
          </CanvasScaler>
          {/* Chat UI hidden on auth pages via ChatMount */}
          <ChatMount />
          {/* Sticky bottom action bar: viewport-anchored, visually scales via CSS vars from CanvasScaler */}
          <StickyActionBar />
          <A11yAnnouncer />
        </Providers>
  <InstallHint />
      </body>
    </html>
  )
}
