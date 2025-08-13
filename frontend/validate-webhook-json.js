// Simple Make.com webhook JSON validator
const WEBHOOK_URL = 'https://hook.us2.make.com/267qcrx705kys88karl81vwnfvyaame6';

async function validateWebhookJSON() {
  console.log('🔍 Make.com Webhook JSON Validator\n');
  
  try {
    console.log('🔗 Sending request to webhook...');
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_name: 'Sam Johnson',
        client_id: '123',
        test: true
      })
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    // Get response content type
    const contentType = response.headers.get('content-type') || '';
    console.log(`Content-Type: ${contentType}`);
    
    if (!contentType.includes('application/json')) {
      console.log('⚠️ Warning: Response is not JSON (incorrect content type)');
    }
    
    // Get the raw response as text first
    const textResponse = await response.text();
    console.log('\nRaw Response Body:');
    console.log(textResponse);
    
    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(textResponse);
      console.log('\n✅ Valid JSON! Parsed structure:');
      console.log(JSON.stringify(jsonData, null, 2));
      
      // Validate expected fields
      if (jsonData.status === 'ok' && jsonData.client) {
        console.log('\n✅ Required fields present!');
        console.log('Client fields:');
        for (const [key, value] of Object.entries(jsonData.client)) {
          console.log(`- ${key}: ${value || '(empty)'}`);
        }
      } else {
        console.log('\n⚠️ Missing required fields in the response');
      }
      
    } catch (e) {
      console.log('\n❌ Invalid JSON - parsing error:');
      console.log(e.message);
      console.log('\nThis needs to be fixed in your Make.com webhook response module.');
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
  
  console.log('\n📋 Make.com Webhook Configuration Tips:');
  console.log('1. Set Response Content Type to "application/json"');
  console.log('2. Use valid JSON syntax in the response body');
  console.log('3. Make sure all data mappings are available');
  console.log('4. Use the Data Structure feature for complex JSON');
  console.log('5. Test mappings with "Run Once" before deploying');
}

validateWebhookJSON();
