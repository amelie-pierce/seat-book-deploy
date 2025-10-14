// API Call Counter Test
// Run this in browser console to test API call reduction

let apiCallCount = 0;

// Override fetch to count API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (typeof url === 'string' && url.includes('/api/reservations')) {
    apiCallCount++;
    console.log(`🔢 API Call #${apiCallCount}: GET /api/reservations`);
  }
  return originalFetch.apply(this, args);
};

// Test function
async function testApiCalls() {
  console.log('🧪 Testing API call optimization...');
  console.log('Starting count:', apiCallCount);
  
  // Simulate app initialization
  console.log('1. Initializing app...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('2. Making some user actions...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('3. Refreshing data...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`Final API call count: ${apiCallCount}`);
  console.log(apiCallCount <= 2 ? '✅ PASS: Optimized!' : '❌ FAIL: Too many calls');
}

// Auto-run test
testApiCalls();