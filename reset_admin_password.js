// Script to reset your admin account password
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

// Create Supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Admin email and new password
const adminEmail = process.argv[2] || 'dferdows@gmail.com'
const newPassword = process.argv[3] || 'YourDesiredPassword123!'  // Change this to your desired password

async function resetAdminPassword() {
  console.log('🔍 Resetting admin account password...\n')
  
  try {
    // Step 1: Get the user by email
    console.log(`📧 Looking up user with email: ${adminEmail}`)
    
    // First try listing all users
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Error listing users:', usersError.message)
      return
    }
    
    // Find the admin user based on different response formats
    let adminUser;
    
    if (Array.isArray(usersData)) {
      adminUser = usersData.find(u => u.email === adminEmail)
    } else if (usersData?.users && Array.isArray(usersData.users)) {
      adminUser = usersData.users.find(u => u.email === adminEmail)
    } else {
      console.error('❌ Unexpected response format from listUsers')
      console.log(JSON.stringify(usersData, null, 2).slice(0, 200) + '...')
      return
    }
    
    if (!adminUser) {
      console.error(`❌ Admin user with email ${adminEmail} not found`)
      return
    }
    
    console.log(`✅ Found admin user: ${adminUser.email} (ID: ${adminUser.id})`)
    
    // Step 2: Reset the admin user's password
    console.log(`🔐 Resetting password for admin ${adminUser.email}...`)
    
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      adminUser.id, 
      { password: newPassword }
    )
    
    if (updateError) {
      console.error('❌ Error resetting admin password:', updateError.message)
      return
    }
    
    console.log(`✅ Admin password successfully reset!`)
    console.log(`\nYou can now log in with:\nEmail: ${adminEmail}\nPassword: ${newPassword}`)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the function
resetAdminPassword()