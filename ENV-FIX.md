# Environment Variables Fix: Using .env Only

## Problem

Next.js automatically loads `.env.local` with **higher precedence** than `.env`. This means if you have both files, `.env.local` values will override `.env` values.

## Solution

### Option 1: Delete .env.local (Recommended)

The simplest solution is to delete `.env.local` and use only `.env`:

```bash
cd jobmelan-saas
rm .env.local
```

Then ensure all your environment variables are in `.env`:

```env
# .env file
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
GEMINI_API_KEY=your_key_here
```

**Restart your dev server** after deleting `.env.local`:
```bash
npm run dev
```

### Option 2: Code Changes (Already Applied)

I've updated the code to explicitly load `.env` file in:
- `src/actions/ai-actions.ts` - Forces loading from `.env` only
- `prisma.config.ts` - Forces loading from `.env` only  
- `src/app/api/webhooks/clerk/route.ts` - Forces loading from `.env` only

However, **Next.js still loads `.env.local` at startup**, so the best solution is to **delete `.env.local`**.

## Why This Happens

Next.js loads environment variables in this order (highest to lowest precedence):
1. `.env.local` ← **Highest precedence**
2. `.env.development` / `.env.production`
3. `.env` ← **Lowest precedence**

If a variable exists in both `.env.local` and `.env`, `.env.local` wins.

## Verification

After deleting `.env.local` and restarting the server, verify:

1. Check that AI generation works (uses GEMINI_API_KEY from `.env`)
2. Check that database connections work (uses DATABASE_URL from `.env`)
3. Check that Clerk auth works (uses Clerk keys from `.env`)

## Important

- **Always use `.env` only** - Do not create `.env.local`
- **Restart dev server** after any `.env` changes
- **`.env` is already in `.gitignore`** - Your secrets are safe

