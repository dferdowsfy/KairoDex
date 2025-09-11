#!/usr/bin/env node
/**
 * Test script to verify AI model standardization
 * Run with: node test_ai_standardization.js
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testAIStandardization() {
  console.log('🤖 Testing AI Model Standardization...\n');
  
  try {
    // Test AI diagnostics endpoint
    console.log('1. Testing AI Diagnostics endpoint...');
  const { stdout } = await execAsync('curl -s http://localhost:3002/api/ai-diagnostics');
    const diagnostics = JSON.parse(stdout);
    
    console.log('   Provider:', diagnostics.provider);
    console.log('   Model:', diagnostics.model);
    console.log('   Expected Model: openai/gpt-4o-mini-search-preview\n');
    
    if (diagnostics.model === 'openai/gpt-4o-mini-search-preview') {
      console.log('✅ AI Model correctly standardized to gpt-4o-mini-search-preview');
    } else {
      console.log('❌ AI Model not standardized correctly');
      console.log('   Current model:', diagnostics.model);
    }
    
    if (diagnostics.warnings && diagnostics.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      diagnostics.warnings.forEach(warning => console.log('   -', warning));
    }
    
    // Test a simple AI completion
    console.log('\n2. Testing AI completion...');
  const testResponse = await execAsync(`curl -s -X POST http://localhost:3002/api/ai/chat -H "Content-Type: application/json" -d '{"message":"Say hello in 3 words","clientId":"test"}'`);
    const chatResult = JSON.parse(testResponse.stdout);
    
    if (chatResult.reply && chatResult.reply.length > 0) {
      console.log('✅ AI completion successful');
      console.log('   Response:', chatResult.reply.substring(0, 50) + '...');
    } else {
      console.log('❌ AI completion failed');
      console.log('   Error:', chatResult);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  console.error('\nMake sure your development server is running on localhost:3002');
    console.error('Run: npm run dev');
  }
}

if (require.main === module) {
  testAIStandardization();
}

module.exports = { testAIStandardization };
