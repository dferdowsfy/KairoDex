import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './store/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        primarySoft: '#E3EDFF',
        accent: '#06C167',
        accentSoft: '#DCFCE7',
        warn: '#F59E0B',
        warnSoft: '#FEF3C7',
        danger: '#EF4444',
        dangerSoft: '#FEE2E2',
        ink: '#0F172A',
        surface: '#F6F7FB',
        card: '#FFFFFF'
      },
      boxShadow: {
  glass: '0 1px 2px rgba(2,6,23,0.06), 0 8px 24px rgba(2,6,23,0.08)'
      },
      backdropBlur: { xs: '2px' }
    }
  },
  plugins: [require('tailwindcss-animate')]
}
export default config
