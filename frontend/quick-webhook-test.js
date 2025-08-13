// Test if the webhook exists and what it expects
const WEBHOOK_URL = 'https://hook.us2.make.com/267qcrx705kys88karl81vwnfvyaame6';

async function quickWebhookTest() {
  console.log('🔍 Testing webhook availability...\n');
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test: true,
        client_name: 'Sam Johnson'
      })
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('❌ 401 = Webhook exists but scenario is not configured for webhooks');
      console.log('   Your scenario needs a "Custom Webhook" module as the first step');
    } else if (response.status === 404) {
      console.log('❌ 404 = Webhook URL does not exist');
    } else if (response.status === 200 || response.status === 202) {
      console.log('✅ Webhook is working!');
      const data = await response.text();
      console.log('Response:', data);
    } else {
      console.log(`ℹ️  Status ${response.status}: Check Make.com scenario configuration`);
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

quickWebhookTest();
