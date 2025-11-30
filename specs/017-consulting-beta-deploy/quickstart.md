# Developer Quickstart: Consulting Page & Beta Deployment

**Feature**: 017-consulting-beta-deploy
**Date**: 2025-11-30

## Prerequisites

- **Node.js**: v18.17+ (for Astro CLI)
- **Bun**: v1.0+ (project runtime)
- **Wrangler CLI**: v3.91+ (Cloudflare tooling)
- **Cloudflare Account**: With D1 and Pages access

## Initial Setup

### 1. Clone and Install

```bash
# Navigate to repository
cd speck-017-consulting-beta-deploy

# Install dependencies
bun install

# Install website dependencies (includes Kysely for type-safe D1 queries)
cd website && bun install && cd ..

# Note: kysely and kysely-d1 should already be in package.json
# If not, add them: bun add kysely kysely-d1
```

### 2. Cloudflare Configuration

**Create D1 Database:**
```bash
# Create the database (run once)
wrangler d1 create speck-inquiries

# Note the database_id from output, update wrangler.toml
```

**Get Turnstile Keys:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Turnstile
2. Add site: `localhost` (for development), `beta.speck.codes`, `speck.codes`
3. Copy Site Key and Secret Key

**Create Environment Files:**

```bash
# website/.dev.vars (local development secrets)
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

```bash
# website/.env (public environment variables)
PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

### 3. Database Setup

```bash
# Run migrations locally
cd website
wrangler d1 migrations apply speck-inquiries --local

# Seed development data (optional)
wrangler d1 execute speck-inquiries --local --file=./migrations/seed.sql
```

## Development Workflow

### Start Local Development

```bash
# From website directory
cd website

# Start Astro dev server with Cloudflare bindings
bun run dev

# Or with wrangler for full D1 access
wrangler pages dev --local -- bun run dev
```

**Local URLs:**
- Website: http://localhost:4321
- Help page: http://localhost:4321/expert-help

### Run Tests

```bash
# From repository root
bun test

# Website-specific tests
cd website
bun test
```

### Build for Production

```bash
cd website
bun run build
```

## Project Structure

```
website/
├── src/
│   ├── components/
│   │   └── InquiryForm.astro      # Contact form component
│   ├── pages/
│   │   └── expert-help.astro      # Help page
│   ├── lib/
│   │   └── db.ts                  # Kysely database factory
│   ├── types/
│   │   └── database.ts            # Kysely type definitions
│   └── styles/
│       └── form.css               # Form styles
├── functions/
│   └── api/
│       └── inquiry.ts             # D1 inquiry endpoint (uses Kysely)
├── migrations/
│   └── 001_create_inquiries.sql   # D1 schema
├── wrangler.toml                  # Cloudflare configuration
├── .dev.vars                      # Local secrets (not committed)
└── .env                           # Public env vars

.claude/
├── commands/
│   └── speck.inquiries.md         # Admin slash command
└── scripts/
    └── inquiries/
        └── manage.ts              # Inquiry management script (uses Kysely)
```

## Common Tasks

### View Form Submissions Locally

```bash
wrangler d1 execute speck-inquiries --local --command "SELECT * FROM inquiries ORDER BY submitted_at DESC"
```

### Test Form Submission

```bash
# Simulate form submission (without Turnstile in dev)
curl -X POST http://localhost:4321/api/inquiry \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","message":"Test inquiry","turnstile_token":"test"}'
```

### Deploy to Beta

```bash
# Ensure you're on the beta branch
git checkout beta

# Push to trigger deployment
git push origin beta

# Or manual deploy
wrangler pages deploy dist --project-name=speck-website --branch=beta
```

### Run D1 Migrations (Remote)

```bash
wrangler d1 migrations apply speck-inquiries --remote
```

## Troubleshooting

### "D1_ERROR: no such table: inquiries"

Run migrations:
```bash
wrangler d1 migrations apply speck-inquiries --local
```

### Turnstile Verification Failing Locally

For local development, you can:
1. Use Turnstile's test keys (always passes)
2. Skip verification in development mode
3. Set `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` (always passes)

### Type Errors with Cloudflare Bindings

Regenerate types:
```bash
wrangler types
```

### Changes Not Reflected

Clear Astro cache:
```bash
rm -rf website/dist website/.astro
```

## Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `PUBLIC_TURNSTILE_SITE_KEY` | Public | Turnstile widget site key |
| `TURNSTILE_SECRET_KEY` | Secret | Turnstile server verification |
| `DB` | Binding | D1 database binding (via wrangler.toml) |

## Useful Commands

```bash
# Wrangler D1 commands
wrangler d1 list                              # List databases
wrangler d1 info speck-inquiries              # Database info
wrangler d1 execute speck-inquiries --local   # Interactive SQL

# Astro commands
bun run dev                                   # Start dev server
bun run build                                 # Production build
bun run preview                               # Preview production build

# Testing
bun test                                      # Run all tests
bun test --watch                              # Watch mode
```

## Next Steps

After setup:
1. Create Kysely types at `website/src/types/database.ts`
2. Create DB factory at `website/src/lib/db.ts`
3. Create the help page at `website/src/pages/expert-help.astro`
4. Create the inquiry form component
5. Set up the API endpoint in `website/functions/api/inquiry.ts` (using Kysely)
6. Configure beta deployment in Cloudflare Pages dashboard
7. Set up redirect rule: `speck.codes` → `beta.speck.codes`
