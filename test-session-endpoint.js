// Simple test to check session endpoint
const sessionId = 'f15c1dd8-7917-4905-bac7-9c2812e07844'; // From our previous test

async function testSessionEndpoint() {
  console.log('Testing session endpoint...');
  console.log('Session ID:', sessionId);
  
  try {
    const response = await fetch(`http://localhost:3000/api/tutor/session/${sessionId}`);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testSessionEndpoint();