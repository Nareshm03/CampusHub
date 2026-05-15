# Quick Testing Guide - Student Dashboard Fix

## Prerequisites
- Backend running on port 5000
- Frontend running on port 3000
- Valid student account credentials

## Test 1: Verify Backend Routes
```bash
cd backend
node verify-routes.js
```

**Expected Output**:
```
✓ /api/v1/assignments/upcoming-deadlines route is registered
```

## Test 2: Test All Endpoints
```bash
cd backend
node test-all-endpoints.js
```

**Expected Output**:
All endpoints should return 401 (Unauthorized), not 404

## Test 3: Frontend Dashboard Test

### Steps:
1. Open browser to `http://localhost:3000`
2. Login with student credentials
3. Navigate to student dashboard
4. Open browser console (F12)

### Expected Results:
✓ No 404 errors in console
✓ Dashboard loads with data
✓ Upcoming deadlines section displays
✓ All stats show correctly

### If You See Errors:

**"No authentication token found"**
- User is not logged in
- Login again and retry

**"Attendance summary endpoint not found"**
- Backend route missing
- Check backend routes configuration

**"Failed to fetch dashboard data"**
- Backend not running
- Check backend is on port 5000

## Test 4: Test Without Authentication

### Steps:
1. Clear localStorage: `localStorage.clear()`
2. Refresh page
3. Check console

### Expected Results:
✓ Warning: "No authentication token found"
✓ Redirect to login page
✓ No API calls made

## Common Issues & Solutions

### Issue: Still seeing 404 errors
**Solution**: 
- Verify backend is running: `netstat -ano | findstr :5000`
- Check .env.local has correct API URL
- Clear browser cache and reload

### Issue: "Access denied" errors
**Solution**:
- Verify user has STUDENT role
- Check token is valid
- Re-login to get fresh token

### Issue: Empty dashboard
**Solution**:
- Check if student profile exists
- Verify student has enrolled subjects
- Check database has seed data

## Quick Commands

### Start Backend
```bash
cd backend
npm start
```

### Start Frontend
```bash
cd frontend
npm run dev
```

### Check Backend Status
```bash
netstat -ano | findstr :5000
```

### Test Specific Endpoint
```bash
cd backend
node test-endpoint.js
```

## Success Criteria

✓ Backend routes verified
✓ All endpoints return 401 (not 404)
✓ Frontend loads without 404 errors
✓ Dashboard displays data correctly
✓ Error messages are clear and specific
✓ No repeated error logs
