"use client"
import Link from 'next/link'

export default function Logo({ className = 'h-10 w-auto' }: { className?: string }) {
  return (
  <a href="https://kairodex.com" aria-label="KairoDex home" className="inline-flex items-center gap-2 select-none">
      <span className={`block ${className}`} aria-hidden>
        <svg width="160" height="40" viewBox="0 0 160 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="KairoDex" className="h-full w-auto">
          <defs>
            <linearGradient id="kd-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="49%" stopColor="#de7b19ff" />
              <stop offset="100%" stopColor="#FFA476" />
            </linearGradient>
          </defs>
          {/* Icon area 32x32 */}
          <g transform="translate(4,4)">
            {/* soft fill */}
            <path d="M4 16L16 7l12 9v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V16Z" fill="url(#kd-grad)" opacity=".18" />
            {/* house outline */}
            <path d="M6 15.2 16 8l10 7.2V26a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V15.2Z" fill="none" stroke="#FF6F3C" strokeWidth="2.6" strokeLinejoin="round" />
            {/* growth check */}
            <path d="M10 22l5-5 3.8 3.8L23 16" fill="none" stroke="#FF6F3C" strokeWidth="2.6" strokeLinecap="round" />
          </g>
          {/* Wordmark */}
          <text x="48" y="27" fontSize="18" fontWeight="800" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" fill="#0F172A" letterSpacing=".2">KairoDex</text>
        </svg>
      </span>
    </a>
  )
}
