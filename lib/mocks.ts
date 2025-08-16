import type { Client, Event, Note, Task, Stage, Document } from '@/lib/types'

// Simple in-memory mock DB
let idSeq = 1
const genId = () => String(idSeq++)
const now = () => new Date().toISOString()

const agentId = 'agent_1'

const clients: Client[] = [
  { id: genId(), agent_id: agentId, name: 'Ava Thompson', email: 'ava@example.com', phone: '+1 415 555 1020', stage: 'touring', created_at: now(), preferences: { budget_min: 750000, budget_max: 1200000, locations: ['SoMa','Noe Valley'], must: ['Parking','Natural light'], nice: ['Roof deck'] } },
  { id: genId(), agent_id: agentId, name: 'Mateo Garcia', email: 'mateo@example.com', phone: '+1 323 555 3001', stage: 'nurture', created_at: now() },
  { id: genId(), agent_id: agentId, name: 'Zoe Chen', email: 'zoe@example.com', phone: '+1 650 555 7777', stage: 'offer', created_at: now() }
]

const notes: Note[] = [
  { id: genId(), agent_id: agentId, client_id: clients[0].id, body: 'Loved the natural light at 123 Market St. Wants to see weekend options.', created_at: now() },
  { id: genId(), agent_id: agentId, client_id: clients[1].id, body: 'Prefers neighborhoods near parks.', created_at: now() }
]

const tasks: Task[] = [
  { id: genId(), agent_id: agentId, client_id: clients[0].id, title: 'Send 3 condo options in SoMa', status: 'open', due_at: new Date(Date.now()+86400000).toISOString(), created_at: now() },
  { id: genId(), agent_id: agentId, client_id: clients[2].id, title: 'Draft counter‑offer terms', status: 'open', created_at: now() }
]

const events: Event[] = [
  { id: genId(), agent_id: agentId, client_id: clients[0].id, type: 'note', ref_id: notes[0].id, created_at: now() },
  { id: genId(), agent_id: agentId, client_id: clients[0].id, type: 'task', ref_id: tasks[0].id, created_at: now() }
]

// Documents (contracts)
const documents: Document[] = [
  { id: genId(), agent_id: agentId, client_id: clients[2].id, title: 'Purchase Agreement - Zoe Chen', status: 'draft', content: `Purchase Agreement\n\nBuyer: Zoe Chen\nProperty: 456 Oak Ave, San Mateo, CA\nPrice: $1,150,000\nClosing Date: 2025-09-15\nContingencies: Inspection, Financing`, created_at: now() },
  { id: genId(), agent_id: agentId, client_id: clients[0].id, title: 'Touring Schedule - Ava Thompson', status: 'final', content: `Showing Plan\n\nClient: Ava Thompson\nNeighborhoods: SoMa, Noe Valley\nDates: This weekend`, created_at: now() }
]

// Query helpers
export const mockDb = {
  // Clients
  async listClients(params?: { search?: string; stage?: Stage | 'all' }) {
    let out = [...clients].sort((a,b)=>b.created_at.localeCompare(a.created_at))
    if (params?.search) out = out.filter(c => c.name.toLowerCase().includes(params.search!.toLowerCase()))
    if (params?.stage && params.stage !== 'all') out = out.filter(c => c.stage === params.stage)
    return out
  },
  async getClient(id: string) {
    const c = clients.find(c=>c.id===id)
    if (!c) throw new Error('Client not found')
    return c
  },
  async updateClientStage(id: string, stage: Stage) {
    const c = clients.find(c=>c.id===id)
    if (c) c.stage = stage
  },

  // Notes
  async listNotes(clientId: string) {
    return notes.filter(n=>n.client_id===clientId).sort((a,b)=>b.created_at.localeCompare(a.created_at))
  },
  async addNote(clientId: string, body: string) {
  const n: Note = { id: genId(), agent_id: agentId, client_id: clientId, body, created_at: now() }
    notes.unshift(n)
  events.unshift({ id: genId(), agent_id: agentId, client_id: clientId, type: 'note', ref_id: n.id, created_at: now() })
    return n
  },
  async listRecentNotes(limit = 5) {
    return [...notes].sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0, limit)
  },

  // Tasks
  async listTasks(clientId?: string) {
    let out = [...tasks]
    if (clientId) out = out.filter(t=>t.client_id===clientId)
    return out.sort((a,b)=>{
      const ad = a.due_at ?? '9999'
      const bd = b.due_at ?? '9999'
      return ad.localeCompare(bd)
    })
  },
  async completeTask(id: string) {
    const t = tasks.find(t=>t.id===id); if (t) t.status = 'done'
  },
  async snoozeTask(id: string, minutes: number) {
    const t = tasks.find(t=>t.id===id); if (t) t.due_at = new Date(Date.now()+minutes*60_000).toISOString()
  },
  async createTask(task: Partial<Task>) {
  const t: Task = { id: genId(), agent_id: agentId, title: task.title ?? 'Task', status: task.status ?? 'open', client_id: task.client_id, due_at: task.due_at, created_at: now() }
    tasks.unshift(t)
  if (t.client_id) events.unshift({ id: genId(), agent_id: agentId, client_id: t.client_id, type: 'task', ref_id: t.id, created_at: now() })
    return t
  },

  // Events
  async listEvents(clientId: string) {
    return events.filter(e=>e.client_id===clientId).sort((a,b)=>b.created_at.localeCompare(a.created_at))
  },

  // Documents
  async listDocuments(params?: { status?: 'draft'|'final'; clientId?: string }) {
    let out = [...documents]
    if (params?.status) out = out.filter(d=>d.status===params.status)
    if (params?.clientId) out = out.filter(d=>d.client_id===params.clientId)
    return out.sort((a,b)=>b.created_at.localeCompare(a.created_at))
  },
  async amendDocument(id: string, command: string) {
    const d = documents.find(d=>d.id===id)
    if (!d) throw new Error('Document not found')
    // Naive parser for a couple common intents
    const lower = command.toLowerCase()
    // Price
    const priceMatch = lower.match(/price\s*(to|=)\s*\$?([\d,\.]+)/)
    if (priceMatch) {
      const num = priceMatch[2].replace(/,/g,'')
      d.content = d.content?.replace(/Price:\s*\$?[\d,\.]+/, `Price: $${Number(num).toLocaleString()}`)
    }
    // Closing date
    const dateMatch = lower.match(/closing date\s*(to|=|on)\s*([a-z0-9 ,\/-]+)/)
    if (dateMatch) {
      const raw = dateMatch[2].trim()
      const dt = new Date(raw)
      const iso = isNaN(dt.getTime()) ? raw : dt.toISOString().slice(0,10)
      d.content = d.content?.replace(/Closing Date:\s*[\w-]+/, `Closing Date: ${iso}`)
    }
    d.status = 'draft'
  events.unshift({ id: genId(), agent_id: agentId, client_id: d.client_id, type: 'document', ref_id: d.id, meta: { action: 'amend', command }, created_at: now() })
    return d
  }
}
