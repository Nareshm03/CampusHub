# CampusHub Deployment Troubleshooting

## Common Issues & Solutions

### 1. CORS Errors

**Symptom**: Browser console shows "CORS policy blocked" errors

**Solutions**:
```bash
# Check backend CORS configuration
# Ensure ALLOWED_ORIGINS matches frontend URL exactly

# Render Dashboard → Environment Variables
ALLOWED_ORIGINS=https://your-app.vercel.app

# No trailing slash
# Must match protocol (https)
# Case sensitive
```

**Verify**:
```bash
curl -H "Origin: https://your-app.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://campushub-backend.onrender.com/api/v1/auth/login
```

---

### 2. Backend Cold Start (Render Free Tier)

**Symptom**: First request takes 30+ seconds, then times out

**Solutions**:
1. **Wait it out**: Free tier spins down after 15 min inactivity
2. **Keep-alive service**: Use cron-job.org to ping every 10 minutes
   ```
   URL: https://campushub-backend.onrender.com/health
   Interval: Every 10 minutes
   ```
3. **Upgrade**: Render Starter plan ($7/month) for always-on

**Temporary Fix**:
```javascript
// Add to frontend: lib/axios.js
axios.defaults.timeout = 60000; // 60 seconds
```

---

### 3. Database Connection Failed

**Symptom**: Backend logs show "MongoServerError: connection refused"

**Solutions**:

**Check 1: Network Access**
```bash
# MongoDB Atlas → Network Access
# Ensure 0.0.0.0/0 is whitelisted
```

**Check 2: Connection String**
```bash
# Verify MONGODB_URI format
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Common mistakes:
# - Special characters in password not URL-encoded
# - Wrong database name
# - Missing ?retryWrites=true
```

**Check 3: Database User**
```bash
# MongoDB Atlas → Database Access
# Ensure user has "Read and write to any database" role
```

**Test Connection**:
```javascript
// Create test-connection.js
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected'))
  .catch(err => console.error('❌ Error:', err));
```

---

### 4. Environment Variables Not Working

**Symptom**: App uses default values instead of env vars

**Solutions**:

**Render**:
1. Dashboard → Environment Variables
2. Add/update variables
3. Click "Save Changes"
4. **Important**: Redeploy after changes (auto-triggers)

**Vercel**:
1. Project Settings → Environment Variables
2. Add/update variables
3. Select environment: Production
4. **Important**: Redeploy after changes
   ```bash
   # Trigger redeploy
   Deployments → Latest → Redeploy
   ```

**Verify**:
```javascript
// Add temporary endpoint to check
app.get('/debug-env', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    HAS_JWT_SECRET: !!process.env.JWT_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL
  });
});
```

---

### 5. Build Failures

**Symptom**: Deployment fails during build phase

**Common Causes**:

**Missing Dependencies**:
```bash
# Check package.json includes all dependencies
npm install --save missing-package

# Commit and push
git add package.json package-lock.json
git commit -m "Add missing dependency"
git push
```

**Node Version Mismatch**:
```json
// Add to package.json
{
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}
```

**Build Command Issues**:
```bash
# Render: Ensure build command is correct
Build Command: npm install

# Vercel: Usually auto-detected
Build Command: npm run build
```

**Memory Issues**:
```bash
# Increase Node memory (Render)
Start Command: node --max-old-space-size=2048 src/server.js
```

---

### 6. Frontend Can't Reach Backend

**Symptom**: API calls fail with network errors

**Check 1: API URL**:
```bash
# Verify NEXT_PUBLIC_API_URL in Vercel
NEXT_PUBLIC_API_URL=https://campushub-backend.onrender.com/api/v1

# Must include /api/v1
# Must be https
# No trailing slash
```

**Check 2: Backend Health**:
```bash
curl https://campushub-backend.onrender.com/health
# Should return: {"status":"OK"}
```

**Check 3: Browser Console**:
```javascript
// Open DevTools → Console
console.log(process.env.NEXT_PUBLIC_API_URL);
// Should show backend URL
```

**Check 4: Network Tab**:
```
1. Open DevTools → Network
2. Try login
3. Check request URL
4. Verify it points to correct backend
```

---

### 7. 404 Not Found on Refresh

**Symptom**: Frontend routes work on navigation but 404 on refresh

**Solution**: Vercel handles this automatically for Next.js

**If using custom vercel.json**:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

### 8. Static Files Not Loading

**Symptom**: Images, CSS, or JS files return 404

**Backend (Render)**:
```javascript
// Ensure static middleware is configured
app.use('/uploads', express.static('uploads'));

// Check file exists in deployment
// Render doesn't persist files between deploys
// Use S3 or Cloudinary for production
```

**Frontend (Vercel)**:
```javascript
// Use Next.js Image component
import Image from 'next/image';

<Image src="/logo.png" alt="Logo" width={100} height={100} />

// Files in public/ are served at root
// /public/logo.png → /logo.png
```

---

### 9. WebSocket Connection Failed

**Symptom**: Real-time features don't work

**Solution**:
```javascript
// Update Socket.io client connection
// frontend/context/SocketContext.jsx

const socket = io(process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', ''), {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

**Render Configuration**:
```bash
# Render supports WebSockets by default
# Ensure backend has Socket.io configured
# Check backend logs for connection attempts
```

---

### 10. Slow Performance

**Symptom**: App loads slowly or times out

**Solutions**:

**Backend**:
1. Add database indexes
2. Enable Redis caching
3. Optimize queries
4. Upgrade Render tier

**Frontend**:
1. Enable Next.js Image optimization
2. Implement code splitting
3. Use dynamic imports
4. Enable Vercel Analytics

**Database**:
1. Create indexes on frequently queried fields
2. Limit query results
3. Use pagination
4. Upgrade Atlas tier

---

### 11. Authentication Issues

**Symptom**: Login works but session lost on refresh

**Check JWT Configuration**:
```bash
# Backend environment variables
JWT_SECRET=<strong-secret-32-chars>
JWT_EXPIRE=30d

# Ensure JWT_SECRET is same across all instances
# Render redeploys create new instances
```

**Check Cookie Settings**:
```javascript
// backend/middleware/session.js
{
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    sameSite: 'none', // Cross-origin
    httpOnly: true
  }
}
```

---

### 12. Email Not Sending

**Symptom**: Password reset emails not received

**Check SMTP Configuration**:
```bash
# Verify credentials
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-specific-password

# Gmail requires app-specific password
# Google Account → Security → App passwords
```

**Test Email**:
```javascript
// Create test-email.js
const sendEmail = require('./utils/sendEmail');

sendEmail({
  email: 'test@example.com',
  subject: 'Test',
  message: 'Test message'
}).then(() => console.log('✅ Sent'))
  .catch(err => console.error('❌ Error:', err));
```

**Use Mock Mode**:
```bash
# For testing without real emails
ENABLE_MOCK_EMAIL=true
```

---

## Debugging Tools

### Check Backend Logs
```bash
# Render Dashboard → Logs tab
# Filter by: Error, Warning
# Download logs for detailed analysis
```

### Check Frontend Logs
```bash
# Vercel Dashboard → Deployments → View Function Logs
# Check browser console for client-side errors
```

### Test API Endpoints
```bash
# Health check
curl https://campushub-backend.onrender.com/health

# Test auth endpoint
curl -X POST https://campushub-backend.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### Verify Environment
```bash
# Run verification script
node verify-deployment.js
```

---

## Getting Help

### Render Support
- Dashboard → Help → Contact Support
- Community: https://community.render.com

### Vercel Support
- Dashboard → Help → Contact Support
- Discord: https://vercel.com/discord

### MongoDB Support
- Atlas → Support → Create Case
- Community: https://www.mongodb.com/community/forums

---

## Emergency Rollback

### Render
1. Dashboard → Deploys
2. Find last working deployment
3. Click "Redeploy"

### Vercel
1. Dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

### Database
1. Atlas → Clusters → Backup
2. Restore from snapshot
3. Update connection string if needed
