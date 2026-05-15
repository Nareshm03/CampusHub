# 🚀 CampusHub Deployment Documentation

Complete guide for deploying CampusHub to production using free-tier cloud services.

## 📋 Quick Links

- **[Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)** - Step-by-step deployment instructions
- **[Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** - Track your deployment progress
- **[Maintenance Guide](MAINTENANCE_GUIDE.md)** - Daily operations and monitoring
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions

## 🏗️ Architecture

```
┌─────────────────┐
│   Users/Clients │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Vercel (Frontend - Next.js)        │
│  https://campushub.vercel.app       │
└────────┬────────────────────────────┘
         │ HTTPS/API Calls
         ▼
┌─────────────────────────────────────┐
│  Render (Backend - Node.js/Express) │
│  https://campushub-backend.onrender.com │
└────────┬────────────────────────────┘
         │ MongoDB Driver
         ▼
┌─────────────────────────────────────┐
│  MongoDB Atlas (Database)           │
│  Cloud-hosted MongoDB cluster       │
└─────────────────────────────────────┘
```

## 🎯 Deployment Stack

| Component | Service | Tier | Cost |
|-----------|---------|------|------|
| Frontend | Vercel | Free | $0/month |
| Backend | Render | Free | $0/month |
| Database | MongoDB Atlas | Free (M0) | $0/month |
| CI/CD | GitHub Actions | Free | $0/month |
| **Total** | | | **$0/month** |

## ⚡ Quick Start

### Prerequisites
1. GitHub account with repository
2. MongoDB Atlas account (already configured)
3. Email for notifications

### 5-Minute Deployment

```bash
# 1. Generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Run quick start script
deploy-quickstart.bat

# 3. Follow the prompts
```

### Manual Deployment

1. **Backend (Render)**: 10 minutes
   - Sign up at https://render.com
   - Create Web Service from GitHub
   - Configure environment variables
   - Deploy

2. **Frontend (Vercel)**: 5 minutes
   - Sign up at https://vercel.com
   - Import GitHub repository
   - Configure environment variables
   - Deploy

3. **Connect Services**: 2 minutes
   - Update backend CORS with frontend URL
   - Verify connection

**Total Time**: ~20 minutes

## 📚 Documentation Structure

### 1. PRODUCTION_DEPLOYMENT.md
Complete step-by-step guide covering:
- Account setup for all services
- Environment variable configuration
- Deployment procedures
- Post-deployment verification
- Custom domain setup (optional)

### 2. DEPLOYMENT_CHECKLIST.md
Interactive checklist for:
- Pre-deployment preparation
- Backend deployment steps
- Frontend deployment steps
- Integration verification
- Security checks
- Testing procedures

### 3. MAINTENANCE_GUIDE.md
Ongoing operations including:
- Daily/weekly/monthly tasks
- Monitoring setup
- Log management
- Backup strategies
- Performance optimization
- Security maintenance

### 4. TROUBLESHOOTING.md
Solutions for common issues:
- CORS errors
- Database connection problems
- Build failures
- Authentication issues
- Performance problems
- Emergency rollback procedures

## 🔧 Configuration Files

### Backend Configuration
- `backend/.env.production` - Production environment variables
- `backend/render.yaml` - Render deployment configuration
- `.github/workflows/deploy-backend.yml` - CI/CD pipeline

### Frontend Configuration
- `frontend/.env.production` - Production environment variables
- `vercel.json` - Vercel deployment configuration
- `.github/workflows/deploy-frontend.yml` - CI/CD pipeline

### Verification
- `verify-deployment.js` - Automated deployment testing script

## 🔐 Security Checklist

- ✅ Strong JWT_SECRET (32+ characters)
- ✅ Strong SESSION_SECRET (32+ characters)
- ✅ HTTPS enforced on all services
- ✅ CORS properly configured
- ✅ No credentials in code
- ✅ Rate limiting enabled
- ✅ Helmet security headers active
- ✅ MongoDB network access restricted
- ✅ Environment variables secured

## 📊 Monitoring

### Health Checks
```bash
# Backend
curl https://campushub-backend.onrender.com/health

# Frontend
curl https://campushub.vercel.app

# Automated verification
node verify-deployment.js
```

### Dashboards
- **Render**: https://dashboard.render.com
- **Vercel**: https://vercel.com/dashboard
- **MongoDB Atlas**: https://cloud.mongodb.com

### Alerts
- Render: Email notifications for deploy failures
- Vercel: Email notifications for build failures
- MongoDB: Alerts for storage/connection issues
- UptimeRobot: Uptime monitoring (optional)

## 🔄 Update Workflow

### Automatic Deployment (CI/CD)
```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# GitHub Actions triggers deployment
# Render auto-deploys backend
# Vercel auto-deploys frontend
```

### Manual Deployment
```bash
# Render: Dashboard → Manual Deploy
# Vercel: Dashboard → Redeploy
```

## 💰 Cost Optimization

### Free Tier Limits
- **Render**: 750 hours/month (sleeps after 15 min)
- **Vercel**: 100GB bandwidth/month
- **MongoDB Atlas**: 512MB storage

### When to Upgrade
- Backend sleeping affects UX → Render Starter ($7/month)
- High traffic → Vercel Pro ($20/month)
- Storage full → MongoDB M2 ($9/month)

### Cost Monitoring
- Check usage in each dashboard
- Set up alerts at 80% usage
- Review monthly usage reports

## 🆘 Support

### Service Status Pages
- Render: https://status.render.com
- Vercel: https://www.vercel-status.com
- MongoDB: https://status.mongodb.com

### Community Support
- Render Community: https://community.render.com
- Vercel Discord: https://vercel.com/discord
- MongoDB Forums: https://www.mongodb.com/community/forums

### Documentation
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- MongoDB Docs: https://www.mongodb.com/docs/atlas

## 📝 Deployment Log

Track your deployments:

| Date | Version | Deployed By | Backend URL | Frontend URL | Notes |
|------|---------|-------------|-------------|--------------|-------|
| | | | | | |

## 🎓 Learning Resources

- [Render Deployment Guide](https://render.com/docs/deploy-node-express-app)
- [Vercel Next.js Deployment](https://vercel.com/docs/frameworks/nextjs)
- [MongoDB Atlas Setup](https://www.mongodb.com/docs/atlas/getting-started/)
- [GitHub Actions CI/CD](https://docs.github.com/en/actions)

## 🤝 Contributing

Improvements to deployment documentation:
1. Fork repository
2. Update documentation
3. Test deployment process
4. Submit pull request

## 📄 License

MIT License - See LICENSE file for details

---

**Need Help?** Start with [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) for detailed instructions.

**Having Issues?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for solutions.

**Deployed Successfully?** Follow [MAINTENANCE_GUIDE.md](MAINTENANCE_GUIDE.md) for ongoing operations.
