# 🚨 EMERGENCY FIX: Backend 502 Error

## Problem
Backend is returning 502 Bad Gateway due to missing Stripe configuration.

## ✅ IMMEDIATE FIX - Add Missing Environment Variable

### Go to Render Dashboard NOW

1. Visit: https://dashboard.render.com
2. Click on **CampusHub** service
3. Click **"Environment"** tab

### Add This Variable

Click "Add Environment Variable" and add:

```
STRIPE_SECRET_KEY
sk_test_placeholder
```

### Save and Redeploy

1. Click **"Save Changes"**
2. Wait 2-3 minutes for redeploy
3. Backend will restart successfully

---

## ✅ Verify CORS Settings Are Still Correct

While you're in the Environment tab, verify these are set:

```
FRONTEND_URL = https://frontend-wine-two-10.vercel.app
ALLOWED_ORIGINS = https://frontend-wine-two-10.vercel.app
```

If they're wrong, update them too.

---

## After Backend Restarts

1. Wait for "Live" status in Render
2. Go back to: https://frontend-wine-two-10.vercel.app/login
3. Try logging in with:
   - Email: `admin@mvjce.edu.in`
   - Password: `admin@123`

---

## Why This Happened

The backend code tries to initialize Stripe on startup. Without the `STRIPE_SECRET_KEY` environment variable, it crashes with a 502 error.

The fix in the code (checking if Stripe key exists) is already there, but the backend needs to restart with the new variable.

---

**Add STRIPE_SECRET_KEY to Render NOW!** 🚀
