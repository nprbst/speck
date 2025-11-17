# Research: Speck Public Website

**Phase**: 0 (Outline & Research)
**Date**: 2025-11-15
**Purpose**: Resolve technical unknowns and establish best practices for static website implementation

## Research Topics

### 1. Testing Strategy for Static Sites

**Decision**: Multi-layer testing approach with unit tests for build scripts, visual regression for UI consistency, and automated accessibility audits

**Rationale**:
- **Build Script Unit Tests**: The `sync-docs.ts` script is critical infrastructure (single source of truth for documentation). Use Bun's built-in test runner to verify Git sparse checkout logic, file copying, error handling, and edge cases (missing repo, network failures).
- **Visual Regression**: Since design consistency is a key requirement (matching hono.dev + claude.com aesthetics), use Playwright with screenshot comparison to catch unintended visual changes across homepage, docs, and comparison pages. Test at mobile/tablet/desktop breakpoints.
- **Accessibility Tests**: With SC-010 requiring 95+ Lighthouse accessibility score, integrate Axe-core with Playwright to automatically audit WCAG 2.1 AA compliance on all pages. Test keyboard navigation, ARIA labels, heading hierarchy, color contrast.
- **Manual Performance Testing**: Use Lighthouse CI in GitHub Actions to enforce <2s load time on 3G, mobile usability 95+. Fail builds if budgets violated.

**Alternatives Considered**:
- **End-to-End Tests (rejected)**: No user interactions to test (static site, no forms/login). E2E would be overkill.
- **Snapshot Tests (rejected for markup)**: HTML snapshots are brittle for static sites that change frequently. Visual regression is more maintainable.
- **Storybook (deferred)**: Component isolation useful but not MVP-critical. Can add later if component library grows.

**Implementation**:
```typescript
// tests/build/sync-docs.test.ts
import { test, expect } from 'bun:test';
import { syncDocs } from '../../website/scripts/sync-docs';

test('syncDocs clones only /docs from main repo', async () => {
  const result = await syncDocs({ dryRun: true });
  expect(result.filesCloned).toContain('docs/getting-started.md');
  expect(result.filesCloned).not.toContain('src/');
});

// tests/visual/homepage.spec.ts (Playwright)
import { test, expect } from '@playwright/test';

test('homepage matches design at 1920x1080', async ({ page }) => {
  await page.goto('http://localhost:4321');
  await expect(page).toHaveScreenshot('homepage-desktop.png', { fullPage: true });
});

// tests/accessibility/pages.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage has no accessibility violations', async ({ page }) => {
  await page.goto('http://localhost:4321');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

---

### 2. Astro Content Collections Best Practices

**Decision**: Use Astro Content Collections with Zod schema validation for documentation, with frontmatter for metadata (title, order, category)

**Rationale**:
- Content Collections provide type-safe markdown access, automatic sorting, and filtering without manual file globbing
- Zod schema ensures consistent frontmatter across all docs (prevents missing titles, invalid categories)
- Built-in syntax highlighting via Shiki (faster than Prism, better TypeScript support)
- File-based structure allows easy sync from main repo without database

**Implementation Pattern**:
```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const docsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['getting-started', 'commands', 'concepts', 'examples']),
    order: z.number().int().positive(), // For sidebar ordering
    lastUpdated: z.date().optional(),
  }),
});

export const collections = {
  docs: docsCollection,
};

// Usage in pages/docs/[...slug].astro
import { getCollection } from 'astro:content';

const docs = await getCollection('docs', ({ data }) => data.category === 'getting-started');
const sortedDocs = docs.sort((a, b) => a.data.order - b.data.order);
```

**Alternatives Considered**:
- **MDX (rejected for MVP)**: Adds complexity with React components in markdown. Not needed for simple docs.
- **Manual markdown parsing (rejected)**: Content Collections handle frontmatter, syntax highlighting, and type safety automatically.

---

### 3. Dark Mode Implementation Strategy

**Decision**: CSS custom properties with `prefers-color-scheme` media query, localStorage for manual override, no JavaScript flash on load

**Rationale**:
- System preference respected by default (`prefers-color-scheme: dark`)
- Manual toggle persists preference in localStorage
- Inline script in `<head>` prevents FOUC (flash of unstyled content) before page hydration
- CSS variables allow theme switching without class toggling on every element

**Implementation Pattern**:
```css
/* src/styles/theme.css */
:root {
  /* Light mode (fallback) */
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-accent: #e34234;
  --color-border: #e0e0e0;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode palette inspired by claude.com */
    --color-bg: #1a1a1a;
    --color-text: #e8e6e3;
    --color-accent: #d4a574; /* clay accent */
    --color-border: #2a2a2a;
  }
}

[data-theme="light"] {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  /* ... */
}

[data-theme="dark"] {
  --color-bg: #1a1a1a;
  --color-text: #e8e6e3;
  /* ... */
}
```

```html
<!-- In BaseLayout.astro <head> -->
<script is:inline>
  // Run before page render to prevent flash
  const theme = localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
</script>
```

**Alternatives Considered**:
- **Tailwind dark mode (rejected)**: Adds build complexity and large CSS bundle. Custom properties are simpler.
- **JavaScript-only theme toggle (rejected)**: Causes FOUC and doesn't respect system preference.

---

### 3a. View Transitions for SPA-like Navigation

**Decision**: Use Astro's built-in View Transitions API for seamless page navigation without full reloads

**Rationale**:
- Eliminates full page reloads when navigating between documentation pages
- Prevents sidebar re-render and hover state flashing
- Provides smooth fade transitions between pages
- Native browser API (View Transitions API) with Astro polyfill for unsupported browsers
- Zero JavaScript required from developer (handled by Astro)
- Improves perceived performance significantly

**Implementation Pattern**:
```astro
---
// BaseLayout.astro
import { ViewTransitions } from 'astro:transitions';
---
<html>
  <head>
    <ViewTransitions />
  </head>
  <body>
    <slot />
  </body>
</html>
```

```astro
<!-- Sidebar.astro - persist across navigations -->
<aside class="sidebar" transition:persist>
  <nav class="sidebar-nav">
    <!-- navigation links -->
  </nav>
</aside>

<script>
  // Update active state on navigation
  document.addEventListener('astro:page-load', () => {
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(link => {
      const isActive = currentPath === link.getAttribute('href');
      link.classList.toggle('active', isActive);
    });
  });
</script>
```

```css
/* global.css - customize transition animations */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.2s;
}

@keyframes fade-out {
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
}
```

**Benefits**:
- **User Experience**: Smooth, app-like navigation
- **Performance**: Only content area re-renders, not entire page
- **Accessibility**: Respects `prefers-reduced-motion` automatically
- **SEO**: Still server-rendered, just enhanced with client-side routing
- **Bundle Size**: ~15KB for client router (included in Astro)

**Alternatives Considered**:
- **React/Vue islands (rejected)**: Overkill for simple navigation, adds framework overhead
- **Custom SPA router (rejected)**: Reinventing the wheel, Astro's solution is native and well-tested
- **No enhancement (rejected)**: Full page reloads create jarring UX, especially noticeable in docs navigation

**Browser Support**:
- Chrome 111+ (native View Transitions API)
- Firefox, Safari (Astro polyfill)
- Graceful degradation: Falls back to regular navigation if disabled

---

### 4. Cloudflare Pages Build Configuration

**Decision**: Use Cloudflare Pages GitHub integration with custom build command that runs doc sync, then Astro build

**Rationale**:
- Cloudflare Pages provides free automatic deployments on every push to `004-public-website` branch
- Custom build command allows running `bun scripts/sync-docs.ts` before `bun run build`
- Environment variable `MAIN_REPO_URL` set in Cloudflare dashboard for doc sync
- Preview deployments for PRs automatically generated

**Configuration**:
```bash
# Cloudflare Pages Build Settings
Build command: bun run website:build
Build output directory: website/dist
Root directory: /
Node version: 20 (use Bun via package.json script)

# package.json scripts
{
  "scripts": {
    "website:sync": "bun website/scripts/sync-docs.ts",
    "website:build": "bun website:sync && cd website && bun run build",
    "website:dev": "cd website && bun run dev"
  }
}

# Environment Variables (set in Cloudflare Pages dashboard)
MAIN_REPO_URL=https://github.com/nprbst/speck.git
DOCS_SOURCE_PATH=docs
```

**GitHub Webhook Setup**:
- In main Speck repo: Settings → Webhooks → Add webhook
- Payload URL: Cloudflare Pages build webhook URL (provided in CF dashboard)
- Trigger: Push events to `main` branch
- Effect: When docs updated in main repo, Cloudflare Pages rebuilds website automatically

**Alternatives Considered**:
- **Vercel (rejected)**: Similar features but Cloudflare has better global CDN and simpler image optimization
- **Netlify (rejected)**: More expensive for bandwidth, Cloudflare free tier more generous
- **Self-hosted (rejected)**: Adds maintenance burden, defeats simplicity goal

---

### 5. Performance Optimization Strategy

**Decision**: Multi-pronged approach with critical CSS inlining, lazy image loading, minimal JavaScript, and Cloudflare CDN caching

**Techniques**:
1. **Critical CSS Inlining**: Astro automatically inlines styles for above-the-fold content
2. **Image Optimization**:
   - SVG for icons/diagrams (inline in HTML for immediate render)
   - Cloudflare Images for raster images (automatic WebP/AVIF with PNG fallback)
   - `loading="lazy"` for below-the-fold images
3. **JavaScript Budget**:
   - No framework JavaScript shipped (Astro renders to static HTML)
   - Only ship JS for theme toggle (~1KB) and clipboard API (~500 bytes)
   - Use `<script is:inline>` for critical scripts, `type="module"` for defer
4. **Font Strategy**:
   - System font stack as default (no web fonts for MVP)
   - If custom fonts needed: self-host, preload, use `font-display: swap`
5. **CDN Caching**:
   - Cloudflare CDN caches static files at edge (117 global locations)
   - Set `Cache-Control: public, max-age=31536000, immutable` for hashed assets
   - Set `Cache-Control: public, max-age=3600` for HTML pages

**Performance Budgets** (enforced via Lighthouse CI):
- Total page weight: <500KB (compressed)
- JavaScript: <10KB (compressed)
- First Contentful Paint: <1.5s on 3G
- Cumulative Layout Shift: <0.1
- Time to Interactive: <3.5s on 3G

**Alternatives Considered**:
- **Service Worker (deferred)**: Offline support not MVP requirement, adds complexity
- **HTTP/2 Server Push (rejected)**: Cloudflare Pages doesn't support it, and modern browsers prefetch well enough

---

### 6. Documentation Sync Implementation Details

**Decision**: Git sparse checkout in Bun script with error handling, fallback to cached docs on failure

**Rationale**:
- Sparse checkout clones only `/docs` directory, not entire main repo (faster, smaller disk usage)
- Error handling prevents build failures if main repo unreachable (use cached docs from previous build)
- Bun Shell API provides clean Git command execution without spawning bash

**Implementation**:
```typescript
// website/scripts/sync-docs.ts
import { $ } from 'bun';
import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import { join } from 'path';

const MAIN_REPO_URL = process.env.MAIN_REPO_URL || 'https://github.com/nprbst/speck.git';
const DOCS_SOURCE_PATH = process.env.DOCS_SOURCE_PATH || 'docs';
const TEMP_DIR = join(import.meta.dir, '../../.temp-docs-clone');
const TARGET_DIR = join(import.meta.dir, '../src/content/docs');

async function syncDocs() {
  try {
    // Clean temp directory
    if (existsSync(TEMP_DIR)) rmSync(TEMP_DIR, { recursive: true });
    mkdirSync(TEMP_DIR, { recursive: true });

    // Sparse checkout of /docs only
    await $`git clone --depth 1 --filter=blob:none --sparse ${MAIN_REPO_URL} ${TEMP_DIR}`;
    await $`cd ${TEMP_DIR} && git sparse-checkout set ${DOCS_SOURCE_PATH}`;

    // Copy docs to content directory
    const sourceDocsPath = join(TEMP_DIR, DOCS_SOURCE_PATH);
    if (existsSync(sourceDocsPath)) {
      if (existsSync(TARGET_DIR)) rmSync(TARGET_DIR, { recursive: true });
      cpSync(sourceDocsPath, TARGET_DIR, { recursive: true });
      console.log(`✅ Synced docs from ${MAIN_REPO_URL}/${DOCS_SOURCE_PATH}`);
    } else {
      throw new Error(`Docs path ${DOCS_SOURCE_PATH} not found in repo`);
    }

    // Cleanup
    rmSync(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.warn(`⚠️  Failed to sync docs from main repo: ${error.message}`);
    console.warn('📦 Using cached documentation from previous build');

    // If no cached docs exist, fail build
    if (!existsSync(TARGET_DIR)) {
      throw new Error('No cached docs available and sync failed. Cannot build.');
    }
  }
}

await syncDocs();
```

**Error Scenarios Handled**:
- Main repo unreachable (network failure): Use cached docs
- `/docs` path doesn't exist in main repo: Fail build with clear error
- Git not installed: Fail build with installation instructions
- No cached docs + sync failure: Fail build (cannot proceed without docs)

---

### 7. Accessibility Implementation Checklist

**Decision**: Follow WCAG 2.1 AA guidelines with automated testing via Axe-core and manual keyboard navigation testing

**Requirements** (to meet SC-010: Lighthouse a11y score 95+):

1. **Semantic HTML**:
   - Use `<nav>`, `<main>`, `<article>`, `<aside>` for structure
   - Heading hierarchy: single `<h1>` per page, no skipped levels
   - `<button>` for interactive elements (not `<div onclick>`)

2. **Keyboard Navigation**:
   - All interactive elements focusable via Tab
   - Skip-to-content link for screen readers
   - Focus visible styles (outline on `:focus-visible`)
   - No keyboard traps

3. **ARIA Labels**:
   - `aria-label` for icon-only buttons (theme toggle, mobile menu)
   - `aria-expanded` for collapsible navigation
   - `aria-current="page"` for active navigation link

4. **Color Contrast**:
   - Text: 4.5:1 minimum (7:1 for AAA)
   - UI components: 3:1 minimum
   - Test with WebAIM Contrast Checker

5. **Responsive Text**:
   - Zoom to 200% without horizontal scrolling
   - Use `rem` units (not `px`) for font sizes

6. **Alt Text**:
   - Descriptive alt text for all images
   - Empty `alt=""` for decorative images

**Testing Process**:
```bash
# Automated accessibility audit (run in CI)
bunx playwright test tests/accessibility/

# Manual testing checklist
1. Tab through entire page (skip-to-content → nav → main content → footer)
2. Use site with screen reader (VoiceOver on macOS, NVDA on Windows)
3. Zoom to 200% and verify no content hidden
4. Toggle dark mode and verify contrast still passes
```

**WCAG 2.1 AA Compliance Scope**:

Per spec.md Assumption A9, targeting WCAG 2.1 AA with pragmatic flexibility. The following criteria apply:

✅ **Included** (strictly enforced):
- 1.4.3 Contrast (Minimum) - 4.5:1 for text, 3:1 for UI components
- 2.1.1 Keyboard - All functionality via keyboard
- 2.4.1 Bypass Blocks - Skip-to-content link
- 2.4.6 Headings and Labels - Descriptive headings
- 3.1.1 Language of Page - `lang="en"` on `<html>`
- 4.1.2 Name, Role, Value - Proper ARIA labels

⚠️ **Excluded** (acceptable to fall short if overly burdensome):
- 1.2.2 Captions (Prerecorded) - No video content in MVP
- 1.2.3 Audio Description - No video content in MVP
- 2.2.1 Timing Adjustable - No timed interactions
- 2.2.2 Pause, Stop, Hide - No auto-playing content

**Definition of "overly burdensome"**: Implementation would require >8 hours of work OR introduce dependency on paid service OR significantly degrade performance (<80 Lighthouse score).

**Validation**: Run Axe-core audits. If violations found in Excluded criteria, document rationale. If violations in Included criteria, fix immediately.

**Alternatives Considered**:
- **Manual-only testing (rejected)**: Not scalable, easy to miss regressions
- **WAVE browser extension (supplementary)**: Good for spot-checks but doesn't integrate into CI

---

## Summary of Decisions

| Topic | Decision | Primary Rationale |
|-------|----------|-------------------|
| Testing | Unit (Bun) + Visual Regression (Playwright) + A11y (Axe) | Matches static site needs: script reliability, design consistency, WCAG compliance |
| Content Collections | Astro Content Collections with Zod | Type safety, automatic sorting, built-in syntax highlighting |
| Dark Mode | CSS custom properties + localStorage | No FOUC, respects system preference, simple implementation |
| Deployment | Cloudflare Pages with custom build command | Free tier, global CDN, automatic GitHub integration |
| Performance | Critical CSS inlining + lazy images + minimal JS | Achieves <2s 3G load time budget |
| Doc Sync | Git sparse checkout in Bun script | Fast, reliable, handles errors gracefully |
| Accessibility | WCAG 2.1 AA + automated Axe testing | Meets 95+ Lighthouse score requirement |

---

## Unresolved Items

*None*. All "NEEDS CLARIFICATION" items from Technical Context resolved.

---

## Next Steps

Proceed to **Phase 1: Design & Contracts** to generate:
1. `data-model.md` - Page structure and content types
2. `contracts/` - Component API contracts (Astro component props)
3. `quickstart.md` - Developer setup guide for working on website
