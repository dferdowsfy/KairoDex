#!/usr/bin/env node
/**
 * Comprehensive test for contract amendment functionality
 * Run with: node test_contract_amendments.js
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testContractAmendments() {
  console.log('📄 Testing Contract Amendment System...\n');
  
  try {
    // Test 1: Template contract amendment
    console.log('1. Testing Template Contract Amendment...');
    const templateTest = {
      contractTemplate: `PURCHASE AND SALE AGREEMENT

Property Address: 123 Main Street, Anytown, State 12345
Purchase Price: $500,000
Closing Date: December 15, 2024
Earnest Money: $10,000

BUYER: John Doe
SELLER: Jane Smith

This agreement is contingent upon buyer's inspection within 7 days.`,
      naturalChanges: "change closing date to January 30, 2025 and increase earnest money to $15,000",
      clientContext: {}
    };

    const templateResponse = await execAsync(`curl -s -X POST http://localhost:3000/api/contracts/apply/ -H "Content-Type: application/json" -d @- << 'EOF'
${JSON.stringify(templateTest)}
EOF`);
    const templateResult = JSON.parse(templateResponse.stdout);
    
    if (templateResult.updated) {
      console.log('✅ Template amendment successful');
      console.log('   Changes made:', templateResult.updated.includes('January 30, 2025') ? 'Date updated ✓' : 'Date not updated ✗');
      console.log('   Earnest money:', templateResult.updated.includes('$15,000') ? 'Amount updated ✓' : 'Amount not updated ✗');
      console.log('   Summary:', templateResult.summary ? templateResult.summary.substring(0, 100) + '...' : 'No summary provided');
    } else {
      console.log('❌ Template amendment failed');
      console.log('   Error:', templateResult.error || 'Unknown error');
    }
    
    // Test 2: Natural language processing
    console.log('\n2. Testing Complex Natural Language Changes...');
    const complexTest = {
      contractTemplate: `REAL ESTATE CONTRACT

Property: 456 Oak Avenue, Springfield, IL 62701
Sale Price: $350,000
Closing: March 1, 2025
Inspection Period: 10 days
Financing Contingency: 30 days

Additional Terms:
- Property sold "as-is"
- Seller to provide home warranty`,
      naturalChanges: "extend inspection period to 14 days, remove as-is condition, and add radon testing requirement",
      clientContext: {}
    };

    const complexResponse = await execAsync(`curl -s -X POST http://localhost:3000/api/contracts/apply/ -H "Content-Type: application/json" -d @- << 'EOF'
${JSON.stringify(complexTest)}
EOF`);
    const complexResult = JSON.parse(complexResponse.stdout);
    
    if (complexResult.updated) {
      console.log('✅ Complex amendment successful');
      console.log('   Inspection period:', complexResult.updated.includes('14 days') ? 'Extended ✓' : 'Not extended ✗');
      console.log('   As-is removal:', !complexResult.updated.includes('"as-is"') ? 'Removed ✓' : 'Still present ✗');
      console.log('   Radon testing:', complexResult.updated.toLowerCase().includes('radon') ? 'Added ✓' : 'Not added ✗');
    } else {
      console.log('❌ Complex amendment failed');
      console.log('   Error:', complexResult.error || 'Unknown error');
    }

    // Test 3: Error handling
    console.log('\n3. Testing Error Handling...');
    const errorTest = {
      contractTemplate: "",
      naturalChanges: "add something",
      clientContext: {}
    };

    const errorResponse = await execAsync(`curl -s -X POST http://localhost:3000/api/contracts/apply/ -H "Content-Type: application/json" -d @- << 'EOF'
${JSON.stringify(errorTest)}
EOF`);
    const errorResult = JSON.parse(errorResponse.stdout);
    
    if (errorResult.error) {
      console.log('✅ Error handling working correctly');
      console.log('   Error message:', errorResult.error);
    } else {
      console.log('⚠️  Error handling may need improvement');
    }

    // Test 4: AI model verification
    console.log('\n4. Verifying AI Model Usage...');
    const modelResponse = await execAsync('curl -s http://localhost:3000/api/ai-diagnostics/');
    const modelResult = JSON.parse(modelResponse.stdout);
    
    console.log('   Current Provider:', modelResult.provider);
    console.log('   Current Model:', modelResult.model);
    console.log('   Expected Model: openai/gpt-4o-mini-search-preview');
    
    if (modelResult.model === 'openai/gpt-4o-mini-search-preview') {
      console.log('✅ Correct AI model in use');
    } else {
      console.log('⚠️  Different AI model detected');
    }

    console.log('\n🎯 Contract Amendment Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nMake sure your development server is running on localhost:3000');
    console.error('Run: npm run dev');
  }
}

if (require.main === module) {
  testContractAmendments();
}

module.exports = { testContractAmendments };
