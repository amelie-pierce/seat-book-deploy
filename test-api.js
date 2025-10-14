// Simple test script to verify API consistency
const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

async function testApiConsistency() {
  console.log('🧪 Testing API consistency...');
  console.log(`Base URL: ${BASE_URL}`);
  
  const results = [];
  
  // Make 3 consecutive API calls
  for (let i = 1; i <= 3; i++) {
    try {
      console.log(`\n📡 Call ${i}:`);
      const response = await fetch(`${BASE_URL}/api/reservations`);
      const data = await response.json();
      
      console.log(`  - Status: ${response.status}`);
      console.log(`  - Success: ${data.success}`);
      console.log(`  - Count: ${data.count}`);
      console.log(`  - Reservations: ${data.reservations.length}`);
      
      results.push({
        call: i,
        status: response.status,
        count: data.count,
        reservationsLength: data.reservations.length
      });
      
      // Wait 100ms between calls
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Call ${i} failed:`, error.message);
    }
  }
  
  // Check consistency
  const firstResult = results[0];
  const allConsistent = results.every(result => 
    result.count === firstResult.count && 
    result.reservationsLength === firstResult.reservationsLength
  );
  
  console.log('\n📊 Results Summary:');
  results.forEach(result => {
    console.log(`  Call ${result.call}: ${result.count} reservations`);
  });
  
  console.log(`\n${allConsistent ? '✅' : '❌'} API Consistency: ${allConsistent ? 'PASSED' : 'FAILED'}`);
  
  if (!allConsistent) {
    console.log('❗ Different results detected - this indicates the persistence fix is needed');
  } else {
    console.log('🎉 All calls returned consistent results!');
  }
}

testApiConsistency().catch(console.error);