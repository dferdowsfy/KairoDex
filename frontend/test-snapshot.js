// Test script for Client Snapshot functionality
// This can be run in the browser console to test the snapshot service

// Test the snapshot service directly
import { fetchClientSnapshot } from './src/services/snapshot.js';

async function testSnapshot() {
  console.log('Testing Client Snapshot Service...');
  
  try {
    const result = await fetchClientSnapshot({
      clientId: 'client1',
      agentId: 'agent1',
      question: 'client snapshot'
    });
    
    console.log('Snapshot Result:', result);
    
    if (result.status === 'ok') {
      console.log('✅ Snapshot fetched successfully');
      console.log('Client Data:', result.client);
      if (result.answer) {
        console.log('Follow-up suggestion:', result.answer);
      }
    } else {
      console.log('⚠️  Snapshot returned status:', result.status);
      console.log('Message:', result.message);
    }
  } catch (error) {
    console.error('❌ Error testing snapshot:', error);
  }
}

// Uncomment to run test
// testSnapshot();
