#!/usr/bin/env node

/**
 * Admin Password Reset Test Script
 * This script tests the admin password reset functionality
 */

const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

// Constants
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validation
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// Create command line interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function main() {
  console.log('\n🔐 Admin Password Reset Test Script')
  console.log('===================================\n')
  
  try {
    // List users
    console.log('Fetching users...')
    const { data: users, error } = await supabase.auth.admin.listUsers({ perPage: 10 })
    
    if (error) {
      throw new Error(`Failed to list users: ${error.message}`)
    }
    
    if (!users || users.length === 0) {
      console.log('❌ No users found in your Supabase project')
      return
    }
    
    // Display users
    console.log('\nAvailable Users:')
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email || 'No Email'} (ID: ${user.id})`)
    })
    
    // Ask for user selection
    const userIndex = await promptNumber('\nSelect a user (number): ', 1, users.length) - 1
    const selectedUser = users[userIndex]
    
    console.log(`\n👤 Selected User: ${selectedUser.email} (${selectedUser.id})`)
    
    // Ask for new password
    const password = await promptInput('\nEnter new password (min 6 chars): ')
    
    if (password.length < 6) {
      console.log('❌ Password must be at least 6 characters')
      return
    }
    
    // Confirm
    const confirmed = await promptConfirm(`\nAre you sure you want to reset the password for ${selectedUser.email}?`)
    
    if (!confirmed) {
      console.log('\n❌ Operation cancelled')
      return
    }
    
    // Reset password
    console.log('\nResetting password...')
    const { data, error: resetError } = await supabase.auth.admin.updateUserById(
      selectedUser.id, 
      { password }
    )
    
    if (resetError) {
      throw new Error(`Failed to reset password: ${resetError.message}`)
    }
    
    console.log('\n✅ Password reset successful!')
    console.log(`\nUser can now login with their email (${selectedUser.email}) and the new password`)
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`)
  } finally {
    rl.close()
  }
}

// Helper functions for prompts
function promptInput(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer)
    })
  })
}

function promptNumber(question, min, max) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      const num = parseInt(answer)
      if (isNaN(num) || num < min || num > max) {
        console.log(`Please enter a number between ${min} and ${max}`)
        resolve(promptNumber(question, min, max))
      } else {
        resolve(num)
      }
    })
  })
}

function promptConfirm(question) {
  return new Promise(resolve => {
    rl.question(`${question} (y/n): `, answer => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

// Run the script
main().catch(error => {
  console.error(`\n❌ Unhandled error: ${error.message}`)
  process.exit(1)
})