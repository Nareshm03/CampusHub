#!/usr/bin/env node

const https = require('https');

const BACKEND_URL = process.env.BACKEND_URL || 'https://campushub-backend.onrender.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://campushub-xyz.vercel.app';

console.log('🚀 CampusHub Deployment Verification\n');

const tests = [
  {
    name: 'Backend Health Check',
    url: `${BACKEND_URL}/health`,
    expected: 200
  },
  {
    name: 'Backend API Docs',
    url: `${BACKEND_URL}/api-docs`,
    expected: 200
  },
  {
    name: 'Frontend Homepage',
    url: FRONTEND_URL,
    expected: 200
  }
];

function testEndpoint(test) {
  return new Promise((resolve) => {
    const url = new URL(test.url);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      const success = res.statusCode === test.expected;
      console.log(
        success ? '✅' : '❌',
        test.name,
        `(${res.statusCode})`
      );
      resolve(success);
    });

    req.on('error', (err) => {
      console.log('❌', test.name, `(Error: ${err.message})`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('❌', test.name, '(Timeout)');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing endpoints...\n');
  
  const results = [];
  for (const test of tests) {
    const result = await testEndpoint(test);
    results.push(result);
  }

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`\n📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ All systems operational!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check logs above.');
    process.exit(1);
  }
}

runTests();
