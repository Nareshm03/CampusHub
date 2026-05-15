# CampusHub Deployment Checklist

## Pre-Deployment
- [ ] Code pushed to GitHub repository
- [ ] All tests passing locally
- [ ] Environment variables documented
- [ ] Database connection tested

## Backend Deployment (Render)
- [ ] Render account created
- [ ] Web service created
- [ ] Root directory set to `backend`
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] Environment variables configured:
  - [ ] NODE_ENV=production
  - [ ] PORT=10000
  - [ ] MONGODB_URI
  - [ ] JWT_SECRET (generated)
  - [ ] SESSION_SECRET (generated)
  - [ ] SMTP credentials
  - [ ] FRONTEND_URL (placeholder)
  - [ ] ALLOWED_ORIGINS (placeholder)
- [ ] First deployment completed
- [ ] Backend URL noted: ___________________________
- [ ] Health check verified: /health endpoint returns 200

## Frontend Deployment (Vercel)
- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Root directory set to `frontend`
- [ ] Framework detected as Next.js
- [ ] Environment variables configured:
  - [ ] NEXT_PUBLIC_API_URL (backend URL)
  - [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  - [ ] NEXT_PUBLIC_ENABLE_MOCK_PAYMENTS=true
- [ ] First deployment completed
- [ ] Frontend URL noted: ___________________________
- [ ] Homepage loads successfully

## Integration
- [ ] Backend CORS updated with frontend URL
- [ ] Backend redeployed with new CORS settings
- [ ] Frontend can connect to backend API
- [ ] Login functionality tested
- [ ] API calls return expected responses
- [ ] No CORS errors in browser console

## Database Configuration
- [ ] MongoDB Atlas network access set to 0.0.0.0/0
- [ ] Database user has read/write permissions
- [ ] Connection string tested from Render
- [ ] Sample data visible in application

## CI/CD Setup
- [ ] GitHub Actions workflows created
- [ ] Render deploy hook obtained
- [ ] GitHub secret RENDER_DEPLOY_HOOK_URL added
- [ ] Test commit pushed to verify auto-deployment
- [ ] Vercel GitHub integration active

## Monitoring Setup
- [ ] Render email notifications enabled
- [ ] Vercel deployment notifications enabled
- [ ] MongoDB Atlas alerts configured
- [ ] UptimeRobot monitors created (optional)

## Security Verification
- [ ] Strong JWT_SECRET generated
- [ ] Strong SESSION_SECRET generated
- [ ] HTTPS enforced on both services
- [ ] CORS properly restricted
- [ ] No credentials in code
- [ ] Rate limiting active
- [ ] Helmet security headers enabled

## Testing & Verification
- [ ] Backend health check: GET /health returns 200
- [ ] API documentation accessible: /api-docs
- [ ] Frontend homepage loads
- [ ] Login page accessible
- [ ] Registration flow works
- [ ] Dashboard loads after login
- [ ] API calls succeed (check Network tab)
- [ ] Database operations work (create/read/update)
- [ ] File uploads work (if applicable)
- [ ] Email notifications work (or mock enabled)

## Documentation
- [ ] PRODUCTION_DEPLOYMENT.md reviewed
- [ ] MAINTENANCE_GUIDE.md reviewed
- [ ] Backend URL documented
- [ ] Frontend URL documented
- [ ] Admin credentials documented (securely)
- [ ] Deployment date recorded

## Post-Deployment
- [ ] All team members notified
- [ ] URLs shared with stakeholders
- [ ] Monitoring dashboards bookmarked
- [ ] Backup procedures tested
- [ ] Rollback procedure documented
- [ ] Support contacts saved

## Optional Enhancements
- [ ] Custom domain configured (frontend)
- [ ] Custom domain configured (backend)
- [ ] SSL certificates verified
- [ ] CDN configured for static assets
- [ ] Redis caching added
- [ ] Upgraded to paid tiers (if needed)

---

## Deployment Information

**Deployment Date**: _____________
**Deployed By**: _____________
**Backend URL**: _____________
**Frontend URL**: _____________
**Database**: MongoDB Atlas (campushub_prod)
**Hosting**: Render (backend) + Vercel (frontend)

## Access Credentials (Store Securely)

**Render Account**: _____________
**Vercel Account**: _____________
**MongoDB Atlas**: _____________
**GitHub Repository**: _____________

## Notes

_____________________________________________
_____________________________________________
_____________________________________________
