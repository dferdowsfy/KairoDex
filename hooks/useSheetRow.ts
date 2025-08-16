"use client"
import { useQuery } from '@tanstack/react-query'

export function useSheetRow(clientId?: string) {
  return useQuery({
    queryKey: ['sheetRow', clientId ?? 'none'],
    enabled: !!clientId,
    queryFn: async () => {
      const res = await fetch(`/api/sheets/client?id=${clientId}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      return data.row as any
    }
  })
}
