// Quick test script for task creation
const testTaskCreation = async () => {
  try {
    console.log('Testing task creation...')
    
    const response = await fetch('/api/sheets/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: 'test-client',
        title: 'Test Task from Browser',
        status: 'open'
      })
    })
    
    const result = await response.json()
    console.log('Task creation result:', result)
    
    if (response.ok) {
      console.log('✅ Task creation successful!')
    } else {
      console.log('❌ Task creation failed:', result.error)
    }
  } catch (error) {
    console.error('❌ Task creation error:', error)
  }
}

// Run the test
testTaskCreation()