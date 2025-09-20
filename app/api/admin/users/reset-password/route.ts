import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    
    // Get Supabase URL and admin key directly (avoiding any potential issues with the wrapper)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                       process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 
                       process.env.SUPABASE_SERVICE_ROLE || 
                       process.env.SUPABASE_SERVICE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      console.error('Missing required Supabase credentials')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    // Create a direct Supabase admin client
    const directAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
    
    // Debug log
    console.log(`[Direct Admin] Attempting to update password for user ${userId}`)
    
    // Get user info first to verify the user exists
    const { data: userData, error: userError } = await directAdmin.auth.admin.getUserById(userId)
    
    if (userError) {
      console.error(`Failed to get user info: ${userError.message}`)
      return NextResponse.json({ error: `Failed to get user info: ${userError.message}` }, { status: 500 })
    }
    
    if (!userData?.user) {
      console.error('User not found')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const userEmail = userData.user.email || ''
    console.log(`Found user: ${userEmail || 'Unknown'}`)
    
    // Update the password directly
    const { error: updateError } = await directAdmin.auth.admin.updateUserById(userId, {
      password,
    })
    
    if (updateError) {
      console.error(`Password update failed: ${updateError.message}`)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    
    // Log the password change
    console.log(`[ADMIN-ACTION] Password reset for user ${userId} (${userEmail}) by admin at ${new Date().toISOString()}`)
    
    // We no longer test the credentials here as it could interfere with user sessions
    // Instead, we just log that the password was updated
    console.log(`✓ Password successfully updated for ${userEmail} - will be active on next login`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully',
      userId,
      email: userEmail,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Admin password reset error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}
