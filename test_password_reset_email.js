// Test script to debug password reset email functionality
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const AUTH_BROWSER_ORIGIN = process.env.NEXT_PUBLIC_AUTH_BROWSER_ORIGIN || 'http://localhost:3000'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000'

// Check required environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Test email address - change this to your test email
const testEmail = process.argv[2] || 'dferdows@gmail.com'

// Helper function to print environment info
function printEnvironmentInfo() {
  console.log('Environment Information:')
  console.log(`- SUPABASE_URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`)
  console.log(`- SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`)
  console.log(`- AUTH_BROWSER_ORIGIN: ${AUTH_BROWSER_ORIGIN}`)
  console.log(`- SITE_URL: ${SITE_URL}`)
  console.log('\n')
}

async function testPasswordResetEmail() {
  console.log('🔍 Testing password reset email functionality...\n')
  printEnvironmentInfo()
  
  console.log(`📧 Sending password reset email to: ${testEmail}`)
  
  // Create redirect URL with forceBrowser parameter
  const redirectTo = `${AUTH_BROWSER_ORIGIN}/reset-password?email=${encodeURIComponent(testEmail)}&forceBrowser=1`
  console.log(`🔗 Redirect URL: ${redirectTo}`)
  
  try {
    // Send password reset email
    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: redirectTo
    })
    
    if (error) {
      console.error('❌ Error sending password reset email:', error.message)
      console.error(error)
    } else {
      console.log('✅ Password reset email sent successfully!')
      console.log('📝 Check the email account for the reset link.')
      console.log('\nTroubleshooting tips:')
      console.log(' - Check your spam/junk folder')
      console.log(' - Verify Supabase email service is properly configured')
      console.log(' - Ensure email templates are set up in Supabase Dashboard')
      console.log(' - Check that the Supabase project has the correct site URL in Auth settings')
      console.log(' - Verify "Redirect URLs" in Supabase includes your reset-password page URL')
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

// Run the test
testPasswordResetEmail()