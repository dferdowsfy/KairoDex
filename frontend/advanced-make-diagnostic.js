// Advanced Make.com webhook diagnostic script
const WEBHOOK_URL = 'https://hook.us2.make.com/267qcrx705kys88karl81vwnfvyaame6';

async function diagnoseMakeWebhook() {
  console.log('🔍 Advanced Make.com Webhook Diagnostic\n');
  
  // Create a test client that matches what we're sending from the app
  const testClient = {
    client_id: 'client1',
    name: 'Sam Johnson',
    email: 'sam.johnson@email.com',
    phone: '555-123-4567',
    search_fields: {
      first_name: 'Sam',
      last_name: 'Johnson'
    }
  };
  
  console.log('📋 Testing with client:', testClient.name);
  
  try {
    console.log('🔗 Sending request to:', WEBHOOK_URL);
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: testClient.client_id,
        client_name: testClient.name,
        client_email: testClient.email,
        client_phone: testClient.phone,
        agent_id: 'agent1',
        question: 'client snapshot',
        search_fields: testClient.search_fields
      })
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response Headers:');
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Get the raw response as text first
    const textResponse = await response.text();
    console.log('\nRaw Response Body:');
    console.log(textResponse);
    
    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(textResponse);
      console.log('\n✅ Parsed JSON Response:');
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('\n❌ Invalid JSON response:', e.message);
    }
    
    if (response.status >= 400) {
      console.log('\n🚨 Error Details:');
      console.log(`- Status: ${response.status} ${response.statusText}`);
      console.log('- Make.com Error Information:');
      console.log('  This is likely due to:');
      console.log('  1. The scenario is not turned ON');
      console.log('  2. There\'s an error in one of the scenario modules');
      console.log('  3. The webhook response JSON structure is invalid');
      console.log('  4. Required field mapping is missing or incorrect');
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
  
  console.log('\n📋 Make.com Scenario Checklist:');
  console.log('1. Is the scenario turned ON? ');
  console.log('2. Is the webhook trigger properly configured?');
  console.log('3. Do you have proper error handling in your scenario?');
  console.log('4. Is your JSON structure in the webhook response valid?');
  console.log('5. Are you mapping all required fields correctly?');
  console.log('6. Have you tested the scenario with sample data?');
}

diagnoseMakeWebhook();
