// Seat Booking Conflict Test
// This script simulates two users trying to book the same seat simultaneously

const BASE_URL = window.location.origin;

async function simulateConflict() {
  console.log('🧪 Testing seat booking conflict detection...');
  
  const reservation1 = {
    reservation_id: 'test-user1-' + Date.now(),
    user_id: 'U001',
    table_id: 'A1',
    date: '2025-10-15',
    slot_type: 'AM',
    created_at: new Date().toISOString()
  };

  const reservation2 = {
    reservation_id: 'test-user2-' + Date.now(),
    user_id: 'U002', // Different user
    table_id: 'A1',  // Same seat
    date: '2025-10-15',     // Same date
    slot_type: 'AM',        // Same time slot
    created_at: new Date().toISOString()
  };

  try {
    console.log('👤 User 1 booking seat A1 for AM slot...');
    const response1 = await fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation: reservation1 })
    });
    
    const result1 = await response1.json();
    console.log('User 1 result:', response1.status, result1);

    // Small delay to simulate real-world timing
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('👤 User 2 trying to book SAME seat A1 for AM slot...');
    const response2 = await fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation: reservation2 })
    });
    
    const result2 = await response2.json();
    console.log('User 2 result:', response2.status, result2);

    // Analyze results
    if (response1.ok && !response2.ok && response2.status === 409) {
      console.log('✅ CONFLICT DETECTION WORKING!');
      console.log('  - User 1: Successfully booked');
      console.log('  - User 2: Correctly rejected with conflict');
      console.log('  - Error:', result2.error);
      console.log('  - Conflict details:', result2.conflictDetails);
    } else {
      console.log('❌ CONFLICT DETECTION FAILED!');
      console.log('  - Both users might have been allowed to book the same seat');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
simulateConflict();