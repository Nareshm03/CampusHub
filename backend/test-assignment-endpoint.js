const axios = require('axios');

// Test the assignment endpoint
async function testAssignmentEndpoint() {
  try {
    console.log('Testing assignment endpoint...');
    
    // First, try to login as a student to get a token
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'student@example.com', // Replace with actual student credentials
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token obtained');
    
    // Now test the upcoming deadlines endpoint
    const response = await axios.get('http://localhost:5000/api/v1/assignments/upcoming-deadlines', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✓ Endpoint is working!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.error('✗ Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('✗ No response from server. Is the backend running?');
    } else {
      console.error('✗ Error:', error.message);
    }
  }
}

testAssignmentEndpoint();
