// Test Client Snapshot with Real Google Sheets Data
// This function tests the webhook call with the actual client names

async function testClientSnapshotWithRealData() {
  console.log('🧪 Testing Client Snapshot with Google Sheets Data');
  
  // Real clients that match Google Sheets (columns D & E)
  const realClients = [
    { id: 'client1', name: 'Sam Johnson', email: 'sam.johnson@email.com' },
    { id: 'client2', name: 'Casey Martinez', email: 'casey.martinez@email.com' },
    { id: 'client3', name: 'Riley Davis', email: 'riley.davis@email.com' },
    { id: 'client4', name: 'Taylor Patel', email: 'taylor.patel@email.com' },
    { id: 'client5', name: 'Logan Lopez', email: 'logan.lopez@email.com' }
  ];
  
  console.log('📊 Updated Frontend Clients:', realClients);
  
  // Test webhook payload for first client
  const testClient = realClients[0]; // Sam Johnson
  const webhookPayload = {
    client_id: testClient.id,
    client_name: testClient.name,
    client_email: testClient.email,
    agent_id: 'agent1',
    question: 'client snapshot',
    search_fields: {
      name: testClient.name,
      email: testClient.email,
      first_name: testClient.name.split(' ')[0], // "Sam"
      last_name: testClient.name.split(' ').slice(1).join(' ') // "Johnson"
    }
  };
  
  console.log('📤 Webhook Payload for Sam Johnson:', webhookPayload);
  console.log('🔍 Make.com should search for:');
  console.log('  - Column D (first_name): "Sam"');
  console.log('  - Column E (last_name): "Johnson"');
  console.log('  - OR email: "sam.johnson@email.com"');
  
  // Test the actual API call
  try {
    console.log('🚀 Making test API call...');
    
    const response = await fetch(process.env.REACT_APP_MAKE_SNAPSHOT_URL || process.env.NEXT_PUBLIC_MAKE_SNAPSHOT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.REACT_APP_MAKE_APIKEY && { 'x-make-apikey': process.env.REACT_APP_MAKE_APIKEY })
      },
      body: JSON.stringify(webhookPayload)
    });
    
    console.log('📡 Response Status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook Response:', result);
      
      if (result.status === 'ok') {
        console.log('🎉 SUCCESS! Client snapshot retrieved');
        console.log('📋 Client Data:', result.client);
      } else if (result.status === 'not_found') {
        console.log('❌ Client not found - check Make.com search logic');
        console.log('💡 Make sure Make.com searches for "Sam" in column D and "Johnson" in column E');
      } else {
        console.log('⚠️ Unexpected status:', result.status);
      }
    } else {
      console.log('❌ HTTP Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Network Error:', error.message);
    console.log('💡 Check if Make.com webhook URL is correct');
  }
  
  return webhookPayload;
}

// Test function you can run in browser console
window.testClientSnapshot = testClientSnapshotWithRealData;

console.log('🎯 To test: Open browser console and run: testClientSnapshot()');

// Also export for use in components
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testClientSnapshotWithRealData };
}
