# 🔧 Fix Login Failed Issue

## Step 1: Check Browser Console

1. On the login page, press **F12**
2. Go to **Console** tab
3. Look for error messages (usually red text)

### Common Errors:

**CORS Error:**
```
Access to fetch at 'https://campushub-4puo.onrender.com/api/v1/auth/login' 
from origin 'https://frontend-wine-two-10.vercel.app' has been blocked by CORS policy
```

**Network Error:**
```
Failed to fetch
net::ERR_FAILED
```

---

## Step 2: Test Backend API Directly

### Option A: From Browser Console

1. Press **F12** on the login page
2. Go to **Console** tab
3. Paste this code:

```javascript
fetch('https://campushub-4puo.onrender.com/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@mvjce.edu.in',
    password: 'admin@123'
  })
})
.then(r => r.json())
.then(d => console.log('Response:', d))
.catch(e => console.error('Error:', e));
```

4. Check the response

### Option B: Test in New Tab

Open this URL in a new tab:
```
https://campushub-4puo.onrender.com/health
```

Should show:
```json
{"success":true,"message":"Server is healthy","data":{"status":"OK","uptime":123}}
```

---

## Step 3: Fix CORS Settings in Render

### Go to Render Dashboard

1. Visit: https://dashboard.render.com
2. Click on **CampusHub** service
3. Click **"Environment"** tab (left sidebar)

### Update These Variables

Find these variables and update them:

**FRONTEND_URL**
- Current value: `https://placeholder.vercel.app` (or something else)
- New value: `https://frontend-wine-two-10.vercel.app`

**ALLOWED_ORIGINS**
- Current value: `https://placeholder.vercel.app` (or something else)
- New value: `https://frontend-wine-two-10.vercel.app`

### Save and Redeploy

1. Click **"Save Changes"** button
2. Render will automatically redeploy (takes 2-3 minutes)
3. Watch the logs for "Server running in production mode"

---

## Step 4: Wait for Backend to Wake Up

If backend is sleeping (Render free tier):
1. Visit: https://campushub-4puo.onrender.com/health
2. Wait 30 seconds for it to wake up
3. You should see the health check response

---

## Step 5: Test Login Again

1. Go back to: https://frontend-wine-two-10.vercel.app/login
2. Enter credentials:
   - Email: `admin@mvjce.edu.in`
   - Password: `admin@123`
3. Click **Sign In**

---

## Step 6: Check Network Tab

If still failing:

1. Press **F12**
2. Go to **Network** tab
3. Click **Sign In** button
4. Look for the login request
5. Click on it to see:
   - **Status code** (should be 200)
   - **Response** (should show user data)
   - **Headers** (check CORS headers)

---

## Common Issues & Solutions

### Issue 1: CORS Error
**Solution:** Update FRONTEND_URL and ALLOWED_ORIGINS in Render

### Issue 2: Backend Sleeping
**Solution:** Wait 30 seconds, or upgrade to paid tier

### Issue 3: Wrong API URL
**Check:** Press F12 → Console, type:
```javascript
console.log(process.env.NEXT_PUBLIC_API_URL);
```
Should show: `https://campushub-4puo.onrender.com/api/v1`

### Issue 4: Invalid Credentials
**Solution:** Use these verified credentials:
- Email: `admin@mvjce.edu.in`
- Password: `admin@123`

---

## Quick Test Command

Run this in browser console to test everything:

```javascript
// Test 1: Backend Health
fetch('https://campushub-4puo.onrender.com/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend:', d.data.status))
  .catch(e => console.error('❌ Backend down:', e));

// Test 2: Login
fetch('https://campushub-4puo.onrender.com/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@mvjce.edu.in',
    password: 'admin@123'
  })
})
.then(r => r.json())
.then(d => console.log('✅ Login:', d.success ? 'SUCCESS' : 'FAILED', d))
.catch(e => console.error('❌ Login error:', e));
```

---

## Most Likely Fix

**Update CORS in Render:**
1. Go to https://dashboard.render.com
2. CampusHub service → Environment tab
3. Set `ALLOWED_ORIGINS=https://frontend-wine-two-10.vercel.app`
4. Save and wait 2-3 minutes
5. Try login again

---

**After updating CORS, the login should work!** 🚀
