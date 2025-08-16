"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { USE_MOCKS } from '@/lib/config'
import { mockDb } from '@/lib/mocks'
import type { Task } from '@/lib/types'

export function useTasks(clientId?: string) {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['tasks', clientId ?? 'all'],
    queryFn: async () => {
      if (USE_MOCKS) return mockDb.listTasks(clientId)
      const qs = clientId ? `?clientId=${encodeURIComponent(clientId)}` : ''
      const res = await fetch(`/api/sheets/tasks${qs}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      return (json.items || []) as Task[]
    }
  })

  const complete = useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCKS) return mockDb.completeTask(id)
      const res = await fetch('/api/sheets/tasks', { method: 'PATCH', body: JSON.stringify({ id, client_id: clientId, status: 'done' }) })
      if (!res.ok) throw new Error(await res.text())
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const key = ['tasks', clientId ?? 'all']
      const prev = qc.getQueryData<Task[]>(key)
      if (prev) qc.setQueryData(key, prev.map(t => t.id === id ? { ...t, status: 'done' } : t))
      return { prev }
    },
    onError: (_e,_v,ctx) => { if (ctx?.prev) qc.setQueryData(['tasks', clientId ?? 'all'], ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] })
  })

  const snooze = useMutation({
    mutationFn: async ({ id, minutes }: { id: string; minutes: number }) => {
      if (USE_MOCKS) return mockDb.snoozeTask(id, minutes)
      const res = await fetch('/api/sheets/tasks', { method: 'PATCH', body: JSON.stringify({ id, client_id: clientId, snooze_minutes: minutes }) })
      if (!res.ok) throw new Error(await res.text())
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] })
  })

  const create = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      if (USE_MOCKS) return mockDb.createTask(task)
      const res = await fetch('/api/sheets/tasks', { method: 'POST', body: JSON.stringify(task) })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      return json.item as Task
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] })
  })

  return { ...q, complete, snooze, create }
}
