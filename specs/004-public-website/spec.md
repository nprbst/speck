# Feature Specification: Speck Public Website

**Feature Branch**: `004-public-website`
**Created**: 2025-11-15
**Status**: Draft
**Input**: User description: "This project needs a public website. We should aim for something that has the asthetic of hono.dev mixed with https://www.claude.com/product/claude-code (both in dark mode). We also want this to be cheap and simple to host (mostly static) on something like Cloudflare. The target audience is developers who are trying to learn to get the most of Claude Code and/or wanting to use github/spec-kit, but need to customize it to be more opinionated. You can reference the 001 spec for details on what we've built so far."

## Clarifications

### Session 2025-11-15

- Q: How will documentation content be structured and sourced for the website build? → A: Embed markdown docs in website repo with build-time import from main repo
- Q: Which static site generator will be used (VitePress, Astro, Next.js, or other)? → A: Astro
- Q: How will images and assets be optimized to meet 2-second 3G load time? → A: Cloudflare Images + responsive formats (WebP/AVIF with PNG fallback), prefer SVG-first approach where practical
- Q: When/how is documentation sync from main repo triggered (manual, webhook, scheduled)? → A: Webhook from main repo triggers Cloudflare Pages rebuild
- Q: What is the analytics privacy posture (cookieless, cookie-based with consent, no analytics)? → A: Cookieless analytics (no consent banner needed)
- Q: How is documentation synced from main repo at build time (submodule, sparse checkout script, or manual)? → A: During Cloudflare Pages build, execute a Bun script that clones only the /docs subdirectory from main repo using sparse checkout and copies files to Astro content collections

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Speck (Priority: P1)

A developer working with Claude Code finds spec-kit too generic and searches for "spec-kit alternatives" or "Claude Code customization." They land on speck.dev and immediately understand what Speck is, why it exists, and whether it's right for them—all within 30 seconds of page load.

**Why this priority**: Discovery is the funnel top. Without clear value communication, no one installs Speck. This is the make-or-break moment.

**Independent Test**: Deploy homepage alone. Measure: Can a developer unfamiliar with Speck read the hero section and accurately describe what Speck does in their own words? Success = 90%+ comprehension in user testing.

**Acceptance Scenarios**:

1. **Given** developer lands on speck.dev, **When** they view the hero section, **Then** they see a clear one-sentence value proposition (what Speck is), a contrasting comparison with spec-kit (why it's different), and a prominent CTA to get started
2. **Given** developer scrolls past hero, **When** they view feature highlights, **Then** they see 3-4 key differentiators (Claude-native, Bun-powered, opinionated workflow, upstream sync) with visual icons and 1-2 sentence descriptions
3. **Given** developer wants proof, **When** they look for validation, **Then** they see a quick comparison table or side-by-side showing Speck vs spec-kit differences (workflow speed, runtime, customization)
4. **Given** developer is on mobile, **When** they view site, **Then** all content is readable without horizontal scrolling and CTAs are thumb-accessible

---

### User Story 2 - Learn How to Use Speck (Priority: P2)

A developer convinced by the homepage wants to understand the Speck workflow before installing. They navigate to documentation and quickly grasp the three-phase workflow (specify → plan → implement) with clear examples of what each command does.

**Why this priority**: Installation friction is high for CLI tools. Developers want confidence they understand the tool before committing to setup.

**Independent Test**: Deploy docs section independently. Test: Can a developer read the "Getting Started" guide and correctly answer: "What are the three Speck commands and when do I use each?" Success = 85%+ accuracy.

**Acceptance Scenarios**:

1. **Given** developer clicks "Docs" navigation, **When** they land on documentation, **Then** they see a sidebar with hierarchical navigation (Getting Started, Commands Reference, Concepts, Examples) and the first page is "Quick Start"
2. **Given** developer reads Quick Start, **When** they scan the page, **Then** they see a linear workflow: installation → first feature → running commands → viewing output, with code examples for each step
3. **Given** developer wants command details, **When** they navigate to Commands Reference, **Then** they see all `/speck.*` commands with syntax, flags, examples, and common use cases
4. **Given** developer learns visually, **When** they view workflow documentation, **Then** they see diagrams or terminal screenshots showing command input/output
5. **Given** developer wants to copy commands, **When** they hover over code blocks, **Then** they see a "copy" button that copies the command to clipboard

---

### User Story 3 - Compare Speck with Spec-Kit (Priority: P3)

A developer already using spec-kit wonders if Speck is worth switching to. They find a dedicated comparison page that honestly explains the tradeoffs: when to use Speck (opinionated, Claude-native, Bun runtime) vs when to stick with spec-kit (language-agnostic, bash-based, minimal dependencies).

**Why this priority**: Conversion from spec-kit is important but not critical path. Most users will be new to both tools.

**Independent Test**: Deploy comparison page standalone. Test: After reading, can a spec-kit user identify 2 reasons to switch and 1 reason not to? Success = 80%+ identification.

**Acceptance Scenarios**:

1. **Given** developer navigates to "Speck vs Spec-Kit" page, **When** they view content, **Then** they see a side-by-side comparison table covering: runtime (Bun vs Bash), command style (Claude-native vs generic), workflow philosophy (opinionated vs flexible), and upstream sync strategy
2. **Given** developer wants migration guidance, **When** they scroll to migration section, **Then** they see step-by-step instructions for converting a spec-kit project to Speck
3. **Given** developer is skeptical, **When** they look for caveats, **Then** they see an honest "When NOT to use Speck" section listing scenarios where spec-kit is better (e.g., non-Bun environments, need for bash portability)

---

### User Story 4 - Install and Set Up Speck (Priority: P1)

A developer ready to try Speck follows installation instructions. They successfully install prerequisites (Bun, Claude Code), clone the repo, and run their first `/speck.specify` command within 5 minutes.

**Why this priority**: Installation is the conversion point. If it fails, all prior discovery work is wasted.

**Independent Test**: Give installation docs to a developer unfamiliar with Speck. Measure time from "read docs" to "successful `/speck.specify` run." Success = 90%+ complete in under 10 minutes.

**Acceptance Scenarios**:

1. **Given** developer views installation page, **When** they check prerequisites, **Then** they see clear version requirements (Bun 1.0+, Git 2.30+, Claude Code) with links to install each
2. **Given** developer has prerequisites, **When** they follow setup steps, **Then** they see numbered instructions: clone repo → install dependencies → verify installation → run first command
3. **Given** developer encounters errors, **When** they check troubleshooting section, **Then** they see common issues (Bun not in PATH, Claude Code not configured, permissions errors) with solutions
4. **Given** developer completes installation, **When** they run verification command, **Then** they see success output confirming Speck is ready

---

### Edge Cases

- **Slow network during page load**: When user has slow connection, site loads core content first (hero + primary CTA), then progressively enhances with images/animations
- **JavaScript disabled**: When JS disabled, site remains functional—navigation works, content readable, code copy buttons degrade gracefully to manual copy
- **Dark mode preference mismatch**: When user system is in light mode but prefers dark site, they see a theme toggle in header to manually switch
- **Missing documentation section**: When user navigates to incomplete docs, they see a "Coming Soon" placeholder with link to GitHub discussions to request priority
- **Outdated browser**: When user visits with browser lacking CSS Grid support (IE11, old Safari), site renders in single-column fallback layout
- **Mobile landscape orientation**: When user views site on narrow landscape screen (e.g., phone rotated), header collapses to hamburger menu to preserve content width
- **Copy command fails**: When clipboard API unavailable, copy button shows tooltip "Select and copy manually"
- **Search query with no results**: When user searches docs for nonexistent term, they see "No results found. Try [suggested terms]" with links to popular docs

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Website MUST clearly communicate Speck's value proposition within the hero section (above the fold): what Speck is, how it differs from spec-kit, and who should use it
- **FR-002**: Website MUST provide hierarchical documentation navigation with categories: Getting Started, Commands Reference, Concepts, and Examples
- **FR-003**: Website MUST include a Quick Start guide showing: installation prerequisites, setup steps, running first `/speck.specify` command, and verification of successful setup
- **FR-004**: Website MUST display all `/speck.*` commands in a Commands Reference section with: command syntax, available flags, usage examples, and common use cases
- **FR-005**: Website MUST include a comparison page contrasting Speck vs spec-kit across: runtime environment, command style, workflow philosophy, and use case suitability
- **FR-006**: Website MUST be fully responsive with breakpoints at 30em (mobile), 48em (tablet), and 62em (desktop), ensuring readable content and accessible CTAs on all devices
- **FR-007**: Website MUST support dark mode as default with manual theme toggle, using color palette inspired by claude.com/product/claude-code (charcoal background, clay accents, subtle gray borders)
- **FR-008**: Website MUST provide copy-to-clipboard functionality for all code blocks and command examples
- **FR-009**: Website MUST be deployable as static files to Cloudflare Pages with build process generating optimized HTML/CSS/JS
- **FR-010**: Website MUST load core content (hero + navigation + primary CTA) within 2 seconds on 3G connection, using SVG-first approach for icons/diagrams and Cloudflare Images with responsive formats (WebP/AVIF with PNG fallback) for raster images
- **FR-011**: Website MUST degrade gracefully when JavaScript disabled, maintaining navigation, content readability, and basic functionality
- **FR-012**: Website MUST include meta tags for SEO (title, description, Open Graph) and social sharing with relevant keywords (Claude Code, spec-kit, feature specification, workflow automation)
- **FR-013**: Website MUST provide a "Speck vs Spec-Kit" migration guide with step-by-step instructions for converting existing spec-kit projects
- **FR-014**: Website MUST include troubleshooting section in installation docs covering common errors: Bun not in PATH, Claude Code configuration, permission issues
- **FR-015**: Website design MUST follow aesthetic blend of hono.dev (minimalist, VitePress-style navigation, developer-focused) and claude.com/product/claude-code (dark mode palette, sophisticated animations, code-centric layout)

### Key Entities

- **Homepage**: Landing page with hero section (value proposition, differentiators, CTA), feature highlights (3-4 key benefits with icons), comparison table/visual (Speck vs spec-kit), and footer (links, GitHub, license)
- **Documentation Site**: Multi-page documentation with sidebar navigation, hierarchical structure (Getting Started → Commands → Concepts → Examples), code examples, and search functionality
- **Quick Start Guide**: Step-by-step installation and first-run tutorial covering prerequisites, setup, first command, and verification
- **Commands Reference**: Comprehensive documentation for all `/speck.*` commands (specify, clarify, plan, tasks, implement, check-upstream, pull-upstream, transform-upstream) with syntax, flags, examples
- **Comparison Page**: Side-by-side Speck vs spec-kit comparison covering runtime, philosophy, use cases, and migration guidance
- **Theme System**: Dark/light mode toggle with persistence, inspired by claude.com color palette (charcoal/clay) and hono.dev structure
- **Code Block Component**: Syntax-highlighted code examples with copy-to-clipboard button, line numbers, and language labels
- **Navigation System**: Responsive header with dropdown menus (Docs, Examples, GitHub), mobile hamburger menu, and breadcrumb trails
- **Static Build Pipeline**: Astro build process converting markdown content collections and component islands to optimized static HTML/CSS/JS for Cloudflare Pages deployment. Build-time import pulls markdown documentation from main Speck repository to ensure single source of truth while allowing independent website deployment. GitHub webhook from main repo triggers automatic rebuild when documentation changes
- **Documentation Content Source**: During Cloudflare Pages build, a Bun script clones only the /docs subdirectory from main Speck repository using Git sparse checkout and copies files to Astro content collections, ensuring latest command documentation, specs, and examples are included in static build

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Homepage hero section achieves 90%+ comprehension in user testing (users can describe Speck in their own words after 30-second view)
- **SC-002**: Time to first `/speck.specify` command is under 10 minutes for 90% of developers following installation docs
- **SC-003**: Website core content loads in under 2 seconds on 3G connection (measured via Lighthouse/WebPageTest)
- **SC-004**: Mobile usability score is 95+ on Google PageSpeed Insights with zero horizontal scrolling issues
- **SC-005**: Code copy-to-clipboard functionality succeeds 99%+ of the time across modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- **SC-006**: Documentation search (if implemented) returns relevant results in under 500ms for 95% of queries
- **SC-007**: Site remains fully functional (navigation, content readable, links work) when JavaScript disabled
- **SC-008**: Comparison page visit-to-GitHub-click conversion rate is 30%+ (developers who read comparison page then visit Speck GitHub repo)
- **SC-009**: Monthly hosting cost on Cloudflare Pages is under $5 for up to 10,000 monthly visitors
- **SC-010**: Lighthouse accessibility score is 95+ with proper heading hierarchy, ARIA labels, and keyboard navigation support

## Assumptions

1. **Static Site Generator**: Using Astro for static site generation with content collections for markdown documentation, component islands for interactive elements, and framework-agnostic component support (can integrate React/Vue/Svelte as needed)
2. **Cloudflare Pages**: Deployment target is Cloudflare Pages with standard free tier limits (500 builds/month, 100 custom domains)
3. **Content Updates**: Documentation content will be maintained via markdown files in the main Speck repository; GitHub webhook from main repo triggers Cloudflare Pages rebuild when documentation changes, ensuring automatic updates with single source of truth
4. **Search**: If search functionality needed, using client-side search (no server required) via tools like Algolia DocSearch (free for open source) or local search index
5. **Analytics**: Cookieless analytics using Cloudflare Web Analytics (free, privacy-friendly, GDPR/CCPA compliant without consent banner) tracking basic metrics (page views, popular pages) without personally identifiable information
6. **Code Syntax Highlighting**: Using a client-side syntax highlighter (Prism, Shiki) supporting TypeScript, bash, markdown, and JSON
7. **Browser Support**: Modern browsers (Chrome/Edge 90+, Firefox 88+, Safari 14+) with graceful degradation for older browsers
8. **Content Migration**: Initial content based on existing documentation in specs/001-speck-core-project and README files
9. **Image Optimization**: Icons and diagrams as SVG where practical; raster images (screenshots, photos) served via Cloudflare Images with automatic WebP/AVIF conversion and PNG fallback for older browsers

## Dependencies

- **Static Site Generator**: Astro (framework-agnostic, content-focused static site generator)
- **Build Environment**: Node.js/Bun for running build scripts and dependency management
- **Hosting Platform**: Cloudflare Pages with Git integration for automatic deployments
- **Webhook Integration**: GitHub webhook from main Speck repository to trigger Cloudflare Pages rebuild on documentation changes
- **Content Source**: Existing Speck documentation (001 spec, README, command documentation)
- **Design Assets**: Logo/branding for Speck (if not yet created, simple text-based logo acceptable for MVP); icons and diagrams preferably as SVG
- **Image Service**: Cloudflare Images for serving raster images with automatic format optimization (WebP/AVIF)
- **Domain**: speck.dev or similar domain (assumption: domain will be registered separately)

## Out of Scope

The following are explicitly **not** part of this feature:

- **Interactive demos**: Live in-browser Speck command execution (future enhancement)
- **Community features**: User comments, forums, or discussion boards (use GitHub Discussions instead)
- **Blog/changelog**: Dedicated blog or automated changelog (future feature)
- **Backend services**: No server-side APIs, databases, or dynamic content generation
- **User accounts**: No login, authentication, or personalization features
- **Tutorials beyond Quick Start**: Advanced guides, video tutorials, or in-depth case studies (future content)
- **Internationalization**: English-only for MVP (i18n is future enhancement)
- **Search autocomplete**: Basic search only; no autocomplete, typo correction, or AI-powered suggestions
- **Playground/sandbox**: Online environment to test Speck commands (future feature)
- **Performance monitoring**: No APM, error tracking, or advanced analytics beyond basic page views
- **Cookie consent banner**: No consent banner (cookieless analytics only via Cloudflare Web Analytics)
- **User tracking/profiling**: No behavioral tracking, user profiling, or invasive analytics beyond aggregate page views
