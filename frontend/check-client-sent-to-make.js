// Check what client data is being sent to Make.com
const WEBHOOK_URL = 'https://hook.us2.make.com/267qcrx705kys88karl81vwnfvyaame6';

async function checkClientSentToMake() {
  console.log('📤 Checking What Client Data is Being Sent to Make.com\n');
  
  // Test client data - these should match the ones in your frontend
  const clientsToTest = [
    {
      clientId: 'client1',
      name: 'Sam Johnson',
      email: 'sam.johnson@email.com',
      phone: '555-123-4567'
    },
    {
      clientId: 'client2', 
      name: 'Taylor Patel',
      email: 'taylor.patel@email.com',
      phone: '555-987-6543'
    }
  ];
  
  for (const client of clientsToTest) {
    console.log(`\n🧪 Testing with client: ${client.name} (${client.clientId})`);
    
    const requestBody = {
      client_id: client.clientId,
      client_name: client.name,
      client_email: client.email,
      client_phone: client.phone,
      agent_id: 'agent1',
      question: 'client snapshot',
      search_fields: {
        first_name: client.name.split(' ')[0],
        last_name: client.name.split(' ').slice(1).join(' ')
      }
    };
    
    console.log('Request Body:');
    console.log(JSON.stringify(requestBody, null, 2));
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      try {
        const jsonResponse = await response.json();
        console.log('Response:');
        console.log(JSON.stringify(jsonResponse, null, 2));
        
        // Check if client in response matches the requested client
        if (jsonResponse.status === 'ok' && jsonResponse.client) {
          if (jsonResponse.client.name === client.name || 
              jsonResponse.client.client_id === client.clientId) {
            console.log('✅ SUCCESS: Response contains the requested client');
          } else {
            console.log('❌ ERROR: Response contains a different client');
            console.log(`Requested: ${client.name} (${client.clientId})`);
            console.log(`Received: ${jsonResponse.client.name} (${jsonResponse.client.client_id})`);
          }
        }
      } catch (e) {
        const textResponse = await response.text();
        console.log('Raw response (not valid JSON):');
        console.log(textResponse);
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
  
  console.log('\n🔧 How to Fix "Same Client" Issue:');
  console.log('1. In Make.com, add a "Search Rows" or "Get Record" module before your response');
  console.log('2. Configure it to search based on client ID or name from the webhook request');
  console.log('3. Map the search results to your webhook response');
  console.log('4. Add error handling for when a client is not found');
}

checkClientSentToMake();
