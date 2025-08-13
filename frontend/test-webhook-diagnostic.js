// Detailed webhook diagnostic tool
const WEBHOOK_URL = 'https://hook.us2.make.com/267qcrx705kys88karl81vwnfvyaame6';

async function diagnosticTest() {
  console.log('🔍 Make.com Webhook Diagnostic Test\n');
  console.log('Webhook URL:', WEBHOOK_URL);

  // Test 1: Simple GET request to see if webhook exists
  try {
    console.log('\n📡 Test 1: GET request to check webhook existence...');
    const getResponse = await fetch(WEBHOOK_URL, { method: 'GET' });
    console.log(`Status: ${getResponse.status} ${getResponse.statusText}`);
    
    if (getResponse.status === 405) {
      console.log('✅ Webhook exists (405 = Method Not Allowed for GET)');
    } else if (getResponse.status === 404) {
      console.log('❌ Webhook not found (404)');
    } else {
      console.log(`ℹ️  Unexpected status: ${getResponse.status}`);
    }
  } catch (e) {
    console.log('❌ Network error:', e.message);
  }

  // Test 2: POST with minimal data
  try {
    console.log('\n📡 Test 2: POST with minimal JSON...');
    const postResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true })
    });
    
    console.log(`Status: ${postResponse.status} ${postResponse.statusText}`);
    
    if (postResponse.ok) {
      const data = await postResponse.json();
      console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await postResponse.text();
      console.log('❌ Error response body:', errorText);
    }
  } catch (e) {
    console.log('❌ Network error:', e.message);
  }

  // Test 3: POST with form data (sometimes Make.com prefers this)
  try {
    console.log('\n📡 Test 3: POST with form data...');
    const formData = new URLSearchParams();
    formData.append('client_name', 'Sam Johnson');
    formData.append('test', 'true');
    
    const formResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
    
    console.log(`Status: ${formResponse.status} ${formResponse.statusText}`);
    
    if (formResponse.ok) {
      const data = await formResponse.json();
      console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await formResponse.text();
      console.log('❌ Error response body:', errorText);
    }
  } catch (e) {
    console.log('❌ Network error:', e.message);
  }

  console.log('\n🎯 Summary:');
  console.log('If all tests show 401 Unauthorized, the Make.com scenario likely needs:');
  console.log('1. To be turned ON/activated in Make.com');
  console.log('2. Proper webhook trigger configuration');
  console.log('3. To accept incoming webhooks (not just send them)');
  console.log('4. Authentication to be disabled or configured differently');
}

diagnosticTest();
