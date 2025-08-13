// Test without any authentication (no API key)
const WEBHOOK_URL = 'https://hook.us2.make.com/267qcrx705kys88karl81vwnfvyaame6';

async function testNoAuth() {
  console.log('🔓 Testing webhook WITHOUT any authentication\n');
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No x-make-apikey header at all
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
      console.log('\n✅ SUCCESS! No authentication needed!');
      try {
        const data = await response.json();
        console.log('Response data:', JSON.stringify(data, null, 2));
      } catch (e) {
        const text = await response.text();
        console.log('Response text:', text);
      }
    } else if (response.status === 401) {
      console.log('\n❌ Still requires authentication');
      console.log('You need to configure API keys in Make.com webhook settings');
    } else {
      console.log(`\n📡 Status ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.log('Response:', text);
    }
    
  } catch (error) {
    console.log('\n❌ Network error:', error.message);
  }
}

testNoAuth();
