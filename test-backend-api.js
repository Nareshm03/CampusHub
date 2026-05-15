// Test Backend API from Browser Console
// Copy and paste this into your browser console (F12 -> Console tab)

console.log('Testing CampusHub Backend API...\n');

// Test 1: Health Check
fetch('https://campushub-4puo.onrender.com/health')
  .then(r => r.json())
  .then(d => console.log('✅ Health Check:', d))
  .catch(e => console.error('❌ Health Check Failed:', e));

// Test 2: Login API
fetch('https://campushub-4puo.onrender.com/api/v1/auth/login', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Origin': 'https://frontend-wine-two-10.vercel.app'
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'admin@mvjce.edu.in',
    password: 'admin@123'
  })
})
.then(r => {
  console.log('Response Status:', r.status);
  console.log('Response Headers:', [...r.headers.entries()]);
  return r.json();
})
.then(d => console.log('✅ Login Response:', d))
.catch(e => console.error('❌ Login Failed:', e));

// Test 3: Check CORS headers
fetch('https://campushub-4puo.onrender.com/api/v1/auth/login', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://frontend-wine-two-10.vercel.app',
    'Access-Control-Request-Method': 'POST'
  }
})
.then(r => {
  console.log('\nCORS Preflight Response:');
  console.log('Access-Control-Allow-Origin:', r.headers.get('Access-Control-Allow-Origin'));
  console.log('Access-Control-Allow-Methods:', r.headers.get('Access-Control-Allow-Methods'));
  console.log('Access-Control-Allow-Credentials:', r.headers.get('Access-Control-Allow-Credentials'));
})
.catch(e => console.error('❌ CORS Preflight Failed:', e));
