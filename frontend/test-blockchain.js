// Test script to verify blockchain configuration
require('dotenv').config();

console.log('🔍 Testing Blockchain Configuration...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('REACT_APP_PRIVATE_KEY:', process.env.REACT_APP_PRIVATE_KEY ? '✅ Set' : '❌ Not set');
console.log('REACT_APP_CONTRACT_ADDRESS:', process.env.REACT_APP_CONTRACT_ADDRESS ? '✅ Set' : '❌ Not set');
console.log('REACT_APP_ALCHEMY_API_KEY:', process.env.REACT_APP_ALCHEMY_API_KEY ? '✅ Set' : '❌ Not set');

// Check if private key is valid format
if (process.env.REACT_APP_PRIVATE_KEY) {
  const privateKey = process.env.REACT_APP_PRIVATE_KEY;
  if (privateKey.startsWith('0x') && privateKey.length === 66) {
    console.log('✅ Private key format is valid');
  } else {
    console.log('❌ Private key format is invalid (should start with 0x and be 66 characters)');
  }
}

// Check if contract address is valid format
if (process.env.REACT_APP_CONTRACT_ADDRESS) {
  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  if (contractAddress.startsWith('0x') && contractAddress.length === 42) {
    console.log('✅ Contract address format is valid');
  } else {
    console.log('❌ Contract address format is invalid (should start with 0x and be 42 characters)');
  }
}

console.log('\n🚀 To test blockchain connection:');
console.log('1. Open your browser to http://localhost:3000');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to Console tab');
console.log('4. Run this command:');
console.log(`
import('./src/utils/blockchain.js').then(module => {
  module.initializeBlockchain().then(result => {
    console.log('Blockchain initialized:', result);
  });
});
`);

console.log('\n📝 Expected Results:');
console.log('- ✅ true = Blockchain is properly configured and connected');
console.log('- ❌ false = Running in demo mode (missing credentials)');
console.log('- ⚠️ Error = Configuration issue (check credentials)');
