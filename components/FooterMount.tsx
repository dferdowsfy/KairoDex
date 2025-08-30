"use client"
import { usePathname } from 'next/navigation'

export default function FooterMount() {
  const pathname = usePathname()
  const hideOn = ['/login', '/signup']
  const shouldHide = hideOn.some(p => pathname?.startsWith(p))
  if (shouldHide) return null
  return (
    <footer className="mt-10 border-t border-default bg-surface">
      <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-muted flex flex-col sm:flex-row gap-3 sm:gap-6 items-start sm:items-center">
  <div>© {new Date().getFullYear()} Kairodex</div>
        <a href="/privacy" className="hover:text-ink">Privacy Policy</a>
      </div>
    </footer>
  )
}
