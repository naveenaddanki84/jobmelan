# 🚀 Deployment Checklist

Quick reference checklist for deploying JOBMÉLAN to production.

## Pre-Deployment

### Code Preparation
- [ ] All code committed to Git
- [ ] Build works locally: `npm run build`
- [ ] No TypeScript errors
- [ ] No linter errors
- [ ] Test all features locally

### Environment Variables
- [ ] `.env.example` created (template for env vars)
- [ ] All required env vars documented
- [ ] Production keys ready (Clerk, Database, Gemini)

## Deployment Steps

### 1. Vercel Setup
- [ ] Create account at vercel.com
- [ ] Connect GitHub repository
- [ ] Create new project
- [ ] Set root directory: `jobmelan-saas` (if needed)
- [ ] Framework: Next.js (auto-detected)

### 2. Environment Variables in Vercel
Add these in Vercel Dashboard → Settings → Environment Variables:

- [ ] `CLERK_SECRET_KEY` (production key)
- [ ] `CLERK_WEBHOOK_SECRET` (from Clerk Dashboard)
- [ ] `CLERK_PRO_PLAN_ID=cplan_35lmOqzm4DkZ9qKirzLMaU5cImq`
- [ ] `DATABASE_URL` (production database)
- [ ] `GEMINI_API_KEY`
- [ ] `NODE_ENV=production`

**Important**: Set for Production, Preview, AND Development environments.

### 3. Database Setup
- [ ] Production database created (Neon, Supabase, etc.)
- [ ] Database URL added to Vercel env vars
- [ ] Schema pushed: `npx prisma db push`
- [ ] Verify tables exist (User, Resume, JobApplication)

### 4. Clerk Configuration
- [ ] Billing enabled in Clerk Dashboard
- [ ] Stripe account connected
- [ ] Pro plan created (ID: `cplan_35lmOqzm4DkZ9qKirzLMaU5cImq`)
- [ ] Webhook URL updated to production domain
- [ ] Webhook events subscribed (subscription.* events)
- [ ] Webhook secret copied to Vercel env vars

### 5. Deploy
- [ ] Click "Deploy" in Vercel
- [ ] Wait for build to complete
- [ ] Check build logs for errors
- [ ] Note production URL

## Post-Deployment

### Testing
- [ ] Landing page loads
- [ ] Sign up/Sign in works
- [ ] Resume editor works
- [ ] Job search works
- [ ] Job tracker works
- [ ] Pricing page loads (`/pricing`)
- [ ] Can subscribe to Pro plan
- [ ] Pro features unlock after subscription
- [ ] Upgrade prompts show for non-pro users

### Webhook Verification
- [ ] Subscribe to test plan
- [ ] Check Clerk Dashboard → Webhooks → Logs
- [ ] Verify events received
- [ ] Check Vercel → Functions → Logs
- [ ] Verify database updated (`isPro=true`)

### Monitoring
- [ ] Check Vercel Analytics
- [ ] Monitor error logs
- [ ] Check database performance
- [ ] Verify API quotas (Gemini)

## Quick Commands

```bash
# Build locally to test
cd jobmelan-saas
npm run build

# Push database schema
npx prisma db push

# Generate Prisma client
npx prisma generate

# Check environment variables
vercel env ls
```

## Troubleshooting

### Build Fails
- Check build logs in Vercel
- Verify all dependencies installed
- Check TypeScript errors

### Database Connection Fails
- Verify DATABASE_URL is correct
- Check database allows external connections
- Test connection locally

### Webhook Not Working
- Verify webhook URL is production domain
- Check webhook secret matches
- Verify events are subscribed
- Check Vercel function logs

## Production URLs

After deployment, update these:

- **Webhook URL**: `https://your-domain.vercel.app/api/webhooks/clerk`
- **Clerk Frontend API**: Set in Clerk Dashboard → Domains

---

**Status**: Ready to deploy! 🚀

