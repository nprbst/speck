# Deployment Quick Start

**Quick reference for deploying the Speck website to Cloudflare Pages**

> For detailed instructions, see [website/DEPLOYMENT.md](website/DEPLOYMENT.md)

## Prerequisites

- [ ] Cloudflare account
- [ ] GitHub repository access
- [ ] Domain name (optional)

## Step-by-Step Deployment

### 1. Create Cloudflare Pages Project (5 minutes)

```bash
# Login to Cloudflare Dashboard
https://dash.cloudflare.com

# Go to: Pages → Create a project → Connect to Git
# Select: nprbst/speck-004-public-website
# Branch: 004-public-website
```

### 2. Configure Build Settings

```
Framework preset: None
Build command: bun run website:build
Build output directory: website/dist
Root directory: /
Node version: 20
```

### 3. Set Environment Variables (Optional)

```bash
# Cloudflare Dashboard → Settings → Environment Variables
# Currently not required - docs sync from local monorepo
# MAIN_REPO_URL=https://github.com/nprbst/speck.git
# DOCS_SOURCE_PATH=docs
```

### 4. Deploy!

```bash
# Trigger deployment
git push origin 004-public-website

# Or use Cloudflare Dashboard
# Pages → Deployments → Create deployment
```

### 5. Verify Deployment

```bash
# Wait for build to complete (2-5 minutes)
# Then run verification script:
bun website/scripts/verify-deployment.ts https://speck-004-public-website.pages.dev
```

## Expected Build Output

```
✓ Documentation synced
✓ 8 pages built
✓ Sitemap generated
✓ Build completed in ~2 minutes
```

## Deployment URLs

- **Preview**: `https://speck-004-public-website.pages.dev`
- **Custom Domain** (if configured): `https://speck.codes`

## Common Issues

### Build Fails

**Check**:
1. Build command: `bun run website:build`
2. Output directory: `website/dist`
3. Build logs in Cloudflare Dashboard

**Fix**:
```bash
# Test locally
cd /path/to/repo
bun run website:build
# Should create website/dist/index.html
```

### Site Returns 404

**Check**:
1. Build completed successfully
2. Output directory contains `index.html`
3. DNS propagated (wait 5-15 minutes)

### Slow Performance

**Check**:
1. Cache headers configured (`website/public/_headers`)
2. Cloudflare CDN enabled
3. Images optimized

**Test**:
```bash
# Run Lighthouse audit
# Chrome DevTools → Lighthouse → Analyze
```

## Post-Deployment Tasks

- [ ] Configure custom domain (optional)
- [ ] Set up GitHub webhook for auto-rebuild
- [ ] Enable Cloudflare Web Analytics
- [ ] Run Lighthouse audit
- [ ] Test all pages
- [ ] Validate SEO tags

## Monitoring

**Cloudflare Dashboard**:
- Analytics: `Pages → Analytics`
- Build logs: `Pages → Deployments → [deployment]`
- Error logs: `Pages → Functions → Logs`

**Verification Script**:
```bash
# Run daily/weekly checks
bun website/scripts/verify-deployment.ts https://speck.codes
```

## Rollback

If deployment breaks:

```bash
# Option 1: Cloudflare Dashboard
# Pages → Deployments → [last good deployment] → Rollback

# Option 2: Git revert
git revert <commit-hash>
git push origin 004-public-website
```

## Need Help?

- Full guide: [website/DEPLOYMENT.md](website/DEPLOYMENT.md)
- Cloudflare docs: https://developers.cloudflare.com/pages/
- Astro docs: https://docs.astro.build/en/guides/deploy/cloudflare/

---

**Estimated time**: 15-20 minutes for first deployment
**Cost**: $0 (Cloudflare Pages free tier)
