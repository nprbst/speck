# Implementation Plan: Website Content Update for Advanced Speck Features

**Branch**: `011-website-feature-update` | **Date**: 2025-11-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/011-website-feature-update/spec.md`

## Executive Summary

This feature updates the Speck website to showcase major capabilities added in specifications 007-010: multi-repo/monorepo support, stacked PR workflows, and performance improvements through virtual commands and hook-based architecture. The update focuses on user-facing documentation that communicates value propositions without implementation details, targeting three primary audiences: new visitors evaluating Speck, existing users discovering new features, and team leads assessing enterprise fit.

The work is primarily content creation and information architecture refinement, building on the existing website infrastructure from spec 004 and spec 006 content. Success depends on clear messaging, intuitive navigation, and comprehensive examples that demonstrate real-world usage patterns.

## Technical Context

**Project Type**: Documentation/Content (Astro-based static site from spec 004)
**Content Format**: Markdown with frontmatter metadata
**Primary Dependencies**: Existing website infrastructure (Astro), content from specs 007-010 (source material)
**Testing**: Manual content review, link validation, accessibility checks
**Target Platform**: Web (static site deployment via Cloudflare Pages)
**Scope**: Content update for ~15-20 documentation pages covering 3 major feature areas
**Performance Goals**: N/A (content-only update)
**Constraints**: Maintain 100% backwards compatibility with spec 006 content, ensure spec 007-010 source content accuracy

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Principle III: Specification-First Development
- Spec contains no implementation details (Astro components, React, deployment configs)
- Success criteria are measurable user outcomes (time to understand, navigation clicks, content coverage)
- Functional requirements focus on WHAT content exists, not HOW it's implemented

### ✅ Principle IV: Quality Gates
- Specification checklist completed and validated
- All acceptance scenarios testable through content review
- Zero [NEEDS CLARIFICATION] markers in spec

### ✅ Principle VI: Technology Agnosticism
- Content requirements don't prescribe CMS, static site generator, or hosting
- References to "Astro" limited to context notes, not requirements
- Website can be migrated to different platform without invalidating spec

### ⚠️ Principle VII: File Format Compatibility
- N/A - This feature updates website content, not `specs/` directory artifacts
- Website content lives in `website/` directory (separate from spec-kit conventions)

### ✅ Principle VIII: Command-Implementation Separation
- N/A - This feature doesn't add slash commands or scripts

### ⚠️ Principle IX: Code Quality Standards
- Limited code changes (if any) - primarily content updates
- If website build scripts modified: MUST pass typecheck and lint

### ⚠️ Principle X: Zero Test Regression Policy
- Website has visual regression tests and accessibility tests (from spec 004)
- MUST maintain passing status for existing tests
- No new test failures introduced

**Constitution Compliance**: PASS with caveats
- Principles VII, VIII don't apply to website content updates
- Principle IX/X apply only if code changes occur (unlikely for content-focused update)

## Project Structure

### Documentation (this feature)

```text
specs/011-website-feature-update/
├── plan.md              # This file
├── research.md          # Phase 0 - Content audit and source material review
├── data-model.md        # Phase 1 - Content structure and navigation taxonomy
├── quickstart.md        # Phase 1 - Content update workflow guide
├── contracts/           # Phase 1 - Content schemas and templates
│   ├── content-schema.md        # Markdown frontmatter structure
│   ├── navigation-structure.md  # Information architecture
│   └── capability-matrix.md     # Feature compatibility table
└── tasks.md             # Phase 2 - Content creation tasks (via /speck.tasks)
```

### Source Code (repository root)

```text
website/                 # Astro-based static site (existing from spec 004)
├── src/
│   ├── content/docs/    # Documentation markdown files (UPDATE TARGET)
│   │   ├── getting-started/
│   │   │   ├── installation.md           # FROM spec 006 - verify consistency
│   │   │   └── quickstart.md             # UPDATE - add multi-repo, stacked PR refs
│   │   ├── concepts/                      # DECISION NEEDED: Current dir is "concepts", but tasks/contracts use "core-concepts"
│   │   │   └── workflow.md               # FROM spec 006 - preserve, extend with multi-repo/stacked PR refs
│   │   │                                 # ACTION: Either rename concepts/ → core-concepts/ OR update tasks to use concepts/
│   │   ├── advanced-features/            # NEW SECTION
│   │   │   ├── multi-repo-support.md     # NEW - spec 007, 009 content
│   │   │   ├── stacked-prs.md            # NEW - spec 008, 009 content
│   │   │   └── monorepos.md              # NEW - spec 007 content
│   │   ├── architecture/                 # NEW SECTION
│   │   │   ├── virtual-commands.md       # NEW - spec 010 content
│   │   │   ├── hooks.md                  # NEW - spec 010 content
│   │   │   └── performance.md            # NEW - spec 010 metrics
│   │   ├── examples/                     # EXPAND
│   │   │   ├── multi-repo-workflow.md    # NEW
│   │   │   ├── stacked-pr-workflow.md    # NEW
│   │   │   └── monorepo-workflow.md      # NEW
│   │   └── reference/
│   │       └── capability-matrix.md      # NEW - feature compatibility
│   ├── pages/
│   │   └── index.astro                   # UPDATE - hero section, value prop
│   └── components/
│       └── Navigation.astro              # UPDATE - add new sections
└── public/                                # Static assets (if screenshots needed)
```

**Structure Decision**: Content updates target existing Astro site from spec 004. New documentation pages added to `website/src/content/docs/` in two new sections (advanced-features, architecture) plus expanded examples. Navigation component updated to surface new content. Homepage hero section refreshed to reflect expanded capabilities.

## Complexity Tracking

No constitutional violations requiring justification. This is a straightforward content update building on existing infrastructure.

---

## Phase 0: Research & Content Audit

**Goal**: Audit existing website content (spec 004, 006 baseline), review specs 007-010 for source material, identify content gaps, and clarify information architecture approach.

### Research Tasks

1. **Existing Content Audit**
   - Catalog all pages from specs 004 and 006 implementations
   - Document current navigation structure and page organization
   - Identify which content must be preserved verbatim (SC-003 requirement)
   - Note any broken links or outdated references

2. **Source Material Review (Specs 007-010)**
   - Extract key user-facing concepts from each spec:
     - Spec 007: Multi-repo detection, `/speck.link`, symlinks, shared specs, per-repo constitutions
     - Spec 008: Stacked PRs, `/speck.branch`, tool compatibility, PR automation
     - Spec 009: Multi-repo stacked PRs, independent stacks per child, aggregate status
     - Spec 010: Virtual commands, hooks, performance metrics, dual-mode CLI
   - Identify quickstart content from each spec (ready-made examples)
   - Collect performance metrics and success criteria for quantitative claims

3. **Information Architecture Research**
   - Review website navigation best practices (max 3 clicks to any page - SC-006)
   - Research capability matrix formats (comparison tables, feature grids)
   - Evaluate decision guide patterns (when to use X vs Y)
   - Analyze persona-based navigation (new users vs existing users paths)

4. **Competitive Analysis** (Optional - inform positioning)
   - How do similar tools communicate multi-repo support?
   - How are stacked PR workflows documented (Graphite, Aviator, etc.)?
   - What messaging resonates for performance improvements?

**Deliverable**: `research.md` documenting:
- Content inventory (what exists, what needs updates, what's new)
- Source material summary (key concepts per spec)
- Information architecture decision (section structure, navigation paths)
- Messaging framework (value propositions for each audience)

---

## Phase 1: Content Structure & Contracts

**Goal**: Define content organization, page templates, and structural schemas before writing content.

### Data Model (`data-model.md`)

**Key Entities**:

1. **Documentation Page**
   - Title (string)
   - Category (enum: getting-started, core-concepts, advanced-features, architecture, examples, reference)
   - Frontmatter metadata (description, tags, last-updated)
   - Target audience (enum: new-users, existing-users, evaluators, all)
   - Related pages (array of links)
   - Prerequisites (array of prerequisite concepts)

2. **Navigation Node**
   - Label (string)
   - Path (string)
   - Children (array of Navigation Nodes)
   - Order (number for sorting)
   - Icon (optional string for visual hierarchy)

3. **Capability Feature**
   - Name (string: multi-repo, stacked-PR, monorepo, virtual-commands, etc.)
   - Repository modes (array: single-repo, multi-repo-root, multi-repo-child)
   - Workflow modes (array: single-branch, stacked-PR)
   - Status (enum: supported, not-supported, partial)
   - Limitations (array of strings)

4. **Example Workflow**
   - Name (string)
   - Duration estimate (string: "5 minutes", "10 minutes")
   - Prerequisites (array of required setup)
   - Steps (array of step objects with title, description, code samples)
   - Success criteria (what users achieve)

### Contracts (`/contracts/`)

1. **`spec-kit-attribution-guide.md`**: Attribution strategy and tone guidance (NEW - from clarifications session)
   - Where attribution appears: hero subtitle, Origins section, footer, inline contexts
   - Tone requirements: respectful, grateful, compatibility-focused per FR-032
   - Core features receiving inline attribution: three-phase workflow, constitution, templates (FR-031)
   - Example phrasings: "The three-phase workflow (specify, plan, implement), inherited from spec-kit, forms the foundation..."
   - Non-Claude-Code conditional guidance: "If you're not using Claude Code, consider exploring spec-kit directly"
   - spec-kit GitHub URL: https://github.com/github/spec-kit

2. **`content-schema.md`**: Markdown frontmatter structure (renumbered from 1 due to attribution guide addition)
   ```yaml
   ---
   title: String (required)
   description: String (1-2 sentences, for meta tags)
   category: Enum (getting-started | core-concepts | advanced-features | architecture | examples | reference)
   audience: Enum[] (new-users | existing-users | evaluators | all)
   prerequisites: String[] (links to prerequisite pages)
   tags: String[] (for search)
   lastUpdated: Date (ISO 8601)
   ---
   ```

3. **`navigation-structure.md`**: Information architecture
   - Sitemap showing all pages and hierarchy
   - Navigation menu structure (top-level, dropdowns)
   - Breadcrumb patterns
   - Cross-linking strategy

4. **`capability-matrix.md`**: Feature compatibility table
   | Feature | Single-Repo | Multi-Repo Root | Multi-Repo Child | Limitations |
   |---------|-------------|-----------------|------------------|-------------|
   | Stacked PRs | ✅ Supported | ✅ Supported | ✅ Supported | No cross-repo dependencies |
   | Shared Specs | N/A | ✅ Supported | ✅ Supported | Requires symlinks |
   | Virtual Commands | ✅ Supported | ✅ Supported | ✅ Supported | None |

5. **`example-templates.md`**: Workflow documentation pattern
   - Standard structure for example pages
   - Code sample formatting conventions
   - Before/after comparison template

### Quickstart Guide (`quickstart.md`)

**Content Update Workflow**:
1. Review source specs (007-010) for technical accuracy
2. Draft content in markdown following content-schema
3. Create examples following example-templates
4. Update navigation structure
5. Run link validation
6. Preview in local Astro dev server
7. Accessibility check with axe-core
8. Deploy to preview environment
9. Final review and approval

**Tools**:
- Markdown editor (any)
- Link checker (automated via test suite from spec 004)
- Axe accessibility validator (existing from spec 004)
- Astro dev server (`bun run website:dev`)

---

## Phase 2: Task Generation

**Note**: This phase is executed by `/speck.tasks` command, not as part of `/speck.plan`.

Tasks will break down content creation into:
- User Story 1 tasks: Multi-repo capability documentation
- User Story 2 tasks: Stacked PR workflow documentation
- User Story 3 tasks: Performance improvements documentation
- User Story 4 tasks: Homepage and value proposition updates
- User Story 5 tasks: Spec 006 content integration verification

Expected task categories:
1. Content authoring (15-20 new/updated pages)
2. Navigation updates (2-3 components)
3. Example workflows (3 complete examples)
4. Capability matrix creation (1 reference page)
5. spec-kit attribution implementation (5-6 tasks: hero subtitle, Origins section, dedicated about page, footer, inline attribution in content, validation)
6. Link validation and accessibility testing
7. Preview deployment and review

---

## Constitutional Re-Check (Post-Design)

### ✅ Specification-First Development
- Plan maintains technology-agnostic approach
- Content structure defined independently of Astro implementation
- Contracts describe WHAT content exists, not HOW it's rendered

### ✅ Quality Gates
- Clear deliverables per phase (research.md, contracts, data-model.md)
- Testable acceptance criteria (link validation, accessibility, content review)

### ✅ Zero Test Regression
- Existing visual regression tests from spec 004 will validate no layout breakage
- Accessibility tests will ensure new content meets WCAG standards
- Link checker will prevent broken references

**Final Constitution Compliance**: PASS

---

## Success Metrics Alignment

This plan addresses all success criteria from spec.md:

- **SC-001**: Homepage value prop clarity → Phase 1 contract defines messaging, Phase 2 implements
- **SC-002**: Multi-repo setup docs → Phase 1 contract defines structure, Phase 2 creates content from spec 007
- **SC-003**: Spec 006 content preservation → Phase 0 audit identifies what to preserve, Phase 2 verifies
- **SC-004**: Stacked PR decision guide → Phase 1 contract defines decision guide template, Phase 2 implements from spec 008
- **SC-005**: 3+ complete examples → Phase 1 example-templates defines structure, Phase 2 creates 3 workflows
- **SC-006**: 3-click navigation → Phase 1 navigation-structure enforces depth limit
- **SC-007**: 3+ performance metrics → Phase 0 extracts metrics from spec 010, Phase 2 documents
- **SC-008**: Capability matrix → Phase 1 contract defines table structure, Phase 2 populates from specs 008-009

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Spec 007-010 content too technical | High - violates technology-agnostic principle | Phase 0 research extracts user-facing concepts only, filters implementation details |
| Navigation becomes too complex | Medium - violates 3-click rule | Phase 1 information architecture explicitly validates depth constraint |
| Spec 006 content conflicts with new content | Medium - violates backwards compatibility | Phase 0 audit identifies all spec 006 pages, Phase 2 verifies consistency |
| Examples too abstract | High - reduces comprehension | Phase 1 example-templates enforces concrete, step-by-step format with code samples |
| Capability matrix incomplete | Medium - confuses feature relationships | Phase 1 contract defines all repository+workflow mode combinations explicitly |

---

## Dependencies

- **Spec 004** (public website): Astro infrastructure, build system, deployment pipeline
- **Spec 006** (content update): Existing installation, skill, core concepts documentation
- **Spec 007** (multi-repo): Source material for multi-repo/monorepo documentation
- **Spec 008** (stacked PRs): Source material for stacked PR workflow documentation
- **Spec 009** (multi-repo stacked): Source material for multi-repo+stacked PR integration
- **Spec 010** (virtual commands): Source material for performance and architecture documentation

All dependencies are completed and merged.

---

## Next Steps

1. Run `/speck.tasks` to generate actionable task breakdown
2. Execute Phase 0 research (content audit + source material review)
3. Execute Phase 1 design (content structure + contracts)
4. Execute Phase 2 implementation (content authoring + validation)
5. Preview deployment and stakeholder review
6. Production deployment
