# Prisma PostgreSQL Connection Error Fix

## Error
```
prisma:error Error in PostgreSQL connection: Error { kind: Closed, cause: None }
```

## Common Causes

1. **DATABASE_URL not set** - Environment variable missing or incorrect
2. **Connection pool exhausted** - Too many connections in serverless environment
3. **Database unreachable** - Network issues or database down
4. **Connection timeout** - Database taking too long to respond
5. **Missing connection pooling parameters** - Needed for serverless environments

## Solutions

### 1. Check DATABASE_URL

Verify your `DATABASE_URL` is set correctly:

```bash
# In your .env file
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
```

**For serverless databases (Neon, Supabase), add connection pooling parameters:**

```bash
# Neon example
DATABASE_URL="postgresql://user:password@host:port/database?schema=public&pgbouncer=true&connect_timeout=15"

# Supabase example  
DATABASE_URL="postgresql://user:password@host:port/database?schema=public&pgbouncer=true&connection_limit=1"
```

### 2. Connection Pooling Parameters

For Vercel/serverless deployments, add these parameters to your DATABASE_URL:

```
?schema=public&pgbouncer=true&connect_timeout=15&connection_limit=1
```

**Full example:**
```
DATABASE_URL="postgresql://user:password@host:port/database?schema=public&pgbouncer=true&connect_timeout=15&connection_limit=1"
```

### 3. Verify Database is Accessible

Test your database connection:

```bash
# Test connection
npx prisma db push --skip-generate

# Or use Prisma Studio
npx prisma studio
```

### 4. Check Environment Variables in Vercel

If deploying to Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify `DATABASE_URL` is set for Production, Preview, and Development
3. Make sure there are no extra quotes or spaces
4. Redeploy after adding/updating environment variables

### 5. Database Provider Specific

#### Neon
- Use the **pooled connection string** (not direct connection)
- Format: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`
- Add `&pgbouncer=true` for connection pooling

#### Supabase
- Use the **connection pooling** connection string
- Format: `postgresql://postgres:password@host.supabase.co:6543/postgres`
- Port `6543` is for connection pooling (not `5432`)

#### Railway
- Use the connection string from Railway dashboard
- Usually works without additional parameters

### 6. Updated Prisma Client

The Prisma client has been updated to:
- ✅ Check for DATABASE_URL before creating client
- ✅ Handle connection errors gracefully
- ✅ Properly disconnect on shutdown
- ✅ Reuse connection in development

### 7. Test Connection

After fixing, test the connection:

```bash
cd jobmelan-saas

# Check if DATABASE_URL is loaded
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL ? 'DATABASE_URL is set' : 'DATABASE_URL is missing')"

# Test Prisma connection
npx prisma db push
```

## Quick Fix Checklist

- [ ] DATABASE_URL is set in `.env` file
- [ ] DATABASE_URL includes connection pooling parameters (for serverless)
- [ ] Database is accessible and running
- [ ] Using pooled connection string (not direct connection)
- [ ] Environment variables are set in Vercel (if deployed)
- [ ] Prisma client updated (already done)

## Still Having Issues?

1. **Check database logs** - Look for connection errors
2. **Verify network access** - Ensure database allows connections from your IP/Vercel
3. **Check database limits** - Some free tiers have connection limits
4. **Try direct connection** - Temporarily use direct connection to test
5. **Check Prisma version** - Ensure Prisma is up to date: `npm install prisma@latest @prisma/client@latest`

## Example .env File

```env
# Database (with connection pooling for serverless)
DATABASE_URL="postgresql://user:password@host:port/database?schema=public&pgbouncer=true&connect_timeout=15&connection_limit=1"

# Other variables...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
CLERK_PRO_PLAN_ID=cplan_35lmOqzm4DkZ9qKirzLMaU5cImq
GEMINI_API_KEY=your_api_key_here
NODE_ENV=production
```

