"use client"
import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { persistQueryClient } from '@tanstack/react-query-persist-client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
    },
    mutations: {
      retry: 1
    }
  }
})

if (typeof window !== 'undefined') {
  const persister = createSyncStoragePersister({ storage: window.localStorage })
  persistQueryClient({ queryClient, persister })
}
