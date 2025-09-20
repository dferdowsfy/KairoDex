"use client"
import { useState } from 'react'

export default function AdminUserRow({ user, onUpdated, onDeleted }: any) {
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState(user.role || 'user')
  const [disabled, setDisabled] = useState(!!user.disabled)
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function doUpdate(changes: any) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: user.id, action: 'update', payload: changes }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Update failed')
      onUpdated && onUpdated(json.user || json)
    } catch (err: any) {
      alert(err?.message || 'Failed')
    } finally { setLoading(false) }
  }

  async function doDelete() {
    if (!confirm('Delete user? This cannot be undone.')) return
    setLoading(true)
    try {
      const url = `/api/admin/users?id=${encodeURIComponent(user.id)}`
      const res = await fetch(url, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Delete failed')
      onDeleted && onDeleted(user.id)
    } catch (err: any) {
      alert(err?.message || 'Failed')
    } finally { setLoading(false) }
  }

  async function resetPassword() {
    // Validation
    setResetError('')
    
    if (!password) {
      setResetError('Password is required')
      return
    }
    
    if (password.length < 6) {
      setResetError('Password must be at least 6 characters')
      return
    }
    
    if (password !== confirmPassword) {
      setResetError('Passwords do not match')
      return
    }
    
    setResetLoading(true)
    try {
      const response = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }
      
      // Success
      setResetSuccess(true)
      setPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setIsResetOpen(false)
        setResetSuccess(false)
      }, 3000)
    } catch (error: any) {
      setResetError(error.message || 'An unexpected error occurred')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <tr className="border-t">
      <td className="py-3 px-2 text-sm">{user.email || <span className="text-xs text-slate-400">(no email)</span>}</td>
      <td className="py-3 px-2 text-sm">{user.phone || '-'}</td>
      <td className="py-3 px-2 text-sm">{new Date(user.created_at || '').toLocaleString()}</td>
      <td className="py-3 px-2 text-sm">
        <select value={role} onChange={(e)=>{ setRole(e.target.value); doUpdate({ role: e.target.value }) }} disabled={loading} className="rounded-md border px-2 py-1 text-sm">
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      </td>
      <td className="py-3 px-2 text-sm">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={disabled} onChange={(e)=>{ setDisabled(e.target.checked); doUpdate({ disabled: e.target.checked }) }} disabled={loading} /> Disabled
        </label>
      </td>
      <td className="py-3 px-2 text-sm">
        <div className="flex gap-2">
          <button onClick={doDelete} disabled={loading} className="text-sm text-red-600 hover:underline">Delete</button>
          <button onClick={() => setIsResetOpen(true)} disabled={loading} className="text-sm text-blue-600 hover:underline">Reset Password</button>
        </div>
        
        {isResetOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Reset Password for {user.email}</h3>
              
              {resetSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded p-3 mb-4 text-green-700">
                  Password has been successfully reset.
                </div>
              ) : (
                <>
                  {resetError && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-red-700">
                      {resetError}
                    </div>
                  )}
                  
                  <div className="space-y-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">New Password</label>
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border rounded-md px-3 py-2"
                        placeholder="Minimum 6 characters"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full border rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setIsResetOpen(false)
                    setPassword('')
                    setConfirmPassword('')
                    setResetError('')
                    setResetSuccess(false)
                  }}
                  className="px-3 py-1 border rounded-md"
                >
                  {resetSuccess ? 'Close' : 'Cancel'}
                </button>
                
                {!resetSuccess && (
                  <button 
                    onClick={resetPassword}
                    disabled={resetLoading}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md disabled:bg-blue-400"
                  >
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  )
}
