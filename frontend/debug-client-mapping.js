// Debug Test for Client Snapshot Data Mapping
// Run this in browser console to see what data is being sent

function debugClientMapping() {
  console.log('🔍 Frontend Clients vs Google Sheets Mapping Test');
  
  // Sample frontend clients (from your dropdown)
  const frontendClients = [
    { id: 'client1', name: 'Avery Brooks', email: 'avery.brooks@example.com' },
    { id: 'client2', name: 'Jordan Brooks', email: 'jordan.brooks@example.com' },
    { id: 'client3', name: 'Priya Shah', email: 'priya.shah@example.com' },
    { id: 'client4', name: 'Mateo Alvarez', email: 'mateo.alvarez@example.com' },
    { id: 'client5', name: 'Lila Nguyen', email: 'lila.nguyen@example.com' }
  ];
  
  // Sample Google Sheets data (from your screenshot)
  const googleSheetsClients = [
    { name_first: 'Sam', name_last: 'Johnson', email: 'sam.johnson@email.com' },
    { name_first: 'Casey', name_last: 'Martinez', email: 'casey.martinez@email.com' },
    { name_first: 'Riley', name_last: 'Davis', email: 'riley.davis@email.com' },
    { name_first: 'Taylor', name_last: 'Patel', email: 'taylor.patel@email.com' },
    { name_first: 'Logan', name_last: 'Lopez', email: 'logan.lopez@email.com' }
  ];
  
  console.log('📱 Frontend Clients:', frontendClients);
  console.log('📊 Google Sheets Clients:', googleSheetsClients);
  
  console.log('\n🔗 What will be sent to Make.com webhook:');
  
  frontendClients.forEach(client => {
    const payload = {
      client_id: client.id,
      client_name: client.name,
      client_email: client.email,
      agent_id: 'agent1',
      question: 'client snapshot',
      search_fields: {
        name: client.name,
        email: client.email,
        first_name: client.name.split(' ')[0],
        last_name: client.name.split(' ').slice(1).join(' ')
      }
    };
    
    console.log(`\n${client.name}:`, payload);
    
    // Try to find a match in Google Sheets
    const match = googleSheetsClients.find(sheet => 
      sheet.email === client.email ||
      (sheet.name_first + ' ' + sheet.name_last) === client.name ||
      sheet.name_first === payload.search_fields.first_name
    );
    
    if (match) {
      console.log(`  ✅ Potential match found: ${match.name_first} ${match.name_last}`);
    } else {
      console.log(`  ❌ No match found - Make.com will return "not_found"`);
    }
  });
  
  console.log('\n💡 Recommendations:');
  console.log('1. Use email matching if possible (most reliable)');
  console.log('2. Update frontend client data to match Google Sheets');
  console.log('3. Add ID mapping column to Google Sheets');
  console.log('4. Use fuzzy name matching in Make.com scenario');
}

// Uncomment to run test
// debugClientMapping();
