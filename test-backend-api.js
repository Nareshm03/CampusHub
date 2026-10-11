// Test Backend API from Browser Console
// Copy and paste this into your browser console (F12 -> Console tab).
//
// Required console variables (never hardcode credentials in this file):
//   const API_BASE = 'https://<your-backend-host>';
//   const TEST_EMAIL = 'test-admin@example.com';
//   const TEST_PASSWORD = '<password>';
// The script targets API_BASE only, fails safely when unset, and never
// logs passwords, tokens, or full response bodies.

(function () {
  'use strict';

  if (typeof API_BASE === 'undefined' || !API_BASE) {
    console.error('Set API_BASE first, e.g.: const API_BASE = "https://<your-backend-host>";');
    return;
  }
  if (typeof TEST_EMAIL === 'undefined' || !TEST_EMAIL || typeof TEST_PASSWORD === 'undefined' || !TEST_PASSWORD) {
    console.error('Set TEST_EMAIL and TEST_PASSWORD first (test-only credentials, never production secrets).');
    return;
  }

  const base = String(API_BASE).replace(/\/+$/, '');
  console.log('Testing CampusHub Backend API...\n');

  const safeStatus = (label, res) => {
    console.log(label, 'HTTP status:', res.status);
  };

  // Test 1: Health Check
  fetch(`${base}/health`)
    .then((r) => {
      safeStatus('Health Check:', r);
      return r.json();
    })
    .then((d) => console.log('Health status:', d && d.data && d.data.status))
    .catch((e) => console.error('Health Check Failed:', e && e.message));

  // Test 2: Login API (logs status only — never the token or body)
  fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  })
    .then((r) => {
      safeStatus('Login Response:', r);
      return r.json();
    })
    .then((d) => console.log('Login success flag:', d && d.success === true))
    .catch((e) => console.error('Login Failed:', e && e.message));

  // Test 3: Check CORS headers
  fetch(`${base}/api/v1/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: window.location.origin,
      'Access-Control-Request-Method': 'POST'
    }
  })
    .then((r) => {
      console.log('\nCORS Preflight Response:');
      console.log('Access-Control-Allow-Origin:', r.headers.get('Access-Control-Allow-Origin'));
      console.log('Access-Control-Allow-Methods:', r.headers.get('Access-Control-Allow-Methods'));
      console.log('Access-Control-Allow-Credentials:', r.headers.get('Access-Control-Allow-Credentials'));
    })
    .catch((e) => console.error('CORS Preflight Failed:', e && e.message));
})();
