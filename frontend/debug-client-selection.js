// Debug client selection issues with Make.com webhook
const WEBHOOK_URL = 'https://hook.us2.make.com/267qcrx705kys88karl81vwnfvyaame6';

async function testClientSelection() {
  console.log('🔍 Testing Client Selection in Make.com Webhook\n');
  
  // Test with different clients to see which one is recognized
  const testClients = [
    {
      client_id: 'client1',
      name: 'Taylor Patel',
      email: 'taylor.patel@email.com',
      phone: '555-123-4567',
      search_fields: {
        first_name: 'Taylor',
        last_name: 'Patel'
      }
    },
    {
      client_id: 'client2',
      name: 'Riley Davis',
      email: 'riley.davis@email.com',
      phone: '555-987-6543',
      search_fields: {
        first_name: 'Riley',
        last_name: 'Davis'
      }
    },
    {
      client_id: 'client3',
      name: 'client4', // The client ID from the Make.com screenshot
      email: 'test@example.com',
      phone: '555-555-5555',
      search_fields: {
        first_name: 'client4',
        last_name: ''
      }
    }
  ];
  
  for (const client of testClients) {
    console.log(`\n📋 Testing client: ${client.name} (${client.client_id})`);
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: client.client_id,
          client_name: client.name,
          client_email: client.email,
          client_phone: client.phone,
          agent_id: 'agent1',
          question: 'client snapshot',
          search_fields: client.search_fields
        })
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      // Get the raw response as text first
      const textResponse = await response.text();
      console.log('Raw Response Body:');
      console.log(textResponse);
      
      // Try to parse as JSON
      try {
        const jsonData = JSON.parse(textResponse);
        console.log('Valid JSON, parsed result:');
        console.log(JSON.stringify(jsonData, null, 2));
        
        // Check if the client in the response matches the requested client
        if (jsonData.status === 'ok' && jsonData.client) {
          if (jsonData.client.client_id === client.client_id || 
              jsonData.client.name === client.name) {
            console.log('✅ MATCH! The returned client matches the requested client');
          } else {
            console.log('❌ NO MATCH! The returned client does not match the requested client');
            console.log(`Requested: ${client.name} (${client.client_id})`);
            console.log(`Returned: ${jsonData.client.name} (${jsonData.client.client_id})`);
          }
        }
        
      } catch (e) {
        console.log('❌ Invalid JSON - parsing error:', e.message);
      }
    } catch (error) {
      console.log('❌ Network error:', error.message);
    }
  }
}

testClientSelection();
