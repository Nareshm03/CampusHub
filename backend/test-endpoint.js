const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/assignments/upcoming-deadlines',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('Testing endpoint without authentication...\n');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse:');
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log(data);
    }
    
    console.log('\n=== Analysis ===');
    if (res.statusCode === 404) {
      console.log('✗ Route NOT FOUND (404) - The endpoint does not exist or is not registered');
    } else if (res.statusCode === 401) {
      console.log('✓ Route EXISTS but requires authentication (401) - This is expected!');
    } else if (res.statusCode === 403) {
      console.log('✓ Route EXISTS but requires specific role (403)');
    } else {
      console.log(`Route returned status ${res.statusCode}`);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
  console.log('\n✗ Cannot connect to backend. Is it running on port 5000?');
});

req.end();
