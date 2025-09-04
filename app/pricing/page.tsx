"use client"
import React from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionUser } from '@/hooks/useSessionUser'
import PricingSection from '@/components/PricingSection'

export default function PricingPage() {
  const { user, loading } = useSessionUser()
  const router = useRouter()

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  // Show loading state while checking auth
  if (loading) {
    return (
      <main className="min-h-screen bg-[#f9f9f7] flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </main>
    )
  }

  // Don't render pricing for authenticated users (they'll be redirected)
  if (user) {
    return null
  }

  return (
    <main className="min-h-screen bg-[#f9f9f7]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <PricingSection />
      </div>
    </main>
  )
}
