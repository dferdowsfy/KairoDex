import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

// POST /api/admin/users/reset-password
// Body: { userId: string, password: string }
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, password } = body || {}
    
    // Validation
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    
    // Get admin client
    const admin = supabaseAdmin()
    
    // Update user password using admin API
    const { data, error } = await admin.auth.admin.updateUserById(userId, {
      password,
    })
    
    if (error) {
      console.error('Admin password reset error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Log the password change (for audit purposes)
    // Note: In a production system, you might want to store this in a secure audit log
    console.log(`[ADMIN-ACTION] Password reset for user ${userId} by admin at ${new Date().toISOString()}`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully',
      userId,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Admin password reset error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}