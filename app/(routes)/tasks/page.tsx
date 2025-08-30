"use client"
export const dynamic = 'force-dynamic'
import { useTasks } from '@/hooks/useTasks'
import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import WheelDateTime from '@/components/WheelDateTime'
import { useSearchParams } from 'next/navigation'
import { useUI } from '@/store/ui'
import { useClient } from '@/hooks/useClient'
import { US_STATES, getStateByCode } from '@/lib/us'
import { getContractsForJurisdiction, type ContractTemplate } from '@/lib/contracts'
import { getContractDisplayName, getContractCategory, CONTRACT_CATEGORIES } from '@/lib/contractMappings'

/* ---------- Quick Action Button (active = themed gradient, inactive = grey) ---------- */
function QuickActionButton({
  id,
  label,
  activePanel,
  setActivePanel,
  size = 'text-lg',
  onClick
}: {
  id: 'amend' | 'followup' | 'create',
  label: string,
  activePanel: 'amend' | 'followup' | 'create' | null,
  setActivePanel: React.Dispatch<React.SetStateAction<'amend'|'followup'|'create'|null>>,
  size?: string,
  onClick?: () => void
}) {
  const isActive = activePanel === id
  const base = `p-5 rounded-2xl sf-display ${size} font-semibold transition-colors shadow-sm`
  // Match button color to the dropdown/panel theme
  const colorMap: Record<'amend' | 'followup' | 'create', string> = {
    amend:   'bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white hover:opacity-90',
    followup:'bg-gradient-to-r from-green-900 via-emerald-800 to-green-700 text-white hover:opacity-90',
    create:  'bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white hover:opacity-90',
  }
  const inactiveCls = `panel-glass text-white border border-white/20`
  return (
    <button
      role="tab"
      aria-selected={isActive}
      className={`${base} ${isActive ? colorMap[id] : inactiveCls}`}
      onClick={() => {
        if (onClick) return onClick()
        setActivePanel(p => (p === id ? null : id))
      }}
    >
      {label}
    </button>
  )
}

export default function TasksPage() {
  const { data, complete, snooze } = useTasks()
  const now = new Date()
  const [activePanel, setActivePanel] = useState<'amend'|'followup'|'create'|null>(null)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState<Date | null>(null)
  const [reminder, setReminder] = useState('')
  // Amend Contracts UI state
  const [stateCode, setStateCode] = useState<string>('')
  const [countyFips, setCountyFips] = useState<string>('')
  const [counties, setCounties] = useState<{ name: string; fips: string }[]>([])
  const [contractId, setContractId] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const [nlCommand, setNlCommand] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyResult, setApplyResult] = useState<{ updated?: string; summary?: string } | null>(null)
  // Follow-up composer state
  const [fuChannel, setFuChannel] = useState<'email'|'sms'>('email')
  const [fuTone, setFuTone] = useState('Professional')
  const [fuInstruction, setFuInstruction] = useState('Draft a brief follow-up based on recent activity.')
  const [fuDraft, setFuDraft] = useState('')
  const [fuLoading, setFuLoading] = useState(false)
  // DocuSign state
  const [sendingDs, setSendingDs] = useState(false)
  const [dsError, setDsError] = useState<string | null>(null)
  // Supabase contracts state
  const [supabaseContracts, setSupabaseContracts] = useState<any[]>([])
  const [loadingSupabase, setLoadingSupabase] = useState(false)
  const [selectedSupabaseContract, setSelectedSupabaseContract] = useState<string>('')
  const [contractPreview, setContractPreview] = useState<string>('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  // Available states with contracts
  const [availableStates, setAvailableStates] = useState<string[]>([])
  const [loadingStates, setLoadingStates] = useState(false)

  const overdue = (t: any) => t.due_at && new Date(t.due_at) < now && t.status !== 'done'
  const dueSoon = (t: any) => t.due_at && new Date(t.due_at).getTime() - now.getTime() < 1000 * 60 * 60 * 24 && !overdue(t) && t.status !== 'done'
  const colorBar = (t: any) => overdue(t) ? 'bg-warn' : (dueSoon(t) ? 'bg-primary' : 'bg-accent')
  const params = useSearchParams()
  const { selectedClientId, setSelectedClientId } = useUI()
  const { data: activeClient } = useClient(selectedClientId as any)

  // React to dashboard quick links
  useEffect(() => {
  const quick = params?.get('quick')
  const view = params?.get('view')
    if (quick === 'emails') {
      const email = (activeClient as any)?.email
      if (email) window.location.href = `mailto:${email}?subject=${encodeURIComponent('Follow-up')}`
    }
    if (quick === 'calls') {
      setActivePanel('create')
    }
    if (quick === 'amend') {
      setActivePanel('amend')
    }
    // view=calendar reserved for future calendar embed
  }, [params, activeClient])

  // Load available states with contracts
  useEffect(() => {
    const loadAvailableStates = async () => {
      setLoadingStates(true)
      try {
        const res = await fetch('/api/contracts/states')
        if (res.ok) {
          const data = await res.json()
          setAvailableStates(data.states || [])
        } else {
          console.error('Failed to load available states')
          setAvailableStates([])
        }
      } catch (e) {
        console.error('Error loading available states:', e)
        setAvailableStates([])
      } finally {
        setLoadingStates(false)
      }
    }
    loadAvailableStates()
  }, [])

  // Load Supabase contracts when state/county changes
  useEffect(() => {
    if (!stateCode) {
      setSupabaseContracts([])
      return
    }
    setLoadingSupabase(true)
    const loadSupabaseContracts = async () => {
      try {
        console.log('🔍 Loading contracts for state:', stateCode, 'county:', countyFips)
        const { supabase } = await import('@/lib/supabaseBrowser')
        let query = supabase
          .from('contract_files')
          .select('*')
          .eq('state_code', stateCode)
        if (countyFips) {
          query = query.eq('county_fips', countyFips)
        }
        const { data, error } = await query
        console.log('📊 Supabase query result:', { data, error, count: data?.length, firstRecord: data?.[0] })
        if (error) throw error
        setSupabaseContracts(data || [])
      } catch (e) {
        console.error('❌ Failed to load Supabase contracts:', e)
        setSupabaseContracts([])
      } finally {
        setLoadingSupabase(false)
      }
    }
    loadSupabaseContracts()
  }, [stateCode, countyFips])

  // Load counties when state changes
  useEffect(() => {
    const s = stateCode && getStateByCode(stateCode)
    if (!s) { setCounties([]); setCountyFips(''); return }
    const fips = s.fips
    fetch(`/api/geo/counties?state=${encodeURIComponent(fips)}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('counties failed')))
      .then(json => setCounties(json.items || []))
      .catch(() => setCounties([]))
  }, [stateCode])

  // Contracts list for selected jurisdiction (hardcoded)
  const hardcodedContracts = useMemo(
    () => getContractsForJurisdiction(stateCode || undefined, countyFips || undefined),
    [stateCode, countyFips]
  )

  // Combined contracts list (Supabase + hardcoded)
  const contracts = useMemo(() => {
    console.log('🔄 Combining contracts. Supabase contracts:', supabaseContracts.length)
    const supabaseContractOptions = supabaseContracts.map(sc => ({
      id: `sb:${sc.id}`,
      name: sc.contract_name,
      template: '', // Not needed for Supabase contracts
      supabaseContract: sc
    }))
    console.log('📝 Supabase contract options:', supabaseContractOptions.length)
    console.log('📝 Hardcoded contracts:', hardcodedContracts.length)
    const combined = [...supabaseContractOptions, ...hardcodedContracts]
    console.log('📋 Combined contracts:', combined.length, combined.map(c => c.name))
    return combined
  }, [supabaseContracts, hardcodedContracts])

  // React to explicit contract selection changes; avoid clearing preview on list refreshes
  useEffect(() => {
    const found = contracts.find(c => c.id === contractId) || null
    setSelectedTemplate(found)
    setApplyResult(null)

    if (!contractId) return // Do not clear preview when selection is empty

    // Load contract preview if it's a Supabase-backed selection
    if (contractId.startsWith('sb:')) {
      const actualContractId = contractId.replace('sb:', '')
      loadContractPreview(actualContractId)
    } else {
      // Non-Supabase template selection: clear preview so the raw template shows
      setContractPreview('')
    }
  }, [contractId, contracts])

  const loadContractPreview = async (contractId: string) => {
    setLoadingPreview(true)
    try {
      const res = await fetch(`/api/contracts/preview?id=${contractId}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        setContractPreview(data.previewText || 'No preview available')
      } else {
        setContractPreview('Failed to load contract preview')
      }
    } catch (e) {
      setContractPreview('Error loading contract preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  const onLoadSupabaseContract = async (contractFile: any) => {
    if (!contractFile) return
    setApplyResult(null)
    try {
      const { supabase } = await import('@/lib/supabaseBrowser')
      const { data, error } = await supabase.storage
        .from(contractFile.bucket)
        .download(contractFile.path)
      if (error || !data) throw new Error(error?.message || 'Download failed')
      const text = await data.text()
      setSelectedTemplate({
        id: `sb:${contractFile.id}`,
        name: getContractDisplayName(contractFile.path.split('/').pop() || ''),
        template: text
      })
      setContractId('')
      setSelectedSupabaseContract(contractFile.id)
    } catch (e) {
      alert((e as any)?.message || 'Failed to load contract')
    }
  }

  // Loading from Supabase Storage is supported via upload + transform service; UI will be added after server route is finalized.

  const onApplyChanges = async () => {
    if (!nlCommand.trim()) return
    if (!selectedTemplate && !selectedSupabaseContract) return
    
    setApplyLoading(true)
    setApplyResult(null)
    try {
      const useSupabaseContract = selectedSupabaseContract || (selectedTemplate?.id?.startsWith('sb:'))
      const contractFileId = selectedSupabaseContract || (selectedTemplate?.id?.startsWith('sb:') ? selectedTemplate.id.replace('sb:', '') : null)
      if (useSupabaseContract && contractFileId) {
        // Use Supabase contract amendment endpoint
        const res = await fetch('/api/contracts/amend-storage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            contractFileId: contractFileId, 
            naturalChanges: nlCommand, 
            clientId: selectedClientId 
          })
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to amend')
        setApplyResult({ 
          updated: `Contract amended successfully! New version ${json.version} saved to: ${json.newPath}`, 
          summary: json.summary 
        })
        // Optimistically set preview from response and pin selection to amended contract
        if (json.amendedText) setContractPreview(json.amendedText)
        if (json.updatedContractId) {
          await loadContractPreview(json.updatedContractId)
          setSelectedSupabaseContract(json.updatedContractId)
        }
        // Refresh Supabase contracts
        const { supabase } = await import('@/lib/supabaseBrowser')
        let query = supabase.from('contract_files').select('*').eq('state_code', stateCode)
        if (countyFips) query = query.eq('county_fips', countyFips)
        const { data: refreshedData } = await query
        if (refreshedData) setSupabaseContracts(refreshedData)
      } else if (selectedTemplate?.template) {
        // Use hardcoded template amendment endpoint
        const clientContext = {
          client: activeClient ?? null,
          location: { state: stateCode, countyFips },
          templateId: selectedTemplate.id,
        }
        const res = await fetch('/api/contracts/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractTemplate: selectedTemplate.template, naturalChanges: nlCommand, clientContext })
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to apply')
        setApplyResult({ updated: json.updated, summary: json.summary })
      } else {
        throw new Error('No valid contract selected')
      }
    } catch (e) {
      alert((e as any)?.message || 'Failed to apply changes')
    } finally {
      setApplyLoading(false)
    }
  }

  return (
  <main className="min-h-screen p-4" style={{ background: 'var(--page-bg)' }}>
      <div className="mb-4 flex items-center justify-between">
    <h1 className="sf-display h2 text-white">Tasks</h1>
    <button aria-label="Add task" className="flex items-center gap-1 btn-neon px-3 py-1.5 active:scale-[0.98]" onClick={() => setActivePanel(p => p==='create'? null : 'create')}>
          <Plus className="h-4 w-4" /> <span className="text-sm">Add</span>
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left content */}
        <section className="space-y-4 lg:col-span-2">
          {/* Quick Actions row with matching active colors */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4" role="tablist">
            <QuickActionButton
              id="amend"
              label="Amend Contracts"
              activePanel={activePanel}
              setActivePanel={setActivePanel}
              size="text-xl"
            />
            <QuickActionButton
              id="followup"
              label="Generate Follow‑Up"
              activePanel={activePanel}
              setActivePanel={setActivePanel}
            />
            <QuickActionButton
              id="create"
              label="Create Task"
              activePanel={activePanel}
              setActivePanel={setActivePanel}
            />
          </div>

          {activePanel === 'create' && (
            <div className="panel-glass rounded-apple border border-white/50 p-4 shadow-sm bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500">
              <div className="flex flex-col gap-3">
                <input
                  className="h-12 input-neon px-4 text-base"
                  placeholder="Task title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <div>
                  <div className="text-xs text-ink/60 mb-1">Date & time</div>
                  <WheelDateTime value={due ?? undefined} onChange={setDue} />
                </div>
                <div>
                  <div className="text-xs text-ink/60 mb-1">Reminder text</div>
                  <input
                    className="h-12 w-full input-neon px-4 text-base"
                    placeholder="What should we remind you to do?"
                    value={reminder}
                    onChange={(e) => setReminder(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <SaveButton title={title} due={due ?? undefined} reminder={reminder} onSaved={() => { setActivePanel(null); setTitle(''); setDue(null); setReminder('') }} />
                  <button className="h-10 px-4 rounded border border-white/50 bg-white/60 text-ink/80 text-sm" onClick={() => { setActivePanel(null); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'followup' && (
            <div className="panel-glass rounded-apple border border-white/50 p-4 shadow-sm mt-4">
              <div className="flex justify-between items-center bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-600 p-4 rounded-lg -mx-4 -mt-4 mb-6">
                <div className="sf-display text-white text-2xl font-bold">Generate Follow‑Up</div>
                {activeClient && (
                  <div className="text-sm text-white/80 bg-white/10 px-3 py-1 rounded-lg">
                    Client: {(activeClient as any)?.name || (activeClient as any)?.first_name + ' ' + (activeClient as any)?.last_name || 'Selected Client'}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-ink/60 mb-1">Channel</div>
                  <select className="h-10 w-full input-neon px-3 text-sm" value={fuChannel} onChange={e=>setFuChannel(e.target.value as any)}>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-ink/60 mb-1">Tone</div>
                  <select className="h-10 w-full input-neon px-3 text-sm" value={fuTone} onChange={e=>setFuTone(e.target.value)}>
                    {['Professional','Friendly','Concise'].map(t=> <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-xs text-ink/60 mb-1">Client</div>
                  <div className="h-10 w-full rounded border border-white/50 bg-white/80 text-ink px-3 text-sm grid place-items-center">{(activeClient as any)?.name || 'Not selected'}</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xs text-ink/60 mb-1">Instruction</div>
                <textarea className="w-full min-h-[120px] input-neon p-3 text-base text-black placeholder-black/70" value={fuInstruction} onChange={e=>setFuInstruction(e.target.value)} placeholder="Add extra context or requests" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <button onClick={async ()=>{
                  if (!selectedClientId) { alert('Pick a client from the top bar first.'); return }
                  setFuLoading(true)
                  try {
                    const res = await fetch('/api/ai/followup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, channel: fuChannel, instruction: `Tone: ${fuTone}. ${fuInstruction}` }) })
                    const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Failed to generate')
                    setFuDraft(json.draft || '')
                  } catch (e:any) { alert(e?.message || 'Generation failed') } finally { setFuLoading(false) }
                }} disabled={fuLoading || !selectedClientId} className={`h-10 px-4 rounded text-sm text-white ${fuLoading? 'bg-slate-400':'bg-primary hover:opacity-90'}`}>{fuLoading?'Generating…':'Generate'}</button>
                {fuDraft && (
                  <>
                    <button onClick={()=>navigator.clipboard.writeText(fuDraft)} className="h-10 px-3 rounded text-sm bg-white/80 text-ink border border-white/50">Copy</button>
                    {/* Mailto / SMS links */}
                    {(fuChannel==='email' && (activeClient as any)?.email) && (
                      <a href={`mailto:${(activeClient as any)?.email}?subject=${encodeURIComponent('Follow-up')}&body=${encodeURIComponent(fuDraft)}`} className="h-10 px-3 rounded text-sm text-white bg-primary hover:opacity-90">Open Email</a>
                    )}
                    {(fuChannel==='sms' && (activeClient as any)?.phone) && (
                      <a href={`sms:${(activeClient as any)?.phone}`} className="h-10 px-3 rounded text-sm text-white bg-primary hover:opacity-90">Open SMS</a>
                    )}
                  </>
                )}
              </div>
              <div className="contract-preview rounded-xl p-5 mt-4 min-h-[160px]">
                <div className="text-sm font-semibold contract-preview-title mb-2">Draft Preview</div>
                {fuDraft ? (<pre className="whitespace-pre-wrap">{fuDraft}</pre>) : (
                  <div className="text-ink/70">Your AI-generated draft will appear here.</div>
                )}
              </div>
            </div>
          )}

          {activePanel === 'amend' && (
            <div className="panel-glass rounded-apple border border-white/50 p-4 shadow-sm mt-4">
              {/* Title — font size & background are easily adjustable here */}
              <div className="flex justify-between items-center bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 p-4 rounded-lg -mx-4 -mt-4 mb-6">
                <div className="sf-display text-white text-2xl font-bold">Amend Contracts</div>
                {activeClient && (
                  <div className="text-sm text-white/80 bg-white/10 px-3 py-1 rounded-lg">
                    Client: {(activeClient as any)?.name || (activeClient as any)?.first_name + ' ' + (activeClient as any)?.last_name || 'Selected Client'}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 p-4 rounded-lg">
                <div>
                  <div className="text-sm text-white/90 mb-2 font-medium">State</div>
                  <select className="h-12 w-full input-neon px-3 text-base font-medium" value={stateCode} onChange={e => { setStateCode(e.target.value); setCountyFips(''); setContractId('') }}>
                    <option value="">Select state…</option>
                    {loadingStates ? (
                      <option disabled>Loading states...</option>
                    ) : (
                      availableStates.map(stateCode => {
                        const state = US_STATES.find(s => s.code === stateCode)
                        return state ? (
                          <option key={state.code} value={state.code}>{state.name}</option>
                        ) : null
                      })
                    )}
                  </select>
                </div>
                <div>
                  <div className="text-sm text-white/90 mb-2 font-medium">Jurisdiction (County)</div>
                  <select className="h-12 w-full input-neon px-3 text-base font-medium" value={countyFips} onChange={e => { setCountyFips(e.target.value); setContractId('') }} disabled={!stateCode}>
                    <option value="">All counties</option>
                    {counties.map(c => <option key={c.fips} value={c.fips}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-sm text-white/90 mb-2 font-medium">Contract</div>
                  <select className="h-12 w-full input-neon px-3 text-base font-medium" value={contractId} onChange={e => setContractId(e.target.value)} disabled={!stateCode}>
                    <option value="">Select contract…</option>
                    {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {(loadingSupabase || supabaseContracts.length > 0) && !contractId && (
                <div className="mt-3 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 p-4 rounded-lg">
                  <div className="text-sm text-white/90 mb-3 font-medium">Or browse your uploaded contracts</div>
                  {loadingSupabase ? (
                    <div className="text-base text-white/80">Loading contracts...</div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(CONTRACT_CATEGORIES).map(([category, categoryFiles]) => {
                        const categoryContracts = supabaseContracts.filter(contract => 
                          categoryFiles.includes(contract.path.split('/').pop() || '')
                        )
                        if (categoryContracts.length === 0) return null
                        return (
                          <div key={category}>
                            <div className="text-sm text-white font-semibold mb-2">{category}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {categoryContracts.map(contract => {
                                const filename = contract.path.split('/').pop() || ''
                                const displayName = getContractDisplayName(filename)
                                return (
                                  <button
                                    key={contract.id}
                                    className={`p-4 rounded-lg border text-left text-base font-medium ${
                                      selectedSupabaseContract === contract.id 
                                        ? 'border-blue-300 bg-blue-100 text-blue-900' 
                                        : 'border-blue-300 bg-white text-gray-900 hover:bg-blue-50'
                                    }`}
                                    onClick={() => onLoadSupabaseContract(contract)}
                                  >
                                    <div className="font-semibold">{displayName}</div>
                                    <div className="text-sm opacity-70 mt-1">
                                      {contract.state_code} • {contract.status} • v{contract.version}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* Show uncategorized contracts */}
                      {(() => {
                        const uncategorized = supabaseContracts.filter(contract => {
                          const filename = contract.path.split('/').pop() || ''
                          return !Object.values(CONTRACT_CATEGORIES).flat().includes(filename)
                        })
                        if (uncategorized.length === 0) return null
                        return (
                          <div>
                            <div className="text-sm text-white font-semibold mb-2">Other</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {uncategorized.map(contract => {
                                const filename = contract.path.split('/').pop() || ''
                                const displayName = getContractDisplayName(filename)
                                return (
                                  <button
                                    key={contract.id}
                                    className={`p-4 rounded-lg border text-left text-base font-medium ${
                                      selectedSupabaseContract === contract.id 
                                        ? 'border-blue-300 bg-blue-100 text-blue-900' 
                                        : 'border-blue-300 bg-white text-gray-900 hover:bg-blue-50'
                                    }`}
                                    onClick={() => onLoadSupabaseContract(contract)}
                                  >
                                    <div className="font-semibold">{displayName}</div>
                                    <div className="text-sm opacity-70 mt-1">
                                      {contract.state_code} • {contract.status} • v{contract.version}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}
              
              {/* Selected contract from dropdown */}
              {contractId && selectedTemplate && (
                <div className="mt-3 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 p-4 rounded-lg">
                  <div className="text-sm text-white/90 mb-3 font-medium">Selected Contract</div>
                  <div className="p-4 rounded-lg border border-blue-300 bg-blue-100 text-blue-900">
                    <div className="font-semibold text-lg">{selectedTemplate.name}</div>
                    <div className="text-sm opacity-70 mt-1">
                      {contractId.startsWith('sb:') ? 'From your uploads' : 'Template contract'}
                    </div>
                  </div>
                  <button 
                    className="mt-3 text-sm text-white/80 hover:text-white font-medium"
                    onClick={() => {
                      setContractId('')
                      setSelectedTemplate(null)
                      setSelectedSupabaseContract('')
                      setNlCommand('')
                      setApplyResult(null)
                    }}
                  >
                    ← Back to all contracts
                  </button>
                </div>
              )}

              {/* Contract amendment interface */}
              {(selectedTemplate || selectedSupabaseContract) && (
                <div className="space-y-4 mt-4 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 p-6 rounded-lg">
                  {/* Contract preview section */}
                  <div className="contract-preview rounded-xl p-6 overflow-auto max-h-[70vh]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-semibold contract-preview-title">Contract Preview</div>
                      {contractPreview && (
                        <div className="flex items-center gap-2">
                          <button
                            className="text-xs px-3 py-1 rounded bg-blue-700 text-white hover:bg-blue-600"
                            onClick={() => navigator.clipboard.writeText(contractPreview)}
                            title="Copy to clipboard"
                          >Copy</button>
                          <button
                            className="text-xs px-3 py-1 rounded bg-blue-700 text-white hover:bg-blue-600"
                            onClick={() => {
                              const blob = new Blob([contractPreview], { type: 'text/plain;charset=utf-8' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = 'contract-amended.txt'
                              document.body.appendChild(a)
                              a.click()
                              document.body.removeChild(a)
                              URL.revokeObjectURL(url)
                            }}
                            title="Download as .txt"
                          >Download</button>
                        </div>
                      )}
                    </div>
                    {loadingPreview ? (
                      <div className="text-lg text-blue-100 p-4">Loading contract...</div>
                    ) : contractPreview ? (
                      <pre className="whitespace-pre-wrap">{contractPreview}</pre>
                    ) : selectedTemplate?.template ? (
                      <pre className="whitespace-pre-wrap">{selectedTemplate.template}</pre>
                    ) : selectedSupabaseContract ? (
                      <div className="text-lg text-blue-50 p-4">
                        <div className="font-semibold text-2xl mb-4 text-blue-200">
                          {supabaseContracts.find(c => c.id === selectedSupabaseContract)?.contract_name}
                        </div>
                        <div className="text-base text-blue-300 space-y-2">
                          <div>State: {supabaseContracts.find(c => c.id === selectedSupabaseContract)?.state_code}</div>
                          <div>County: {supabaseContracts.find(c => c.id === selectedSupabaseContract)?.county_fips}</div>
                          <div>Status: {supabaseContracts.find(c => c.id === selectedSupabaseContract)?.status}</div>
                          <div>Version: {supabaseContracts.find(c => c.id === selectedSupabaseContract)?.version}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-lg text-blue-300 p-4">No preview available</div>
                    )}
                  </div>
                  
                  {/* Amendment input section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <div className="text-sm text-white/90 mb-3 font-semibold">Describe your changes</div>
                      <textarea 
                        className="w-full min-h-[120px] input-neon p-4 text-lg font-medium text-black placeholder-black/70" 
                        placeholder="e.g., extend closing date by 10 days; increase earnest money to $5,000; add inspection contingency." 
                        value={nlCommand} 
                        onChange={e => setNlCommand(e.target.value)} 
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <button 
                        className={`btn-neon h-14 px-6 text-lg font-bold text-white shadow-lg disabled:opacity-60 disabled:cursor-not-allowed`} 
                        disabled={!nlCommand.trim() || applyLoading} 
                        onClick={onApplyChanges}
                      >
                        {applyLoading ? 'Applying…' : 'Apply changes'}
                      </button>
                      <button 
                        className="h-14 px-6 rounded-lg panel-glass border border-white/30 text-white text-lg font-bold hover:bg-white/10" 
                        onClick={() => { setNlCommand(''); setApplyResult(null) }}
                      >
                        Reset
                      </button>
                      {(contractPreview || selectedSupabaseContract) && (
                        <button
                          className={`h-14 px-6 rounded-lg text-lg font-bold text-white shadow-lg ${sendingDs ? 'bg-slate-500' : 'bg-red-800 hover:bg-red-900'}`}
                          disabled={sendingDs}
                          onClick={async () => {
                            setDsError(null)
                            setSendingDs(true)
                            try {
                              const payload: any = selectedSupabaseContract
                                ? { contractId: selectedSupabaseContract }
                                : { text: contractPreview, name: selectedTemplate?.name || 'Contract' }
                              
                              console.log('🔧 DocuSign payload:', {
                                hasContractId: !!payload.contractId,
                                hasText: !!payload.text,
                                textLength: payload.text?.length,
                                name: payload.name
                              })
                              
                              const res = await fetch('/api/docusign/sender-view', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                              })
                              
                              const json = await res.json()
                              console.log('🔧 DocuSign response:', { status: res.status, json })
                              
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
                            } catch (e: any) {
                              console.error('🚨 DocuSign error:', e)
                              setDsError(e?.message || 'DocuSign error')
                            } finally {
                              setSendingDs(false)
                            }
                          }}
                        >
                          {sendingDs ? 'Opening DocuSign…' : 'Send to DocuSign'}
                        </button>
                      )}
                      {dsError && (
                        <div className="text-sm text-red-200 bg-red-900/40 border border-red-700 rounded p-2">{dsError}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {applyResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-blue-900 rounded-xl border border-blue-600 p-4 overflow-auto max-h-[50vh]">
                    <div className="text-sm text-blue-200 mb-2 font-semibold">Updated Contract</div>
                    <pre className="whitespace-pre-wrap text-base text-blue-50">{applyResult.updated}</pre>
                  </div>
                  <div className="bg-blue-900 rounded-xl border border-blue-600 p-4 overflow-auto max-h-[50vh]">
                    <div className="text-sm text-blue-200 mb-2 font-semibold">Summary of Changes</div>
                    <pre className="whitespace-pre-wrap text-base text-blue-50">{applyResult.summary}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state cards when no tasks */}
          {!data?.length && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="ai-card ai-card-blue p-6 rounded-2xl">
                <div className="sf-display text-xl mb-1">Stay organized</div>
                <div className="text-pop opacity-80">Create your first task to track work.</div>
              </div>
              <div className="ai-card ai-card-amber p-6 rounded-2xl">
                <div className="sf-display text-xl mb-1">Snooze reminders</div>
                <div className="text-pop opacity-80">Push non-urgent work later.</div>
              </div>
              <div className="ai-card ai-card-blue p-6 rounded-2xl">
                <div className="sf-display text-xl mb-1">See deadlines</div>
                <div className="text-pop opacity-80">We highlight urgent items.</div>
              </div>
            </div>
          )}
        </section>

        {/* Right sidebar: current tasks */}
        <aside className="lg:col-span-1">
          <div className="panel-glass rounded-apple p-4 border border-white/20 shadow-sm sticky top-24 max-h-[75vh] overflow-auto">
            <div className="sf-display text-lg text-white mb-3">Current Tasks</div>
            <ul className="space-y-2">
              {data?.map(t => (
                <li key={t.id} className={`relative rounded-xl p-3 border shadow-sm text-black bg-white ${overdue(t) ? 'border-warn' : dueSoon(t) ? 'border-primary' : 'border-accent'}`}>
                  <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${colorBar(t)}`}></span>
                  <div className="sf-text text-[1.05rem] font-semibold">{t.title}</div>
                  <div className="text-xs text-black/60 mt-0.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full ${overdue(t) ? 'bg-warnSoft text-warn' : dueSoon(t) ? 'bg-primarySoft text-primary' : 'bg-accentSoft text-accent'}`}>
                      {t.due_at ? new Date(t.due_at).toLocaleString() : 'No due'}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {t.status !== 'done' && <button className="bg-accent hover:opacity-90 text-white rounded-lg px-3 py-1.5 shadow-sm" onClick={() => complete.mutate(t.id)}>Complete</button>}
                    {t.status !== 'done' && <button className="bg-white/80 text-black/80 border border-white/50 rounded-lg px-3 py-1.5 hover:bg-white" onClick={() => snooze.mutate({ id: t.id, minutes: 60 })}>Snooze 1h</button>}
                  </div>
                </li>
              ))}
              {!data?.length && (
                <li className="text-black/70 text-sm">No tasks yet.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  )
}

function SaveButton({ title, due, reminder, onSaved }: { title: string; due?: Date; reminder?: string; onSaved: () => void }) {
  const { create } = useTasks()
  const disabled = !title.trim()
  const handle = async () => {
    let due_at: string | undefined
    if (due) {
      const tzFixed = new Date(due.getTime() - due.getTimezoneOffset() * 60000)
      due_at = tzFixed.toISOString()
    }
    const combinedTitle = `${title.trim()}${reminder && reminder.trim() ? ' — ' + reminder.trim() : ''}`
    await create.mutateAsync({ title: combinedTitle, status: 'open', due_at })
    onSaved()
  }
  return (
  <button disabled={disabled} onClick={handle} className={`h-10 px-4 rounded text-sm text-black shadow-sm ${disabled ? 'bg-slate-300' : 'bg-accent hover:opacity-90'}`}>
      Save task
    </button>
  )
}