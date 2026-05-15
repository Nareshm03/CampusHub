const http = require('http');

const endpoints = [
  '/api/v1/students/me',
  '/api/v1/attendance/summary/123',
  '/api/v1/leaves/my',
  '/api/v1/notices/my',
  '/api/v1/attendance/student/123',
  '/api/v1/marks/my',
  '/api/v1/assignments/upcoming-deadlines',
  '/api/v1/grades/calculate/me'
];

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          message: res.statusMessage
        });
      });
    });

    req.on('error', () => {
      resolve({ path, status: 'ERROR', message: 'Connection failed' });
    });

    req.setTimeout(2000, () => {
      req.destroy();
      resolve({ path, status: 'TIMEOUT', message: 'Request timeout' });
    });

    req.end();
  });
}

async function testAllEndpoints() {
  console.log('Testing all dashboard endpoints...\n');
  console.log('Endpoint'.padEnd(50), 'Status');
  console.log('='.repeat(70));

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    const statusColor = result.status === 404 ? '✗' : result.status === 401 ? '✓' : '?';
    console.log(
      `${statusColor} ${endpoint.padEnd(48)}`,
      `${result.status} ${result.message}`
    );
  }

  console.log('\n=== Legend ===');
  console.log('✓ 401 Unauthorized = Route exists, requires auth (GOOD)');
  console.log('✗ 404 Not Found = Route does not exist (PROBLEM)');
  console.log('? Other status = Check manually');
}

testAllEndpoints();
