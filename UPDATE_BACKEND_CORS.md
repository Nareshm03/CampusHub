# Update Backend CORS Settings

## Go to Render Dashboard

1. Visit: https://dashboard.render.com
2. Click on your **CampusHub** service
3. Go to **"Environment"** tab (left sidebar)

## Update These Variables

Find and update these environment variables:

### FRONTEND_URL
**Old value:** https://placeholder.vercel.app
**New value:** https://frontend-wine-two-10.vercel.app

### ALLOWED_ORIGINS
**Old value:** https://placeholder.vercel.app
**New value:** https://frontend-wine-two-10.vercel.app

## Save Changes

1. Click **"Save Changes"** button
2. Render will automatically redeploy (takes 2-3 minutes)
3. Wait for "Live" status

## Verify Backend is Running

After redeploy completes, visit:
https://campushub-4puo.onrender.com/health

Should return:
```json
{"status":"OK","uptime":123}
```

---

## Your Deployment URLs

**Frontend:** https://frontend-wine-two-10.vercel.app
**Backend:** https://campushub-4puo.onrender.com
**API:** https://campushub-4puo.onrender.com/api/v1
