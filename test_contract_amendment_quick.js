#!/usr/bin/env node
/**
 * Quick test for contract amendment functionality
 * Run with: node test_contract_amendment_quick.js
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testContractAmendment() {
  console.log('📄 Testing Contract Amendment...\n');
  
  try {
    // Test template contract amendment (this should work)
    console.log('Testing Template Contract Amendment...');
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

  const response = await execAsync(`curl -s -X POST http://localhost:3002/api/contracts/apply/ -H "Content-Type: application/json" -d @- << 'EOF'
${JSON.stringify(templateTest)}
EOF`);
    const result = JSON.parse(response.stdout);
    
    if (result.updated) {
      console.log('✅ Template contract amendment WORKING');
      console.log('   Date change:', result.updated.includes('January 30, 2025') ? '✓' : '✗');
      console.log('   Money change:', result.updated.includes('$15,000') ? '✓' : '✗');
      console.log('   Has summary:', result.summary ? '✓' : '✗');
      
      console.log('\nAmended contract preview:');
      console.log(result.updated.substring(0, 200) + '...\n');
    } else {
      console.log('❌ Template contract amendment FAILED');
      console.log('   Error:', result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  console.error('Make sure your development server is running on localhost:3002');
  }
}

if (require.main === module) {
  testContractAmendment();
}

module.exports = { testContractAmendment };
