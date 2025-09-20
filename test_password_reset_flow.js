#!/usr/bin/env node

/**
 * Test script for password reset flow
 * Tests the complete journey from forgot password to reset completion
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Password Reset Flow Test\n');

// Check if required files exist and have expected content
const checks = [
  {
    file: 'app/reset-password/page.tsx',
    description: 'Reset password page with username input',
    requiredContent: ['username', 'setUsername', 'Username / Email', 'new password']
  },
  {
    file: 'app/(routes)/forgot-password/page.tsx', 
    description: 'Forgot password page with proper redirect',
    requiredContent: ['buildResetPasswordUrl', 'resetPasswordForEmail']
  },
  {
    file: 'lib/authOrigins.ts',
    description: 'Auth origins with forceBrowser parameter',
    requiredContent: ['buildResetPasswordUrl', 'forceBrowser=1']
  }
];

let allPassed = true;

checks.forEach(({ file, description, requiredContent }) => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${description}: File ${file} not found`);
    allPassed = false;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const missingContent = requiredContent.filter(req => !content.includes(req));
  
  if (missingContent.length > 0) {
    console.log(`❌ ${description}: Missing content - ${missingContent.join(', ')}`);
    allPassed = false;
  } else {
    console.log(`✅ ${description}: All required content found`);
  }
});

console.log('\n📋 Manual Testing Steps:');
console.log('1. Go to /forgot-password page');
console.log('2. Enter your email address');
console.log('3. Check email for reset link');
console.log('4. Click the reset link');
console.log('5. Verify the reset page opens with:');
console.log('   - Username/Email field (pre-populated)');
console.log('   - New Password field');
console.log('   - Confirm Password field');
console.log('6. Enter username and new password');
console.log('7. Submit form');
console.log('8. Verify success message and redirect to login');
console.log('9. Test login with new password');

console.log('\n🔧 Environment Variables to Check:');
console.log('- NEXT_PUBLIC_AUTH_BROWSER_ORIGIN (for PWA escape)');
console.log('- RESEND_API_KEY (for email sending)');
console.log('- RESEND_FROM (sender email address)');

console.log('\n📱 PWA Testing:');
console.log('- Install PWA and test reset link opening in browser');
console.log('- Verify forceBrowser=1 parameter triggers browser escape');

if (allPassed) {
  console.log('\n🎉 All file checks passed! Ready for manual testing.');
} else {
  console.log('\n⚠️  Some checks failed. Please review the issues above.');
}

console.log('\n💡 Pro tip: Use browser DevTools to monitor:');
console.log('- Network requests to Supabase auth endpoints');
console.log('- Console logs for PWA escape behavior');
console.log('- LocalStorage for pw-reset-email persistence');