# Speck Public Website

**Static marketing and documentation website for Speck** - Built with Astro 5, deployed to Cloudflare Pages.

🚀 **Deployment Status**: ✅ Ready for production deployment
📚 **Deployment Guide**: See [README-DEPLOYMENT.md](README-DEPLOYMENT.md)

---

## Quick Links

- 🏠 **Production Site**: https://speck-004-public-website.pages.dev (after deployment)
- 📖 **Deployment Guide**: [README-DEPLOYMENT.md](README-DEPLOYMENT.md)
- 🚀 **Quick Start**: [../DEPLOYMENT-QUICKSTART.md](../DEPLOYMENT-QUICKSTART.md)
- 📊 **Phase 9 Status**: [PHASE9-STATUS.md](PHASE9-STATUS.md)

---

## Project Structure

```text
website/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Navigation.astro # Header navigation
│   │   ├── CodeBlock.astro  # Syntax-highlighted code
│   │   ├── ThemeToggle.astro # Dark/light mode toggle
│   │   ├── FeatureCard.astro # Homepage feature cards
│   │   └── Sidebar.astro    # Documentation sidebar
│   ├── content/             # Content collections
│   │   ├── docs/            # Documentation (synced from main repo)
│   │   └── config.ts        # Content collection schema
│   ├── layouts/             # Page layouts
│   │   ├── BaseLayout.astro # Common HTML structure
│   │   ├── HomeLayout.astro # Homepage layout
│   │   └── DocsLayout.astro # Documentation layout
│   ├── pages/               # File-based routing
│   │   ├── index.astro      # Homepage
│   │   ├── docs/[...slug].astro # Dynamic docs routes
│   │   ├── comparison.astro # Speck vs Spec-Kit
│   │   └── 404.astro        # Error page
│   └── styles/              # Global styles
│       ├── global.css       # CSS reset, base styles
│       └── theme.css        # Dark/light mode palette
├── public/                  # Static assets
│   ├── images/              # SVG icons, logos
│   ├── _headers             # Cloudflare Pages cache headers
│   └── favicon.svg          # Site favicon
├── scripts/                 # Build-time scripts
│   ├── sync-docs.ts         # Sync docs from main repo
│   └── verify-deployment.ts # Post-deployment verification
└── dist/                    # Build output (generated)
```

---

## Commands

All commands are run from the **repository root**, not the `website/` directory:

| Command | Action |
|---------|--------|
| `bun run website:dev` | Start dev server at `localhost:4321` |
| `bun run website:build` | Build production site to `website/dist/` |
| `bun run website:preview` | Preview production build locally |
| `bun run website:sync` | Sync documentation from main repo |
| `bun run website:verify <url>` | Verify deployed site |

**Testing**:
```bash
bun run test:visual  # Visual regression tests (Playwright)
bun run test:a11y    # Accessibility tests (Axe-core)
```

---

## Development

### Local Setup

1. **Install dependencies**:
   ```bash
   cd website
   bun install
   ```

2. **Start dev server**:
   ```bash
   bun run dev
   # Or from root: bun run website:dev
   ```

3. **Open browser**:
   ```
   http://localhost:4321
   ```

### Project Features

- ✅ **Astro 5** - Modern static site generator
- ✅ **View Transitions** - SPA-like navigation
- ✅ **Dark Mode** - System preference + manual toggle
- ✅ **Content Collections** - Type-safe markdown with Zod validation
- ✅ **Shiki Syntax Highlighting** - Beautiful code blocks
- ✅ **Responsive Design** - Mobile-first, 30em/48em/62em breakpoints
- ✅ **Accessibility** - WCAG 2.1 AA compliant, Axe tested
- ✅ **SEO Optimized** - Open Graph, Twitter Cards, sitemap, robots.txt
- ✅ **Performance** - <2s load on 3G, 90+ Lighthouse score

---

## Deployment

### Quick Deploy to Cloudflare Pages

**Prerequisites**: Cloudflare account (free tier)

**Steps**:
1. Follow [DEPLOYMENT-QUICKSTART.md](../DEPLOYMENT-QUICKSTART.md)
2. Configure build settings:
   - Build command: `bun run website:build`
   - Output directory: `website/dist`
3. Deploy and verify

**Time**: 15-20 minutes for first-time setup

### Post-Deployment Verification

```bash
# Run automated verification
bun run website:verify https://your-url.pages.dev

# Expected output:
# ✅ All deployment verification tests passed!
```

---

## Documentation

### User Documentation

User-facing documentation is synced from the main repo's `/docs` directory:

```bash
bun run website:sync
```

**Documentation Structure**:
- `docs/getting-started/` - Installation, quick start
- `docs/commands/` - Command reference
- `docs/core-concepts/` - Core concepts, workflow
- `docs/examples/` - Examples and tutorials

### Developer Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Comprehensive deployment guide
- **[PHASE9-STATUS.md](PHASE9-STATUS.md)** - Phase 9 implementation status
- **[README-DEPLOYMENT.md](README-DEPLOYMENT.md)** - Deployment overview

---

## Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Lighthouse Performance | 90+ | Run after deployment |
| Lighthouse Accessibility | 95+ | Run after deployment |
| Load Time (3G) | <2s | Run after deployment |
| Total Page Weight | <500KB | Run after deployment |
| JavaScript Bundle | <10KB | ✅ ~5KB (theme + clipboard) |

**Verify**: `bun run website:verify <url>` + Chrome DevTools → Lighthouse

---

## Architecture Decisions

### Why Astro?
- Zero JavaScript by default (only ship JS where needed)
- Fast build times with Bun
- File-based routing
- Built-in content collections
- Excellent Cloudflare Pages integration

### Why Cloudflare Pages?
- Free tier (500 builds/month, 100GB bandwidth)
- Global CDN with edge caching
- Automatic HTTPS
- GitHub integration for auto-deploy
- Preview deployments for PRs

### Why View Transitions?
- SPA-like navigation without full framework
- Native browser API (with polyfill)
- Smooth page transitions
- Prevents sidebar re-render
- Small bundle size (~15KB)

---

## Tech Stack

**Framework**: Astro 5.15.8
**Runtime**: Bun 1.0+
**Styling**: CSS custom properties, responsive design
**Syntax Highlighting**: Shiki 3.15.0
**Testing**: Playwright (visual), Axe-core (accessibility)
**Deployment**: Cloudflare Pages
**Analytics**: Cloudflare Web Analytics (optional)

---

## Contributing

### Adding New Pages

1. Create `.astro` file in `src/pages/`
2. Use appropriate layout (BaseLayout, DocsLayout)
3. Add to navigation if needed
4. Test locally: `bun run website:dev`

### Adding Documentation

Documentation is synced from main repo's `/docs` directory. To add new docs:

1. Edit files in main repo's `/docs` directory
2. Run `bun run website:sync` to update
3. Verify locally
4. Commit and push (webhook triggers rebuild)

### Running Tests

```bash
# Visual regression tests
bun run test:visual

# Accessibility tests
bun run test:a11y

# All tests
bun run test:all
```

---

## Support

**Deployment Issues**: See [DEPLOYMENT.md#troubleshooting](DEPLOYMENT.md#troubleshooting)
**Build Failures**: Check Cloudflare Pages build logs
**Performance**: Run verification script and Lighthouse audit

**External Resources**:
- [Astro Documentation](https://docs.astro.build)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare Discord](https://discord.cloudflare.com)

---

## License

MIT - See repository root for license file

---

**Project Status**: ✅ Ready for production deployment
**Next Step**: Deploy to Cloudflare Pages → See [DEPLOYMENT-QUICKSTART.md](../DEPLOYMENT-QUICKSTART.md)
