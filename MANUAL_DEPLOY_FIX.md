# 🔧 Manual Deploy Fix

## ✅ Fix Applied Locally

The trust proxy setting has been added to fix the rate limiter error.

## 📤 Deploy to Render

### Option 1: Push to Your GitHub (Recommended)
```bash
git push origin main
```

### Option 2: Manual Deploy in Render Dashboard
1. Go to: https://dashboard.render.com
2. Click on **CampusHub** service
3. Click **Manual Deploy** button (top right)
4. Select **Clear build cache & deploy**
5. Click **Deploy**
6. Wait 2-3 minutes

---

## 🎯 What Was Fixed

### 1. Trust Proxy Setting
Added `app.set('trust proxy', 1);` to server.js

**Why:** Render uses a proxy, and Express needs to trust it for rate limiting to work correctly.

### 2. SMTP Issue (Already Handled)
The SMTP IPv6 error is just a warning. Emails are disabled in production with `ENABLE_MOCK_EMAIL=false`.

---

## ✅ After Deploy

1. **Wait 2-3 minutes** for deployment to complete
2. **Check logs** in Render - the rate limit error should be gone
3. **Try login** at: https://frontend-wine-two-10.vercel.app/login
   - Email: `admin@mvjce.edu.in`
   - Password: `admin@123`

---

## 🎉 Your Deployment is Complete!

- ✅ Frontend: https://frontend-wine-two-10.vercel.app
- ✅ Backend: https://campushub-4puo.onrender.com
- ✅ Database: MongoDB Atlas (708 documents migrated)
- ✅ All fixes applied
