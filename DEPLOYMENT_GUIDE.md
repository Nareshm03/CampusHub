# CampusHub Deployment Guide

## Quick Deployment Steps

### 1. Backend Deployment (Render)

1. **Sign up at [Render](https://render.com)**
2. **Create New Web Service**
   - Connect your GitHub repository
   - Select `backend` folder as root directory
   - Render will auto-detect the `render.yaml` file
3. **Set Environment Variables** (in Render Dashboard):
   ```
   MONGODB_URI=mongodb+srv://nareshmurthy080_db_user:wCO0hi3827r6I17O@databasetest.peyxbzx.mongodb.net/campushub_prod?retryWrites=true&w=majority&appName=Databasetest
   FRONTEND_URL=https://your-app.vercel.app
   ALLOWED_ORIGINS=https://your-app.vercel.app
   SMTP_USER=nareshmurthy080@gmail.com
   SMTP_PASS=qftliqjetkvrvkcf
   FROM_EMAIL=nareshmurthy080@gmail.com
   ```
4. **Deploy** - Render will build and deploy automatically
5. **Note your backend URL**: `https://campushub-backend.onrender.com`

### 2. Frontend Deployment (Vercel)

1. **Sign up at [Vercel](https://vercel.com)**
2. **Import Project**
   - Connect your GitHub repository
   - Vercel will auto-detect Next.js
   - Set root directory to `frontend`
3. **Set Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://campushub-backend.onrender.com/api/v1
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
   NEXT_PUBLIC_ENABLE_MOCK_PAYMENTS=true
   ```
4. **Deploy** - Vercel will build and deploy automatically
5. **Update Backend CORS**: Go back to Render and update `FRONTEND_URL` and `ALLOWED_ORIGINS` with your Vercel URL

### 3. Alternative: Railway (Backend + Frontend)

1. **Sign up at [Railway](https://railway.app)**
2. **Deploy Backend**:
   - New Project → Deploy from GitHub
   - Select backend folder
   - Add environment variables
3. **Deploy Frontend**:
   - Add service → Deploy from GitHub
   - Select frontend folder
   - Add environment variables

### 4. AWS Deployment (Advanced)

**Backend (Elastic Beanstalk)**:
```bash
cd backend
eb init -p node.js campushub-backend
eb create campushub-backend-env
eb setenv MONGODB_URI=your_uri JWT_SECRET=your_secret
eb deploy
```

**Frontend (Amplify)**:
```bash
cd frontend
amplify init
amplify add hosting
amplify publish
```

## Environment Variables Checklist

### Backend (Production)
- ✓ `MONGODB_URI` - Use production database
- ✓ `JWT_SECRET` - Generate strong secret
- ✓ `SESSION_SECRET` - Generate strong secret
- ✓ `FRONTEND_URL` - Your Vercel URL
- ✓ `ALLOWED_ORIGINS` - Your Vercel URL
- ✓ `SMTP_USER`, `SMTP_PASS` - Email credentials
- ✓ `NODE_ENV=production`

### Frontend (Production)
- ✓ `NEXT_PUBLIC_API_URL` - Your Render backend URL
- ✓ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe key (if using real payments)

## Post-Deployment

1. **Test the deployment**: Visit your Vercel URL
2. **Check backend health**: Visit `https://your-backend.onrender.com/api/v1/health`
3. **Update MongoDB whitelist**: Add `0.0.0.0/0` in MongoDB Atlas Network Access
4. **Monitor logs**: Check Render and Vercel dashboards

## Free Tier Limits

- **Render**: 750 hours/month, sleeps after 15 min inactivity
- **Vercel**: 100 GB bandwidth, unlimited deployments
- **MongoDB Atlas**: 512 MB storage

## Troubleshooting

- **CORS errors**: Check `ALLOWED_ORIGINS` matches frontend URL exactly
- **Backend sleeping**: First request may take 30s on Render free tier
- **Database connection**: Verify MongoDB Atlas allows connections from anywhere
- **Build failures**: Check Node version compatibility (use Node 18+)
