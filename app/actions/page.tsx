"use client"
export const dynamic = 'force-dynamic'
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUI } from '@/store/ui'
import ClientSelector from '@/components/ClientSelector'
import { US_STATES, getStateByCode } from '@/lib/us'
import { getContractsForJurisdiction, type ContractTemplate } from '@/lib/contracts'
import { getContractDisplayName, CONTRACT_CATEGORIES } from '@/lib/contractMappings'
import QuickTaskForm from '@/components/QuickTaskForm'
import ReminderCadence from '@/components/ReminderCadence'
import { useClient } from '@/hooks/useClient'
import { Sparkles, SquarePen, CheckSquare } from 'lucide-react'

type ActionKey = 'followup' | 'amend' | 'task' | 'reminder'

const ALLOWED_STATES = ['MD', 'DC', 'VA'] as const

function StickyActionButtons({ open, setOpen }: { open: ActionKey | null, setOpen: (k: ActionKey)=>void }) {
  const items: { k: ActionKey; label: string; desc: string; icon: JSX.Element; bg: string; border: string; hover: string }[] = [
    { k: 'followup', label: 'Generate Follow‑Up', desc: 'AI email or SMS draft', icon: <Sparkles className="h-7 w-7" />, bg: 'bg-amber-100/60', border: 'border-amber-300/60', hover: 'hover:bg-amber-200/70' },
    { k: 'amend', label: 'Amend Contract', desc: 'Modify contract terms', icon: <SquarePen className="h-7 w-7" />, bg: 'bg-emerald-100/60', border: 'border-emerald-300/60', hover: 'hover:bg-emerald-200/70' },
    { k: 'task', label: 'Create Task', desc: 'Quick todo for client', icon: <CheckSquare className="h-7 w-7" />, bg: 'bg-violet-100/60', border: 'border-violet-300/60', hover: 'hover:bg-violet-200/70' }
  ]
  return (
    <div className="sticky top-[56px] md:top-[70px] z-20">
      <div className="rounded-3xl border border-slate-200 bg-white/85 backdrop-blur px-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map(it => {
            const active = open === it.k
            return (
              <button
                key={it.k}
                onClick={() => setOpen(it.k)}
                className={`group relative text-left rounded-3xl border ${it.border} ${it.bg} ${it.hover} transition-all p-6 h-44 flex flex-col justify-between shadow-sm ${active ? 'ring-2 ring-slate-900 bg-white !border-slate-400' : 'hover:shadow-md'}`}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-14 h-14 rounded-2xl grid place-items-center border text-slate-800 bg-white/80 backdrop-blur-sm ${active ? 'border-slate-300 shadow-md' : 'border-white/60 shadow'} transition-colors`}>{it.icon}</div>
                </div>
                <div className="mt-3">
                  <div className="font-semibold text-slate-900 leading-snug text-[25pt] tracking-tight">{it.label}</div>
                  <div className="text-sm sm:text-base text-slate-700 mt-2 font-medium">{it.desc}</div>
                </div>
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent group-hover:border-slate-400" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function ActionsPage() {
  const search = useSearchParams()
  const initial = (search?.get('open') as ActionKey | null) || null
  const [open, _setOpen] = useState<ActionKey | null>(initial)
  const setOpen = (k: ActionKey) => _setOpen(k)
  const { selectedClientId, pushToast } = useUI()
  const { data: activeClient } = useClient((selectedClientId || '') as any)

  // Amend Contracts state (Supabase + templates)
  const [stateCode, setStateCode] = useState<string>('')
  const [countyFips, setCountyFips] = useState<string>('')
  const [counties, setCounties] = useState<{ name: string; fips: string }[]>([])
  const [contractId, setContractId] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const [nlCommand, setNlCommand] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyResult, setApplyResult] = useState<{ updated?: string; summary?: string } | null>(null)
  const [supabaseContracts, setSupabaseContracts] = useState<any[]>([])
  const [loadingSupabase, setLoadingSupabase] = useState(false)
  const [selectedSupabaseContract, setSelectedSupabaseContract] = useState<string>('')
  const [contractPreview, setContractPreview] = useState<string>('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  // DocuSign state
  const [sendingDs, setSendingDs] = useState(false)
  const [dsError, setDsError] = useState<string | null>(null)
  // Follow-up composer state
  const [fuChannel, setFuChannel] = useState<'email'|'sms'>('email')
  const [fuTone, setFuTone] = useState('Professional')
  const [fuInstruction, setFuInstruction] = useState('Draft a brief follow-up based on recent activity.')
  const [fuDraft, setFuDraft] = useState('')
  const [fuLoading, setFuLoading] = useState(false)

  useEffect(() => {
    if (initial && !open) _setOpen(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Counties by state via API
  useEffect(() => {
    const s = stateCode && getStateByCode(stateCode)
    if (!s) { setCounties([]); setCountyFips(''); return }
    const fips = s.fips
    fetch(`/api/geo/counties?state=${encodeURIComponent(fips)}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('counties failed')))
      .then(json => setCounties(json.items || []))
      .catch(() => setCounties([]))
  }, [stateCode])

  // Load Supabase contracts when state/county changes (MD/DC/VA only)
  useEffect(() => {
    if (!stateCode || !ALLOWED_STATES.includes(stateCode as any)) {
      setSupabaseContracts([])
      return
    }
    setLoadingSupabase(true)
    const load = async () => {
      try {
        const { supabase } = await import('@/lib/supabaseBrowser')
        let query = supabase.from('contract_files').select('*').eq('state_code', stateCode)
        if (countyFips) query = query.eq('county_fips', countyFips)
        const { data, error } = await query
        if (error) throw error
        setSupabaseContracts(data || [])
      } catch (e) {
        setSupabaseContracts([])
      } finally {
        setLoadingSupabase(false)
      }
    }
    load()
  }, [stateCode, countyFips])

  // Hardcoded templates list for jurisdiction
  const hardcodedContracts = useMemo(
    () => getContractsForJurisdiction(stateCode || undefined, countyFips || undefined),
    [stateCode, countyFips]
  )

  // Combined list
  const contracts = useMemo(() => {
    const supabaseOptions = supabaseContracts.map(sc => ({
      id: `sb:${sc.id}`,
      name: sc.contract_name,
      template: '',
      supabaseContract: sc
    }))
    return [...supabaseOptions, ...hardcodedContracts]
  }, [supabaseContracts, hardcodedContracts])

  // Reflect selection -> template and preview
  useEffect(() => {
    const found = contracts.find(c => c.id === contractId) || null
    setSelectedTemplate(found)
    setApplyResult(null)
    if (!contractId) return
    if (contractId.startsWith('sb:')) {
      const actualId = contractId.replace('sb:', '')
      loadContractPreview(actualId)
    } else {
      setContractPreview('')
    }
  }, [contractId, contracts])

  const loadContractPreview = async (id: string) => {
    setLoadingPreview(true)
    try {
      const res = await fetch(`/api/contracts/preview?id=${id}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setContractPreview(data.previewText || 'No preview available')
      else setContractPreview('Failed to load contract preview')
    } catch {
      setContractPreview('Error loading contract preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  const onLoadSupabaseContract = async (contractFile: any) => {
    if (!contractFile) return
    setApplyResult(null)
    try {
      // Prefer server preview endpoint for reliability (works even for PDFs and private storage)
      setSelectedTemplate({ id: `sb:${contractFile.id}`, name: getContractDisplayName(contractFile.path.split('/').pop() || ''), template: '' })
      setContractId('')
      setSelectedSupabaseContract(contractFile.id)
      await loadContractPreview(contractFile.id)
    } catch (e:any) {
      alert(e?.message || 'Failed to load contract preview')
    }
  }

  const onApplyChanges = async () => {
    if (!nlCommand.trim()) { pushToast({ type: 'info', message: 'Describe the changes to apply.' }); return }
    if (!selectedTemplate && !selectedSupabaseContract) { pushToast({ type: 'info', message: 'Pick a contract first.' }); return }
    if (!selectedClientId) { pushToast({ type: 'info', message: 'Pick a client first.' }); return }
    setApplyLoading(true)
    setApplyResult(null)
    try {
      const useSb = selectedSupabaseContract || (selectedTemplate?.id?.startsWith('sb:'))
      const contractFileId = selectedSupabaseContract || (selectedTemplate?.id?.startsWith('sb:') ? selectedTemplate.id.replace('sb:', '') : null)
      if (useSb && contractFileId) {
        const res = await fetch('/api/contracts/amend-storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contractFileId, naturalChanges: nlCommand, clientId: selectedClientId }) })
        const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Failed to amend')
        setApplyResult({ updated: `Contract amended successfully! New version ${json.version} saved to: ${json.newPath}`, summary: json.summary })
        if (json.amendedText) setContractPreview(json.amendedText)
        if (json.updatedContractId) { await loadContractPreview(json.updatedContractId); setSelectedSupabaseContract(json.updatedContractId) }
        // refresh
        const { supabase } = await import('@/lib/supabaseBrowser')
        let query = supabase.from('contract_files').select('*').eq('state_code', stateCode)
        if (countyFips) query = query.eq('county_fips', countyFips)
        const { data: refreshed } = await query
        if (refreshed) setSupabaseContracts(refreshed)
      } else if (selectedTemplate?.template) {
        const clientContext = { clientId: selectedClientId, location: { state: stateCode, countyFips }, templateId: selectedTemplate.id }
        const res = await fetch('/api/contracts/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contractTemplate: selectedTemplate.template, naturalChanges: nlCommand, clientContext }) })
        const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Failed to apply')
        setApplyResult({ updated: json.updated, summary: json.summary })
      } else {
        throw new Error('No valid contract selected')
      }
    } catch (e:any) {
      alert(e?.message || 'Failed to apply changes')
    } finally {
      setApplyLoading(false)
    }
  }

  return (
  <main className="min-h-screen" style={{ background: 'linear-gradient(180deg,#F7F3EE,#F3EEE7 60%, #EFE8DF)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-4 has-bottom-nav">
        <section className="space-y-3">
          <h1 className="text-[20pt] leading-tight font-semibold text-slate-900">Actions</h1>
          <div className="text-slate-600">Pick a client, then choose an action</div>
          <ClientSelector />
        </section>

        {/* Sticky quick-action buttons */}
        <StickyActionButtons open={open} setOpen={setOpen} />

        {/* Panels */}
        {open === 'followup' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 mt-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900">Generate Follow‑Up</div>
              {activeClient && (
                <div className="text-sm text-slate-500">Client: {(activeClient as any)?.name || (activeClient as any)?.first_name || ''} {(activeClient as any)?.last_name || ''}</div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div>
                <div className="text-xs text-slate-500 mb-1">Channel</div>
                <select className="h-10 w-full input-neon px-3 text-sm" value={fuChannel} onChange={e=>setFuChannel(e.target.value as any)}>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Tone</div>
                <select className="h-10 w-full input-neon px-3 text-sm" value={fuTone} onChange={e=>setFuTone(e.target.value)}>
                  {['Professional','Friendly','Concise'].map(t=> <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Client</div>
                <div className="h-10 w-full rounded border border-slate-200 bg-slate-50 text-slate-700 px-3 text-sm grid place-items-center">{(activeClient as any)?.name || 'Not selected'}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <button onClick={async ()=>{
                if (!selectedClientId) { pushToast({ type:'info', message: 'Pick a client first.'}); return }
                setFuLoading(true)
                try {
                  const res = await fetch('/api/ai/followup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, channel: fuChannel, instruction: `Tone: ${fuTone}. ${fuInstruction}` }) })
                  const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Failed to generate')
                  setFuDraft(json.draft || '')
                } catch (e:any) { pushToast({ type:'error', message: e?.message || 'Generation failed'}) } finally { setFuLoading(false) }
              }} disabled={fuLoading || !selectedClientId} className={`h-10 px-4 rounded text-sm text-white ${fuLoading? 'bg-slate-400':'bg-slate-900 hover:opacity-90'}`}>{fuLoading?'Generating…':'Generate'}</button>
              {fuDraft && (
                <>
                  <button onClick={()=>navigator.clipboard.writeText(fuDraft)} className="h-10 px-3 rounded text-sm bg-white text-slate-900 border border-slate-200">Copy</button>
                  {(fuChannel==='email' && (activeClient as any)?.email) && (
                    <a href={`mailto:${(activeClient as any)?.email}?subject=${encodeURIComponent('Follow-up')}&body=${encodeURIComponent(fuDraft)}`} className="h-10 px-3 rounded text-sm text-white bg-slate-900">Open Email</a>
                  )}
                  {(fuChannel==='sms' && (activeClient as any)?.phone) && (
                    <a href={`sms:${(activeClient as any)?.phone}`} className="h-10 px-3 rounded text-sm text-white bg-slate-900">Open SMS</a>
                  )}
                </>
              )}
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-500 mb-1">Instruction</div>
              <textarea className="w-full min-h-[120px] input-neon p-3 text-base text-black placeholder-black/70" value={fuInstruction} onChange={e=>setFuInstruction(e.target.value)} placeholder="Add extra context or requests" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mt-4 min-h-[120px]">
              <div className="text-sm font-semibold mb-2">Draft Preview</div>
              {fuDraft ? (<pre className="whitespace-pre-wrap text-slate-900">{fuDraft}</pre>) : (
                <div className="text-slate-500">Your AI-generated draft will appear here.</div>
              )}
            </div>
          </section>
        )}

        {open === 'task' && (
          <section className="mt-3">
            <QuickTaskForm clientId={selectedClientId || undefined} onCreated={() => _setOpen(null)} onCancel={() => _setOpen(null)} />
          </section>
        )}

        {open === 'amend' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 mt-3 space-y-3">
            <div className="font-semibold text-slate-900">Amend Contracts</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select className="input-neon px-2 py-2" value={stateCode} onChange={e => { setStateCode(e.target.value); setCountyFips(''); setContractId('') }}>
                <option value="">Select state…</option>
                {ALLOWED_STATES.map(code => {
                  const s = US_STATES.find(x => x.code === code)
                  return s ? <option key={s.code} value={s.code}>{s.name}</option> : null
                })}
              </select>
              <select className="input-neon px-2 py-2" value={countyFips} onChange={e => { setCountyFips(e.target.value); setContractId('') }} disabled={!stateCode}>
                <option value="">All counties</option>
                {counties.map(c => <option key={c.fips} value={c.fips}>{c.name}</option>)}
              </select>
              <select className="input-neon px-2 py-2" value={contractId} onChange={e => setContractId(e.target.value)} disabled={!stateCode}>
                <option value="">Select contract…</option>
                {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {(loadingSupabase || supabaseContracts.length > 0) && !contractId && (
              <div className="mt-2">
                <div className="text-sm text-ink/80 mb-2 font-medium">Your uploaded contracts</div>
                {loadingSupabase ? (
                  <div className="text-slate-600">Loading contracts...</div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(CONTRACT_CATEGORIES).map(([category, categoryFiles]) => {
                      const categoryContracts = supabaseContracts.filter(contract => categoryFiles.includes(contract.path.split('/').pop() || ''))
                      if (categoryContracts.length === 0) return null
                      return (
                        <div key={category}>
                          <div className="text-sm font-semibold mb-2">{category}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {categoryContracts.map(contract => {
                              const filename = contract.path.split('/').pop() || ''
                              const displayName = getContractDisplayName(filename)
                              return (
                                <button
                                  key={contract.id}
                                  className={`p-4 rounded-lg border text-left text-base font-medium ${selectedSupabaseContract === contract.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'}`}
                                  onClick={() => onLoadSupabaseContract(contract)}
                                >
                                  <div className="font-semibold">{displayName}</div>
                                  <div className="text-sm opacity-70 mt-1">{contract.state_code} • {contract.status} • v{contract.version}</div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {contractId && selectedTemplate && (
              <div className="mt-2">
                <div className="text-sm text-ink/80 mb-2 font-medium">Selected Contract</div>
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-slate-900">
                  <div className="font-semibold text-lg">{selectedTemplate.name}</div>
                  <div className="text-sm opacity-70 mt-1">{contractId.startsWith('sb:') ? 'From your uploads' : 'Template contract'}</div>
                </div>
                <button className="mt-2 text-sm text-slate-700 hover:text-slate-900 font-medium" onClick={() => { setContractId(''); setSelectedTemplate(null); setSelectedSupabaseContract(''); setNlCommand(''); setApplyResult(null) }}>← Back to all contracts</button>
              </div>
            )}

            {(selectedTemplate || selectedSupabaseContract) && (
              <div className="space-y-3 mt-3">
                <div className="contract-preview rounded-xl p-4 border border-slate-200 bg-slate-50 max-h-[60vh] overflow-auto">
                  <div className="text-sm font-semibold mb-2">Contract Preview</div>
                  {loadingPreview ? (
                    <div className="text-slate-600">Loading contract...</div>
                  ) : contractPreview ? (
                    <pre className="whitespace-pre-wrap text-slate-900">{contractPreview}</pre>
                  ) : selectedTemplate?.template ? (
                    <pre className="whitespace-pre-wrap text-slate-900">{selectedTemplate.template}</pre>
                  ) : (
                    <div className="text-slate-600">No preview available</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-ink/80 mb-2 font-semibold">Describe your changes</div>
                  <textarea className="w-full min-h-[120px] input-neon p-3 text-base text-black placeholder-black/70" value={nlCommand} onChange={e => setNlCommand(e.target.value)} placeholder="e.g., extend closing by 10 days; increase earnest money to $5,000; add inspection contingency." />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <button className={`px-4 py-2 rounded-lg text-white ${applyLoading ? 'bg-slate-400' : 'bg-slate-900 hover:opacity-95'}`} disabled={applyLoading || !nlCommand.trim()} onClick={onApplyChanges}>{applyLoading ? 'Applying…' : 'Apply changes'}</button>
                  <button className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-900" onClick={() => { setNlCommand(''); setApplyResult(null) }}>Reset</button>
                  {(contractPreview || selectedSupabaseContract) && (
                    <button
                      className={`px-4 py-2 rounded-lg text-white ${sendingDs ? 'bg-slate-500' : 'bg-red-700 hover:bg-red-800'}`}
                      disabled={sendingDs}
                      onClick={async () => {
                        setDsError(null)
                        setSendingDs(true)
                        try {
                          const payload: any = selectedSupabaseContract
                            ? { contractId: selectedSupabaseContract }
                            : { text: contractPreview || selectedTemplate?.template, name: selectedTemplate?.name || 'Contract' }
                          const res = await fetch('/api/docusign/sender-view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                          const json = await res.json()
                          if (!res.ok) {
                            if ((json?.error || '').toLowerCase().includes('consent')) {
                              const c = await fetch('/api/docusign/consent')
                              const j = await c.json()
                              if (j?.url) window.open(j.url, '_blank', 'noopener')
                              else throw new Error(json?.error || 'DocuSign consent required')
                            } else {
                              throw new Error(json?.error || `Failed to start DocuSign (${res.status})`)
                            }
                          } else if (json?.url) {
                            window.open(json.url, '_blank', 'noopener')
                          }
                        } catch (e:any) {
                          setDsError(e?.message || 'DocuSign error')
                        } finally {
                          setSendingDs(false)
                        }
                      }}
                    >
                      {sendingDs ? 'Opening DocuSign…' : 'Send to DocuSign'}
                    </button>
                  )}
                </div>
                {dsError && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{dsError}</div>
                )}
              </div>
            )}

            {applyResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 overflow-auto max-h-[50vh]">
                  <div className="text-sm font-semibold mb-2">Updated Contract</div>
                  <pre className="whitespace-pre-wrap text-slate-900">{applyResult.updated}</pre>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 overflow-auto max-h-[50vh]">
                  <div className="text-sm font-semibold mb-2">Summary of Changes</div>
                  <pre className="whitespace-pre-wrap text-slate-900">{applyResult.summary}</pre>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}