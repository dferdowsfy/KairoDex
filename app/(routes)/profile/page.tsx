"use client"
export const dynamic = 'force-dynamic'
import { useTheme, THEME_PRESETS, ThemeName } from '@/store/theme'
import { Check } from 'lucide-react'

export default function ProfilePage() {
  const { name, colors, setTheme, setColors, reset } = useTheme()
  const presetEntries = Object.entries(THEME_PRESETS) as [ThemeName, typeof colors][]

  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold mb-4 text-slate-900">Profile & Theme</h1>

      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-700 mb-2">Quick themes</h2>
        <div className="grid grid-cols-2 gap-3">
          {presetEntries.map(([key, c]) => (
            <button key={key} onClick={() => setTheme(key)} className={`text-left rounded-xl border px-3 py-3 bg-white transition hover:shadow-sm ${name===key? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'}`} aria-pressed={name===key}>
              <div className="flex items-center justify-between">
                <span className="capitalize font-medium text-slate-900">{key}</span>
                {name===key && <Check className="h-4 w-4 text-primary" />}
              </div>
              <div className="mt-2 flex gap-1">
                {['primary','accent','warn','danger'].map((k) => (
                  <span key={k} className="h-5 w-5 rounded-full border border-slate-200" style={{ backgroundColor: (c as any)[k] }} />
                ))}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <button onClick={reset} className="text-xs text-slate-700 underline">Reset to default</button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-700 mb-2">Custom colors</h2>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3">
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm text-slate-600">Page background</label>
            <input
              type="text"
              className="flex-1 h-9 rounded border border-slate-300 px-2 text-sm"
              placeholder="CSS color or gradient, e.g. linear-gradient(180deg,#fff,var(--surface))"
              value={colors.pageBg || ''}
              onChange={(e) => setColors({ pageBg: e.target.value })}
            />
          </div>
          {([
            ['primary','Primary'],
            ['primarySoft','Primary soft'],
            ['accent','Accent'],
            ['accentSoft','Accent soft'],
            ['warn','Warning'],
            ['warnSoft','Warning soft'],
            ['danger','Danger'],
            ['dangerSoft','Danger soft'],
            ['ink','Text (ink)'],
            ['surface','Surface'],
            ['card','Card']
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <label className="w-32 text-sm text-slate-600">{label}</label>
              <input type="color" aria-label={`${label} color`} className="h-9 w-14 rounded border border-slate-200" value={(colors as any)[key]} onChange={(e) => setColors({ [key]: e.target.value } as any)} />
              <input type="text" className="flex-1 h-9 rounded border border-slate-300 px-2 text-sm" value={(colors as any)[key]} onChange={(e) => setColors({ [key]: e.target.value } as any)} />
              <span className="h-6 w-6 rounded-full border border-slate-200" style={{ backgroundColor: (colors as any)[key] }} />
            </div>
          ))}
          <div className="text-xs text-slate-500">Changes save automatically to this device.</div>
        </div>
      </section>
    </main>
  )
}
