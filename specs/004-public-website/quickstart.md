# Developer Quick Start: Speck Public Website

**Phase**: 1 (Design & Contracts)
**Date**: 2025-11-15
**Audience**: Developers setting up the website project locally

## Overview

This guide will help you set up the Speck public website development environment and run your first local build in **under 10 minutes**.

---

## Prerequisites

Before starting, ensure you have:

- **Bun 1.0+** - JavaScript runtime and package manager
- **Git 2.30+** - Version control
- **Node.js 20+** - Required by some Astro dependencies (even though we use Bun)
- **Modern browser** - Chrome 90+, Firefox 88+, or Safari 14+

### Installing Prerequisites

**macOS/Linux**:
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Node.js (via nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Verify installations
bun --version    # Should show 1.0.0 or higher
node --version   # Should show v20.x.x
git --version    # Should show 2.30.0 or higher
```

**Windows**:
```powershell
# Install Bun (PowerShell)
irm bun.sh/install.ps1 | iex

# Install Node.js from https://nodejs.org (download LTS version)

# Verify installations (in new terminal)
bun --version
node --version
git --version
```

---

## Project Setup

### 1. Clone the Repository

```bash
# Clone the Speck repository (replace with actual URL when available)
git clone https://github.com/nprbst/speck-004-public-website.git
cd speck-004-public-website

# Switch to the website feature branch
git checkout 004-public-website
```

### 2. Install Dependencies

```bash
# Install all project dependencies
bun install

# This installs:
# - Astro 4.x (static site generator)
# - Syntax highlighter (Shiki or Prism)
# - Playwright (for visual regression tests)
# - Axe-core (for accessibility tests)
```

Expected output:
```
bun install v1.x.x
 + astro@4.x.x
 + @astrojs/content@x.x.x
 [... other dependencies ...]

 150 packages installed [2.5s]
```

### 3. Set Up Environment Variables

```bash
# Create .env file for local development
cat > .env <<EOF
# Main Speck repository URL (for syncing docs)
MAIN_REPO_URL=https://github.com/nprbst/speck.git

# Path to docs in main repo
DOCS_SOURCE_PATH=docs
EOF
```

**Note**: `.env` is gitignored. For production (Cloudflare Pages), these are set in the dashboard.

### 4. Initial Documentation Sync

```bash
# Sync documentation from main Speck repo
bun run website:sync

# Expected output:
# ✅ Synced docs from https://github.com/nprbst/speck.git/docs
# 📄 Copied 12 files to src/content/docs/
```

**What this does**:
- Clones `/docs` directory from main Speck repo using Git sparse checkout
- Copies markdown files to `website/src/content/docs/`
- Validates frontmatter against Zod schema

---

## Development Workflow

### Running the Dev Server

```bash
# Start Astro dev server with hot reload
bun run website:dev

# Server starts at http://localhost:4321
```

Expected output:
```
🚀 astro v4.x.x started in XXms

  ┃ Local    http://localhost:4321/
  ┃ Network  use --host to expose

watching for file changes...
```

**Navigate to**: http://localhost:4321

You should see the Speck homepage with:
- Hero section
- Feature cards
- Navigation header
- Dark mode (default)

### Making Changes

The dev server **auto-reloads** when you edit:

- **Content**: `website/src/content/docs/*.md` → Refresh page to see changes
- **Components**: `website/src/components/*.astro` → Auto-reloads
- **Pages**: `website/src/pages/*.astro` → Auto-reloads
- **Styles**: `website/src/styles/*.css` → Auto-reloads

**Example: Edit the homepage**

```bash
# Open homepage in your editor
code website/src/pages/index.astro

# Change the hero headline (around line 10)
# Save the file → Browser auto-refreshes
```

---

## Project Structure

```text
speck-004-public-website/
├── specs/004-public-website/    # Feature specification & planning docs
│   ├── spec.md                  # Feature requirements
│   ├── plan.md                  # Implementation plan (this workflow)
│   ├── research.md              # Phase 0 research decisions
│   ├── data-model.md            # Phase 1 data models
│   ├── contracts/               # TypeScript API contracts
│   └── quickstart.md            # This file
│
├── website/                     # Astro static site project
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── Navigation.astro
│   │   │   ├── CodeBlock.astro
│   │   │   ├── ThemeToggle.astro
│   │   │   └── FeatureCard.astro
│   │   ├── content/             # Astro content collections
│   │   │   ├── docs/            # Documentation (synced from main repo)
│   │   │   └── config.ts        # Content schema (Zod validation)
│   │   ├── layouts/
│   │   │   ├── BaseLayout.astro # Base HTML structure
│   │   │   ├── DocsLayout.astro # Docs with sidebar
│   │   │   └── HomeLayout.astro # Homepage layout
│   │   ├── pages/               # File-based routing
│   │   │   ├── index.astro      # Homepage (/)
│   │   │   ├── docs/[...slug].astro  # Docs pages (/docs/*)
│   │   │   ├── comparison.astro # Comparison page (/comparison)
│   │   │   └── 404.astro        # 404 error page
│   │   └── styles/
│   │       ├── global.css       # Base styles, resets
│   │       └── theme.css        # Dark/light mode palette
│   ├── public/                  # Static assets (copied as-is)
│   │   ├── images/              # SVG icons, logo
│   │   └── fonts/               # Web fonts (if needed)
│   ├── scripts/
│   │   └── sync-docs.ts         # Doc sync script (Bun)
│   ├── astro.config.mjs         # Astro configuration
│   ├── package.json             # Dependencies & scripts
│   └── tsconfig.json            # TypeScript config
│
└── tests/                       # Test suite
    ├── build/
    │   └── sync-docs.test.ts    # Unit tests for doc sync
    ├── visual/
    │   └── homepage.spec.ts     # Visual regression tests
    └── accessibility/
        └── pages.spec.ts        # Accessibility tests (Axe)
```

---

## Common Tasks

### Sync Documentation from Main Repo

```bash
# Re-sync docs (e.g., after main repo updates)
bun run website:sync

# Dev server will auto-reload with new docs
```

### Build for Production

```bash
# Build static site (outputs to website/dist/)
bun run website:build

# Preview production build locally
bun run website:preview
# Server starts at http://localhost:4321
```

### Run Tests

```bash
# Run all tests
bun test

# Run specific test suites
bun test tests/build/           # Unit tests for build scripts
bun test tests/visual/          # Visual regression tests (Playwright)
bun test tests/accessibility/   # Accessibility tests (Axe-core)
```

### Type Checking

```bash
# Check TypeScript types without building
bun run typecheck

# Should show:
# ✓ Type checking complete (0 errors)
```

### Linting & Formatting

```bash
# Lint code (ESLint)
bun run lint

# Format code (Prettier)
bun run format

# Fix auto-fixable issues
bun run lint:fix
```

---

## Dark Mode Testing

The site defaults to **dark mode** with manual toggle support.

### Test Dark Mode Behavior

1. **System Preference** (default):
   - Open site in fresh browser (no localStorage)
   - Should respect system `prefers-color-scheme` setting
   - Toggle system dark mode → Site follows

2. **Manual Override**:
   - Click theme toggle in header
   - Preference saved to `localStorage`
   - Refresh page → Theme persists

3. **No JavaScript Flash**:
   - Disable cache, hard refresh
   - Should NOT see light mode flash before dark mode loads
   - (Inline `<script>` in `<head>` prevents FOUC)

### Inspect Theme Styles

```bash
# Open browser DevTools
# Elements tab → <html data-theme="dark">

# Console:
localStorage.getItem('speck-theme')
// Should show: {"theme":"dark","timestamp":...}
```

---

## Troubleshooting

### Dev Server Not Starting

**Symptom**: `bun run website:dev` fails with port conflict

```bash
# Kill process on port 4321
lsof -ti:4321 | xargs kill -9

# Or use a different port
bun run website:dev --port 3000
```

### Documentation Not Syncing

**Symptom**: `bun run website:sync` fails or no files copied

**Check**:
1. **Environment variable**: Is `MAIN_REPO_URL` set in `.env`?
   ```bash
   cat .env | grep MAIN_REPO_URL
   ```

2. **Network access**: Can you reach the main repo?
   ```bash
   git ls-remote $MAIN_REPO_URL
   ```

3. **Git installed**:
   ```bash
   which git
   git --version
   ```

**Solution**:
```bash
# Re-create .env file with correct URL
echo "MAIN_REPO_URL=https://github.com/nprbst/speck.git" > .env

# Retry sync
bun run website:sync
```

### Build Fails with Zod Validation Error

**Symptom**: `astro build` fails with "Invalid frontmatter" error

**Cause**: Documentation markdown files have invalid frontmatter (e.g., missing `title`, invalid `category`)

**Solution**:
1. Check error message for file path and invalid field
2. Open the file in `website/src/content/docs/`
3. Fix frontmatter to match schema:
   ```yaml
   ---
   title: "Page Title"
   description: "Short description"
   category: "getting-started"  # Must be valid category
   order: 1
   ---
   ```

### TypeScript Errors in Components

**Symptom**: `bun run typecheck` shows errors

**Cause**: Component props don't match contract interfaces

**Solution**:
1. Check contract in `specs/004-public-website/contracts/components.ts`
2. Update component props to match interface
3. Re-run `bun run typecheck`

### Visual Regression Test Failures

**Symptom**: `bun test tests/visual/` fails with "Screenshot mismatch"

**Cause**: Intentional visual change, or browser rendering difference

**Solution**:
```bash
# Update baseline screenshots (after verifying change is intentional)
bun test tests/visual/ --update-snapshots

# Re-run tests (should pass now)
bun test tests/visual/
```

---

## Performance Testing

### Lighthouse CI (Local)

```bash
# Build production site
bun run website:build

# Run Lighthouse audit
bunx lighthouse http://localhost:4321 \
  --output html \
  --output-path ./lighthouse-report.html \
  --throttling.cpuSlowdownMultiplier=4 \
  --emulated-form-factor=mobile

# Open report in browser
open lighthouse-report.html
```

**Expected scores**:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+

### Check Performance Budgets

```bash
# Run Lighthouse CI with budgets
bunx lhci autorun --config=lighthouserc.json

# Fails build if budgets exceeded (configured in lighthouserc.json)
```

---

## Deployment Preview

The website will deploy to **Cloudflare Pages** automatically when pushed to the `004-public-website` branch.

### Local Cloudflare Pages Emulation

```bash
# Install Wrangler CLI
bun add -D wrangler

# Run local Cloudflare Pages dev server
bunx wrangler pages dev website/dist

# Server starts at http://localhost:8788
```

---

## Next Steps

After setting up:

1. **Read the spec**: Review `specs/004-public-website/spec.md` for requirements
2. **Check contracts**: Browse `specs/004-public-website/contracts/` for component APIs
3. **Implement components**: Start with `Navigation.astro` or `CodeBlock.astro`
4. **Write tests**: Add tests as you build components
5. **Run Phase 2**: Use `/speck.tasks` to generate implementation tasks

---

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run website:sync` | Sync docs from main repo |
| `bun run website:dev` | Start dev server (http://localhost:4321) |
| `bun run website:build` | Build for production (outputs to dist/) |
| `bun run website:preview` | Preview production build locally |
| `bun test` | Run all tests |
| `bun run typecheck` | Check TypeScript types |
| `bun run lint` | Lint code (ESLint) |
| `bun run format` | Format code (Prettier) |
| `bunx playwright test` | Run visual regression tests |
| `bunx lighthouse <url>` | Run Lighthouse audit |

---

## Getting Help

**Documentation Issues**:
- Check `specs/004-public-website/spec.md` for requirements
- Review `specs/004-public-website/research.md` for design decisions

**Build Errors**:
- Check Astro docs: https://docs.astro.build
- Search Bun docs: https://bun.sh/docs

**Component APIs**:
- Reference `specs/004-public-website/contracts/components.ts`

**Questions**:
- Open GitHub Discussion in main Speck repo
- Tag with `004-public-website` label

---

## Success Criteria

You've successfully set up the project when:

✅ Dev server runs at http://localhost:4321
✅ Homepage displays with dark mode
✅ Documentation syncs from main repo
✅ Type checking passes (`bun run typecheck`)
✅ All tests pass (`bun test`)
✅ Production build succeeds (`bun run website:build`)

**Time to completion**: Should take **under 10 minutes** with prerequisites installed.

---

**Last Updated**: 2025-11-15
**Next**: Proceed to `/speck.tasks` to generate implementation task breakdown
