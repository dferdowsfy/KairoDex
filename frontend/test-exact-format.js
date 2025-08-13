// Test with exact Make.com API key format
const WEBHOOK_URL = 'https://hook.us2.make.com/267qcrx705kys88karl81vwnfvyaame6';
const API_KEY = '267qcrx705kys88karl81vwnfvyaame6';

async function testExactFormat() {
  console.log('🎯 Testing exact Make.com format: x-make-apikey header\n');
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-make-apikey': API_KEY
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
    console.log('Headers sent:');
    console.log('  Content-Type: application/json');
    console.log(`  x-make-apikey: ${API_KEY.substring(0, 10)}...`);
    
    if (response.ok) {
      console.log('\n✅ SUCCESS! The x-make-apikey header format works!');
      try {
        const data = await response.json();
        console.log('Response data:', JSON.stringify(data, null, 2));
      } catch (e) {
        const text = await response.text();
        console.log('Response text:', text);
      }
    } else if (response.status === 401) {
      console.log('\n❌ Still 401 - Possible issues:');
      console.log('1. API key value might be incorrect');
      console.log('2. Make.com scenario might need to be restarted');
      console.log('3. Try clicking "Save" in the webhook module again');
    } else if (response.status === 500) {
      console.log('\n⚠️  500 Internal Server Error');
      console.log('Webhook is accepting requests but scenario has an error');
      console.log('Check Make.com execution logs');
    } else {
      console.log(`\n❓ Unexpected status: ${response.status}`);
      const errorText = await response.text();
      console.log('Response:', errorText);
    }
    
  } catch (error) {
    console.log('\n❌ Network error:', error.message);
  }
}

testExactFormat();
