// Test webhook after Make.com configuration changes
const WEBHOOK_URL = 'https://hook.us2.make.com/267qcrx705kys88karl81vwnfvyaame6';

async function testAfterConfig() {
  console.log('🔄 Testing webhook after Make.com configuration...\n');
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_name: 'Taylor Patel',
        search_fields: {
          first_name: 'Taylor',
          last_name: 'Patel'
        },
        test: true
      })
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ SUCCESS! Webhook is now working');
      try {
        const data = await response.json();
        console.log('Response data:', JSON.stringify(data, null, 2));
      } catch (e) {
        const text = await response.text();
        console.log('Response text:', text);
      }
    } else if (response.status === 401) {
      console.log('❌ Still 401 - Check webhook authentication settings in Make.com');
      console.log('   Make sure Authentication is set to "None"');
    } else if (response.status === 500) {
      console.log('⚠️  500 error - Webhook triggered but internal error in scenario');
      console.log('   Check Make.com scenario execution logs');
    } else {
      console.log(`ℹ️  Status ${response.status}: ${response.statusText}`);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

testAfterConfig();
