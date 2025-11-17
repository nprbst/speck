# Implementation Plan: Speck Public Website

**Branch**: `004-public-website` | **Date**: 2025-11-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-public-website/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a static marketing and documentation website for Speck that blends the aesthetic of hono.dev (minimalist, developer-focused) with claude.com/product/claude-code (dark mode palette, sophisticated animations). The site will be deployed to Cloudflare Pages, source documentation from the main Speck repository via build-time sync, and achieve <2s load time on 3G connections. Primary goals: communicate Speck's value proposition (90%+ comprehension), enable developers to install and run their first command in <10 minutes, and provide comprehensive documentation with comparison to spec-kit.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Bun 1.0+ runtime for build scripts
**Primary Dependencies**: Astro 4.x (static site generator with View Transitions API), Cloudflare Images (image optimization), Shiki (syntax highlighting, chosen for better TypeScript support over Prism)
**Storage**: N/A (static files only, no database)
**Testing**: Bun test runner (unit tests for build scripts), Playwright (visual regression tests with screenshot comparison), Axe-core (accessibility testing via Playwright), Lighthouse CI (performance budgets)
**Target Platform**: Static files deployed to Cloudflare Pages, modern browsers (Chrome/Edge 90+, Firefox 88+, Safari 14+)
**Navigation**: SPA-like page transitions using Astro View Transitions (native API in Chrome 111+, polyfill for other browsers)
**Project Type**: Web (static marketing + documentation site)
**Performance Goals**: <2s core content load on 3G (Lighthouse/WebPageTest), Lighthouse accessibility score 95+, mobile usability score 95+
**Constraints**: Monthly hosting cost <$5 (Cloudflare Pages free tier), JavaScript-disabled graceful degradation, responsive at 30em/48em/62em breakpoints
**Scale/Scope**: ~10-15 pages (homepage, 4-6 docs sections, comparison, installation, examples), documentation auto-sync from main repo via webhook, support up to 10k monthly visitors on free tier

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution**: `.specify/memory/constitution.md` (v1.1.0)

Applying relevant constitutional principles to this feature:

### Pre-Research Gates

✅ **Simplicity Gate**: Static-only approach with no backend services, databases, or authentication. Minimal dependencies (Astro + syntax highlighter).
✅ **Performance Gate**: Explicit performance budgets defined (<2s load, 95+ Lighthouse scores). SVG-first for icons, responsive image formats, Cloudflare CDN.
✅ **Cost Gate**: Cloudflare Pages free tier (<$5/month for 10k visitors). No paid services required for MVP.
✅ **Maintainability Gate**: Single source of truth for docs (main repo), automated sync via webhook. Standard Astro project structure.

**Status**: All gates pass. Proceeding to Phase 0 research.

### Post-Design Re-Check

**Completed**: 2025-11-15 after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md)

✅ **Simplicity Gate**: Design maintains static-only architecture. No new backend services introduced. Components are simple Astro files with minimal client-side JavaScript (theme toggle + clipboard API only).

✅ **Performance Gate**: Design includes specific optimizations:
- SVG-first approach for icons (inline in HTML, no HTTP requests)
- Critical CSS inlining (Astro default behavior)
- JavaScript budget: <10KB total (theme.js ~1KB, clipboard.js ~500 bytes)
- Lazy image loading for below-the-fold content
- Cloudflare CDN edge caching

✅ **Cost Gate**: Design stays within free tier limits:
- Cloudflare Pages: Free (500 builds/month, website uses ~30-50/month max)
- Cloudflare Images: Free tier or minimal cost (primarily uses SVG, not raster images)
- GitHub Actions: Free (Lighthouse CI tests on PR merges only)

✅ **Maintainability Gate**: Design improves maintainability:
- Single source of truth for docs (main repo, synced via build script)
- Type-safe component contracts (TypeScript interfaces in contracts/)
- Automated tests (unit, visual regression, accessibility)
- Clear separation: content (markdown), components (Astro), styles (CSS)

**Final Status**: All gates pass. Design adheres to simplicity principles and established constraints.

**Phase 1 Complete**: Ready to proceed to Phase 2 (task generation via `/speck.tasks`)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
website/                           # Astro static site project
├── src/
│   ├── components/                # Reusable UI components
│   │   ├── Navigation.astro       # Header, sidebar, mobile menu
│   │   ├── CodeBlock.astro        # Syntax-highlighted code with copy button
│   │   ├── ThemeToggle.astro      # Dark/light mode switcher
│   │   └── FeatureCard.astro      # Homepage feature highlights
│   ├── content/                   # Astro content collections
│   │   ├── docs/                  # Documentation markdown (synced from main repo)
│   │   └── config.ts              # Content collection schema
│   ├── layouts/                   # Page layouts
│   │   ├── BaseLayout.astro       # Common HTML structure, meta tags
│   │   ├── DocsLayout.astro       # Documentation with sidebar
│   │   └── HomeLayout.astro       # Homepage layout
│   ├── pages/                     # Route pages (file-based routing)
│   │   ├── index.astro            # Homepage
│   │   ├── docs/[...slug].astro   # Dynamic docs routes
│   │   ├── comparison.astro       # Speck vs Spec-Kit comparison
│   │   └── 404.astro              # Error page
│   └── styles/                    # Global styles, theme CSS
│       ├── global.css             # Base styles, CSS variables
│       └── theme.css              # Dark/light mode palette
├── public/                        # Static assets (copied as-is)
│   ├── images/                    # SVG icons, logo
│   └── fonts/                     # Web fonts (if needed)
├── scripts/                       # Build-time scripts
│   └── sync-docs.ts               # Bun script: copy docs from repository /docs directory
└── astro.config.mjs               # Astro configuration

tests/                             # Test suite
├── build/                         # Build script tests
│   └── sync-docs.test.ts          # Test doc sync logic
├── visual/                        # Visual regression tests (Playwright)
│   └── homepage.spec.ts           # Screenshot comparison tests
└── accessibility/                 # a11y tests
    └── pages.spec.ts              # Axe-core accessibility tests
```

**Structure Decision**: Standard Astro static site structure with content collections for documentation. Build-time `scripts/sync-docs.ts` runs during Cloudflare Pages build to copy files from repository's `/docs` directory to `src/content/docs/`. Monorepo structure eliminates need for Git operations. File-based routing in `pages/` directory. Component-based UI with `.astro` files for zero-JS-by-default rendering.

## Complexity Tracking

No constitution violations. All gates pass without justification needed.

---

## Phase Summary

### Phase 0: Research (Complete)

**Output**: [research.md](research.md)

**Key Decisions**:
1. **Testing Strategy**: Multi-layer approach (Bun unit tests, Playwright visual regression, Axe-core accessibility, Lighthouse CI performance)
2. **Content Collections**: Astro Content Collections with Zod schema validation
3. **Dark Mode**: CSS custom properties with localStorage persistence, no FOUC
4. **Deployment**: Cloudflare Pages with custom build command, GitHub webhook integration
5. **Performance**: SVG-first, critical CSS inlining, <10KB JavaScript budget
6. **Doc Sync**: Direct filesystem copy from `/docs` directory in Bun script with error handling and fallback
7. **Accessibility**: WCAG 2.1 AA compliance, automated Axe testing

### Phase 1: Design & Contracts (Complete)

**Outputs**:
- [data-model.md](data-model.md) - Content types, page structures, component data schemas
- [contracts/](contracts/) - TypeScript API contracts for all components and build scripts
  - `components.ts` - Component prop interfaces, page data models, SEO metadata
  - `build-scripts.ts` - Build script APIs, environment variables, performance budgets
  - `README.md` - Contract usage guide and validation rules
- [quickstart.md](quickstart.md) - Developer setup guide (target: <10 minutes to first build)

**Key Artifacts**:
- 4 core components defined: Navigation, CodeBlock, ThemeToggle, FeatureCard
- 3 page types: Homepage, Documentation, Comparison
- 1 content collection: Documentation (Zod validated)
- Build script contract: `syncDocs()` with error handling and caching
- Performance budgets: <500KB page weight, <10KB JS, <2s FCP on 3G

### Phase 2: Task Generation (Next)

Run `/speck.tasks` to generate dependency-ordered implementation tasks.

**Expected task categories**:
1. Project setup (Astro init, dependencies, configuration)
2. Build infrastructure (doc sync script, Cloudflare Pages config, webhooks)
3. Core components (Navigation, CodeBlock, ThemeToggle, FeatureCard)
4. Page layouts (BaseLayout, DocsLayout, HomeLayout)
5. Pages (Homepage, docs routes, comparison page, 404)
6. Styling (theme CSS, global styles, responsive breakpoints)
7. Content collections (schema, validation, doc frontmatter)
8. Testing (unit tests, visual regression, accessibility, Lighthouse CI)
9. Deployment (Cloudflare Pages setup, environment variables, domain config)

---

## References

- **Feature Spec**: [spec.md](spec.md)
- **Technical Research**: [research.md](research.md)
- **Data Model**: [data-model.md](data-model.md)
- **API Contracts**: [contracts/](contracts/)
- **Developer Guide**: [quickstart.md](quickstart.md)

---

**Planning Complete**: 2025-11-15
**Next Command**: `/speck.tasks` to generate implementation task breakdown
