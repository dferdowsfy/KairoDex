export type UUID = string

export type Stage = 'new' | 'nurture' | 'touring' | 'offer' | 'under_contract' | 'closed' | 'lost'

export interface Client {
  id: UUID
  agent_id: UUID
  name: string
  email?: string
  phone?: string
  stage: Stage
  preferences?: {
    budget_min?: number
    budget_max?: number
    locations?: string[]
    must?: string[]
    nice?: string[]
  }
  created_at: string
}

export interface Note { id: UUID; client_id: UUID; agent_id: UUID; body: string; created_at: string }
export interface Task { id: UUID; client_id?: UUID; agent_id: UUID; title: string; due_at?: string; status: 'open'|'done'; created_at: string }
export interface Event { id: UUID; client_id: UUID; agent_id: UUID; type: 'note'|'message'|'task'|'document'|'status'; ref_id?: UUID; meta?: any; created_at: string }
export interface Message { id: UUID; client_id: UUID; agent_id: UUID; direction: 'in'|'out'; channel: 'email'|'sms'; body: string; created_at: string }
export interface Document { id: UUID; client_id: UUID; agent_id: UUID; title: string; status: 'draft'|'final'; content?: string; created_at: string }
