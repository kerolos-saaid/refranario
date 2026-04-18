# Señor Shaعbi - Cloudflare Deployment Guide

Deploy your fullstack React 19 + Hono app on Cloudflare's free tier.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌────────────────────────────────┐ │
│  │   Cloudflare    │    │     Cloudflare Workers         │ │
│  │     Pages       │───▶│   (Hono API + D1 Database)    │ │
│  │   (Frontend)    │    │                                │ │
│  └─────────────────┘    └────────────────────────────────┘ │
│           │                         │                        │
│           ▼                         ▼                        │
│    static files              /api/* routes                  │
└─────────────────────────────────────────────────────────────┘
```

**Free Tier Limits:**
- Cloudflare Pages: 500 min/month, 1 build per deploy, 25 MB bandwidth
- Cloudflare Workers: 100,000 requests/day
- Cloudflare D1: 5 MB storage, 5 million read queries/day

---

## Prerequisites

1. **Cloudflare Account** - Sign up at [cloudflare.com](https://cloudflare.com)
2. **Node.js 18+** - For Wrangler CLI
3. **Git** - For version control

---

## Step 1: Install Dependencies

```bash
# Install Cloudflare dependencies
bun install

# Verify wrangler is installed
npx wrangler --version
```

---

## Step 2: Set Up D1 Database (Free SQL Database)

### Create the Database

```bash
# Login to Cloudflare (first time)
npx wrangler login

# Create D1 database
npx wrangler d1 create senor-shabi-db
```

**Output example:**
```
┌─────────────────────────────┬──────────────────────────────────────┐
│ Name                        │ UUID                                 │
├─────────────────────────────┼──────────────────────────────────────┤
│ senor-shabi-db              │ xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx │
└─────────────────────────────┴──────────────────────────────────────┘
```

### Update wrangler.toml

Copy the `database_id` and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "senor-shabi-db"
database_id = "YOUR_DATABASE_ID_HERE"  # Paste UUID here
```

### Run Migrations

```bash
# Apply schema
npx wrangler d1 execute senor-shabi-db --local --file=./server/src/schema.sql

# Seed with sample data
npx wrangler d1 execute senor-shabi-db --local --file=./server/src/seed.sql

# Verify data (optional)
npx wrangler d1 execute senor-shabi-db --local --command="SELECT * FROM proverbs"
```

---

## Step 3: Deploy the API (Cloudflare Workers)

### Deploy to Cloudflare

```bash
# Deploy to production
npx wrangler deploy

# Or deploy to preview
npx wrangler deploy --env preview
```

**Output example:**
```
🌀  Creating namespace 'senor-shabi-api'
🌀  Uploading senor-shabi-api...
⚡  Done!
  https://senor-shabi-api.your-username.workers.dev
```

### Test the API

```bash
# Get all proverbs
curl https://senor-shabi-api.your-username.workers.dev/api/proverbs

# Get single proverb
curl https://senor-shabi-api.your-username.workers.dev/api/proverbs/1

# Login test
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' \
  https://senor-shabi-api.your-username.workers.dev/api/login
```

---

## Step 4: Deploy the Frontend (Cloudflare Pages)

### Build the Frontend

```bash
# Build React app
bun run build
```

### Deploy to Cloudflare Pages

```bash
# Deploy using Wrangler
npx wrangler pages deploy dist/client \
  --project-name=senor-shabi \
  --branch=main
```

**Or use Git Integration:**
1. Push your code to GitHub
2. Go to Cloudflare Dashboard → Pages → Create project
3. Connect your GitHub repository
4. Configure:
   - Production branch: `main`
   - Build command: `bun run build`
   - Build output directory: `dist/client`

### GitHub Actions Auto-Deploy

This repo includes `.github/workflows/deploy.yml`, which auto-deploys production when you push to `main`.

What it does:
- Deploys the Worker backend when backend files change
- Builds and deploys the Pages frontend when frontend files change
- Skips the untouched side so a frontend-only push does not redeploy the backend
- A manual GitHub Actions run deploys both sides, which is useful for smoke-testing the pipeline

Set these GitHub repository settings before using it:

**Secrets**
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Workers Scripts Edit and Pages Edit permissions
- `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare account ID

**Variables**
- `CLOUDFLARE_PAGES_PROJECT_NAME`: your Pages project name, for example `senor-shabi`
- `VITE_API_URL` (optional): override the frontend API base URL at build time

After those are set, every push to `main` will apply to the running app automatically.

If your Pages project is already connected directly to GitHub inside Cloudflare, disable that Pages-side Git integration or this workflow will trigger a second frontend deploy for the same push.

---

## Step 5: Connect Frontend to API

### Update API Base URL

Edit `client/src/lib/api.ts`:

```typescript
const API_BASE = 'https://senor-shabi-api.your-username.workers.dev'

// Or use environment variable
const API_BASE = import.meta.env.VITE_API_URL || ''
```

### Rebuild and Redeploy

```bash
bun run build
npx wrangler pages deploy dist/client --project-name=senor-shabi
```

---

## Step 6: Custom Domain (Free)

### Add Custom Domain

1. Go to **Cloudflare Dashboard** → **Pages** → Your project
2. Click **Custom domains**
3. Enter your domain (e.g., `refranario.com`)
4. Click **Activate Domain**

Cloudflare will automatically:
- Provision SSL certificates
- Set up CDN caching
- Configure redirects

### Configure Your Domain

If using a subdomain (e.g., `app.yourdomain.com`):

1. Go to **Cloudflare Dashboard** → **DNS**
2. Add CNAME record:
   - Type: `CNAME`
   - Name: `app`
   - Target: `senor-shabi.pages.dev`
   - Proxy status: **Proxied** (orange cloud)

---

## Environment Variables

### For Local Development

Create `.dev.vars` file:

```bash
# .dev.vars (local only - don't commit)
API_URL=http://localhost:8787
```

### For Production

Set in **Cloudflare Dashboard** → Workers → Your worker → Settings → Variables:

```
API_URL=https://senor-shabi-api.your-username.workers.dev
```

---

## Project Structure

```
refranario/
├── client/                    # React 19 frontend
│   ├── src/
│   │   ├── pages/           # Splash, Home, Detail, AddEdit, Login
│   │   ├── components/      # OfflineBanner
│   │   ├── hooks/           # useOnlineStatus
│   │   └── lib/api.ts      # API client
│   └── public/              # Static assets
├── server/
│   └── src/
│       ├── index.ts         # Hono API server
│       ├── schema.sql       # D1 database schema
│       └── seed.sql         # Sample data
├── dist/                    # Built files (auto-generated)
├── wrangler.toml            # Cloudflare configuration
└── package.json
```

---

## Troubleshooting

### Common Issues

**1. "Workers module not found"**
```bash
# Ensure you're using ES modules
echo 'type = "module"' >> package.json
```

**2. D1 database not binding**
```bash
# Check wrangler.toml has correct binding name
# Must match: binding = "DB" in [[d1_databases]]
```

**3. CORS errors**
The API already includes CORS middleware. If issues persist, check:
- Frontend is calling correct API URL
- No typos in API endpoint

**4. Build fails**
```bash
# Clear cache and rebuild
rm -rf dist
bun run build
```

### View Logs

```bash
# Live tail logs
npx wrangler tail

# View last 100 lines
npx wrangler logs --tail --max-entries=100
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `bun run dev` | Run local API server |
| `bun run dev:client` | Run local frontend |
| `bun run build` | Build frontend |
| `npx wrangler deploy` | Deploy API to Cloudflare |
| `npx wrangler pages deploy dist/client` | Deploy frontend |
| `npx wrangler d1 execute` | Run SQL commands |
| `npx wrangler tail` | View live logs |
| `npx wrangler login` | Login to Cloudflare |

---

## Costs (Free Tier)

| Service | Free Limit | This App Usage |
|---------|------------|----------------|
| Cloudflare Pages | 500 min/month | ~50 min/month |
| Cloudflare Workers | 100K req/day | ~200 req/day |
| Cloudflare D1 | 5M reads/day | ~50 reads/day |
| Bandwidth | Unlimited | < 10 MB/month |
| SSL | Free | ✅ |
| Custom Domain | Free | ✅ |

**Total Cost: $0/month**

---

## Next Steps

1. ✅ Database configured
2. ✅ API deployed
3. ✅ Frontend deployed
4. ⏳ Custom domain (optional)

To enable D1 database in the API, update `server/src/index.ts` to use D1 instead of in-memory storage.
