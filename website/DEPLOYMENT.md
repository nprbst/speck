# Speck Website Deployment Guide

**Target Platform**: Cloudflare Pages
**Branch**: `004-public-website`
**Build Output**: `website/dist/`

## Prerequisites

- [x] Cloudflare account (free tier)
- [x] GitHub repository access
- [x] Bun 1.0+ installed locally (for testing)
- [x] Domain name (optional - can use `.pages.dev` subdomain)

## Phase 9: Deployment Checklist

### T109: Create Cloudflare Pages Project

1. **Login to Cloudflare Dashboard**:
   - Navigate to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Go to **Pages** in the left sidebar

2. **Create New Project**:
   - Click **"Create a project"**
   - Select **"Connect to Git"**
   - Authorize Cloudflare to access your GitHub account
   - Select repository: `nprbst/speck-004-public-website` (or your fork)
   - Select branch: `004-public-website`

### T110: Configure Build Settings

In the Cloudflare Pages setup wizard, configure:

**Build Configuration**:
```
Framework preset: None (custom configuration)
Build command: bun run website:build
Build output directory: website/dist
Root directory: /
```

**Environment Variables** (set these in next step):
- See T111 below

**Branch Configuration**:
- Production branch: `004-public-website`
- Preview branches: All other branches

**Build Settings**:
- Build timeout: 15 minutes (default)
- Node version: 20 (Bun will be used via scripts)

### T111: Set Environment Variables

Navigate to **Settings → Environment Variables** in your Cloudflare Pages project:

**Production Variables**:
```bash
# Documentation sync (currently using local docs, can be configured for remote sync)
# MAIN_REPO_URL=https://github.com/nprbst/speck.git
# DOCS_SOURCE_PATH=docs
```

**Note**: The current implementation syncs docs from the monorepo's `/docs` directory directly, so external Git cloning is not needed. These variables are optional and can be set if you want to sync from a different repository in the future.

### T112: Configure Custom Domain

**Option 1: Use Cloudflare Pages subdomain** (Free)
- Your site will be at: `speck-004-public-website.pages.dev`
- No configuration needed

**Option 2: Custom domain** (if you own `speck.dev`)

1. **In Cloudflare Pages**:
   - Go to **Custom domains** tab
   - Click **"Set up a custom domain"**
   - Enter: `speck.dev` (or `www.speck.dev`)

2. **DNS Configuration**:
   - If domain is on Cloudflare DNS:
     - DNS records will be added automatically
   - If domain is elsewhere:
     - Add CNAME record: `speck.dev` → `speck-004-public-website.pages.dev`

3. **Wait for SSL**:
   - Cloudflare will provision free SSL certificate (1-5 minutes)
   - Site will be available at `https://speck.dev`

### T113: Set Up GitHub Webhook

**Purpose**: Automatically rebuild website when documentation changes in main Speck repo

**Steps**:

1. **Get Cloudflare Pages Build Hook**:
   - In Cloudflare Pages project, go to **Settings → Builds & deployments**
   - Scroll to **Build hooks**
   - Click **"Add build hook"**
   - Name: "Rebuild on docs update"
   - Branch: `004-public-website`
   - Copy the webhook URL

2. **Configure GitHub Webhook** (in main Speck repo):
   - Go to repository **Settings → Webhooks**
   - Click **"Add webhook"**
   - Paste the Cloudflare build hook URL
   - Content type: `application/json`
   - Events: Select **"Just the push event"**
   - Active: ✓ checked
   - Save webhook

3. **Test Webhook**:
   - Make a small change to `/docs/README.md` in main repo
   - Commit and push
   - Verify Cloudflare Pages triggers a new build

### T114: Configure Cache Headers

**In Cloudflare Pages Dashboard** → **Settings → Functions**:

Create `website/functions/_headers` file (Cloudflare Pages will respect this):

```
# Static assets (hashed filenames)
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# Images
/images/*
  Cache-Control: public, max-age=31536000, immutable

# HTML pages
/*
  Cache-Control: public, max-age=3600, must-revalidate

# Sitemap and robots
/sitemap*.xml
  Cache-Control: public, max-age=86400
/robots.txt
  Cache-Control: public, max-age=86400
```

**Alternative**: Use Cloudflare Transform Rules:
- Go to **Rules → Transform Rules → Modify Response Header**
- Create rule to set cache headers based on path patterns

### T115: Enable Cloudflare Web Analytics

**Steps**:

1. **In Cloudflare Dashboard**:
   - Go to **Web Analytics** (top-level navigation, not Pages-specific)
   - Click **"Add a site"**
   - Enter hostname: `speck.dev` (or your Pages URL)
   - Copy the JavaScript snippet

2. **Add to Website**:
   - The analytics script is already added in `BaseLayout.astro` if `CLOUDFLARE_WEB_ANALYTICS_TOKEN` is set
   - Set environment variable in Cloudflare Pages:
     - `CLOUDFLARE_WEB_ANALYTICS_TOKEN=<your-token>`

3. **Verify**:
   - Visit your deployed site
   - Check **Web Analytics** dashboard after a few minutes
   - Confirm page views are tracked

### T116: Configure Cloudflare Images

**For Raster Images** (if you add photos/screenshots in the future):

1. **Enable Cloudflare Images**:
   - Go to **Images** in Cloudflare Dashboard
   - Enable **Image Resizing** (free tier: 100K requests/month)

2. **Update Image URLs**:
   ```astro
   <!-- Before -->
   <img src="/images/screenshot.png" alt="Screenshot" />

   <!-- After (with Cloudflare Image Resizing) -->
   <img
     src="/cdn-cgi/image/width=800,format=auto/images/screenshot.png"
     alt="Screenshot"
   />
   ```

**Current Status**: Site primarily uses SVG icons (no resizing needed). Implement this when adding raster images.

### T117: Set Up Preview Deployments

**Automatic Configuration** (already enabled by default):

- Every PR to `004-public-website` branch gets a preview URL
- Preview URL format: `<commit-hash>.speck-004-public-website.pages.dev`
- Cloudflare automatically comments on GitHub PRs with preview link

**To Test**:
1. Create a new branch: `git checkout -b test-deployment`
2. Make a small change to `website/src/pages/index.astro`
3. Push and create PR to `004-public-website`
4. Cloudflare bot will comment with preview URL

### T118: Deploy to Production

**Trigger Deployment**:

Option 1: **Push to GitHub** (recommended)
```bash
git push origin 004-public-website
```
Cloudflare Pages will detect the push and auto-deploy.

Option 2: **Manual Deploy** (from Cloudflare Dashboard)
- Go to **Deployments** tab
- Click **"Create deployment"**
- Select branch: `004-public-website`
- Click **"Deploy"**

**Verify Homepage Loads**:
1. Wait for build to complete (2-5 minutes)
2. Visit deployment URL (e.g., `speck-004-public-website.pages.dev`)
3. Confirm homepage renders correctly:
   - [ ] Hero section displays
   - [ ] Navigation works
   - [ ] Feature cards render
   - [ ] Theme toggle functions

### T119: Verify Documentation Sync

**Test Documentation Build**:

1. **Check Build Logs**:
   - Go to **Deployments** tab
   - Click on latest deployment
   - View build logs
   - Confirm `bun run website:sync` succeeded
   - Confirm docs were copied to `website/src/content/docs/`

2. **Verify Docs Pages**:
   - Visit `/docs/getting-started/installation`
   - Visit `/docs/getting-started/quick-start`
   - Confirm content displays correctly

3. **Test Webhook Rebuild**:
   - Make a change to `/docs/README.md` in main repo
   - Push to main branch
   - Confirm webhook triggers Cloudflare rebuild
   - Verify updated content appears after deployment

### T120: Test Production Performance

**Run Lighthouse Audit**:

1. **Using Chrome DevTools**:
   - Open deployed site in Chrome
   - Open DevTools (F12)
   - Go to **Lighthouse** tab
   - Select **Performance**, **Accessibility**, **Best Practices**, **SEO**
   - Click **"Analyze page load"**

2. **Target Scores**:
   - Performance: 90+
   - Accessibility: 95+
   - Best Practices: 95+
   - SEO: 90+

3. **Web Vitals** (from Lighthouse):
   - Largest Contentful Paint (LCP): < 2.5s
   - First Input Delay (FID): < 100ms
   - Cumulative Layout Shift (CLS): < 0.1

**Using WebPageTest** (3G simulation):
```
URL: https://speck.dev
Location: Select a location
Connection: 3G
```

**Expected Results**:
- First Contentful Paint: < 1.8s
- Speed Index: < 3.0s
- Total Page Weight: < 500KB

### T121: Verify Analytics Tracking

**Check Cloudflare Web Analytics**:

1. Visit deployed site and navigate to multiple pages:
   - Homepage
   - Docs pages
   - Comparison page

2. Wait 5-10 minutes for data to propagate

3. **In Cloudflare Dashboard → Web Analytics**:
   - Confirm page views appear
   - Verify visitor count increments
   - Check top pages (should show `/`, `/docs/*`, `/comparison`)

**Troubleshooting**:
- If no data appears, check browser console for errors
- Verify analytics token is set correctly
- Confirm ad blockers aren't blocking Cloudflare Beacon

### T122: Test All Pages in Production

**Manual Testing Checklist**:

- [ ] **Homepage** (`/`)
  - [ ] Hero section renders
  - [ ] Feature cards display
  - [ ] CTAs link correctly
  - [ ] Navigation works
  - [ ] Theme toggle functions

- [ ] **Documentation** (`/docs/*`)
  - [ ] Sidebar navigation renders
  - [ ] Active page highlighted
  - [ ] Code blocks with syntax highlighting
  - [ ] Copy-to-clipboard works
  - [ ] Breadcrumbs correct
  - [ ] Table of contents generated

- [ ] **Comparison** (`/comparison`)
  - [ ] Comparison table renders
  - [ ] Responsive on mobile
  - [ ] Links work

- [ ] **404 Page** (`/nonexistent-page`)
  - [ ] Custom 404 page displays
  - [ ] Link back to homepage works

**Cross-Browser Testing**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Responsive Testing**:
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Mobile landscape (667x375)

### T123: Validate SEO Tags

**Using Meta Tags Analyzer**:

1. Visit [metatags.io](https://metatags.io)
2. Enter deployed URL: `https://speck.dev`
3. Click **"Generate"**

**Verify**:
- [ ] **Title Tag**: "Speck - Opinionated Feature Specs for Claude Code"
- [ ] **Meta Description**: Present and < 160 characters
- [ ] **Open Graph Title**: Matches page title
- [ ] **Open Graph Description**: Present
- [ ] **Open Graph Image**: Displays correctly (1200x630)
- [ ] **Twitter Card**: `summary_large_image`
- [ ] **Canonical URL**: Matches current page
- [ ] **Favicon**: Displays correctly

**Using Google Search Console**:
1. Add property: `https://speck.dev`
2. Verify ownership (DNS TXT record or meta tag)
3. Submit sitemap: `https://speck.dev/sitemap-index.xml`
4. Wait 24-48 hours for initial indexing

**Check Sitemap**:
- Visit `https://speck.dev/sitemap-index.xml`
- Confirm all pages listed
- Verify URLs are absolute (not relative)

**Check Robots.txt**:
- Visit `https://speck.dev/robots.txt`
- Confirm `Allow: /`
- Confirm sitemap reference

## Post-Deployment Monitoring

### Performance Monitoring

**Set up Cloudflare Web Analytics alerts**:
- Go to **Notifications** in Cloudflare Dashboard
- Create alerts for:
  - Core Web Vitals degradation
  - Increased error rate
  - Traffic spikes

### Uptime Monitoring

Consider setting up external monitoring:
- **UptimeRobot** (free): Ping every 5 minutes
- **Pingdom** (free tier): Basic uptime checks
- **Cloudflare Health Checks** (paid): Advanced monitoring

### Cost Tracking

**Cloudflare Pages Free Tier Limits**:
- 500 builds/month
- 100 GB bandwidth/month
- Unlimited requests

**Expected Usage** (10k visitors/month):
- Builds: ~30-50/month (docs updates)
- Bandwidth: ~5-10 GB/month
- Well within free tier

### Maintenance Schedule

**Weekly**:
- Check Cloudflare Analytics for traffic trends
- Review build logs for errors

**Monthly**:
- Run Lighthouse audit
- Update dependencies: `bun update`
- Review Cloudflare Pages usage

**Quarterly**:
- Review and optimize images
- Audit accessibility compliance
- Update documentation

## Rollback Procedure

If a deployment breaks the site:

1. **In Cloudflare Pages Dashboard**:
   - Go to **Deployments** tab
   - Find last working deployment
   - Click **"⋯"** → **"Rollback to this deployment"**

2. **Or revert via Git**:
   ```bash
   git revert <commit-hash>
   git push origin 004-public-website
   ```

## Troubleshooting

### Build Fails

**Check Build Logs**:
- Most common issues:
  - Missing environment variables
  - Dependency installation failure
  - TypeScript errors

**Solutions**:
- Verify `bun run website:build` works locally
- Check environment variables are set in Cloudflare
- Review build logs for specific error messages

### Site Returns 404

**Possible Causes**:
- Incorrect build output directory
- Build didn't complete successfully
- DNS not propagated (for custom domain)

**Solutions**:
- Verify `website/dist/index.html` exists after build
- Check deployment status in Cloudflare
- Wait 5-15 minutes for DNS propagation

### Slow Load Times

**Diagnose**:
- Run Lighthouse audit
- Check Network tab in DevTools
- Verify Cloudflare CDN is caching assets

**Common Fixes**:
- Enable cache headers (see T114)
- Optimize images (convert to WebP/AVIF)
- Minify JavaScript/CSS (Astro does this automatically)

## Additional Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Astro Deployment Guide](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

**Deployment Completed**: Mark this date when all tasks T109-T123 are complete
**Deployed URL**: `https://speck-004-public-website.pages.dev` (or custom domain)
**Status**: Ready for production traffic
