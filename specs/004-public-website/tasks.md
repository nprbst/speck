# Tasks: Speck Public Website

**Input**: Design documents from `/specs/004-public-website/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: No tests requested in specification (focus on MVP delivery)

**Organization**: Tasks are organized by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1 = User Story 1, etc.)
- File paths included in task descriptions

## Path Conventions

- **Website Source**: `website/src/`
- **Components**: `website/src/components/`
- **Pages**: `website/src/pages/`
- **Layouts**: `website/src/layouts/`
- **Styles**: `website/src/styles/`
- **Content Collections**: `website/src/content/`
- **Build Scripts**: `website/scripts/`
- **Static Assets**: `website/public/`
- **Tests**: `tests/` (visual, accessibility, build scripts)
- **Configuration**: `website/astro.config.mjs`, `website/package.json`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, directory structure, and foundational configuration

- [ ] T001 Create `website/` directory with Astro project structure
- [ ] T002 [P] Initialize Astro 4.x project with `bun create astro@latest website` (use TypeScript, strict mode)
- [ ] T003 [P] Create `website/src/components/` directory for reusable UI components
- [ ] T004 [P] Create `website/src/layouts/` directory for page layouts
- [ ] T005 [P] Create `website/src/content/docs/` directory for documentation content collection
- [ ] T006 [P] Create `website/src/styles/` directory for global styles and theme CSS
- [ ] T007 [P] Create `website/public/images/` directory for SVG icons and static assets
- [ ] T008 [P] Create `website/scripts/` directory for build-time scripts
- [ ] T009 [P] Create `tests/build/` directory for build script unit tests
- [ ] T010 [P] Create `tests/visual/` directory for Playwright visual regression tests
- [ ] T011 [P] Create `tests/accessibility/` directory for Axe-core accessibility tests
- [ ] T012 Configure Astro in `website/astro.config.mjs` (enable content collections, set site URL, configure integrations)
- [ ] T013 Install dependencies in `website/package.json` (Astro, Shiki syntax highlighter, Bun test runner, Playwright, Axe-core)
- [ ] T014 [P] Configure TypeScript in `website/tsconfig.json` (strict mode, paths for `@/` alias)
- [ ] T015 [P] Create `.gitignore` entries for `website/dist/`, `website/.astro/`, `website/node_modules/`, `.temp-docs-clone/`
- [ ] T016 [P] Add npm scripts to root `package.json` (`website:sync`, `website:dev`, `website:build`, `website:preview`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure and shared utilities that ALL user story tasks depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Content Collection Schema & Build Scripts

- [ ] T017 Implement content collection schema in `website/src/content/config.ts` (Zod schema for docs with title, description, category, order, lastUpdated, tags)
- [ ] T018 Implement documentation sync script in `website/scripts/sync-docs.ts` (Git sparse checkout from main repo, copy to content/docs/, error handling with cached fallback)
- [ ] T019 Create `.env.example` file documenting required environment variables (MAIN_REPO_URL, DOCS_SOURCE_PATH)

### Base Layout & Global Styles

- [ ] T020 Implement BaseLayout in `website/src/layouts/BaseLayout.astro` (HTML structure, SEO metadata, theme script in head, global CSS import)
- [ ] T021 [P] Implement global CSS reset in `website/src/styles/global.css` (modern CSS reset, base typography, responsive breakpoints)
- [ ] T022 [P] Implement theme CSS variables in `website/src/styles/theme.css` (CSS custom properties for colors, dark/light mode with prefers-color-scheme, clay accent palette from claude.com)
- [ ] T023 Implement theme toggle inline script in BaseLayout head (prevent FOUC, read localStorage, set data-theme attribute)

**Checkpoint**: Foundation ready - content schema, build scripts, base layout, and theme system implemented - user story implementation can now begin

---

## Phase 3: User Story 1 - Discover Speck (Priority: P1) 🎯 MVP

**Goal**: A developer lands on speck.dev and immediately understands what Speck is, why it exists, and whether it's right for them—all within 30 seconds

**Independent Test**: Deploy homepage alone. Measure: Can a developer unfamiliar with Speck read the hero section and accurately describe what Speck does in their own words? Success = 90%+ comprehension.

### Core Components

- [ ] T024 [P] [US1] Implement Navigation component in `website/src/components/Navigation.astro` (header, logo, links, mobile hamburger menu at 768px breakpoint)
- [ ] T025 [P] [US1] Implement FeatureCard component in `website/src/components/FeatureCard.astro` (title, description, SVG icon, optional learn-more link)
- [ ] T026 [P] [US1] Implement ThemeToggle component in `website/src/components/ThemeToggle.astro` (dark/light toggle button, localStorage persistence, ARIA labels)

### Homepage Implementation

- [ ] T027 [US1] Implement HomeLayout in `website/src/layouts/HomeLayout.astro` (extends BaseLayout, homepage-specific structure)
- [ ] T028 [US1] Implement homepage in `website/src/pages/index.astro` (hero section with value prop, 3-4 feature cards, comparison preview, CTAs)
- [ ] T029 [US1] Add homepage content data in `website/src/pages/index.astro` (hero headline "Opinionated feature specs for Claude Code", subheadline, primary/secondary CTAs, feature highlights)
- [ ] T030 [US1] Create SVG icons for feature cards in `website/public/images/` (command-line icon, lightning icon for Bun, sync icon for upstream)
- [ ] T031 [US1] Create Speck logo SVG in `website/public/images/speck-logo.svg` (simple text-based logo acceptable for MVP)
- [ ] T032 [US1] Implement responsive homepage styles (30em mobile, 48em tablet, 62em desktop breakpoints, thumb-accessible CTAs)
- [ ] T033 [US1] Add SEO metadata to homepage (title "Speck - Opinionated Feature Specs for Claude Code", description, Open Graph tags, keywords)

**Checkpoint**: User Story 1 complete - homepage displays with hero, features, and navigation - independently testable at speck.dev/

---

## Phase 4: User Story 2 - Learn How to Use Speck (Priority: P2)

**Goal**: A developer navigates to documentation and quickly grasps the three-phase workflow (specify → plan → implement) with clear examples

**Independent Test**: Deploy docs section independently. Test: Can a developer read the "Getting Started" guide and correctly answer: "What are the three Speck commands and when do I use each?" Success = 85%+ accuracy.

### Documentation Components

- [ ] T034 [P] [US2] Implement CodeBlock component in `website/src/components/CodeBlock.astro` (Shiki syntax highlighting for bash/TypeScript/JSON, copy-to-clipboard button, line numbers, optional title)
- [ ] T035 [P] [US2] Implement Sidebar component for documentation navigation (hierarchical navigation by category, active page highlighting, collapsible sections)

### Documentation Layout & Routing

- [ ] T036 [US2] Implement DocsLayout in `website/src/layouts/DocsLayout.astro` (extends BaseLayout, sidebar navigation, breadcrumbs, table of contents from headings)
- [ ] T037 [US2] Implement dynamic docs page in `website/src/pages/docs/[...slug].astro` (getStaticPaths from content collection, render markdown, build sidebar from all docs)
- [ ] T038 [US2] Implement sidebar navigation logic in DocsLayout (group docs by category, sort by order, highlight active page)
- [ ] T039 [US2] Implement breadcrumb navigation in DocsLayout (Home → Category → Current Page)
- [ ] T040 [US2] Implement table of contents extraction from markdown headings (display h2/h3 headings with anchor links)

### Documentation Content (Placeholder)

- [ ] T041 [US2] Create placeholder "Quick Start" doc in `website/src/content/docs/getting-started/quick-start.md` (installation, first command, verification - content synced from main repo later)
- [ ] T042 [US2] Create placeholder "Commands Reference" doc in `website/src/content/docs/commands/reference.md` (list of /speck.* commands with syntax)
- [ ] T043 [US2] Create placeholder "Concepts" doc in `website/src/content/docs/concepts/workflow.md` (three-phase workflow diagram)
- [ ] T044 [US2] Create placeholder "Examples" doc in `website/src/content/docs/examples/first-feature.md` (walkthrough example)

### Documentation Styles & Interactions

- [ ] T045 [US2] Implement copy-to-clipboard functionality in CodeBlock component (Clipboard API with fallback message, success feedback)
- [ ] T046 [US2] Style documentation page layout (sidebar width, content max-width, mobile responsive with collapsible sidebar)
- [ ] T047 [US2] Add SEO metadata to docs pages (dynamic title from frontmatter, description, canonical URL)

**Checkpoint**: User Story 2 complete - documentation section with sidebar, code blocks, and navigation - independently testable

---

## Phase 5: User Story 3 - Compare Speck with Spec-Kit (Priority: P3)

**Goal**: A developer finds a dedicated comparison page that honestly explains the tradeoffs between Speck and spec-kit

**Independent Test**: Deploy comparison page standalone. Test: After reading, can a spec-kit user identify 2 reasons to switch and 1 reason not to? Success = 80%+ identification.

### Comparison Page Implementation

- [ ] T048 [US3] Implement comparison page in `website/src/pages/comparison.astro` (side-by-side comparison table, when to use each, migration guide)
- [ ] T049 [US3] Add comparison table data in comparison page (runtime: Bun vs Bash, command style: Claude-native vs generic, philosophy: opinionated vs flexible)
- [ ] T050 [US3] Add "When to Use Speck" section with bullet points (use Claude Code daily, want fast TypeScript builds, prefer opinionated workflows)
- [ ] T051 [US3] Add "When to Use Spec-Kit" section with honest caveats (need language-agnostic specs, constrained environments without Bun, maximum customization freedom)
- [ ] T052 [US3] Add migration guide section with step-by-step instructions (install prerequisites, clone Speck repo, run first command)
- [ ] T053 [US3] Style comparison table (responsive table layout, mobile card-based view, visual differentiators)
- [ ] T054 [US3] Add SEO metadata to comparison page (title "Speck vs Spec-Kit Comparison", description, keywords)

**Checkpoint**: User Story 3 complete - comparison page with honest tradeoff analysis - independently testable

---

## Phase 6: User Story 4 - Install and Set Up Speck (Priority: P1)

**Goal**: A developer follows installation instructions and successfully runs their first `/speck.specify` command within 5-10 minutes

**Independent Test**: Give installation docs to a developer unfamiliar with Speck. Measure time from "read docs" to "successful `/speck.specify` run." Success = 90%+ complete in under 10 minutes.

### Installation Documentation

- [ ] T055 [US4] Create installation guide doc in `website/src/content/docs/getting-started/installation.md` (prerequisites: Bun 1.0+, Git 2.30+, Claude Code, with version links)
- [ ] T056 [US4] Add setup steps to installation guide (clone repo, install dependencies, verify installation, run first command)
- [ ] T057 [US4] Add troubleshooting section to installation guide (Bun not in PATH, Claude Code not configured, permissions errors, common solutions)
- [ ] T058 [US4] Add verification command example to installation guide (example output confirming Speck is ready)
- [ ] T059 [US4] Create prerequisite check code examples in installation guide (bun --version, git --version, claude --version checks)

**Checkpoint**: User Story 4 complete - installation documentation with clear prerequisites and troubleshooting - validates full user journey from discovery to first command

---

## Phase 7: Edge Cases & Polish

**Purpose**: Handle edge cases, improve UX, and ensure graceful degradation

### Edge Case Handling

- [ ] T060 [P] Implement 404 error page in `website/src/pages/404.astro` (friendly message, link back to homepage, search suggestion)
- [ ] T061 [P] Implement "Coming Soon" placeholder for incomplete docs sections (message with link to GitHub discussions)
- [ ] T062 [P] Implement progressive loading for homepage (core content loads first, then images/animations)
- [ ] T063 [P] Add JavaScript-disabled fallback styles (navigation works without JS, code blocks show manual copy instruction)
- [ ] T064 [P] Implement mobile landscape header collapse (hamburger menu for narrow landscape screens)
- [ ] T065 [P] Add clipboard API unavailable fallback in CodeBlock (tooltip "Select and copy manually")
- [ ] T066 [P] Implement old browser fallback layout (single-column for browsers without CSS Grid support)

### Performance Optimization

- [ ] T067 [P] Optimize images (convert raster images to WebP/AVIF with PNG fallback, use Cloudflare Images)
- [ ] T068 [P] Implement lazy loading for below-the-fold images (loading="lazy" attribute)
- [ ] T069 [P] Inline critical CSS for above-the-fold content (Astro does this by default, verify in build output)
- [ ] T070 [P] Set up font strategy (system font stack initially, preload if custom fonts added later)
- [ ] T071 [P] Configure CDN cache headers in Cloudflare Pages (max-age for hashed assets, shorter for HTML)

### Accessibility Enhancements

- [ ] T072 [P] Add skip-to-content link in BaseLayout (hidden until focused, jumps to main content)
- [ ] T073 [P] Ensure all interactive elements have focus-visible styles (outline on keyboard focus)
- [ ] T074 [P] Add ARIA labels to icon-only buttons (theme toggle, mobile menu, copy button)
- [ ] T075 [P] Verify heading hierarchy across all pages (single h1, no skipped levels)
- [ ] T076 [P] Add aria-expanded to collapsible navigation elements (sidebar, mobile menu)
- [ ] T077 [P] Add aria-current="page" to active navigation links

### SEO & Social

- [ ] T078 [P] Create Open Graph image for social sharing in `website/public/images/og-image.png` (1200x630px, Speck branding)
- [ ] T079 [P] Add Twitter Card metadata to BaseLayout (summary_large_image card type)
- [ ] T080 [P] Create robots.txt in `website/public/robots.txt` (allow all, sitemap URL)
- [ ] T081 [P] Generate sitemap.xml (Astro plugin or build script, include all pages with priority/frequency)
- [ ] T082 [P] Add structured data for organization (JSON-LD in BaseLayout, logo, social links)

**Checkpoint**: Edge cases handled, performance optimized, accessibility enhanced, SEO/social configured

---

## Phase 8: Testing & Validation

**Purpose**: Validate implementation meets success criteria and performance budgets

**Note**: Tests are optional per spec, but included here for quality assurance

### Build Script Tests (Optional)

- [ ] T083 [P] Unit test documentation sync script in `tests/build/sync-docs.test.ts` (test sparse checkout logic, file copying, error handling, cached fallback)
- [ ] T084 [P] Test sync script with missing main repo in `tests/build/sync-docs.test.ts` (verify fallback to cached docs)
- [ ] T085 [P] Test sync script with invalid docs path in `tests/build/sync-docs.test.ts` (verify error message and build failure)

### Visual Regression Tests (Optional)

- [ ] T086 [P] Install Playwright in `tests/visual/` (configure browsers, screenshot storage)
- [ ] T087 [P] Implement homepage visual test in `tests/visual/homepage.spec.ts` (screenshot at 1920x1080 desktop, 768x1024 tablet, 375x667 mobile)
- [ ] T088 [P] Implement docs page visual test in `tests/visual/docs.spec.ts` (screenshot with sidebar, code blocks, table of contents)
- [ ] T089 [P] Implement comparison page visual test in `tests/visual/comparison.spec.ts` (screenshot with comparison table)
- [ ] T090 [P] Implement dark mode visual tests (screenshot all pages in dark mode, verify theme consistency)

### Accessibility Tests (Optional)

- [ ] T091 [P] Install Axe-core Playwright integration in `tests/accessibility/`
- [ ] T092 [P] Implement homepage accessibility test in `tests/accessibility/pages.spec.ts` (run Axe audit, expect zero violations)
- [ ] T093 [P] Implement docs page accessibility test in `tests/accessibility/pages.spec.ts` (test sidebar navigation, heading hierarchy, keyboard nav)
- [ ] T094 [P] Implement comparison page accessibility test in `tests/accessibility/pages.spec.ts` (test table semantics, responsive table)
- [ ] T095 [P] Test keyboard navigation across all pages (Tab through nav → main → footer, verify focus order)

### Performance Validation

- [ ] T096 Run Lighthouse audit on homepage (target: Performance 90+, Accessibility 95+, Best Practices 95+, SEO 90+)
- [ ] T097 Run Lighthouse audit on docs page (same targets as homepage)
- [ ] T098 Run Lighthouse audit on comparison page (same targets)
- [ ] T099 Test 3G load time using Lighthouse slow 4G throttling (target: LCP <2.5s, FCP <1.8s per Web Vitals "good" thresholds)
- [ ] T100 Verify JavaScript bundle size (target: <10KB compressed for theme.js + clipboard.js)
- [ ] T101 Verify total page weight (target: <500KB compressed for homepage)
- [ ] T102 Test mobile usability with Google PageSpeed Insights (target: 95+ score, zero horizontal scrolling)

### Integration & End-to-End Validation

- [ ] T103 Test documentation sync from main repo (run website:sync, verify files copied, validate frontmatter)
- [ ] T104 Test build process end-to-end (run website:build, verify dist/ output, check for errors)
- [ ] T105 Test preview server (run website:preview, verify all pages load, test navigation)
- [ ] T106 Test theme toggle persistence (toggle theme, refresh page, verify persistence in localStorage)
- [ ] T107 Test copy-to-clipboard on all code blocks (verify Clipboard API works, test fallback message)
- [ ] T108 Validate all user stories independently (test US1-US4 in isolation per acceptance scenarios)

**Checkpoint**: All tests passing, performance budgets met, accessibility validated

---

## Phase 9: Deployment & Production Readiness

**Purpose**: Configure Cloudflare Pages deployment and production environment

### Cloudflare Pages Configuration

- [ ] T109 Create Cloudflare Pages project linked to GitHub repository (connect 004-public-website branch)
- [ ] T110 Configure build settings in Cloudflare Pages dashboard (build command: `bun run website:build`, output directory: `website/dist`, root directory: `/`)
- [ ] T111 Set environment variables in Cloudflare Pages (MAIN_REPO_URL, DOCS_SOURCE_PATH)
- [ ] T112 Configure custom domain (if speck.dev available, otherwise use cloudflare.pages.dev subdomain)
- [ ] T113 Set up GitHub webhook from main Speck repo to trigger Cloudflare Pages rebuild (webhook URL from CF dashboard, trigger on docs/ path changes)

### Production Optimization

- [ ] T114 [P] Configure cache headers in Cloudflare Pages settings (static assets: max-age=31536000, HTML: max-age=3600)
- [ ] T115 [P] Enable Cloudflare Web Analytics (cookieless analytics for basic metrics)
- [ ] T116 [P] Configure Cloudflare Images for raster image optimization (automatic WebP/AVIF conversion)
- [ ] T117 [P] Set up preview deployments for pull requests (automatic preview URLs for testing)

### Production Validation

- [ ] T118 Deploy to production and verify homepage loads (check speck.dev or CF Pages URL)
- [ ] T119 Verify documentation sync works in production (trigger webhook from main repo, confirm rebuild)
- [ ] T120 Test production performance with Lighthouse (run against live URL, verify meets budgets)
- [ ] T121 Verify analytics tracking works (check Cloudflare Web Analytics dashboard)
- [ ] T122 Test all pages in production (homepage, docs routes, comparison, 404)
- [ ] T123 Validate SEO tags in production (use Meta Tags analyzer, verify Open Graph preview)

**Checkpoint**: Production deployment successful, all pages accessible, performance validated, analytics working

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user story tasks
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion - Homepage (discovery)
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion - Documentation (learn workflow)
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion - Comparison (evaluate tradeoffs)
- **User Story 4 (Phase 6)**: Depends on User Story 2 (installation docs are part of documentation section)
- **Edge Cases & Polish (Phase 7)**: Depends on User Stories 1-4 completion
- **Testing & Validation (Phase 8)**: Depends on all implementation phases (1-7)
- **Deployment (Phase 9)**: Depends on Testing & Validation completion

### User Story Dependencies

**User Story 1 (Homepage)**:
- Can start immediately after Foundational phase
- Independent of other user stories

**User Story 2 (Documentation)**:
- Can start immediately after Foundational phase
- Independent of other user stories

**User Story 3 (Comparison)**:
- Can start immediately after Foundational phase
- Independent of other user stories

**User Story 4 (Installation)**:
- Depends on User Story 2 (installation docs are part of docs section)
- Needs documentation infrastructure (DocsLayout, CodeBlock) from US2

### Parallel Opportunities

#### Within Setup (Phase 1)

```bash
# All directory creation can happen in parallel
Task: "Create website/src/components/ directory"
Task: "Create website/src/layouts/ directory"
Task: "Create website/src/content/docs/ directory"
Task: "Create website/src/styles/ directory"
Task: "Create website/public/images/ directory"
Task: "Create tests/build/ directory"
Task: "Create tests/visual/ directory"
Task: "Create tests/accessibility/ directory"
```

#### Within Foundational (Phase 2)

```bash
# Global styles can be implemented in parallel
Task: "Implement global CSS reset in website/src/styles/global.css"
Task: "Implement theme CSS variables in website/src/styles/theme.css"
```

#### Within User Story 1 (Phase 3)

```bash
# All core components can be implemented in parallel
Task: "Implement Navigation component in website/src/components/Navigation.astro"
Task: "Implement FeatureCard component in website/src/components/FeatureCard.astro"
Task: "Implement ThemeToggle component in website/src/components/ThemeToggle.astro"

# SVG assets can be created in parallel
Task: "Create SVG icons for feature cards in website/public/images/"
Task: "Create Speck logo SVG in website/public/images/speck-logo.svg"
```

#### Within User Story 2 (Phase 4)

```bash
# Documentation components can be implemented in parallel
Task: "Implement CodeBlock component in website/src/components/CodeBlock.astro"
Task: "Implement Sidebar component for documentation navigation"

# Placeholder docs can be created in parallel
Task: "Create placeholder Quick Start doc"
Task: "Create placeholder Commands Reference doc"
Task: "Create placeholder Concepts doc"
Task: "Create placeholder Examples doc"
```

#### Within Edge Cases & Polish (Phase 7)

```bash
# Most edge case implementations can run in parallel
Task: "Implement 404 error page"
Task: "Implement Coming Soon placeholder"
Task: "Implement progressive loading for homepage"
Task: "Add JavaScript-disabled fallback styles"
Task: "Optimize images"
Task: "Implement lazy loading"
Task: "Add skip-to-content link"
Task: "Add ARIA labels"
Task: "Create Open Graph image"
```

#### Within Testing (Phase 8)

```bash
# All visual regression tests can run in parallel
Task: "Implement homepage visual test"
Task: "Implement docs page visual test"
Task: "Implement comparison page visual test"
Task: "Implement dark mode visual tests"

# All accessibility tests can run in parallel
Task: "Implement homepage accessibility test"
Task: "Implement docs page accessibility test"
Task: "Implement comparison page accessibility test"

# Performance audits can run in parallel
Task: "Run Lighthouse audit on homepage"
Task: "Run Lighthouse audit on docs page"
Task: "Run Lighthouse audit on comparison page"
```

---

## Implementation Strategy

### MVP First (Prioritized User Stories)

**MVP Scope** (User Stories 1 & 4 only):
1. Complete Phase 1: Setup (T001-T016)
2. Complete Phase 2: Foundational (T017-T023)
3. Complete Phase 3: User Story 1 - Homepage (T024-T033) → Discovery flow
4. Complete Phase 6: User Story 4 - Installation (T055-T059) → Conversion flow
5. **STOP and VALIDATE**: Test discovery → installation journey
6. Deploy MVP to production

**Full Release** (Add remaining user stories):
1. Add Phase 4: User Story 2 - Documentation (T034-T047)
2. Add Phase 5: User Story 3 - Comparison (T048-T054)
3. Add Phase 7: Edge Cases & Polish (T060-T082)
4. Add Phase 8: Testing & Validation (T083-T108)
5. Deploy full release

### Incremental Delivery

**Milestone 1: Foundation** (Week 1)
- Setup + Foundational → Can run dev server, sync docs

**Milestone 2: MVP** (Week 2)
- User Story 1 (Homepage) + User Story 4 (Installation) → Minimal viable product
- Can launch website with discovery and installation flows

**Milestone 3: Full Documentation** (Week 3)
- User Story 2 (Documentation) → Complete learning experience

**Milestone 4: Complete Experience** (Week 4)
- User Story 3 (Comparison) + Polish + Testing → Production-ready

### Parallel Team Strategy

With multiple developers working in parallel:

1. **Team completes Setup + Foundational together** (T001-T023)
2. **Once Foundational is done, split into parallel workstreams**:
   - **Developer A**: User Story 1 - Homepage (T024-T033)
   - **Developer B**: User Story 2 - Documentation (T034-T047)
   - **Developer C**: User Story 3 - Comparison (T048-T054) + User Story 4 - Installation (T055-T059)
3. **All developers converge on Edge Cases & Polish** (T060-T082)
4. **Testing & Deployment split by specialty**:
   - Developer A: Visual regression tests
   - Developer B: Accessibility tests
   - Developer C: Performance validation + Cloudflare setup

---

## Success Criteria Validation

Per [spec.md](spec.md) Section "Success Criteria", validate these measurable outcomes:

- **SC-001**: Homepage hero section achieves 90%+ comprehension → Validate with user testing after T033
- **SC-002**: Time to first `/speck.specify` command is under 10 minutes for 90% of developers → Validate with user testing after T059
- **SC-003**: Website core content loads in under 2 seconds on 3G → Validate with T099 (Lighthouse 3G throttling)
- **SC-004**: Mobile usability score is 95+ → Validate with T102 (Google PageSpeed Insights)
- **SC-005**: Code copy-to-clipboard functionality succeeds 99%+ → Validate with T107 (manual testing across browsers)
- **SC-007**: Site remains fully functional when JavaScript disabled → Validate with T063 (test navigation, content, links without JS)
- **SC-009**: Monthly hosting cost on Cloudflare Pages is under $5 → Validate after T118 (check CF Pages billing after deployment)
- **SC-010**: Lighthouse accessibility score is 95+ → Validate with T096-T098 (Lighthouse accessibility audits)

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[US1], [US2], [US3], [US4] labels**: Indicate which user story the task belongs to
- **No tests by default**: Tests are optional (not requested in spec), but included in Phase 8 for quality assurance
- **MVP = US1 + US4**: Homepage (discovery) + Installation (conversion) = minimal viable product
- **Independent user stories**: US1, US2, US3 can be implemented in any order after Foundational phase
- **US4 depends on US2**: Installation docs are part of documentation section, needs DocsLayout and CodeBlock
- **Commit Strategy**: Commit after each user story is complete (T033, T047, T054, T059) or after logical groups
- **Checkpoints**: Stop at each checkpoint to validate independently before proceeding
- **Content sync**: Documentation content is synced from main repo via build script, placeholder docs used initially
- **Performance budgets**: <500KB page weight, <10KB JS, <2s FCP on 3G, 95+ accessibility score
- **Design inspiration**: hono.dev (minimalist structure) + claude.com (dark mode palette, clay accents)
- **Graceful degradation**: Site works without JavaScript, respects system theme preference, accessible via keyboard

---

**Task Generation Complete**: 2025-11-15
**Total Tasks**: 123
**Estimated Duration**: 3-4 weeks (1 developer) or 2-3 weeks (3 developers working in parallel)
**MVP Tasks**: 39 (T001-T023 Setup/Foundation + T024-T033 Homepage + T055-T059 Installation)
**Next Step**: Begin Phase 1 (Setup) implementation
