# Password Change System - Quick Reference

## Password Requirements
- ✅ Minimum 8 characters
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)

## User Access

### Students
- Change own password: ✅ (requires current password)
- Change other passwords: ❌
- Location: Student Dashboard → "Change Password" button

### Faculty
- Change own password: ✅ (requires current password)
- Change other passwords: ❌
- Location: Faculty Dashboard → "Change Password" button

### Admins
- Change own password: ✅ (requires current password)
- Reset any user password: ✅ (no current password needed)
- Location: Admin → Students/Faculty → Key icon

## UI Elements

### Password Change Button Locations
1. **Student Dashboard**: Top right corner, next to greeting
2. **Admin Students Page**: Purple key icon in actions column
3. **Admin Faculty Page**: Purple key icon in actions column

### Modal Features
- Show/hide password toggles
- Real-time password strength meter
- Clear validation error messages
- Admin mode indicator (purple theme)
- Responsive design with dark mode

## API Endpoints

### Self-Change
```
PUT /api/auth/changepassword
Auth: Required
Body: { currentPassword, newPassword }
```

### Admin Reset
```
PUT /api/users/:userId/change-password
Auth: Admin only
Body: { newPassword }
```

## Common Errors

| Error Message | Solution |
|--------------|----------|
| "Password must be at least 8 characters" | Use 8+ characters |
| "Password must contain at least one lowercase letter" | Add a-z |
| "Password must contain at least one number" | Add 0-9 |
| "Current password is incorrect" | Verify current password |
| "Passwords do not match" | Ensure passwords match |

## Security Features
- 🔒 bcrypt password hashing
- 📝 Comprehensive audit logging
- 🛡️ Role-based access control
- ✅ Frontend + backend validation
- 🔐 Current password verification (self-changes)

## Files Modified
**Backend**: 3 files
- `controllers/authController.js`
- `controllers/usersController.js`
- `models/User.js`

**Frontend**: 4 files
- `components/ui/ChangePasswordModal.jsx`
- `app/dashboard/admin/students/page.jsx`
- `app/dashboard/admin/faculty/page.jsx`
- `app/dashboard/student/page.jsx` (already had it)

## Testing Quick Checks
- [ ] Student can change own password
- [ ] Admin can reset student password
- [ ] Admin can reset faculty password
- [ ] Invalid passwords rejected
- [ ] Audit logs created
- [ ] UI responsive and accessible

---
**Version**: 1.0 | **Status**: ✅ Production Ready
