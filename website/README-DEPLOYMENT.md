# Speck Website - Deployment Guide

**Quick Links**:
- 🚀 [Quick Start](../DEPLOYMENT-QUICKSTART.md) - Deploy in 15-20 minutes
- 📚 [Full Guide](DEPLOYMENT.md) - Comprehensive deployment documentation
- 📊 [Phase 9 Status](PHASE9-STATUS.md) - Detailed status report
- 🎯 [Implementation Summary](../PHASE9-IMPLEMENTATION-SUMMARY.md) - What's done and what's next

---

## Deployment Status

✅ **Preparation Complete** - Ready for deployment to Cloudflare Pages

**What's Ready**:
- ✅ Production build verified (`bun run website:build`)
- ✅ Deployment documentation complete
- ✅ Cache headers configured
- ✅ Verification script created
- ✅ Build output: 8 pages, sitemap, robots.txt

**What's Needed**:
- ⏳ Cloudflare Pages account (free)
- ⏳ 15-20 minutes for first-time setup
- ⏳ Optional: Custom domain (e.g., `speck.dev`)

---

## Quick Start

### 1. Deploy to Cloudflare Pages

```bash
# See DEPLOYMENT-QUICKSTART.md for step-by-step instructions
# Or follow: https://dash.cloudflare.com → Pages → Create project
```

**Build Configuration**:
```
Build command: bun run website:build
Output directory: website/dist
Root directory: /
```

### 2. Verify Deployment

```bash
# Run verification script
bun run website:verify https://your-deployment-url.pages.dev
```

**Expected Result**:
```
✅ All deployment verification tests passed!
📊 Success rate: 100.0%
```

### 3. Run Lighthouse Audit

**Chrome DevTools** → Lighthouse → Analyze page load

**Target Scores**:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+

---

## Files Overview

### Documentation
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - 60+ page comprehensive guide
- **[../DEPLOYMENT-QUICKSTART.md](../DEPLOYMENT-QUICKSTART.md)** - Quick reference
- **[PHASE9-STATUS.md](PHASE9-STATUS.md)** - Detailed implementation status
- **[../PHASE9-IMPLEMENTATION-SUMMARY.md](../PHASE9-IMPLEMENTATION-SUMMARY.md)** - Summary of completed work

### Configuration
- **[../wrangler.toml](../wrangler.toml)** - Cloudflare Pages config
- **[public/_headers](public/_headers)** - Cache headers for optimal performance

### Scripts
- **[scripts/verify-deployment.ts](scripts/verify-deployment.ts)** - Automated verification
- **[scripts/sync-docs.ts](scripts/sync-docs.ts)** - Documentation sync

---

## Common Tasks

### Build Website
```bash
bun run website:build
# Output: website/dist/
```

### Preview Locally
```bash
bun run website:preview
# Open: http://localhost:4321
```

### Verify Deployment
```bash
bun run website:verify https://speck.dev
```

### Check Build Output
```bash
ls -lh website/dist/
# Should see: index.html, docs/, comparison/, 404.html, sitemap*, robots.txt
```

---

## Deployment Checklist

- [ ] Cloudflare Pages project created
- [ ] Build settings configured
- [ ] Environment variables set (optional)
- [ ] Site deployed and accessible
- [ ] Verification script passes
- [ ] Lighthouse audit meets targets
- [ ] All pages tested
- [ ] SEO tags validated
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled (optional)

---

## Troubleshooting

### Build Fails
**Check**: Build logs in Cloudflare Dashboard
**Fix**: Run `bun run website:build` locally to debug

### Site Returns 404
**Check**: Build output directory is `website/dist`
**Fix**: Verify `website/dist/index.html` exists after build

### Slow Performance
**Check**: Cache headers applied
**Fix**: Verify `website/public/_headers` is deployed

### Verification Script Fails
**Check**: Deployment URL is correct
**Fix**: Use full URL with protocol (https://...)

---

## Support

**Need Help?**
- Build issues → [DEPLOYMENT.md#troubleshooting](DEPLOYMENT.md#troubleshooting)
- Performance → Run verification script
- Cloudflare → https://developers.cloudflare.com/pages/

---

## Next Steps After Deployment

1. ✅ Verify deployment with script
2. ✅ Run Lighthouse audit
3. ✅ Test all pages manually
4. ⏳ Configure custom domain (optional)
5. ⏳ Enable analytics (optional)
6. ⏳ Set up GitHub webhook (optional)

---

**Ready to Deploy?** → Start with [DEPLOYMENT-QUICKSTART.md](../DEPLOYMENT-QUICKSTART.md)
