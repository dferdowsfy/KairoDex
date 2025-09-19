#!/usr/bin/env node

/**
 * Test environment setup for feedback system
 */

require('dotenv').config({ path: '.env.local' })

async function testEnvironment() {
  console.log('🔍 Testing feedback system environment...\n')
  
  // Check Resend API key
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.log('❌ RESEND_API_KEY not found')
    return false
  } else if (resendKey === 're_RbV6Dh19_6Kba541NpbQ3JN4UBHz2CrVH') {
    console.log('✅ RESEND_API_KEY updated with new key')
  } else {
    console.log('⚠️  RESEND_API_KEY present but different from expected')
  }
  
  // Check Supabase connection
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { data, error } = await supabase
      .from('feedback')
      .select('id')
      .limit(1)
    
    if (error) {
      console.log('❌ Feedback table access failed:', error.message)
      return false
    } else {
      console.log('✅ Feedback table accessible')
    }
    
  } catch (err) {
    console.log('❌ Supabase connection failed:', err.message)
    return false
  }
  
  // Check Resend service
  try {
    const { Resend } = require('resend')
    const resend = new Resend(resendKey)
    
    // Don't actually send, just check if we can create the instance
    console.log('✅ Resend client initialized successfully')
    
  } catch (err) {
    console.log('❌ Resend initialization failed:', err.message)
    return false
  }
  
  console.log('\n🎉 Environment setup looks good!')
  console.log('\n📋 Manual Testing Steps:')
  console.log('1. Open http://localhost:3000 in your browser')
  console.log('2. Look for the "Feedback?" button in the bottom right')
  console.log('3. Click it and submit test feedback')
  console.log('4. Check your email at dferdows@gmail.com')
  console.log('5. Check Supabase feedback table for new records')
  
  return true
}

testEnvironment()