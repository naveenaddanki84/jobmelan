# 🚀 Quick Deployment Guide

## Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Phase 7 complete: Subscription system integrated"
git push origin main
```

### Step 2: Deploy on Vercel
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. **Root Directory**: `jobmelan-saas` (if repo is in parent folder)
5. Click "Deploy"

### Step 3: Add Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

```bash
CLERK_SECRET_KEY=sk_live_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx
CLERK_PRO_PLAN_ID=cplan_35lmOqzm4DkZ9qKirzLMaU5cImq
DATABASE_URL=postgresql://...
GEMINI_API_KEY=xxxxx
NODE_ENV=production
```

**Set for**: Production, Preview, Development

### Step 4: Push Database Schema
After first deployment:
```bash
# Get production env vars
vercel env pull .env.production

# Push schema
npx prisma db push
```

### Step 5: Configure Webhook
1. Get your Vercel URL: `https://your-project.vercel.app`
2. Clerk Dashboard → Webhooks → Edit Endpoint
3. Update URL: `https://your-project.vercel.app/api/webhooks/clerk`
4. Save

### Step 6: Test
- Visit your deployed site
- Test sign up/sign in
- Test subscription flow
- Verify webhook receives events

---

## That's it! 🎉

Your app is now live. See `PHASE8-DEPLOYMENT.md` for detailed instructions.

