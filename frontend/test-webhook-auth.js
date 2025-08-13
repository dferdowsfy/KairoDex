// Test different authentication methods for Make.com webhook
const WEBHOOK_URL = 'https://hook.us2.make.com/267qcrx705kys88karl81vwnfvyaame6';
const API_KEY = '267qcrx705kys88karl81vwnfvyaame6';

async function testAuth() {
  const testData = {
    client_name: 'Sam Johnson',
    search_fields: {
      first_name: 'Sam',
      last_name: 'Johnson'
    }
  };

  console.log('🧪 Testing Make.com webhook authentication methods...\n');

  // Method 1: No authentication
  try {
    console.log('1️⃣ Testing without authentication...');
    const response1 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    console.log(`   Status: ${response1.status} ${response1.statusText}`);
    if (response1.ok) {
      console.log('   ✅ Success! No authentication needed.');
      return;
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  // Method 2: Query parameter
  try {
    console.log('\n2️⃣ Testing with API key as query parameter...');
    const response2 = await fetch(`${WEBHOOK_URL}?apikey=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    console.log(`   Status: ${response2.status} ${response2.statusText}`);
    if (response2.ok) {
      console.log('   ✅ Success! Use query parameter authentication.');
      return;
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  // Method 3: Authorization header
  try {
    console.log('\n3️⃣ Testing with Authorization header...');
    const response3 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(testData)
    });
    console.log(`   Status: ${response3.status} ${response3.statusText}`);
    if (response3.ok) {
      console.log('   ✅ Success! Use Authorization header.');
      return;
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  // Method 4: X-API-Key header
  try {
    console.log('\n4️⃣ Testing with X-API-Key header...');
    const response4 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(testData)
    });
    console.log(`   Status: ${response4.status} ${response4.statusText}`);
    if (response4.ok) {
      console.log('   ✅ Success! Use X-API-Key header.');
      return;
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  console.log('\n❌ All authentication methods failed. Check Make.com scenario configuration.');
}

testAuth();
