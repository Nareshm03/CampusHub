# CampusHub Maintenance Guide

## Daily Operations

### Morning Checklist (5 minutes)
1. Check Render dashboard for backend uptime
2. Review Vercel analytics for frontend traffic
3. Check MongoDB Atlas for storage usage
4. Review error logs for critical issues

### Weekly Tasks (30 minutes)
1. Review all error logs in detail
2. Check database backup status
3. Monitor API response times
4. Review security audit logs
5. Update dependencies if needed

### Monthly Tasks (2 hours)
1. Full security audit
2. Performance optimization review
3. Database cleanup and optimization
4. Review and update documentation
5. Test disaster recovery procedures

---

## Monitoring Setup

### Render Monitoring
1. Enable email notifications:
   - Render dashboard → Settings → Notifications
   - Enable "Deploy failed" and "Service down" alerts

### Vercel Monitoring
1. Enable deployment notifications:
   - Vercel project → Settings → Git
   - Enable "Deployment notifications"

### MongoDB Atlas Monitoring
1. Set up alerts:
   - Atlas → Alerts → Create Alert
   - Alert on: Connection count, Storage usage, CPU usage

### Uptime Monitoring (Free)
Use UptimeRobot (https://uptimerobot.com):
1. Create account
2. Add monitors:
   - Backend: `https://campushub-backend.onrender.com/health`
   - Frontend: `https://campushub-xyz.vercel.app`
3. Set check interval: 5 minutes
4. Enable email alerts

---

## Log Management

### Backend Logs (Render)
```bash
# View live logs
# Render dashboard → Logs tab → Enable "Auto-scroll"

# Download logs
# Render dashboard → Logs → Download
```

### Frontend Logs (Vercel)
```bash
# View deployment logs
# Vercel dashboard → Deployments → Select deployment → View Logs

# View function logs
# Vercel dashboard → Logs tab
```

### MongoDB Logs (Atlas)
```bash
# View logs
# Atlas → Clusters → Metrics → View Logs
```

---

## Backup Strategy

### Database Backups (MongoDB Atlas)
- **Automatic**: Atlas creates backups every 24 hours (retained 2 days on free tier)
- **Manual**: 
  1. Atlas → Clusters → Collections
  2. Select database → Export Collection
  3. Download JSON/CSV

### Code Backups
- **Automatic**: GitHub repository (version controlled)
- **Manual**: 
  ```bash
  git clone https://github.com/yourusername/campushub.git backup-$(date +%Y%m%d)
  ```

### Uploaded Files Backup
- Files in `backend/uploads/` are NOT backed up on Render free tier
- **Solution**: Use AWS S3 or Cloudinary for file storage

---

## Scaling Guidelines

### When to Upgrade

#### Backend (Render)
Upgrade from Free to Starter ($7/month) when:
- Cold starts (30s) affect user experience
- Need 24/7 uptime
- Traffic exceeds 750 hours/month

#### Frontend (Vercel)
Upgrade to Pro ($20/month) when:
- Bandwidth exceeds 100GB/month
- Need advanced analytics
- Require team collaboration

#### Database (MongoDB Atlas)
Upgrade to M2 ($9/month) when:
- Storage exceeds 512MB
- Need automated backups beyond 2 days
- Require better performance

---

## Performance Optimization

### Backend Optimization
1. Enable Redis caching (add Redis service)
2. Optimize database queries (add indexes)
3. Implement CDN for static files
4. Enable gzip compression (already configured)

### Frontend Optimization
1. Optimize images (use Next.js Image component)
2. Enable code splitting (automatic in Next.js)
3. Implement lazy loading
4. Use Vercel Analytics for insights

### Database Optimization
1. Create indexes on frequently queried fields
2. Archive old data
3. Optimize query patterns
4. Monitor slow queries

---

## Security Maintenance

### Monthly Security Tasks
1. Update all npm dependencies:
   ```bash
   cd backend && npm audit fix
   cd frontend && npm audit fix
   ```

2. Review MongoDB Atlas security:
   - Check IP whitelist
   - Rotate database passwords
   - Review user permissions

3. Rotate secrets:
   - Generate new JWT_SECRET
   - Update SESSION_SECRET
   - Update API keys

4. Review access logs:
   - Check for suspicious activity
   - Review failed login attempts
   - Monitor rate limit hits

---

## Disaster Recovery

### Backend Down
1. Check Render status page: https://status.render.com
2. Review Render logs for errors
3. Verify MongoDB Atlas is accessible
4. Restart service if needed (Render dashboard → Manual Deploy)

### Frontend Down
1. Check Vercel status: https://www.vercel-status.com
2. Review deployment logs
3. Rollback to previous deployment if needed:
   - Vercel dashboard → Deployments → Previous deployment → Promote to Production

### Database Issues
1. Check MongoDB Atlas status
2. Verify network access settings
3. Check connection string
4. Contact MongoDB support if needed

### Complete Outage Recovery
1. Verify all services are down
2. Check status pages for all providers
3. Review recent changes (git log)
4. Rollback to last known good state
5. Redeploy from scratch if necessary

---

## Cost Monitoring

### Current Costs (Free Tier)
- Render: $0/month (750 hours)
- Vercel: $0/month (100GB bandwidth)
- MongoDB Atlas: $0/month (512MB storage)
- **Total**: $0/month

### Usage Tracking
1. **Render**: Dashboard → Usage tab
2. **Vercel**: Dashboard → Usage tab
3. **MongoDB Atlas**: Clusters → Metrics

### Budget Alerts
Set up alerts when approaching limits:
- Render: 700 hours used
- Vercel: 90GB bandwidth used
- MongoDB: 450MB storage used

---

## Update Procedures

### Backend Updates
1. Make changes locally
2. Test thoroughly
3. Commit and push to GitHub
4. CI/CD auto-deploys to Render
5. Verify deployment in Render logs
6. Test production endpoints

### Frontend Updates
1. Make changes locally
2. Test with `npm run dev`
3. Commit and push to GitHub
4. Vercel auto-deploys
5. Verify deployment in Vercel dashboard
6. Test production site

### Database Schema Updates
1. Create migration script
2. Test on development database
3. Backup production database
4. Run migration on production
5. Verify data integrity

---

## Emergency Contacts

### Service Support
- **Render Support**: support@render.com
- **Vercel Support**: support@vercel.com
- **MongoDB Support**: https://support.mongodb.com

### Status Pages
- Render: https://status.render.com
- Vercel: https://www.vercel-status.com
- MongoDB Atlas: https://status.mongodb.com

---

## Useful Commands

### Check Deployment Status
```bash
node verify-deployment.js
```

### Generate New Secrets
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Test Backend Locally
```bash
cd backend
npm install
npm start
```

### Test Frontend Locally
```bash
cd frontend
npm install
npm run dev
```

---

## Maintenance Log Template

```
Date: ___________
Performed By: ___________
Tasks Completed:
- [ ] Checked all service dashboards
- [ ] Reviewed error logs
- [ ] Updated dependencies
- [ ] Verified backups
- [ ] Tested critical endpoints
- [ ] Reviewed security alerts

Issues Found: ___________
Actions Taken: ___________
Next Review Date: ___________
```
