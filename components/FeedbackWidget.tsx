"use client"
import React, { useState, useEffect } from 'react'

const LIKE_OPTIONS = [
  'Speed',
  'UI Design',
  'Email Automation',
  'Client Notes',
  'DocuSign Flow',
  'Reliability'
]
const DISLIKE_OPTIONS = [
  'Too Slow',
  'Confusing Navigation',
  'Missing Features',
  'Bugs / Errors',
  'Poor Mobile Experience'
]

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [liked, setLiked] = useState<string[]>([])
  const [disliked, setDisliked] = useState<string[]>([])
  const [rating, setRating] = useState<number | undefined>(undefined)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (val: string, list: string[], setList: (v:string[])=>void) => {
    setList(list.includes(val) ? list.filter(v=>v!==val) : [...list, val])
  }

  const submit = async () => {
    if (busy) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked, disliked, rating, message })
      })
      const js = await res.json()
      if (!res.ok) throw new Error(js?.error || 'Failed')
      setSent(true)
      setTimeout(()=> { setOpen(false); setSent(false); setLiked([]); setDisliked([]); setRating(undefined); setMessage('') }, 2500)
    } catch (e:any) {
      setError(e?.message || 'Failed to send')
    } finally { setBusy(false) }
  }

  // Mount animation hook
  const [mounted, setMounted] = useState(false)
  useEffect(()=>{ setMounted(true) },[])

  return (
    <div className="fixed bottom-28 right-4 z-[70] text-sm pointer-events-auto select-none">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open feedback form"
          className="group relative px-5 h-12 rounded-2xl bg-white/80 border border-slate-200 shadow-lg flex items-center justify-center hover:shadow-xl transition-all active:scale-95 backdrop-blur-sm overflow-hidden"
        >
          {/* animated soft gradient layers */}
          <span className="absolute inset-0 bg-gradient-to-tr from-blue-500/15 via-fuchsia-400/10 to-amber-300/20 animate-[pulse_6s_ease-in-out_infinite]" />
          <span className="absolute -inset-2 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.35),transparent_60%)] opacity-70 mix-blend-soft-light animate-[spin_18s_linear_infinite]" />
          <span className="absolute -inset-2 bg-[radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.35),transparent_55%)] opacity-60 mix-blend-soft-light animate-[spin_28s_linear_infinite_reverse]" />
          <span className="relative text-sm font-semibold tracking-tight bg-gradient-to-r from-blue-600 via-fuchsia-600 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
            Feedback?
          </span>
          <span className="absolute inset-0 rounded-2xl ring-2 ring-blue-500/0 group-hover:ring-blue-500/30 transition" />
        </button>
      )}
      {open && (
        <div className="w-[430px] max-w-[95vw] rounded-2xl p-[2px] relative animate-[fadeIn_0.35s_ease]">
          {/* Multi-layer gradient frame */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/60 via-fuchsia-500/50 to-amber-400/60 blur-md opacity-60 animate-[pulse_7s_ease-in-out_infinite]" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600/40 via-transparent to-pink-500/40 mix-blend-overlay" />
          <div className="relative rounded-2xl bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_20%_15%,rgba(59,130,246,0.25),transparent_60%),radial-gradient(circle_at_80%_85%,rgba(236,72,153,0.25),transparent_55%)]" />
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(115deg,rgba(255,255,255,0.6),rgba(255,255,255,0.1))]" />
            <div className="absolute -top-5 -right-5 w-32 h-32 rounded-full bg-gradient-to-br from-blue-400/30 to-fuchsia-400/30 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-gradient-to-tr from-amber-300/30 to-pink-400/30 blur-2xl" />
            <div className="absolute inset-0 animate-[gradientShift_18s_linear_infinite] bg-[conic-gradient(from_0deg,rgba(59,130,246,0.08),rgba(236,72,153,0.06),rgba(251,191,36,0.07),rgba(59,130,246,0.08))]" />
            <div className="absolute inset-0 animate-[floatParticles_14s_linear_infinite] bg-[radial-gradient(circle_at_10%_90%,rgba(59,130,246,0.12),transparent_70%),radial-gradient(circle_at_90%_15%,rgba(251,191,36,0.12),transparent_65%)] mix-blend-soft-light" />
            <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-10 bg-noise" />

            <div className="relative px-5 pt-6 pb-5">
              <div className="absolute -top-4 right-3">
            <button
                onClick={()=>setOpen(false)}
                className="w-9 h-9 rounded-full bg-white/80 backdrop-blur border border-slate-200 text-slate-500 hover:text-slate-700 text-sm flex items-center justify-center shadow-sm hover:shadow transition"
                aria-label="Close feedback"
              >✕</button>
              </div>
              <div className="mb-5 pr-8">
                <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-fuchsia-600 to-amber-500">Feedback
                  <span className="text-[11px] font-normal text-slate-500 ml-1 bg-none">Help us improve</span>
                </h3>
              </div>
              {sent ? (
                <div className="text-emerald-600 font-medium py-10 text-center text-base">Thank you! ✅</div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="font-medium mb-2 text-slate-800 text-sm">What did you like?</p>
                    <div className="flex flex-wrap gap-2">
                      {LIKE_OPTIONS.map(opt => {
                        const active = liked.includes(opt)
                        return (
                          <button
                            key={opt}
                            onClick={()=>toggle(opt, liked, setLiked)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95 ${active? 'bg-blue-600 text-white border-blue-600 shadow-sm':'bg-white/70 backdrop-blur border-slate-300 text-slate-700 hover:border-blue-400 hover:bg-blue-50'}`}
                          >{opt}</button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-2 text-slate-800 text-sm">What needs improvement?</p>
                    <div className="flex flex-wrap gap-2">
                      {DISLIKE_OPTIONS.map(opt => {
                        const active = disliked.includes(opt)
                        return (
                          <button
                            key={opt}
                            onClick={()=>toggle(opt, disliked, setDisliked)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95 ${active? 'bg-rose-600 text-white border-rose-600 shadow-sm':'bg-white/70 backdrop-blur border-slate-300 text-slate-700 hover:border-rose-400 hover:bg-rose-50'}`}
                          >{opt}</button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-2 text-slate-800 text-sm">Overall rating</p>
                    <div className="flex gap-1 flex-wrap">
                      {Array.from({ length: 10 }).map((_,i)=>{
                        const val = i+1
                        const active = rating === val
                        return (
                          <button
                            key={val}
                            onClick={()=> setRating(val)}
                            className={`w-9 h-9 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${active? 'bg-emerald-600 text-white border-emerald-600 shadow-sm':'bg-white/70 backdrop-blur border-slate-300 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'}`}
                          >{val}</button>
                        )
                      })}
                      <button
                        onClick={()=> setRating(undefined)}
                        className="ml-2 px-2 h-9 rounded-lg text-[10px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-transparent"
                      >Clear</button>
                    </div>
                  </div>
                  <div>
                    <textarea
                      placeholder="Your feedback..."
                      value={message}
                      onChange={e=>setMessage(e.target.value)}
                      rows={4}
                      className="w-full border border-slate-300/70 bg-white/60 backdrop-blur rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 placeholder:text-slate-400"
                    />
                  </div>
                  {error && <div className="text-xs text-rose-600">{error}</div>}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[11px] text-slate-500">Stored & sent to owner</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={()=>setOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-300 text-slate-600 hover:bg-slate-100 active:scale-95 transition"
                      >Close</button>
                      <button
                        disabled={busy}
                        onClick={submit}
                        className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 via-fuchsia-600 to-amber-500 text-white shadow hover:shadow-md active:scale-95 disabled:opacity-60 transition"
                      >{busy? 'Sending…':'Send'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
