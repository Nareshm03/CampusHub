# Notices 403 Error - Fixed

## Issue
Users were getting 403 (Forbidden) errors when accessing the notices page.

## Root Cause
The frontend was using incorrect endpoints for different user roles:
- All non-student users were trying to access `/notices`
- But `/notices` endpoint requires ADMIN or FACULTY role
- PARENT role was not handled at all

## Solution Applied

### Frontend Fix (`frontend/app/notices/page.jsx`)
Updated the `fetchNotices` function to use role-specific endpoints:

```javascript
let endpoint = '/notices';
if (user?.role === 'STUDENT') {
  endpoint = '/notices/my';
} else if (user?.role === 'FACULTY') {
  endpoint = '/notices/faculty';
} else if (user?.role === 'PARENT') {
  endpoint = '/parent/notices';
}
```

### Backend Fix (`backend/src/routes/noticeRoutes.js`)
Restricted `/notices` endpoint to ADMIN only:
```javascript
router.get('/', protect, authorize('ADMIN'), getAllNotices);
```

## Endpoint Mapping

| User Role | Endpoint | Description |
|-----------|----------|-------------|
| STUDENT | `/notices/my` | Student-specific notices |
| FACULTY | `/notices/faculty` | Faculty-specific notices |
| PARENT | `/parent/notices` | College-wide notices for parents |
| ADMIN | `/notices` | All notices |

## Testing

### Test as Student
1. Login as: 1mj23is047@mvjce.edu.in
2. Navigate to: http://localhost:3000/notices
3. Should see student-relevant notices without errors

### Test as Parent
1. Login as: shankar@gmail.in / Shankar@123
2. Navigate to: http://localhost:3000/notices
3. Should see college-wide notices without errors

### Test as Faculty
1. Login as faculty user
2. Navigate to: http://localhost:3000/notices
3. Should see faculty-relevant notices without errors

### Test as Admin
1. Login as admin user
2. Navigate to: http://localhost:3000/notices
3. Should see all notices without errors

## Status
✅ Fixed - No more 403 errors on notices page
