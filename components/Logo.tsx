"use client"
import Link from 'next/link'

export default function Logo({ className = 'h-8 w-auto' }: { className?: string }) {
  return (
    <Link href="/" aria-label="AgentHub home" className="inline-flex items-center gap-2 select-none">
      <svg className={className} viewBox="0 0 240 56" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">
        <title>AgentHub</title>
        <defs>
          <filter id="glowBlue" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="0.8" result="b"/>
            <feMerge>
              <feMergeNode in="b"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="glowMagenta" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.6" result="m"/>
            <feColorMatrix in="m" type="matrix" values="0 0 0 0 0.925  0 0 0 0 0.282  0 0 0 0 0.600  0 0 0 1 0"/>
          </filter>
          <filter id="haloCyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="g"/>
            <feColorMatrix in="g" type="matrix" values="0 0 0 0 0.133  0 0 0 0 0.827  0 0 0 0 0.933  0 0 0 0.25 0"/>
          </filter>
          <linearGradient id="btn" x1="0" x2="1">
            <stop offset="0%" stopColor="#2563EB"/>
            <stop offset="100%" stopColor="#EC4899"/>
          </linearGradient>
        </defs>
        {/* Outer halo */}
        <g filter="url(#haloCyan)">
          <path d="M24 32L48 12l24 20v12H24V32z" fill="#22D3EE" opacity="0.06"/>
        </g>
        {/* House icon with crisp white lines and neon edges */}
        <g filter="url(#glowMagenta)">
          <path d="M24 32L48 12l24 20v12H24V32z" fill="none" stroke="#EC4899" strokeWidth="2" opacity="0.5"/>
        </g>
        <g filter="url(#glowBlue)">
          <path d="M24 32L48 12l24 20v12H24V32z M36 44V30h24v14" stroke="#2563EB" strokeWidth="2.5" fill="none"/>
          {/* crisp interior white strokes for contrast */}
          <path d="M24 32L48 12l24 20v12H24V32z M36 44V30h24v14" stroke="#FFFFFF" strokeWidth="1.25" fill="none"/>
        </g>
        {/* Wordmark */}
        <g transform="translate(90, 13)">
          <text x="0" y="24" fontFamily="Sora, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" fontWeight="800" fontSize="28" fill="#FFFFFF">AgentHub</text>
        </g>
      </svg>
    </Link>
  )
}
