"use client"
import React, { useState, useMemo, useEffect } from 'react'
import { X, Check, FileDown, Eye } from 'lucide-react'
import { useUI } from '@/store/ui'

interface ContractRecord { id:string; contract_name:string; status:string; version?:number; metadata?:any }

interface Props { contract: ContractRecord; onClose:()=>void; onCompleted:(newId:string)=>void }

type AmendType = 'price' | 'date' | 'contingency' | 'other'

export default function AmendmentWizard({ contract, onClose, onCompleted }: Props) {
  const [step, setStep] = useState(1)
  const total = 4
  const [amendType, setAmendType] = useState<AmendType | null>(null)
  const [otherText, setOtherText] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState('')
  const [contingency, setContingency] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string>('')
  const [updatedId, setUpdatedId] = useState<string | null>(null)
  const [originalText, setOriginalText] = useState<string>('')
  const [loadingOriginal, setLoadingOriginal] = useState<boolean>(false)
  const [snapshot, setSnapshot] = useState<string>('')
  const { selectedClientId } = useUI()
  const changesDescription = useMemo(() => {
    const parts:string[] = []
    if (amendType === 'price' && price) parts.push(`Change purchase price to $${price}`)
    if (amendType === 'date' && date) parts.push(`Extend/Set closing date to ${new Date(date).toLocaleDateString()}`)
    if (amendType === 'contingency' && contingency) parts.push(`Add/Remove contingency: ${contingency}`)
    if (amendType === 'other' && otherText) parts.push(otherText)
    return parts.join('; ')
  }, [amendType, price, date, contingency, otherText])
  // Fetch original contract preview text on mount (or when contract.id changes)
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingOriginal(true)
      try {
        const res = await fetch(`/api/contracts/preview?id=${encodeURIComponent(contract.id)}`, { cache: 'no-store' })
        const j = await res.json()
        if (!cancelled) setOriginalText(res.ok ? (j.previewText || '') : '')
      } catch {
        if (!cancelled) setOriginalText('')
      } finally { if (!cancelled) setLoadingOriginal(false) }
    }
    load()
    return () => { cancelled = true }
  }, [contract.id])

  // Build contextual snapshot when originalText or changesDescription updates
  useEffect(() => {
    if (!originalText) { setSnapshot(''); return }
    if (!changesDescription) { setSnapshot(originalText.slice(0, 1200)); return } // initial slice if no changes yet
    const text = originalText
    const tokens = changesDescription.split(/;|\n/).map(t=>t.trim()).filter(Boolean)
    // Extract candidate keywords (numbers, dates, money amounts, simple nouns)
    const keywords: string[] = []
    tokens.forEach(t => {
      const money = t.match(/\$\d[\d,]*/g); if (money) money.forEach(m=>keywords.push(m))
      const dates = t.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/ig); if (dates) dates.forEach(d=>keywords.push(d))
      const plainNumbers = t.match(/\b\d{3,}\b/g); if (plainNumbers) plainNumbers.forEach(n=>keywords.push(n))
      // Grab some words > 4 chars (likely meaningful)
      t.split(/[^A-Za-z0-9$]+/).filter(w=>w.length>4 && !/contingency|change|price|amendment|extend|closing|add|remove|other|custom/i.test(w)).slice(0,3).forEach(w=>keywords.push(w))
    })
    const uniq = Array.from(new Set(keywords.map(k=>k.toLowerCase()))).slice(0,25)
    // For each keyword find first occurrence and capture context lines
    const lines = text.split(/\n/)
    const usedLineIdx = new Set<number>()
    const contextBlocks: string[] = []
    uniq.forEach(kw => {
      const idx = lines.findIndex(l => l.toLowerCase().includes(kw))
      if (idx === -1) return
      // capture 2 lines before and 3 after
      for (let i=Math.max(0, idx-2); i<=Math.min(lines.length-1, idx+3); i++) usedLineIdx.add(i)
    })
    if (!usedLineIdx.size) { setSnapshot(text.slice(0, 1200)); return }
    const ordered = Array.from(usedLineIdx).sort((a,b)=>a-b)
    let block: string[] = []
    let last = -10
    const blocks: string[] = []
    ordered.forEach(i => {
      if (i - last > 1 && block.length) { blocks.push(block.join('\n')); block = [] }
      block.push(lines[i])
      last = i
    })
    if (block.length) blocks.push(block.join('\n'))
    let result = blocks.join('\n\n…\n\n')
    // Highlight keywords
    uniq.forEach(kw => {
      const re = new RegExp(kw.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&'),'ig')
      result = result.replace(re, m=>`[[HIGHLIGHT:${m}]]`)
    })
    // Convert markers to simple decoration (will convert to <mark> later in render)
    setSnapshot(result)
  }, [originalText, changesDescription])


  async function applyAmendment() {
    if (!selectedClientId) { setError('No client selected'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/contracts/amend-storage', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contractFileId: contract.id, naturalChanges: changesDescription || 'No changes specified', clientId: selectedClientId }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Failed to amend')
      setSummary(j.summary || 'Amendment applied.')
      setUpdatedId(j.updatedContractId)
      // Trigger DocuSign sender view immediately (optional for user)
      try {
        const ds = await fetch('/api/docusign/sender-view', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contractId: j.updatedContractId }) })
        const djson = await ds.json()
        if (ds.ok && djson?.url) {
          window.open(djson.url, '_blank', 'noopener')
        }
      } catch {}
  setStep(4)
      onCompleted(j.updatedContractId)
    } catch(e:any) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  // Build merged text (original + amendment summary) for preview/PDF
  const mergedText = useMemo(()=>{
    const base = originalText || (contract.metadata?.amended_content) || 'Original text unavailable'
    if (!changesDescription) return base
    return base + '\n\nAmendment Summary:\n' + changesDescription.split('; ').map(l=>`- ${l}`).join('\n')
  }, [originalText, contract.metadata, changesDescription])

  async function downloadRedlinePdf() {
    try {
      const res = await fetch('/api/contracts/pdf', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: mergedText, name: contract.contract_name + '_redline' }) })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${contract.contract_name.replace(/[^a-z0-9_-]+/gi,'_')}_Redline.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  function viewMergedContract() {
    const w = window.open('', '_blank', 'noopener,width=900,height=900')
    if (!w) return
    w.document.write('<html><head><title>Merged Contract</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,sans-serif;padding:24px;line-height:1.4;} h1{font-size:18px;margin:0 0 12px;} pre{white-space:pre-wrap;font-size:12px;background:#f8f8f8;padding:16px;border-radius:8px;border:1px solid #e2e2e2;} .summary{margin-top:24px;padding:16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;} </style></head><body>')
    w.document.write(`<h1>${contract.contract_name} (Merged)</h1>`)
  const escMap: Record<string,string> = { '&':'&amp;','<':'&lt;','>':'&gt;' }
  const esc = (str:string) => str.replace(/[&<>]/g, (ch) => escMap[ch] || ch)
  w.document.write('<pre>'+esc(mergedText)+'</pre>')
    w.document.write('</body></html>')
    w.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6 bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-5xl bg-[#FDFCFB] rounded-2xl shadow-xl border border-slate-200 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-800"><X className="h-5 w-5"/></button>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Amend Contract • {contract.contract_name}</h2>
          <div className="text-xs text-slate-500">Step {step} of {total}</div>
        </div>
        <div className="p-6 space-y-6">
          {step===1 && (
            <div className="space-y-5">
              <h3 className="text-sm font-medium text-slate-700">What would you like to amend?</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { k:'price', label:'Change Purchase Price', desc:'Adjust the agreed price' },
                  { k:'date', label:'Extend Closing Date', desc:'Move closing or key milestone' },
                  { k:'contingency', label:'Add/Remove Contingency', desc:'Inspection, financing, etc.' },
                  { k:'other', label:'Other (custom)', desc:'Specify a custom change' }
                ].map(opt => (
                  <button key={opt.k}
                    onClick={()=> setAmendType(opt.k as AmendType)}
                    className={`rounded-xl border p-4 text-left bg-[#FAF9F7] hover:border-amber-400 transition ${amendType===opt.k? 'border-amber-500 ring-2 ring-amber-200':'border-slate-200'}`}
                  >
                    <div className="font-medium text-slate-900 text-sm">{opt.label}</div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.desc}</div>
                  </button>
                ))}
              </div>
              {amendType === 'price' && (
                <div className="flex flex-col gap-2 max-w-xs">
                  <label className="text-xs font-medium text-slate-600">New Purchase Price</label>
                  <input value={price} onChange={e=>setPrice(e.target.value)} type="number" placeholder="500000" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"/>
                </div>
              )}
              {amendType === 'date' && (
                <div className="flex flex-col gap-2 max-w-xs">
                  <label className="text-xs font-medium text-slate-600">New Closing Date</label>
                  <input value={date} onChange={e=>setDate(e.target.value)} type="date" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"/>
                </div>
              )}
              {amendType === 'contingency' && (
                <div className="flex flex-col gap-2 max-w-md">
                  <label className="text-xs font-medium text-slate-600">Contingency Details</label>
                  <input value={contingency} onChange={e=>setContingency(e.target.value)} placeholder="Add inspection contingency within 10 days" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"/>
                </div>
              )}
              {amendType === 'other' && (
                <div className="flex flex-col gap-2 max-w-md">
                  <label className="text-xs font-medium text-slate-600">Describe the amendment</label>
                  <textarea value={otherText} onChange={e=>setOtherText(e.target.value)} rows={3} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm resize-none" placeholder="e.g., Add clause requiring professional cleaning prior to closing." />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-white border border-slate-300 text-slate-700">Cancel</button>
                <button disabled={!amendType || (amendType==='price'&&!price) || (amendType==='date'&&!date) || (amendType==='contingency'&&!contingency) || (amendType==='other'&&!otherText)} onClick={()=>setStep(2)} className="px-4 py-2 rounded-lg text-sm bg-amber-500 enabled:hover:bg-amber-600 text-white font-medium disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
          {step===2 && (
            <div className="space-y-6">
              <h3 className="text-sm font-medium text-slate-700">Original vs Proposed</h3>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="rounded-xl border border-slate-200 bg-[#FAF9F7] p-4">
                  <div className="text-xs font-semibold text-slate-500 mb-2">Original Contract Snapshot</div>
                  {loadingOriginal ? (
                    <div className="text-[11px] text-slate-600">Loading original contract…</div>
                  ) : snapshot ? (
                    <pre className="text-[11px] leading-snug whitespace-pre-wrap text-slate-800 max-h-72 overflow-auto" dangerouslySetInnerHTML={{ __html: snapshot.replace(/\[\[HIGHLIGHT:(.+?)\]\]/g,'<mark class=\'bg-amber-200 text-slate-900 px-0.5 rounded\'>$1</mark>') }} />
                  ) : (
                    <div className="text-[11px] text-slate-600">Original text unavailable.</div>
                  )}
                  {snapshot && changesDescription && (
                    <div className="mt-2 text-[10px] text-slate-500">Showing contextual lines where changes may apply. Scroll for more.</div>
                  )}
                </div>
                <div className="rounded-xl border border-amber-300 bg-white p-4">
                  <div className="text-xs font-semibold text-amber-700 mb-2">Proposed Amendment</div>
                  <div className="text-[12px] text-slate-700 whitespace-pre-wrap min-h-[4rem]">{changesDescription || 'No changes specified yet.'}</div>
                </div>
              </div>
              <div className="flex justify-between">
                <button onClick={()=>setStep(1)} className="px-4 py-2 rounded-lg text-sm bg-white border border-slate-300 text-slate-700">Back</button>
                <div className="flex gap-3">
                  <button onClick={()=>setStep(3)} className="px-4 py-2 rounded-lg text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium">Continue</button>
                </div>
              </div>
            </div>
          )}
          {step===3 && (
            <div className="space-y-6">
              <h3 className="text-sm font-medium text-slate-700">Preview Changes</h3>
              <RedlinePreview original={originalText || (contract.metadata?.amended_content)||'Original text unavailable'} changes={changesDescription} />
              <div className="flex flex-wrap gap-3 justify-between">
                <div className="flex gap-3 order-2 sm:order-1">
                  <button onClick={()=>setStep(2)} className="px-4 py-2 rounded-lg text-sm bg-white border border-slate-300 text-slate-700">Back</button>
                  <button onClick={()=>applyAmendment()} disabled={loading || !changesDescription} className="px-4 py-2 rounded-lg text-sm bg-red-700 hover:bg-red-800 text-white font-medium disabled:opacity-40">{loading? 'Sending…':'Send to DocuSign'}</button>
                </div>
                <div className="flex gap-2 order-1 sm:order-2">
                  <button onClick={downloadRedlinePdf} className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"><FileDown className="h-3 w-3"/> Download Redline PDF</button>
                  <button onClick={viewMergedContract} className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"><Eye className="h-3 w-3"/> View Merged Contract</button>
                </div>
              </div>
            </div>
          )}
          {step===4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-amber-600">
                <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center"><Check className="h-5 w-5"/></div>
                <h3 className="font-semibold">Amendment Created</h3>
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{summary}</div>
              {updatedId && <div className="text-xs text-slate-500">Linked to original: {contract.id}</div>}
              <div className="flex justify-end gap-2">
                {updatedId && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/docusign/sender-view', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contractId: updatedId }) })
                        const j = await res.json()
                        if (!res.ok) throw new Error(j?.error || 'DocuSign failed')
                        if (j?.url) window.open(j.url, '_blank', 'noopener')
                      } catch (e:any) {
                        alert(e?.message || 'DocuSign error')
                      }
                    }}
                    className="px-4 py-2 rounded-lg text-sm bg-red-700 hover:bg-red-800 text-white font-medium"
                  >Send to DocuSign</button>
                )}
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium">Done</button>
              </div>
            </div>
          )}
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        </div>
      </div>
    </div>
  )
}

function RedlinePreview({ original, changes }: { original:string; changes:string }) {
  // Very lightweight diff: highlight numbers/dates mentioned in changes
  const tokens = changes.split(/;|\n/).map(s=>s.trim()).filter(Boolean)
  let preview = original
  tokens.forEach(t => {
    const priceMatch = t.match(/\$?([0-9]{3,})/)
    if (priceMatch) {
      const v = priceMatch[1]
      preview = preview.replace(new RegExp(v,'g'), `~~${v}~~ → **${v}**`)
    }
  })
  return (
    <div className="rounded-xl border border-slate-200 bg-[#FAF9F7] p-4 max-h-80 overflow-auto">
      <div className="text-xs font-semibold text-slate-500 mb-2">Redline (illustrative)</div>
      <pre className="whitespace-pre-wrap text-[11px] leading-snug text-slate-800">{preview}\n\nChanges:\n{tokens.map(t=>`• ${t}`).join('\n')}</pre>
    </div>
  )
}

function ApprovalsStep({ onBack, onSend, loading, updatedId, contractId }: { onBack:()=>void; onSend:()=>void; loading:boolean; updatedId?: string | null; contractId?: string }) {
  const parties = [
    { role:'Buyer', name:'Buyer Name', email:'buyer@example.com' },
    { role:'Seller', name:'Seller Name', email:'seller@example.com' },
    { role:'Broker', name:'Broker Name', email:'broker@example.com' }
  ]
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-slate-700">Approvals & Signatures</h3>
      <div className="space-y-3">
        {parties.map(p => (
          <label key={p.role} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white text-sm">
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" />
            <div className="flex flex-col">
              <span className="font-medium text-slate-800">{p.role}</span>
              <span className="text-xs text-slate-500">{p.name} • {p.email}</span>
            </div>
          </label>
        ))}
      </div>
      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2 rounded-lg text-sm bg-white border border-slate-300 text-slate-700">Back</button>
        <div className="flex gap-2">
          <button onClick={onSend} disabled={loading} className="px-4 py-2 rounded-lg text-sm bg-amber-500 enabled:hover:bg-amber-600 text-white font-medium disabled:opacity-40">{loading? 'Sending…':'Send for Signature'}</button>
          <button onClick={async ()=>{
            const idToSend = updatedId || contractId
            if (!idToSend) { alert('No contract available to send'); return }
            try {
              const res = await fetch('/api/docusign/sender-view', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ contractId: idToSend }) })
              const j = await res.json()
              if (!res.ok) throw new Error(j?.error || 'DocuSign failed')
              if (j?.url) window.open(j.url, '_blank', 'noopener')
            } catch (e:any) { alert(e?.message || 'DocuSign error') }
          }} className="px-4 py-2 rounded-lg text-sm bg-red-700 hover:bg-red-800 text-white font-medium">Send to DocuSign</button>
        </div>
      </div>
    </div>
  )
}
