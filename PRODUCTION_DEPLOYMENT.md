# CampusHub Production Deployment Guide

## Overview
This guide covers complete deployment of CampusHub to production using free-tier services.

**Stack:**
- Backend: Render (Node.js/Express)
- Frontend: Vercel (Next.js)
- Database: MongoDB Atlas (already configured)
- CI/CD: GitHub Actions

---

## Prerequisites

1. GitHub account with repository pushed
2. MongoDB Atlas account (already configured)
3. Email accounts for notifications

---

## Step 1: Backend Deployment (Render)

### 1.1 Create Render Account
1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

### 1.2 Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `campushub-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### 1.3 Set Environment Variables
In Render dashboard, add these environment variables:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://nareshmurthy080_db_user:wCO0hi3827r6I17O@databasetest.peyxbzx.mongodb.net/campushub_prod?retryWrites=true&w=majority&appName=Databasetest
JWT_SECRET=<GENERATE_RANDOM_STRING_32_CHARS>
JWT_EXPIRE=30d
SESSION_SECRET=<GENERATE_RANDOM_STRING_32_CHARS>
FRONTEND_URL=https://your-app.vercel.app
ALLOWED_ORIGINS=https://your-app.vercel.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=nareshmurthy080@gmail.com
SMTP_PASS=qftliqjetkvrvkcf
FROM_EMAIL=nareshmurthy080@gmail.com
FROM_NAME=CampusHub
ENABLE_MOCK_EMAIL=false
ENABLE_MOCK_PAYMENTS=true
```

**Generate secrets using:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.4 Deploy
1. Click "Create Web Service"
2. Wait 5-10 minutes for deployment
3. Note your backend URL: `https://campushub-backend.onrender.com`

### 1.5 Verify Backend
Visit: `https://campushub-backend.onrender.com/health`
Should return: `{"status":"OK","uptime":...}`

---

## Step 2: Frontend Deployment (Vercel)

### 2.1 Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel

### 2.2 Import Project
1. Click "Add New..." → "Project"
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

### 2.3 Set Environment Variables
Add these in Vercel project settings:

```
NEXT_PUBLIC_API_URL=https://campushub-backend.onrender.com/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
NEXT_PUBLIC_ENABLE_MOCK_PAYMENTS=true
```

### 2.4 Deploy
1. Click "Deploy"
2. Wait 2-5 minutes
3. Note your frontend URL: `https://campushub-xyz.vercel.app`

---

## Step 3: Connect Frontend & Backend

### 3.1 Update Backend CORS
1. Go to Render dashboard → campushub-backend
2. Update environment variables:
   ```
   FRONTEND_URL=https://campushub-xyz.vercel.app
   ALLOWED_ORIGINS=https://campushub-xyz.vercel.app
   ```
3. Save (triggers auto-redeploy)

### 3.2 Configure MongoDB Atlas
1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Select "Allow Access from Anywhere" (0.0.0.0/0)
4. Confirm

---

## Step 4: Setup CI/CD (GitHub Actions)

### 4.1 Get Render Deploy Hook
1. Render dashboard → campushub-backend → Settings
2. Scroll to "Deploy Hook"
3. Copy the webhook URL

### 4.2 Add GitHub Secret
1. GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `RENDER_DEPLOY_HOOK_URL`
4. Value: Paste the webhook URL
5. Save

### 4.3 Verify CI/CD
1. Make a change in `backend/` folder
2. Commit and push to main branch
3. Check GitHub Actions tab for workflow run
4. Render will auto-deploy

---

## Step 5: Verification & Testing

### 5.1 Backend Health Check
```bash
curl https://campushub-backend.onrender.com/health
```
Expected: `{"status":"OK"}`

### 5.2 Frontend Access
1. Visit: `https://campushub-xyz.vercel.app`
2. Test login page loads
3. Check browser console for errors

### 5.3 API Connection Test
1. Open browser DevTools → Network tab
2. Try logging in
3. Verify API calls to backend succeed (200 status)

### 5.4 Database Connection
1. Check Render logs for MongoDB connection success
2. Try creating a test user
3. Verify data appears in MongoDB Atlas

---

## Step 6: Custom Domain (Optional)

### 6.1 Frontend Domain (Vercel)
1. Vercel project → Settings → Domains
2. Add your domain: `campushub.com`
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

### 6.2 Backend Domain (Render)
1. Render service → Settings → Custom Domain
2. Add: `api.campushub.com`
3. Update DNS CNAME record
4. Update frontend env: `NEXT_PUBLIC_API_URL=https://api.campushub.com/api/v1`

---

## Monitoring & Maintenance

### Daily Checks
- Monitor Render logs for errors
- Check Vercel analytics for traffic
- Review MongoDB Atlas metrics

### Free Tier Limitations
- **Render**: Sleeps after 15 min inactivity (30s cold start)
- **Vercel**: 100GB bandwidth/month
- **MongoDB Atlas**: 512MB storage

### Logs Access
- **Backend**: Render dashboard → Logs tab
- **Frontend**: Vercel dashboard → Deployments → View Function Logs
- **Database**: MongoDB Atlas → Metrics

### Updating Application
1. Push changes to GitHub
2. CI/CD auto-deploys backend
3. Vercel auto-deploys frontend
4. No manual intervention needed

---

## Troubleshooting

### CORS Errors
- Verify `ALLOWED_ORIGINS` matches frontend URL exactly
- Check for trailing slashes
- Ensure both HTTP and HTTPS match

### Backend Sleeping (Render Free Tier)
- First request takes 30s to wake up
- Consider upgrading to paid tier ($7/month)
- Or use a cron job to ping every 10 minutes

### Database Connection Failed
- Verify MongoDB Atlas allows 0.0.0.0/0
- Check connection string is correct
- Ensure database user has read/write permissions

### Build Failures
- Check Node version (use 18.x or 20.x)
- Verify all dependencies in package.json
- Review build logs in Render/Vercel

### Environment Variables Not Working
- Redeploy after changing env vars
- Check for typos in variable names
- Ensure no quotes around values in Render

---

## Security Checklist

- ✅ Strong JWT_SECRET and SESSION_SECRET generated
- ✅ HTTPS enforced on both frontend and backend
- ✅ CORS properly configured
- ✅ MongoDB credentials not exposed in code
- ✅ Rate limiting enabled
- ✅ Helmet security headers active
- ✅ Input validation on all endpoints

---

## Cost Breakdown (Free Tier)

| Service | Free Tier | Paid Upgrade |
|---------|-----------|--------------|
| Render | 750 hrs/month | $7/month (always-on) |
| Vercel | 100GB bandwidth | $20/month (Pro) |
| MongoDB Atlas | 512MB storage | $9/month (2GB) |
| GitHub Actions | 2000 min/month | Included |
| **Total** | **$0/month** | **$36/month** |

---

## Quick Reference URLs

- **Frontend**: https://campushub-xyz.vercel.app
- **Backend**: https://campushub-backend.onrender.com
- **API Docs**: https://campushub-backend.onrender.com/api-docs
- **Health Check**: https://campushub-backend.onrender.com/health

---

## Support & Resources

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas: https://www.mongodb.com/docs/atlas
- GitHub Actions: https://docs.github.com/actions

---

## Deployment Checklist

- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] CORS settings updated
- [ ] MongoDB Atlas whitelist configured
- [ ] CI/CD pipelines active
- [ ] Health checks passing
- [ ] Login functionality tested
- [ ] API endpoints responding
- [ ] Database connections stable
- [ ] Custom domains configured (optional)
- [ ] Monitoring setup complete

---

**Deployment Date**: _____________
**Backend URL**: _____________
**Frontend URL**: _____________
**Deployed By**: _____________
