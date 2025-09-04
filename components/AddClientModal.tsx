"use client"
import { useEffect, useState, useRef } from 'react'
// Use dynamic import for papaparse to avoid build-time type issues
let Papa: any = null
  async function ensurePapa() {
    if (!Papa) {
      const mod = await import('papaparse')
      Papa = (mod && (mod as any).default) ? (mod as any).default : mod
    }
    return Papa
  }
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useUI } from '@/store/ui'

export default function AddClientModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const { pushToast, setSelectedClientId } = useUI()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [budget, setBudget] = useState('')
  const [notes, setNotes] = useState('')
  const [detected, setDetected] = useState<{ email?: string; phone?: string; budget?: number; remaining?: string } | null>(null)

  // Format phone as (XXX) XXX-XXXX while typing. Store formatted string in state.
  function formatPhoneInput(v: string) {
    const digits = (v || '').replace(/\D/g, '').slice(0, 10)
    if (!digits) return ''
    if (digits.length <= 3) return `(${digits}`
    if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  }

  function handlePhoneChange(v: string) {
    setPhone(formatPhoneInput(v))
  }
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'single' | 'bulk' | 'text'>('single')
  const [hasHeader, setHasHeader] = useState(true)
  const [csvPreview, setCsvPreview] = useState<any[]>([])
  const [fullRows, setFullRows] = useState<any[]>([])
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [csvErrors, setCsvErrors] = useState<string[] | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string,string>>({})
  const canonicalFields = ['name_first','name_last','name','email','phone','stage','Notes_Inputted','do_not_contact','external_id','address','tags','ignore']
  const [textInput, setTextInput] = useState('')
  const [autoInserted, setAutoInserted] = useState(false)
  const [splitStrategy, setSplitStrategy] = useState<'first'|'last'|'auto'>('auto')
  const [previewResult, setPreviewResult] = useState<any | null>(null)
  const [splitOpen, setSplitOpen] = useState(false)
  const splitRef = useRef<HTMLDivElement | null>(null)

  // Ensure the modal appears at the top and the viewport is scrolled to top on open
  useEffect(() => {
    if (open) {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch {}
  // reset auto-insert guard when modal opens
  setAutoInserted(false)
    }
  }, [open])

  // close split dropdown when click outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!splitRef.current) return
      if (e.target && splitRef.current.contains(e.target as Node)) return
      setSplitOpen(false)
    }
    if (splitOpen) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [splitOpen])

  if (!open) return null

  const submit = async () => {
    // Only name is required now
    if (!name.trim()) {
      pushToast({ type: 'info', message: 'Enter a name.' })
      return
    }

    // Use detected tokens (if user hasn't removed them) or parse fresh from notes
    const parsed = detected || parseFieldsFromNotes(notes || '')
    // Use parsed values if corresponding inputs are empty
    const finalEmail = (email.trim() || parsed.email || '').trim()
    const finalPhone = (phone.trim() || parsed.phone || '').trim()
    const finalBudget = (budget.trim() || (parsed.budget !== undefined ? String(parsed.budget) : '')).trim()
    const remainingNotes = (parsed.remaining || '').trim()

    setLoading(true)
    try {
      const res = await fetch('/api/clients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: finalEmail, phone: finalPhone, budget: finalBudget, notes: remainingNotes })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to add')
      const id = json.id as string
  setSelectedClientId(id)
  qc.invalidateQueries({ queryKey: ['clients'] })
      pushToast({ type: 'success', message: 'Client added.' })
      onCreated?.(id)
      onClose()
    } catch (e: any) {
      pushToast({ type: 'error', message: e?.message || 'Add failed' })
    } finally {
      setLoading(false)
    }
  }

  function parseFieldsFromNotes(text: string) {
    const out: any = { remaining: text }
    if (!text) return out
    // email
    const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig
    const mEmail = text.match(emailRe)
    if (mEmail && mEmail.length) {
      out.email = mEmail[0]
      out.remaining = out.remaining.replace(mEmail[0], '')
    }
    // phone: look for groups of digits of length 7-15 with optional separators
    const phoneRe = /(?:\+?\d[\d\s().-]{6,}\d)/g
    const mPhone = text.match(phoneRe)
    if (mPhone && mPhone.length) {
      // take first match, normalize digits-only
      const digits = (mPhone[0] || '').replace(/\D/g, '').slice(0, 15)
      if (digits) {
        out.phone = digits
        out.remaining = out.remaining.replace(mPhone[0], '')
      }
    }
    // budget: $1234 or budget: 1234 or 'budget 5k' (simple)
    const dollarRe = /\$\s?([0-9,.]+)/
    const mDollar = text.match(dollarRe)
    if (mDollar && mDollar[1]) {
      const n = Number(mDollar[1].replace(/[,]/g, ''))
      if (!Number.isNaN(n)) { out.budget = n; out.remaining = out.remaining.replace(mDollar[0], '') }
    } else {
      const budgetWordRe = /budget[:\s]*([0-9,]+)/i
      const mb = text.match(budgetWordRe)
      if (mb && mb[1]) {
        const n = Number(mb[1].replace(/[,]/g, ''))
        if (!Number.isNaN(n)) { out.budget = n; out.remaining = out.remaining.replace(mb[0], '') }
      }
    }
    // cleanup whitespace
    out.remaining = (out.remaining || '').replace(/\s{2,}/g, ' ').trim()
    return out
  }

  function formatPhoneForDisplay(digits?: string) {
    if (!digits) return ''
    const ds = String(digits).replace(/\D/g, '').slice(0, 10)
    if (!ds) return ''
    if (ds.length <= 3) return `(${ds}`
    if (ds.length <= 6) return `(${ds.slice(0,3)}) ${ds.slice(3)}`
    return `(${ds.slice(0,3)}) ${ds.slice(3,6)}-${ds.slice(6)}`
  }

  function formatBudgetForDisplay(n?: number) {
    if (n === undefined || n === null) return ''
    try { return '$' + Number(n).toLocaleString() } catch { return '$' + String(n) }
  }

  function parseCSVWithPapa(text: string, header = true) {
    return new Promise<{ data: any[]; errors: any[]; meta: any }>(async (resolve) => {
      const p = await ensurePapa()
      p.parse(text, {
        header: header,
        skipEmptyLines: true,
        preview: 50000,
        transformHeader: (h: any) => (h || '').trim(),
        complete: (res: any) => resolve(res as any)
      })
    })
  }

  const handleFile = (file: File | null) => {
    setCsvErrors(null)
    setCsvPreview([])
    setCsvFileName(null)
    if (!file) return
    setCsvFileName(file.name)
    setCsvLoading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const text = String(reader.result || '')
        const parsed = await parseCSVWithPapa(text, hasHeader)
        const data = parsed.data || []
  setFullRows(data)
  setCsvPreview(data.slice(0, 50))
        setColumns(parsed.meta.fields || (data[0] ? Object.keys(data[0]) : []))
        // init mapping suggestions if none
        if (!Object.keys(mapping).length) {
          const suggested: any = {}
          ;(parsed.meta.fields || Object.keys(data[0] || {})).forEach((f: string) => {
            const key = String(f).toLowerCase()
            if (/first/.test(key) && !suggested[f]) suggested[f] = 'name_first'
            else if (/last/.test(key) && !suggested[f]) suggested[f] = 'name_last'
            else if (/^name$/.test(key) && !suggested[f]) suggested[f] = 'name'
            else if (/email/.test(key) && !suggested[f]) suggested[f] = 'email'
            else if (/phone|mobile|cell/.test(key) && !suggested[f]) suggested[f] = 'phone'
            else if (/note|notes|history/.test(key) && !suggested[f]) suggested[f] = 'Notes_Inputted'
            else if (/dnc|do_not_contact|opt_out|unsubscribe/.test(key) && !suggested[f]) suggested[f] = 'do_not_contact'
            else suggested[f] = 'ignore'
          })
          setMapping(suggested)
        }
        if (!data.length) setCsvErrors(['No rows parsed from file'])
        else {
          // If file is small, perform an automatic insert so parsed clients appear instantly
          const AUTO_INSERT_LIMIT = 200
          if (!autoInserted && data.length > 0 && data.length <= AUTO_INSERT_LIMIT) {
            try {
              setMode('bulk')
              // wait a tick for state to settle
              await new Promise((r) => setTimeout(r, 0))
              const res = await uploadBulk(false)
              if (res && res.inserted !== undefined) pushToast({ type: 'success', message: `Auto-inserted ${res.inserted} rows` })
              if (res && res.errors && res.errors.length) pushToast({ type: 'error', message: `${res.errors.length} rows failed to insert` })
              setAutoInserted(true)
            } catch (e) {
              // ignore — uploadBulk will show toasts
            }
          }
        }
      } catch (e: any) {
        setCsvErrors([e?.message || 'Failed to parse CSV'])
      } finally { setCsvLoading(false) }
    }
    reader.onerror = () => { setCsvErrors(['Failed to read file']); setCsvLoading(false) }
    reader.readAsText(file)
  }

  const uploadBulk = async (dryRun = false) => {
    // Build rows depending on mode
    let rowsToSend: any[] = []
    if (mode === 'bulk') {
  if (!fullRows.length) { pushToast({ type: 'info', message: 'No parsed rows to upload' }); return }
      // apply mapping
  rowsToSend = fullRows.map((r: any) => {
        const out: any = {}
        for (const col of columns) {
          const mapTo = mapping[col] || 'ignore'
          if (mapTo === 'ignore') continue
          out[mapTo] = r[col]
        }
        // If 'name' present and split strategy provided, split
        if (!out.name_first && !out.name_last && out.name) {
          const parts = String(out.name).trim().split(/\s+/).filter(Boolean)
          if (parts.length === 1) out.name_first = parts[0]
          else if (parts.length === 2) { out.name_first = parts[0]; out.name_last = parts[1] }
          else if (parts.length > 2) {
            if (splitStrategy === 'first') { out.name_first = parts[0]; out.name_last = parts.slice(1).join(' ') }
            else if (splitStrategy === 'last') { out.name_last = parts[parts.length-1]; out.name_first = parts.slice(0, parts.length-1).join(' ') }
            else { out.name_first = parts[0]; out.name_last = parts.slice(1).join(' ') }
          }
        }
        return out
      })
    } else if (mode === 'text') {
      if (!textInput.trim()) { pushToast({ type: 'info', message: 'Paste some text first' }); return }
      // split paragraphs into entries
      const blocks = textInput.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
      rowsToSend = blocks.map(b => ({ unstructured: b, splitStrategy }))
    }
    setLoading(true)
    try {
      // If caller requested a dry run, just run it and show preview.
      if (dryRun) {
        const res = await fetch('/api/clients/bulk-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: rowsToSend, options: { chunkSize: 100, dryRun: true } })
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Preview failed')
        setPreviewResult(json)
        pushToast({ type: 'info', message: `Preview returned ${json.preview?.length || 0} rows` })
        return
      }

      // Otherwise perform an automatic dry-run first to catch validation issues.
      const dryRes = await fetch('/api/clients/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rowsToSend, options: { chunkSize: 100, dryRun: true } })
      })
      const dryJson = await dryRes.json()
      if (!dryRes.ok) throw new Error(dryJson?.error || 'Preview failed')
      if (dryJson.errors && Array.isArray(dryJson.errors) && dryJson.errors.length) {
        // show preview and stop so user can inspect/fix
        setPreviewResult(dryJson)
        pushToast({ type: 'error', message: `Preview detected ${dryJson.errors.length} problems — please review.` })
        return
      }

      // No validation errors — proceed to insert
      const res = await fetch('/api/clients/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rowsToSend, options: { chunkSize: 100, dryRun: false } })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Upload failed')

      // Update client cache and set selection to first inserted (if available)
      try { qc.invalidateQueries({ queryKey: ['clients'] }) } catch { qc.invalidateQueries() }
      if (json?.rows && Array.isArray(json.rows) && json.rows.length) {
        const first = json.rows[0]
        const newId = first.client_id || first.id || first.email
        if (newId) setSelectedClientId(newId)
      }

      pushToast({ type: 'success', message: `Uploaded ${json.inserted || 0} rows. ${json.errors?.length ? json.errors.length + ' errors' : ''}` })
      onClose()
      return json
    } catch (e: any) {
      pushToast({ type: 'error', message: e?.message || 'Bulk upload failed' })
      throw e
    } finally { setLoading(false) }
  }

  // Preview button removed — uploads are triggered automatically after parsing.

  // detect pasted CSV in the text area and auto-parse to bulk mode
  const handleTextChange = async (e: any) => {
    const v = e.target.value || ''
    setTextInput(v)
    // Heuristic: multiple lines and commas -> likely CSV
    try {
      if (v.indexOf('\n') !== -1 && v.indexOf(',') !== -1) {
        const parsed = await parseCSVWithPapa(v, true)
        const data = parsed.data || []
        if (data && data.length) {
          setFullRows(data)
          setCsvPreview(data.slice(0, 50))
          setColumns(parsed.meta.fields || (data[0] ? Object.keys(data[0]) : []))
          // init mapping suggestions if none
          if (!Object.keys(mapping).length) {
            const suggested: any = {}
            ;(parsed.meta.fields || Object.keys(data[0] || {})).forEach((f: string) => {
              const key = String(f).toLowerCase()
              if (/first/.test(key) && !suggested[f]) suggested[f] = 'name_first'
              else if (/last/.test(key) && !suggested[f]) suggested[f] = 'name_last'
              else if (/^name$/.test(key) && !suggested[f]) suggested[f] = 'name'
              else if (/email/.test(key) && !suggested[f]) suggested[f] = 'email'
              else if (/phone|mobile|cell/.test(key) && !suggested[f]) suggested[f] = 'phone'
              else if (/note|notes|history/.test(key) && !suggested[f]) suggested[f] = 'Notes_Inputted'
              else if (/dnc|do_not_contact|opt_out|unsubscribe/.test(key) && !suggested[f]) suggested[f] = 'do_not_contact'
              else suggested[f] = 'ignore'
            })
            setMapping(suggested)
          }
          setCsvFileName('pasted.csv')
          setMode('bulk')
          // Auto-insert small pasted CSVs so they immediately appear in the UI
          const AUTO_INSERT_LIMIT = 200
          if (!autoInserted && data.length > 0 && data.length <= AUTO_INSERT_LIMIT) {
            try {
              // wait a tick for state updates
              await new Promise((r) => setTimeout(r, 0))
              const res = await uploadBulk(false)
              if (res && res.inserted !== undefined) pushToast({ type: 'success', message: `Auto-inserted ${res.inserted} rows` })
              if (res && res.errors && res.errors.length) pushToast({ type: 'error', message: `${res.errors.length} rows failed to insert` })
              setAutoInserted(true)
            } catch (err) {
              // uploadBulk handles toasts/errors
            }
          }
        }
      }
    } catch (err) {
      // parsing failed — keep as free text
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:p-6 overflow-y-auto">
  <div className="w-full sm:max-w-4xl rounded-2xl bg-white text-slate-900 shadow-lg mt-2 sm:mt-6">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">Add Client</div>
          <button onClick={onClose} className="text-slate-500" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <div className="mb-3 flex gap-2">
            <button onClick={()=>setMode('single')} className={`rounded-xl px-3 py-2 ${mode==='single' ? 'bg-slate-900 text-white' : 'bg-white border'}`}>Single</button>
            <button onClick={()=>setMode('bulk')} className={`rounded-xl px-3 py-2 ${mode==='bulk' ? 'bg-slate-900 text-white' : 'bg-white border'}`}>Bulk CSV</button>
            <button onClick={()=>setMode('text')} className={`rounded-xl px-3 py-2 ${mode==='text' ? 'bg-slate-900 text-white' : 'bg-white border'}`}>Paste text</button>
          </div>
          {mode === 'single' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="e.g., Alex Rivera" />
                {/* detected capsules */}
                {detected && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {detected.email && (
                      <div key="det-email" className="px-2 py-1 rounded-full bg-slate-100 text-sm flex items-center gap-2">
                        <a className="underline" href={`mailto:${detected.email}`}>{detected.email}</a>
                        <button onClick={() => { setDetected({ ...(detected || {}), email: undefined }) }} aria-label="remove-email">×</button>
                      </div>
                    )}
                    {detected.phone && (
                      <div key="det-phone" className="px-2 py-1 rounded-full bg-slate-100 text-sm flex items-center gap-2">
                        <a className="underline" href={`tel:${detected.phone}`}>{formatPhoneForDisplay(detected.phone)}</a>
                        <button onClick={() => { setDetected({ ...(detected || {}), phone: undefined }) }} aria-label="remove-phone">×</button>
                      </div>
                    )}
                    {typeof detected.budget !== 'undefined' && (
                      <div key="det-budget" className="px-2 py-1 rounded-full bg-slate-100 text-sm flex items-center gap-2">
                        <span>{formatBudgetForDisplay(detected.budget)}</span>
                        <button onClick={() => { setDetected({ ...(detected || {}), budget: undefined }) }} aria-label="remove-budget">×</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Email</label>
                <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="alex@example.com" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Phone</label>
                <input
                  value={phone}
                  onChange={e=>handlePhoneChange(e.target.value)}
                  onPaste={(e) => { const t = (e.clipboardData || (window as any).clipboardData).getData('text'); e.preventDefault(); handlePhoneChange(t) }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={14}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="(555) 123-4567"
                />
                <div className="text-xs text-slate-400 mt-1">Auto-formats to (XXX) XXX-XXXX; max 10 digits</div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Budget (optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    value={budget}
                    onChange={e=>setBudget(e.target.value)}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    onWheel={(e:any)=>{ /* prevent scroll wheel from changing value */ e.currentTarget.blur(); }}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 pl-8"
                    placeholder="e.g. 5000"
                  />
                </div>
                <div className="text-xs text-slate-400 mt-1">Use numbers only — mouse wheel disabled to avoid accidental changes.</div>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Notes (optional)</label>
                <textarea value={notes} onChange={e=>{ setNotes(e.target.value); setDetected(parseFieldsFromNotes(e.target.value)) }} rows={4} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Add any notes about this client" />
              </div>
            </div>
          ) : mode === 'bulk' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">CSV file</label>
                <input type="file" accept=".csv,text/csv" onChange={(e)=>handleFile(e.target.files ? e.target.files[0] : null)} className="w-full" />
                <div className="mt-2 flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={hasHeader} onChange={e=>setHasHeader(e.target.checked)} /> Has header row</label>
                  {csvFileName && <div className="text-sm text-slate-500">{csvFileName}</div>}
                </div>
                {csvLoading && <div className="text-sm text-slate-500 mt-2">Parsing…</div>}
                {csvErrors && csvErrors.map((er,i)=>(<div key={i} className="text-sm text-red-600">{er}</div>))}
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Preview (first 50 rows)</label>
                <div className="max-h-72 overflow-auto border rounded-md p-2 bg-gray-50">
                  {csvPreview.length ? (
                      <div className="overflow-auto">
                        <table className="w-full min-w-[900px] text-sm table-auto">
                          <thead>
                            <tr>
                              {columns.map(c => <th key={c} className="text-left pr-4">{c}</th>)}
                            </tr>
                            <tr>
                              {columns.map(c => (
                                <th key={c} className="text-left pr-4">
                                  <select value={mapping[c] || 'ignore'} onChange={(e)=>setMapping(prev=>({ ...prev, [c]: e.target.value }))} className="rounded-md border px-2 py-1 text-sm w-full">
                                    {canonicalFields.map(f => <option key={f} value={f}>{f}</option>)}
                                  </select>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreview.map((r, i) => (
                              <tr key={i} className="border-t">
                                {columns.map((c) => (
                                  <td key={c} className="py-1 pr-4 align-top"><div className="text-xs whitespace-pre-wrap">{String((r && (r[c] ?? r[c.toString()])) ?? '')}</div></td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="mt-2 flex gap-2 items-center">
                          <button onClick={()=>{
                            // Save mapping template
                            try { localStorage.setItem('client_import_mapping', JSON.stringify({ columns, mapping })); pushToast({ type: 'success', message: 'Mapping saved' }) } catch { pushToast({ type: 'error', message: 'Save failed' }) }
                          }} className="rounded-xl px-3 py-1 border text-sm">Save mapping</button>
                          <button onClick={()=>{
                            try { const v = localStorage.getItem('client_import_mapping'); if (!v) { pushToast({ type: 'info', message: 'No saved mapping' }); return } const parsed = JSON.parse(v); if (parsed && parsed.mapping) setMapping(parsed.mapping); pushToast({ type: 'success', message: 'Mapping loaded' }) } catch { pushToast({ type: 'error', message: 'Load failed' }) }
                          }} className="rounded-xl px-3 py-1 border text-sm">Load mapping</button>
                          <div className="text-sm text-slate-500 ml-auto">Tip: map name → name to split into first/last on upload</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No rows parsed yet</div>
                    )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Paste unstructured text or multiple entries (one per paragraph)</label>
                <textarea value={textInput} onChange={handleTextChange} rows={8} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder={`Paste notes or contact blocks. Example:\nAlex Rivera\nalex@example.com\n(555) 111-2222\nMet at open house.`} />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm">Name split strategy:</label>
                <div className="relative inline-block" ref={splitRef}>
                  <button type="button" onClick={()=>setSplitOpen(s=>!s)} className="rounded-xl border px-3 py-1 flex items-center gap-2">
                    <span className="text-sm">{splitStrategy === 'auto' ? 'Auto (best-effort)' : splitStrategy === 'first' ? 'First token = first name' : 'Last token = last name'}</span>
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {splitOpen && (
                    <div className="absolute left-0 mt-2 w-64 bg-white border rounded shadow-md z-50">
                      <button onClick={()=>{ setSplitStrategy('auto'); setSplitOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">Auto (best-effort)</button>
                      <button onClick={()=>{ setSplitStrategy('first'); setSplitOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">First token = first name</button>
                      <button onClick={()=>{ setSplitStrategy('last'); setSplitOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">Last token = last name</button>
                    </div>
                  )}
                </div>

                <button onClick={()=>{
                  // Quick sample insert
                  setTextInput('Alex Rivera\nalex@example.com\n(555) 111-2222\nMet at open house.\n\nJamie Lopez\njamie@example.com\n(555) 222-3333\nReferred by Sam.')
                }} className="ml-auto rounded-xl px-3 py-1 border">Insert sample</button>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-xl px-4 py-2 border border-slate-300">Cancel</button>
          {mode === 'single' ? (
            <button onClick={submit} disabled={loading} className="rounded-xl px-4 py-2 bg-slate-900 text-white disabled:opacity-60">{loading ? 'Adding…' : 'Add'}</button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => uploadBulk(false)} disabled={loading || csvLoading || (mode==='bulk' ? !fullRows.length : !textInput.trim())} className="rounded-xl px-4 py-2 bg-slate-900 text-white disabled:opacity-60">{loading ? 'Uploading…' : 'Upload'}</button>
            </div>
          )}
        </div>
        {previewResult && (
          <div className="p-4 border-t bg-gray-50 max-h-64 overflow-auto">
            <div className="font-medium mb-2">Preview result</div>
            <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(previewResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
