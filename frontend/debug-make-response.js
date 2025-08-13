// Debug what Make.com is actually returning
const WEBHOOK_URL = 'https://hook.us2.make.com/267qcrx705kys88karl81vwnfvyaame6';

async function debugResponse() {
  console.log('🔍 Debug: What is Make.com actually returning?\n');
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_name: 'Riley Davis',
        search_fields: {
          first_name: 'Riley',
          last_name: 'Davis'
        },
        test: true
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
    console.log(`"${textResponse}"`);
    
    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(textResponse);
      console.log('\n✅ Valid JSON:');
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('\n❌ Invalid JSON - this is the problem!');
      console.log('Error:', e.message);
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

debugResponse();
