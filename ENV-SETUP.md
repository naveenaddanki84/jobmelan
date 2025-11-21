# Environment Variables Setup

## Using `.env` File Only

This project uses **`.env`** file only (not `.env.local`). All environment variables should be placed in the `.env` file in the root of the `jobmelan-saas` directory.

## Required Environment Variables

Create a `.env` file in `jobmelan-saas/` directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk Webhook (for syncing users to database)
CLERK_WEBHOOK_SECRET=whsec_...

# Google Gemini API
GEMINI_API_KEY=your_api_key_here

# Stripe (for Phase 7)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Important Notes

1. **Use `.env` only** - Do not use `.env.local`
2. **Never commit `.env`** - It's already in `.gitignore`
3. **Server-side variables** - Variables without `NEXT_PUBLIC_` prefix are server-side only
4. **Public variables** - Variables with `NEXT_PUBLIC_` prefix are exposed to the browser

## Getting Your Keys

### Database (DATABASE_URL)
- Sign up for [Neon](https://neon.tech) or [Supabase](https://supabase.com)
- Get your connection string from the dashboard

### Clerk Authentication
- Sign up at [clerk.com](https://clerk.com)
- Create an application
- Get keys from API Keys section
- Get webhook secret from Webhooks section

### Gemini API Key
- Get your key from [Google AI Studio](https://aistudio.google.com/apikey)

### Stripe (Phase 7)
- Sign up at [stripe.com](https://stripe.com)
- Get keys from Developers → API Keys

## File Location

```
jobmelan-saas/
├── .env          ← Create this file here
├── package.json
└── ...
```

## Next.js Environment Variable Loading

Next.js automatically loads `.env` file. The order of precedence is:
1. `.env.local` (if exists - but we don't use this)
2. `.env.development` / `.env.production` (if exists)
3. `.env` (our standard file)

Since we use only `.env`, all variables should be placed there.

