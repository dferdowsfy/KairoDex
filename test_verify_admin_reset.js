// Test script to verify admin password reset functionality
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.SUPABASE_SERVICE_ROLE || 
                           process.env.SUPABASE_SERVICE_KEY

// Check required environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with admin privileges
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Test user email and new password
const testUserEmail = process.argv[2] 
const newPassword = process.argv[3] || 'TestPassword123!'

if (!testUserEmail) {
  console.error('❌ Please provide a test user email as the first argument')
  console.log('Usage: node test_admin_password_reset.js user@example.com [newPassword]')
  process.exit(1)
}

async function testAdminPasswordReset() {
  console.log('🔍 Testing admin password reset functionality...\n')
  
  try {
    // Step 1: Get the user by email
    console.log(`📧 Looking up user with email: ${testUserEmail}`)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (userError) {
      console.error('❌ Error listing users:', userError.message)
      return
    }
    
    let user;
    
    // Find user based on different response formats
    if (Array.isArray(userData)) {
      user = userData.find(u => u.email === testUserEmail)
    } else if (userData?.users && Array.isArray(userData.users)) {
      user = userData.users.find(u => u.email === testUserEmail)
    }
    
    if (!user) {
      console.error(`❌ User with email ${testUserEmail} not found`)
      return
    }
    
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`)
    
    // Step 2: Reset the user's password
    console.log(`🔐 Resetting password for user ${user.email}...`)
    
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id, 
      { password: newPassword }
    )
    
    if (updateError) {
      console.error('❌ Error resetting password:', updateError.message)
      return
    }
    
    console.log(`✅ Password successfully reset for user ${user.email}`)
    
    // Step 3: Verify that we can sign in with the new password
    console.log(`🔑 Testing login with new password...`)
    
    // Create a regular client for sign-in testing
    const supabaseClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)
    
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: testUserEmail,
      password: newPassword
    })
    
    if (signInError) {
      console.error('❌ Sign-in test failed:', signInError.message)
      return
    }
    
    console.log(`✅ Successfully signed in with new password!`)
    console.log(`🔑 Session established for user ${signInData.user.email}`)
    
    // Log out the session
    await supabaseClient.auth.signOut()
    console.log(`👋 Logged out test session`)
    
    console.log('\n✅✅✅ Admin password reset test completed successfully! ✅✅✅')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the test
testAdminPasswordReset()