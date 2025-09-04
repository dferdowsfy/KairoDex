import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'

export const metadata = { title: 'Admin - Users' }

const AdminUserList = dynamic(() => import('@/components/AdminUserList'), { ssr: false })

function AdminShell() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Admin — User Management</h2>
      <AdminUserList />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading admin…</div>}>
      <AdminShell />
    </Suspense>
  )
}
