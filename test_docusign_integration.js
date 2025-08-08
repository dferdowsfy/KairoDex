const axios = require('axios');

// Test DocuSign integration
async function testDocuSignIntegration() {
  console.log('🧪 Testing DocuSign Integration...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing server health...');
    const healthResponse = await axios.get('http://localhost:3001/api/health');
    console.log('✅ Server is running:', healthResponse.data);
    console.log('');

    // Test 2: Check if DocuSign endpoints are available
    console.log('2. Testing DocuSign endpoints availability...');
    
    // Note: These endpoints require authentication, so we'll just check if the server responds
    try {
      const envelopesResponse = await axios.get('http://localhost:3001/api/docusign/envelopes');
      console.log('✅ DocuSign endpoints are accessible');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ DocuSign endpoints are protected (authentication required)');
      } else {
        console.log('❌ DocuSign endpoints may not be working:', error.message);
      }
    }
    console.log('');

    // Test 3: Check DocuSign configuration
    console.log('3. Testing DocuSign configuration...');
    const docusignConfig = require('./backend/docusign-config');
    
    if (docusignConfig.DOCUSIGN_CONFIG) {
      console.log('✅ DocuSign configuration loaded successfully');
      console.log('   - User ID:', docusignConfig.DOCUSIGN_CONFIG.user_id);
      console.log('   - Account ID:', docusignConfig.DOCUSIGN_CONFIG.account_id);
      console.log('   - Base URI:', docusignConfig.DOCUSIGN_CONFIG.base_uri);
      console.log('   - Integration Key:', docusignConfig.DOCUSIGN_CONFIG.integration_key);
    } else {
      console.log('❌ DocuSign configuration not found');
    }
    console.log('');

    // Test 4: Test JWT token creation
    console.log('4. Testing JWT token creation...');
    try {
      const jwt = docusignConfig.createJwtAssertion();
      console.log('✅ JWT token created successfully');
      console.log('   - Token length:', jwt.length);
      console.log('   - Token preview:', jwt.substring(0, 50) + '...');
    } catch (error) {
      console.log('❌ JWT token creation failed:', error.message);
    }
    console.log('');

    console.log('🎉 DocuSign Integration Test Complete!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Start the frontend: cd frontend && npm start');
    console.log('2. Login to AgentHub');
    console.log('3. Go to "Modify a Contract"');
    console.log('4. Create a contract modification');
    console.log('5. Test the DocuSign integration');
    console.log('');
    console.log('📚 See DOCUSIGN_INTEGRATION_GUIDE.md for detailed instructions');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Make sure the backend server is running: npm start');
    console.log('2. Check if port 3001 is available');
    console.log('3. Verify all dependencies are installed: npm install');
  }
}

// Run the test
testDocuSignIntegration(); 