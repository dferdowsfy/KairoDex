"use client"
export const dynamic = 'force-dynamic'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(180deg,#F7F3EE,#F3EEE7 60%, #EFE8DF)' }}>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center rounded-xl bg-white/70 backdrop-blur border border-slate-200 text-slate-900 px-3 py-2 hover:bg-white transition">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-semibold text-slate-900 ml-2">Privacy Policy</h1>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 space-y-4">
          <p><strong>PRIVACY-POLICY.</strong></p>
          <p><strong>Kairodex Ingest – Privacy Policy</strong></p>

          <h2 className="text-xl font-semibold text-slate-900 mt-6">What we collect</h2>
          <p>When you click “Send to Kairodex” (or use the shortcut), the extension reads visible fields on the current CRM page:</p>
          <ul className="mt-3 space-y-2">
            {[
              'Contact name, email, phone',
              'Stage, source, tags (if shown)',
              'Page URL and timestamp (metadata)'
            ].map((t, idx) => (
              <li
                key={idx}
                className={`flex items-start gap-3 rounded-xl border p-3 md:p-3.5 
                  ${['bg-stone-50','bg-lime-50','bg-cyan-50','bg-fuchsia-50','bg-orange-50'][idx % 5]} 
                  ${['border-stone-200','border-lime-200','border-cyan-200','border-fuchsia-200','border-orange-200'][idx % 5]}
                `}
              >
                <span className={`mt-1.5 h-3.5 w-3.5 rounded-full flex-shrink-0 ${['bg-stone-400','bg-lime-400','bg-cyan-400','bg-fuchsia-400','bg-orange-400'][idx % 5]}`} aria-hidden="true" />
                <span className="text-[1.05rem] leading-7">{t}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-xl font-semibold text-slate-900 mt-6">What we do not collect</h2>
          <ul className="mt-3 space-y-2">
            {[
              'No background tracking or browsing history',
              'No keystrokes or credentials',
              'No data from pages you have not granted access to'
            ].map((t, idx) => (
              <li
                key={idx}
                className={`flex items-start gap-3 rounded-xl border p-3 md:p-3.5 
                  ${['bg-stone-50','bg-lime-50','bg-cyan-50','bg-fuchsia-50','bg-orange-50'][idx % 5]} 
                  ${['border-stone-200','border-lime-200','border-cyan-200','border-fuchsia-200','border-orange-200'][idx % 5]}
                `}
              >
                <span className={`mt-1.5 h-3.5 w-3.5 rounded-full flex-shrink-0 ${['bg-stone-400','bg-lime-400','bg-cyan-400','bg-fuchsia-400','bg-orange-400'][idx % 5]}`} aria-hidden="true" />
                <span className="text-[1.05rem] leading-7">{t}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-xl font-semibold text-slate-900 mt-6">How we use data</h2>
          <p>The extension sends the minimal payload directly to your Kairodex ingest API, which writes to your Supabase database under your account.</p>

          <h2 className="text-xl font-semibold text-slate-900 mt-6">Permissions</h2>
          <p>We use runtime (optional) host permissions. You’ll be prompted to grant access to a site the first time you use the extension there.</p>

          <h2 className="text-xl font-semibold text-slate-900 mt-6">Data sharing</h2>
          <p>We do not sell or share the data. It is transmitted only to the ingest URL you configure.</p>

          <h2 className="text-xl font-semibold text-slate-900 mt-6">Contact</h2>
          <p>support@agenthub.app</p>
        </section>
      </div>
    </main>
  )
}
