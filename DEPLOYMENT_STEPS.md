# 🎯 CampusHub Deployment - Step by Step

## Phase 1: Preparation (5 minutes)

### Step 1.1: Verify GitHub Repository
```bash
cd d:\Projects\CampusHub
git status
git remote -v
```

**Expected Output:**
```
origin  https://github.com/yourusername/campushub.git (fetch)
origin  https://github.com/yourusername/campushub.git (push)
```

**If not initialized:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Step 1.2: Generate Production Secrets
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save these secrets!** You'll need them in Step 2.3

---

## Phase 2: Backend Deployment (10 minutes)

### Step 2.1: Create Render Account
1. Open browser → https://render.com
2. Click "Get Started for Free"
3. Choose "Sign up with GitHub"
4. Authorize Render to access your repositories

### Step 2.2: Create Web Service
1. Click "New +" button (top right)
2. Select "Web Service"
3. Find your repository: `campushub`
4. Click "Connect"

### Step 2.3: Configure Service
Fill in the form:

| Field | Value |
|-------|-------|
| Name | `campushub-backend` |
| Root Directory | `backend` |
| Environment | `Node` |
| Region | Choose closest to you |
| Branch | `main` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | `Free` |

### Step 2.4: Add Environment Variables
Click "Advanced" → Add Environment Variables:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://nareshmurthy080_db_user:wCO0hi3827r6I17O@databasetest.peyxbzx.mongodb.net/campushub_prod?retryWrites=true&w=majority&appName=Databasetest
JWT_SECRET=<PASTE_SECRET_FROM_STEP_1.2>
JWT_EXPIRE=30d
SESSION_SECRET=<PASTE_SECRET_FROM_STEP_1.2>
FRONTEND_URL=https://placeholder.vercel.app
ALLOWED_ORIGINS=https://placeholder.vercel.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=nareshmurthy080@gmail.com
SMTP_PASS=qftliqjetkvrvkcf
FROM_EMAIL=nareshmurthy080@gmail.com
FROM_NAME=CampusHub
ENABLE_MOCK_EMAIL=false
ENABLE_MOCK_PAYMENTS=true
```

### Step 2.5: Deploy
1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Watch the logs for "Server running in production mode"

### Step 2.6: Verify Backend
1. Copy your backend URL (e.g., `https://campushub-backend.onrender.com`)
2. Open in browser: `https://campushub-backend.onrender.com/health`
3. Should see: `{"status":"OK","uptime":123}`

**✅ Backend deployed successfully!**

---

## Phase 3: Frontend Deployment (5 minutes)

### Step 3.1: Create Vercel Account
1. Open browser → https://vercel.com
2. Click "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Vercel

### Step 3.2: Import Project
1. Click "Add New..." → "Project"
2. Find your repository: `campushub`
3. Click "Import"

### Step 3.3: Configure Project
| Field | Value |
|-------|-------|
| Framework Preset | Next.js (auto-detected) |
| Root Directory | `frontend` |
| Build Command | `npm run build` (auto) |
| Output Directory | `.next` (auto) |
| Install Command | `npm install` (auto) |

### Step 3.4: Add Environment Variables
Click "Environment Variables" → Add:

```
NEXT_PUBLIC_API_URL=https://campushub-backend.onrender.com/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
NEXT_PUBLIC_ENABLE_MOCK_PAYMENTS=true
```

**Replace** `campushub-backend.onrender.com` with YOUR backend URL from Step 2.6

### Step 3.5: Deploy
1. Click "Deploy"
2. Wait for deployment (2-5 minutes)
3. Watch build logs

### Step 3.6: Verify Frontend
1. Copy your frontend URL (e.g., `https://campushub-xyz.vercel.app`)
2. Open in browser
3. Should see CampusHub homepage

**✅ Frontend deployed successfully!**

---

## Phase 4: Integration (5 minutes)

### Step 4.1: Update Backend CORS
1. Go to Render dashboard
2. Select `campushub-backend`
3. Click "Environment" tab
4. Update these variables:
   ```
   FRONTEND_URL=https://campushub-xyz.vercel.app
   ALLOWED_ORIGINS=https://campushub-xyz.vercel.app
   ```
   **Replace** with YOUR Vercel URL from Step 3.6
5. Click "Save Changes"
6. Wait for auto-redeploy (2-3 minutes)

### Step 4.2: Configure MongoDB Atlas
1. Go to https://cloud.mongodb.com
2. Click "Network Access" (left sidebar)
3. Click "Add IP Address"
4. Click "Allow Access from Anywhere"
5. Enter `0.0.0.0/0`
6. Click "Confirm"

### Step 4.3: Test Integration
1. Open your frontend URL
2. Open browser DevTools (F12)
3. Go to "Network" tab
4. Try logging in with test credentials
5. Check API calls succeed (status 200)

**✅ Integration complete!**

---

## Phase 5: CI/CD Setup (5 minutes)

### Step 5.1: Get Render Deploy Hook
1. Render dashboard → `campushub-backend`
2. Click "Settings" tab
3. Scroll to "Deploy Hook"
4. Click "Create Deploy Hook"
5. Copy the webhook URL

### Step 5.2: Add GitHub Secret
1. Go to your GitHub repository
2. Click "Settings" tab
3. Click "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Name: `RENDER_DEPLOY_HOOK_URL`
6. Value: Paste webhook URL from Step 5.1
7. Click "Add secret"

### Step 5.3: Verify CI/CD
1. Make a small change in `backend/` folder
2. Commit and push:
   ```bash
   git add .
   git commit -m "Test CI/CD"
   git push origin main
   ```
3. Go to GitHub → "Actions" tab
4. Watch workflow run
5. Check Render for auto-deployment

**✅ CI/CD configured!**

---

## Phase 6: Verification (5 minutes)

### Step 6.1: Run Automated Tests
```bash
node verify-deployment.js
```

**Expected Output:**
```
🚀 CampusHub Deployment Verification

Testing endpoints...

✅ Backend Health Check (200)
✅ Backend API Docs (200)
✅ Frontend Homepage (200)

📊 Results: 3/3 tests passed
✅ All systems operational!
```

### Step 6.2: Manual Testing Checklist
- [ ] Frontend homepage loads
- [ ] Login page accessible
- [ ] Can create account
- [ ] Can log in
- [ ] Dashboard loads
- [ ] API calls succeed (check Network tab)
- [ ] No CORS errors in console

### Step 6.3: Document Deployment
Fill in `DEPLOYMENT_CHECKLIST.md`:
- Deployment date
- Backend URL
- Frontend URL
- Your name

**✅ Deployment verified!**

---

## 🎉 Success!

Your CampusHub application is now live!

### Your URLs:
- **Frontend**: https://campushub-xyz.vercel.app
- **Backend**: https://campushub-backend.onrender.com
- **API Docs**: https://campushub-backend.onrender.com/api-docs

### Next Steps:
1. Share URLs with team
2. Set up monitoring (see MAINTENANCE_GUIDE.md)
3. Configure custom domain (optional)
4. Review security checklist

### Important Notes:
- **Backend sleeps after 15 min** (free tier) - first request takes 30s
- **Vercel auto-deploys** on every push to main
- **Render auto-deploys** via GitHub Actions
- **Monitor dashboards** regularly

---

## 🆘 Having Issues?

### Common Problems:

**CORS Error?**
→ Check ALLOWED_ORIGINS matches frontend URL exactly

**Backend not responding?**
→ Wait 30s for cold start (free tier)

**Database connection failed?**
→ Verify MongoDB Atlas allows 0.0.0.0/0

**Build failed?**
→ Check logs in Render/Vercel dashboard

**More help:** See TROUBLESHOOTING.md

---

## 📞 Support

- **Render**: support@render.com
- **Vercel**: support@vercel.com
- **MongoDB**: https://support.mongodb.com

---

**Congratulations on deploying CampusHub! 🚀**
