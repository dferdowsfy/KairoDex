#!/usr/bin/env node

/**
 * Test feedback API endpoint
 */

require('dotenv').config({ path: '.env.local' })

async function testFeedbackAPI() {
  const { createClient } = require('@supabase/supabase-js')
  
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  try {
    console.log('🔐 Creating test user session...')
    
    // For testing, we'll use a test email - in production this would be done through proper auth
    const testEmail = 'test@example.com'
    
    // Sign up or sign in a test user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: 'testpassword123'
    })
    
    if (authError) {
      console.log('📝 Test user doesn\'t exist, creating one...')
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'testpassword123'
      })
      
      if (signUpError) {
        console.error('❌ Failed to create test user:', signUpError.message)
        return
      }
      
      console.log('✅ Test user created')
    } else {
      console.log('✅ Test user signed in')
    }
    
    // Get session token
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    
    if (!accessToken) {
      console.error('❌ No access token available')
      return
    }
    
    console.log('🧪 Testing feedback API...')
    
    const testFeedback = {
      rating: 8,
      liked: ['Speed', 'UI Design'],
      disliked: ['Missing Features'],
      message: 'This is a test feedback message. The app is great but could use more features!'
    }
    
    const response = await fetch('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(testFeedback)
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Feedback API test successful!')
      console.log('📄 Response:', result)
      
      // Check if feedback was stored in database
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('feedback_id', result.feedback_id)
        .single()
      
      if (feedbackError) {
        console.log('⚠️  Could not verify database storage:', feedbackError.message)
      } else {
        console.log('✅ Feedback stored in database!')
        console.log('📊 Feedback data:', {
          id: feedbackData.feedback_id,
          rating: feedbackData.rating,
          status: feedbackData.status,
          email_sent_at: feedbackData.email_sent_at
        })
      }
      
    } else {
      console.error('❌ Feedback API test failed!')
      console.error('📄 Response:', result)
      console.error('🔍 Status:', response.status)
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message)
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health', { 
      method: 'GET',
      timeout: 2000 
    })
    return response.ok
  } catch {
    return false
  }
}

async function main() {
  console.log('🔍 Checking if dev server is running...')
  
  const serverRunning = await checkServer()
  if (!serverRunning) {
    console.log('⚠️  Dev server not detected at localhost:3000')
    console.log('💡 Please run: npm run dev')
    console.log('📍 Then test manually by:')
    console.log('   1. Opening http://localhost:3000')
    console.log('   2. Clicking the "Feedback?" button')
    console.log('   3. Submitting test feedback')
    return
  }
  
  await testFeedbackAPI()
}

main()