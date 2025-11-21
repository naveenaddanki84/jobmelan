# 🚀 Phase 8: Deployment - IN PROGRESS

## Goal: Deploy JOBMÉLAN to Production

Deploy the application to a hosting platform (Vercel recommended for Next.js) and configure all production settings.

---

## Step 1: Choose Deployment Platform

### Recommended: Vercel (Best for Next.js)

**Why Vercel?**
- Zero-config Next.js deployment
- Automatic HTTPS
- Built-in CI/CD
- Environment variable management
- Serverless functions support
- Free tier available

**Alternatives:**
- Railway
- Render
- AWS Amplify
- Netlify

---

## Step 2: Prepare for Deployment

### 2.1 Verify Build Works Locally

```bash
cd jobmelan-saas
npm run build
```

**Fix any build errors before deploying.**

### 2.2 Check Required Files

Ensure these files exist:
- ✅ `next.config.ts` - Next.js configuration
- ✅ `package.json` - Dependencies
- ✅ `prisma/schema.prisma` - Database schema
- ✅ `.env.example` - Example environment variables (optional but helpful)

### 2.3 Create `.env.example` (Optional)

Create a template for environment variables:

```bash
# Clerk
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
CLERK_PRO_PLAN_ID=cplan_35lmOqzm4DkZ9qKirzLMaU5cImq

# Database
DATABASE_URL=

# AI
GEMINI_API_KEY=

# Node Environment
NODE_ENV=production
```

---

## Step 3: Deploy to Vercel

### 3.1 Install Vercel CLI (Optional)

```bash
npm i -g vercel
```

### 3.2 Deploy via Vercel Dashboard (Recommended)

1. **Go to**: https://vercel.com
2. **Sign up/Login** with GitHub
3. **Click**: "Add New Project"
4. **Import** your repository (or push to GitHub first)
5. **Configure Project**:
   - Framework Preset: **Next.js**
   - Root Directory: `jobmelan-saas` (if repo is in parent folder)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

### 3.3 Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add:

```bash
# Clerk
CLERK_SECRET_KEY=sk_live_xxxxx  # Use production key
CLERK_WEBHOOK_SECRET=whsec_xxxxx
CLERK_PRO_PLAN_ID=cplan_35lmOqzm4DkZ9qKirzLMaU5cImq

# Database
DATABASE_URL=postgresql://...  # Production database URL

# AI
GEMINI_API_KEY=xxxxx

# Node Environment
NODE_ENV=production
```

**Important**: 
- Use **production** Clerk keys (not test keys)
- Use **production** database URL
- Set for **Production**, **Preview**, and **Development** environments

### 3.4 Deploy

Click **"Deploy"** and wait for build to complete.

---

## Step 4: Configure Production Database

### 4.1 Push Schema to Production Database

After deployment, run migrations:

```bash
# Option 1: Via Vercel CLI
vercel env pull .env.production
npx prisma db push

# Option 2: Via Vercel Dashboard → Terminal
# Or connect to your database directly
```

### 4.2 Verify Database Connection

Check that:
- ✅ Schema is pushed
- ✅ Tables exist (User, Resume, JobApplication)
- ✅ Can connect from production

---

## Step 5: Configure Clerk Webhook for Production

### 5.1 Update Webhook URL

1. Go to: Clerk Dashboard → Webhooks
2. Click on your webhook endpoint
3. Update URL to: `https://your-vercel-domain.vercel.app/api/webhooks/clerk`
4. Save changes

### 5.2 Verify Events Subscribed

Ensure these events are subscribed:
- ✅ `user.created`
- ✅ `user.updated`
- ✅ `user.deleted`
- ✅ `subscription.created`
- ✅ `subscription.updated`
- ✅ `subscription.active`
- ✅ `subscription.pastDue`
- ✅ `subscriptionItem.canceled`
- ✅ `subscriptionItem.ended`

### 5.3 Test Webhook

1. Go to: Clerk Dashboard → Webhooks → Logs
2. Click "Send test event"
3. Select `subscription.created`
4. Check Vercel logs: Vercel Dashboard → Project → Functions → `/api/webhooks/clerk`
5. Verify webhook receives and processes events

---

## Step 6: Configure Custom Domain (Optional)

### 6.1 Add Domain in Vercel

1. Vercel Dashboard → Project → Settings → Domains
2. Add your domain (e.g., `jobmelan.com`)
3. Follow DNS configuration instructions

### 6.2 Update Clerk URLs

1. Clerk Dashboard → Domains
2. Add your custom domain
3. Update webhook URL to use custom domain

---

## Step 7: Post-Deployment Checklist

### 7.1 Test Core Features

- [ ] Landing page loads
- [ ] Sign up/Sign in works
- [ ] Resume editor loads
- [ ] Job search works
- [ ] Job tracker works
- [ ] Database saves data

### 7.2 Test Subscription Features

- [ ] Pricing page loads (`/pricing`)
- [ ] Can subscribe to Pro plan
- [ ] Webhook receives subscription events
- [ ] Database updates `isPro=true`
- [ ] Pro features unlock (cover letter, interview prep, auto-tailor)
- [ ] Upgrade prompts show for non-pro users

### 7.3 Test Webhook

- [ ] Create a test user
- [ ] Subscribe to Pro plan
- [ ] Check webhook logs in Clerk Dashboard
- [ ] Verify database updated automatically
- [ ] Check Vercel function logs

### 7.4 Performance Check

- [ ] Page load times are acceptable
- [ ] API routes respond quickly
- [ ] Database queries are optimized
- [ ] No console errors

---

## Step 8: Monitoring & Maintenance

### 8.1 Set Up Monitoring

**Vercel Analytics** (Built-in):
- Vercel Dashboard → Analytics
- Monitor page views, performance

**Error Tracking** (Optional):
- Sentry
- LogRocket
- Vercel Logs

### 8.2 Set Up Alerts

- Database connection failures
- Webhook failures
- High error rates
- API quota limits (Gemini)

### 8.3 Regular Maintenance

- Monitor webhook logs weekly
- Check database size/growth
- Review error logs
- Update dependencies monthly

---

## Common Deployment Issues

### Issue 1: Build Fails

**Symptoms**: Build error in Vercel

**Solutions**:
- Check build logs for specific errors
- Verify all dependencies in `package.json`
- Ensure TypeScript compiles: `npm run build` locally
- Check for missing environment variables

### Issue 2: Database Connection Fails

**Symptoms**: 500 errors, "Database connection failed"

**Solutions**:
- Verify `DATABASE_URL` is set in Vercel
- Check database allows connections from Vercel IPs
- Ensure database is accessible (not localhost)
- Test connection: `npx prisma db push`

### Issue 3: Webhook Not Receiving Events

**Symptoms**: Subscriptions don't sync

**Solutions**:
- Verify webhook URL is correct (production domain)
- Check webhook secret matches Vercel env var
- Verify events are subscribed in Clerk Dashboard
- Check Vercel function logs for errors
- Test webhook with "Send test event"

### Issue 4: Environment Variables Not Loading

**Symptoms**: API keys not working

**Solutions**:
- Verify env vars are set in Vercel Dashboard
- Check environment scope (Production/Preview/Development)
- Redeploy after adding env vars
- Verify `.env` file is not committed (use `.env.example`)

---

## Deployment Checklist

### Pre-Deployment
- [ ] Code is committed to Git
- [ ] Build works locally (`npm run build`)
- [ ] All tests pass (if any)
- [ ] Environment variables documented

### Deployment
- [ ] Project created in Vercel
- [ ] Repository connected
- [ ] Environment variables configured
- [ ] Build succeeds
- [ ] Domain configured (if custom)

### Post-Deployment
- [ ] Database schema pushed
- [ ] Webhook URL updated in Clerk
- [ ] Test sign up/sign in
- [ ] Test core features
- [ ] Test subscription flow
- [ ] Verify webhook works
- [ ] Check error logs
- [ ] Monitor performance

---

## Next Steps After Deployment

1. **Share with Users**
   - Announce launch
   - Gather feedback
   - Monitor usage

2. **Iterate**
   - Fix bugs
   - Add features
   - Improve performance

3. **Scale**
   - Monitor database growth
   - Optimize queries
   - Add caching if needed

---

## Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Clerk Deployment**: https://clerk.com/docs/deployments/overview
- **Prisma Deployment**: https://www.prisma.io/docs/guides/deployment

---

## Status

**Phase 8: Deployment** - ✅ **PREPARATION COMPLETE** - Ready to deploy! 🚀

### ✅ Completed Tasks

1. **✅ Build Verification**
   - Local build tested and working (`npm run build`)
   - All TypeScript types compile correctly
   - No build errors

2. **✅ Configuration Files**
   - `.env.example` created with all required environment variables
   - `vercel.json` configured for Next.js deployment
   - `next.config.ts` properly configured
   - `package.json` includes `postinstall` script for Prisma client generation

3. **✅ Required Files Verified**
   - ✅ `next.config.ts` - Next.js configuration
   - ✅ `package.json` - Dependencies with postinstall script
   - ✅ `prisma/schema.prisma` - Database schema
   - ✅ `.env.example` - Environment variables template
   - ✅ `vercel.json` - Vercel deployment configuration
   - ✅ Webhook route configured at `/api/webhooks/clerk`

### 📋 Next Steps (Manual Actions Required)

1. **Push to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Phase 8: Deployment preparation complete"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Follow Step 3 in this document to deploy via Vercel Dashboard
   - Configure environment variables in Vercel Dashboard
   - Set root directory to `jobmelan-saas` if needed

3. **Configure Production Database**
   - Set up production PostgreSQL database (Neon, Supabase, etc.)
   - Add `DATABASE_URL` to Vercel environment variables
   - Run `npx prisma db push` after deployment

4. **Configure Clerk Webhook**
   - Update webhook URL to production domain
   - Verify webhook secret matches Vercel environment variable

5. **Test Deployment**
   - Follow Post-Deployment Checklist (Step 7)
   - Test all core features
   - Verify subscription flow works

---

Follow the steps above to deploy your application to production.

