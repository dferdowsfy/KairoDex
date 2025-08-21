"use client"
import { StageSelect } from './StageSelect'
import type { Client } from '@/lib/types'
import { Mail, MessageSquare } from 'lucide-react'

export default function ClientHeader({ client, onStage }: { client: Client; onStage: (s: Client['stage']) => void }) {
  return (
    <header className="rounded-2xl">
      <div className="flex items-center gap-3">
        <div>
          <div className="text-xl font-semibold text-ink">{client.name}</div>
          <div className="text-xs text-ink/60">{client.email ?? client.phone ?? 'No contact'}</div>
        </div>
        <div className="ml-auto"><StageSelect value={client.stage} onChange={onStage} /></div>
      </div>
      <div className="mt-3 flex gap-2 text-xs">
  {client.email && <a href={`mailto:${client.email}`} className="px-3 py-1 rounded-lg bg-white/80 border border-white/50 inline-flex items-center gap-2 text-ink/80 hover:bg-white"><Mail className="h-4 w-4" /> Email</a>}
  {client.phone && <a href={`sms:${client.phone}`} className="px-3 py-1 rounded-lg bg-white/80 border border-white/50 inline-flex items-center gap-2 text-ink/80 hover:bg-white"><MessageSquare className="h-4 w-4" /> SMS</a>}
      </div>
    </header>
  )
}
