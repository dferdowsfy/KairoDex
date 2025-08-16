"use client"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'

export default function Providers({ children }: { children: any }) {
  return (
    <QueryClientProvider client={queryClient}>
  {children}
    </QueryClientProvider>
  )
}
