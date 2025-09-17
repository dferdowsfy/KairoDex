"use client"
// NOTE: Recent regression: Contracts page appeared blank due to an unhandled
// fetch/json parsing error causing a client-side exception early in render.
// Added robust try/catch + graceful error UI with retry to prevent total
// page blanking when API responses are malformed or network fails.
import React, { useEffect, useState } from 'react'
import { useUI } from '@/store/ui'
import { useClient } from '@/hooks/useClient'
import AmendmentWizard from '@/components/contracts/AmendmentWizard'

interface ContractRecord {
  id: string
  contract_number?: string
  contract_name: string
  contract_type?: string
  status: string
  version?: number
  created_at?: string
  client_id?: string
  metadata?: any
}

type TabKey = 'active' | 'amended'

export default function ContractsDashboard() {
  const { selectedClientId } = useUI()
  const { data: client } = useClient(selectedClientId || '')
  const [tab, setTab] = useState<TabKey>('active')
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [contractsError, setContractsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [amending, setAmending] = useState<ContractRecord | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string|null>(null)
  const [form, setForm] = useState({ contractName: '', stateCode: 'MD', countyFips: '' })
  const [associated, setAssociated] = useState<any[]>([])
  const [assocLoading, setAssocLoading] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [selectedPreview, setSelectedPreview] = useState<string>('')
  const [loadingAssocPreview, setLoadingAssocPreview] = useState(false)
  const [assocFallback, setAssocFallback] = useState(false)
  const [assocError, setAssocError] = useState<string|null>(null)

  React.useEffect(()=> {
    if (showCreate && !associated.length && !assocLoading) {
      (async ()=> {
        setAssocLoading(true)
        try {
          const res = await fetch('/api/contracts/associated')
          let j: any = null
          try { j = await res.json() } catch (e:any) { j = { error: 'Invalid server response' } }
          if (res.ok) { setAssociated(j.contracts||[]); setAssocFallback(!!j.fallback); setAssocError(null) } else { setAssocError(j.error||'Failed') }
        } catch (e:any) {
          setAssocError(e.message || 'Failed to load associated contracts')
        } finally { setAssocLoading(false) }
      })()
    }
  }, [showCreate, associated.length, assocLoading])

  // Load preview for selected associated template when selectedTemplateId changes
  useEffect(() => {
    if (!selectedTemplateId) { setSelectedPreview(''); setLoadingAssocPreview(false); return }
    const match = associated.find(a => a.id === selectedTemplateId)
    // If associated entry already contains inline template text, use it and skip fetch
    if (match && (match as any).template) { setSelectedPreview((match as any).template); setLoadingAssocPreview(false); return }
    // Otherwise attempt server preview fetch for the associated id
    let cancelled = false
    setLoadingAssocPreview(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/contracts/preview?id=${encodeURIComponent(selectedTemplateId)}`, { cache: 'no-store' })
        const j = await res.json()
        if (!cancelled) setSelectedPreview(res.ok ? (j.previewText || '') : '')
      } catch (e) {
        if (!cancelled) setSelectedPreview('')
      } finally {
        if (!cancelled) setLoadingAssocPreview(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedTemplateId, associated])

  useEffect(() => {
    if (!selectedClientId) return
    setLoading(true)
    setContractsError(null)
    const load = async () => {
      try {
        const q = new URLSearchParams({ clientId: selectedClientId })
        const res = await fetch(`/api/contracts/list?${q.toString()}`)
        let j: any = null
        try { j = await res.json() } catch (e:any) { j = { error: 'Invalid server response' } }
        if (res.ok) {
          const items: ContractRecord[] = (j.contracts || []).filter((c: any)=> c.client_id === selectedClientId)
          setContracts(items)
        } else {
          setContractsError(j.error || 'Failed to load contracts')
        }
      } catch (e:any) {
        setContractsError(e.message || 'Network error loading contracts')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedClientId])

  const activeContracts = contracts.filter(c => c.status !== 'amended')
  const amendedContracts = contracts.filter(c => c.status === 'amended')

  const handleCreate = async () => {
    setCreateError(null)
    if (!form.contractName.trim()) { setCreateError('Name required'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/contracts/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      let json: any = null
      try { json = await res.json() } catch (e:any) { json = null }
      if (!res.ok) {
        // If server returned HTML or non-JSON, fall back to statusText
        setCreateError((json && json.error) ? json.error : (res.statusText || 'Failed'))
      } else {
        setContracts(prev => [json.contract, ...prev])
        setShowCreate(false)
        setForm(f=>({ ...f, contractName: '', countyFips: '' }))
      }
    } catch (e:any) {
      setCreateError(e.message)
    } finally { setCreating(false) }
  }

  return (
    <main className="min-h-screen bg-[#F6F5F3]">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-slate-900">Contracts</h1>
          {client && <div className="text-slate-600 text-sm">Client: {(client as any)?.name || `${(client as any)?.first_name || ''} ${(client as any)?.last_name || ''}`}</div>}
        </header>
        {!selectedClientId && (
          <div className="text-slate-600">Select a client to view contracts.</div>
        )}
        {selectedClientId && (
          <>
            <div className="flex items-center gap-6 border-b border-slate-200">
              {([
                { k:'active', label:`Active Contracts (${activeContracts.length})` },
                { k:'amended', label:`Amended Contracts (${amendedContracts.length})` }
              ] as {k:TabKey;label:string}[]).map(tabDef => {
                return (
                  <button
                    key={tabDef.k}
                    onClick={()=>setTab(tabDef.k)}
                    className={`py-3 px-1 -mb-px text-sm font-medium border-b-2 transition-colors ${tab===tabDef.k? 'border-amber-500 text-slate-900':'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >{tabDef.label}</button>
                )
              })}
              <div className="ml-auto flex items-center gap-3">
                <button onClick={()=>setShowCreate(true)} className="inline-flex items-center rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3 py-2 shadow-sm">Add Contract</button>
              </div>
            </div>
            <section className="pt-4">
              {loading && <div className="text-slate-500">Loading...</div>}
              {contractsError && !loading && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
                  <span>{contractsError}</span>
                  <button
                    onClick={()=> {
                      if (!selectedClientId) return
                      setLoading(true)
                      setContractsError(null)
                      ;(async ()=> {
                        try {
                          const q = new URLSearchParams({ clientId: selectedClientId })
                          const res = await fetch(`/api/contracts/list?${q.toString()}`)
                          let j: any = null
                          try { j = await res.json() } catch (e:any) { j = { error: 'Invalid server response' } }
                          if (res.ok) {
                            const items: ContractRecord[] = (j.contracts || []).filter((c: any)=> c.client_id === selectedClientId)
                            setContracts(items)
                          } else {
                            setContractsError(j.error || 'Failed to load contracts')
                          }
                        } catch (e:any) {
                          setContractsError(e.message || 'Network error loading contracts')
                        } finally { setLoading(false) }
                      })()
                    }}
                    className="ml-auto inline-flex items-center rounded border border-red-300 bg-white/50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-white"
                  >Retry</button>
                </div>
              )}
              {!loading && !contractsError && tab==='active' && (
                <ContractGrid contracts={activeContracts} onAmend={c=>setAmending(c)} />
              )}
              {!loading && !contractsError && tab==='amended' && (
                <ContractGrid contracts={amendedContracts} onAmend={c=>setAmending(c)} amended />
              )}
            </section>
          </>
        )}
      </div>
      {amending && (
        <AmendmentWizard contract={amending} onClose={()=>setAmending(null)} onCompleted={(newId:string)=>{ setAmending(null); /* could refresh list */ }} />
      )}
      {showCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 space-y-5 border border-slate-200">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Add Contract</h2>
              <button onClick={()=> setShowCreate(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <div className="space-y-4">
              <AssociatedContractsSelect
                associated={associated}
                loading={assocLoading}
        fallback={assocFallback}
                valueId={selectedTemplateId}
        onFetch={async ()=> {
                  if (associated.length || assocLoading) return
                  setAssocLoading(true)
                  try {
          const res = await fetch('/api/contracts/associated')
                    const j = await res.json()
          if (res.ok) { setAssociated(j.contracts||[]); setAssocFallback(!!j.fallback); setAssocError(null) } else { setAssocError(j.error||'Failed') }
                  } finally { setAssocLoading(false) }
                }}
                onChange={(id, name)=> { setSelectedTemplateId(id); setForm(f=>({...f, contractName: name })) }}
                onManual={(name)=> { setSelectedTemplateId(''); setForm(f=>({...f, contractName: name })) }}
                currentName={form.contractName}
              />
        {assocError && <div className="text-xs text-red-600">{assocError}</div>}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
                  <select value={form.stateCode} onChange={e=> setForm(f=>({...f, stateCode: e.target.value}))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40">
                    {['MD','DC','VA'].map(s=> <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">County FIPS (optional)</label>
                  <input maxLength={5} value={form.countyFips} onChange={e=> setForm(f=>({...f, countyFips: e.target.value.replace(/[^0-9]/g,'')}))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40" placeholder="24031" />
                </div>
              </div>
              {createError && <div className="text-xs text-red-600">{createError}</div>}

              {/* Preview & DocuSign for selected template */}
              {selectedTemplateId && (
                <div className="mt-4 border-t pt-4">
                  <div className="text-sm font-medium text-slate-700 mb-2">Selected Contract Preview</div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 max-h-64 overflow-auto">
                    {/* Prefer inline template, then show loading, then selectedPreview, then fallback hint */}
                    {(() => {
                      const match = associated.find(a => a.id === selectedTemplateId)
                      if (match && (match as any).template) return <pre className="whitespace-pre-wrap">{(match as any).template}</pre>
                      if (loadingAssocPreview) return (
                        <div className="text-red-700 text-lg font-semibold animate-pulse">
                          Loading preview…
                        </div>
                      )
                      if (selectedPreview) return <pre className="whitespace-pre-wrap">{selectedPreview}</pre>
                      return <div className="text-slate-600">Preview not available for this template. You can still send the contract to DocuSign by selecting Send to DocuSign.</div>
                    })()}
                  </div>
                  {/* DocuSign button intentionally removed from the Create modal to avoid accidental sends */}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={()=> setShowCreate(false)} className="px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">Cancel</button>
              <button disabled={creating} onClick={handleCreate} className="px-4 py-2 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">{creating? 'Creating…':'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

interface AssocProps { associated:any[]; loading:boolean; valueId:string; currentName:string; onFetch:()=>void; onChange:(id:string,name:string)=>void; onManual:(name:string)=>void; fallback?:boolean }
function AssociatedContractsSelect({ associated, loading, valueId, currentName, onFetch, onChange, onManual, fallback }: AssocProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-600">Contract Name</label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <select
            onFocus={onFetch}
            value={valueId || ''}
            onChange={e=> {
              const id = e.target.value
              if (!id) { onChange('', currentName); return }
              const match = associated.find(a=> a.id===id)
              onChange(id, match?.contract_name || '')
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="">{loading? 'Loading templates…':'Select existing contract template'}</option>
            {associated.map(a=> <option key={a.id} value={a.id}>{a.contract_name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Show manual name input only when no existing template is selected to avoid duplicate rows */}
        {!valueId && (
          <input
            value={currentName}
            onChange={e=> onManual(e.target.value)}
            placeholder="e.g. Master Services Agreement"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        )}
      </div>
  <p className="text-[11px] text-slate-500">{fallback? 'Showing recent contracts (no explicit associations yet). Select or type a new name.' : 'Pick an existing template (associated to you) or type a new name.'}</p>
    </div>
  )
}

function ContractGrid({ contracts, onAmend, amended }: { contracts: ContractRecord[]; onAmend:(c:ContractRecord)=>void; amended?:boolean }) {
  const [sendingId, setSendingId] = React.useState<string | null>(null)
  const sendToDocuSign = async (id:string) => {
    setSendingId(id)
    try {
      const res = await fetch('/api/docusign/sender-view', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contractId: id }) })
      const j = await res.json()
      if (res.ok && j.url) window.open(j.url, '_blank', 'noopener')
      // else could show toast (omitted to keep component isolated)
    } finally { setSendingId(s=> s===id? null : s) }
  }
  if (!contracts.length) return <div className="text-slate-500 text-sm">No {amended? 'amended':'active'} contracts.</div>
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
      {contracts.map(c => (
        <div key={c.id} className="rounded-xl bg-[#FAF9F7] border border-slate-200 p-5 flex flex-col gap-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Contract # {(c.contract_number)||c.id.slice(0,6)}</div>
              <div className="font-semibold text-slate-900 text-base">{c.contract_name}</div>
            </div>
            <div className={`text-[11px] font-medium px-2 py-1 rounded-full ${c.status==='amended'?'bg-amber-100 text-amber-800':'bg-slate-100 text-slate-700'}`}>{c.status}</div>
          </div>
          <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
            {c.contract_type && <span>{c.contract_type}</span>}
            {c.version && <span>v{c.version}</span>}
            {c.created_at && <span>{new Date(c.created_at).toLocaleDateString()}</span>}
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <button onClick={()=>onAmend(c)} className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 transition-colors w-full">Amend</button>
            <button disabled={sendingId===c.id} onClick={()=> sendToDocuSign(c.id)} className="inline-flex items-center justify-center rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-medium px-3 py-2 transition-colors w-full disabled:opacity-50">
              {sendingId===c.id? 'Opening DocuSign...' : 'Send to DocuSign'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
