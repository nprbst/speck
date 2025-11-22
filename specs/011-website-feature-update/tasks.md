# Implementation Tasks: Website Content Update for Advanced Speck Features

**Branch**: `011-website-feature-update`
**Generated**: 2025-11-22
**Feature**: Website content update showcasing multi-repo support, stacked PR workflows, and performance improvements
**Source Documents**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), [contracts/](contracts/)

---

## Overview

This tasks file breaks down the website content update into actionable, independently testable user story phases. The work is primarily content creation following established contracts and templates, building on the existing website infrastructure from spec 004 and spec 006.

**Total Phases**: 8
- Phase 1: Setup (content infrastructure)
- Phase 2: Foundational (shared artifacts)
- Phase 3: User Story 4 - Value Proposition (P1)
- Phase 4: User Story 1 - Multi-Repo Discovery (P1)
- Phase 5: User Story 2 - Stacked PR Discovery (P1)
- Phase 6: User Story 5 - Spec 006 Migration (P2)
- Phase 7: User Story 3 - Performance Messaging (P2)
- Phase 8: Polish & Validation

**Implementation Strategy**: MVP-first approach focusing on P1 user stories (US4, US1, US2) for initial release, then iterate with P2 stories (US5, US3).

---

## Phase 1: Setup (Content Infrastructure)

**Goal**: Prepare website development environment and validate existing content structure

**Tasks**:

- [X] T001 Start website development server with `bun run website:dev` to verify existing infrastructure
- [X] T002 Audit existing content in website/src/content/docs/ and verify spec 006 pages are intact
- [X] T003 Create new directories: website/src/content/docs/advanced-features/, website/src/content/docs/architecture/, website/src/content/docs/reference/
- [X] T004 Verify navigation component structure in website/src/components/Navigation.astro

---

## Phase 2: Foundational (Shared Artifacts)

**Goal**: Create capability matrix and update navigation structure - blocking prerequisites for all user stories

**Independent Test**: Capability matrix page renders with all features from specs 007-010, navigation includes all new sections

**Tasks**:

- [X] T005 Create capability matrix page in website/src/content/docs/reference/capability-matrix.md using table structure from contracts/capability-matrix.md and populate with all features from specs 007-010
- [X] T006 Update navigation component in website/src/components/Navigation.astro to add "Advanced Features", "Architecture", and "Reference" sections
- [X] T007 Verify navigation depth constraint (max 3 clicks from homepage) using manual click testing

---

## Phase 3: User Story 4 - Complete Value Proposition (P1)

**Goal**: Update homepage to reflect Speck's expanded capabilities (multi-repo, stacked PRs, performance)

**Story**: A potential Speck user visits the website for the first time and wants to quickly understand what Speck does, why it's better than alternatives, and whether it fits their needs.

**Independent Test**: New visitor can spend 3-5 minutes on homepage and explain: (1) what Speck does, (2) what makes it unique, (3) whether it solves their problem

**Tasks**:

- [X] T008 [US4] Update homepage hero section in website/src/pages/index.astro with new tagline: "Specification-driven development for Claude Code - from idea to implementation with shared specs, stacked PRs, and multi-repo support"
- [X] T009 [P] [US4] Update homepage feature cards in website/src/pages/index.astro to include: Multi-Repo & Monorepo Support, Stacked PR Workflows, Claude-Native Performance, Plugin Installation
- [X] T010 [P] [US4] Add differentiators section to website/src/pages/index.astro highlighting: "Only tool built for Claude Code with native hook integration" and "Only spec system supporting multi-repo shared specifications"
- [X] T011 [P] [US4] Add clear call-to-action in website/src/pages/index.astro: "Install via `/plugin` in Claude Code" with link to installation guide
- [X] T012 [US4] Preview homepage in local dev server at http://localhost:4321 and verify 3-minute comprehension test with colleague

---

## Phase 4: User Story 1 - Multi-Repo Discovery (P1)

**Goal**: Create comprehensive multi-repo documentation enabling users to discover, understand, and set up multi-repo support

**Story**: A team lead evaluating Speck for their microservices architecture visits the website to understand if Speck can handle cross-repo features.

**Independent Test**: Team lead can review website and determine within 5 minutes whether Speck supports their multi-repo use case, understand how to set it up, and see concrete examples

**Tasks**:

- [X] T013 [P] [US1] Create core concepts page in website/src/content/docs/core-concepts/multi-repo.md explaining symlink detection, shared specs, and per-repo constitutions (following contracts/content-schema.md)
- [X] T014 [P] [US1] Create advanced features page in website/src/content/docs/advanced-features/multi-repo-support.md with step-by-step `/speck.link` setup instructions (following contracts/content-schema.md)
- [X] T015 [P] [US1] Create advanced features page in website/src/content/docs/advanced-features/monorepos.md for monorepo workspace management (following contracts/content-schema.md)
- [X] T016 [P] [US1] Create example workflow in website/src/content/docs/examples/multi-repo-workflow.md demonstrating frontend/backend coordination (following contracts/example-templates.md)
- [X] T017 [US1] Update quickstart guide in website/src/content/docs/getting-started/quick-start.md to add "What's Next" references to multi-repo capabilities
- [X] T018 [US1] Add multi-repo use cases to homepage in website/src/pages/index.astro: "Coordinated frontend/backend features" and "Monorepo workspace management"
- [X] T019 [US1] Update commands reference in website/src/content/docs/commands/reference.md to document `/speck.link` command with syntax and examples
- [X] T020 [US1] Verify all multi-repo pages cross-link correctly and prerequisites resolve
- [X] T021 [US1] Test multi-repo discovery flow: homepage → multi-repo concepts → setup guide → example workflow (5-minute path verification)

---

## Phase 5: User Story 2 - Stacked PR Discovery (P1)

**Goal**: Create comprehensive stacked PR documentation enabling users to understand workflows, tooling compatibility, and benefits

**Story**: A developer familiar with stacked PR tools (like Graphite) visits the website to understand if Speck can help split large features into reviewable chunks.

**Independent Test**: Developer can review website and understand within 10 minutes what stacked PR support means, how it integrates with their tools, and why it improves their workflow

**Tasks**:

- [X] T022 [P] [US2] Create core concepts page in website/src/content/docs/core-concepts/stacked-prs.md explaining branch dependency tracking, PR automation, and workflow benefits (following contracts/content-schema.md)
- [X] T023 [P] [US2] Create advanced features page in website/src/content/docs/advanced-features/stacked-prs.md with `/speck.branch` commands and workflow guide (following contracts/content-schema.md)
- [X] T024 [P] [US2] Create example workflow in website/src/content/docs/examples/stacked-pr-workflow.md demonstrating breaking feature into reviewable stack (following contracts/example-templates.md)
- [X] T025 [US2] Update homepage in website/src/pages/index.astro to highlight stacked PR support: "Break features into reviewable chunks" and "Faster delivery through parallel review"
- [X] T026 [US2] Add tool compatibility messaging to stacked PR pages: "Works with Graphite, GitHub Stack, or manual git workflows"
- [X] T027 [US2] Update commands reference in website/src/content/docs/commands/reference.md to document `/speck.branch` commands (create, list, status, import)
- [X] T028 [US2] Add decision guide section to website/src/content/docs/advanced-features/stacked-prs.md: "When to use stacked PRs vs single-branch"
- [X] T029 [US2] Verify stacked PR pages cross-link to capability matrix showing multi-repo compatibility
- [X] T030 [US2] Test stacked PR discovery flow: homepage → stacked PR concepts → setup guide → example workflow (10-minute path verification)

---

## Phase 6: User Story 5 - Spec 006 Content Migration (P2)

**Goal**: Update existing spec 006 content to integrate new capabilities while preserving 100% backwards compatibility

**Story**: A website visitor who previously read the spec 006 documentation returns and wants to understand what's new without encountering conflicting information.

**Independent Test**: Compare spec 006 content with spec 011 updates and verify all previous information remains accurate while new capabilities are seamlessly integrated

**Tasks**:

- [X] T031 [P] [US5] Update three-phase workflow page in website/src/content/docs/core-concepts/workflow.md to add references to multi-repo and stacked PR workflows in "What's Next" section
- [X] T032 [P] [US5] Verify installation guide in website/src/content/docs/getting-started/installation.md remains unchanged (SC-003 preservation requirement)
- [X] T033 [P] [US5] Update existing first feature example in website/src/content/docs/examples/first-feature.md to add "What's Next" references to advanced workflows
- [X] T034 [US5] Create "What's New" section in website/src/content/docs/whats-new.md highlighting specs 007-010 capabilities with dates (2025-11-XX for each spec)
- [X] T035 [US5] Run link validation across all spec 006 pages to ensure no broken links after navigation updates
- [X] T036 [US5] Verify all spec 006 pages have updated frontmatter (audience, tags, relatedPages) per contracts/content-schema.md migration guide
- [X] T037 [US5] Test returning user flow: check what's new → review updated content → verify no contradictions with previous knowledge

---

## Phase 7: User Story 3 - Performance Messaging (P2)

**Goal**: Document performance improvements from virtual commands and hooks in user-facing terms

**Story**: A developer who previously tried Speck revisits the website after hearing about improvements and wants to understand how the virtual command pattern makes Speck faster.

**Independent Test**: Compare "before and after" messaging on website showing measurable performance improvements with technology-agnostic explanations

**Tasks**:

- [ ] T038 [P] [US3] Create architecture page in website/src/content/docs/architecture/virtual-commands.md explaining hook-based command routing benefits (following contracts/content-schema.md)
- [ ] T039 [P] [US3] Create architecture page in website/src/content/docs/architecture/hooks.md documenting PrePromptSubmit hook and prerequisite injection (following contracts/content-schema.md)
- [ ] T040 [P] [US3] Create architecture page in website/src/content/docs/architecture/performance.md with metrics from spec 010: "30% faster slash command execution", "Sub-100ms hook latency" (following contracts/content-schema.md)
- [X] T041 [US3] Update homepage in website/src/pages/index.astro to add performance messaging: "Claude-native performance with hook-based architecture"
- [ ] T042 [US3] Add before/after comparison to performance page showing command invocation improvements (simplified workflow examples)
- [ ] T043 [US3] Update commands reference in website/src/content/docs/commands/reference.md to show simplified virtual command usage (no path dependencies)
- [ ] T044 [US3] Verify performance claims match spec 010 success criteria (SC-005, SC-007 metrics)
- [ ] T045 [US3] Test performance discovery flow: homepage → architecture section → performance metrics

---

## Phase 8: Polish & Cross-Cutting Concerns

**Goal**: Final validation, accessibility testing, and deployment preparation

**Independent Test**: All pages render correctly, pass accessibility scans, have working links, and meet success criteria from spec.md

**Tasks**:

- [ ] T046 [P] Run link validation across all documentation pages using automated link checker or manual testing
- [ ] T047 [P] Run accessibility checks with axe DevTools on all new and updated pages
- [ ] T048 [P] Verify all new pages have complete frontmatter per contracts/content-schema.md validation rules
- [ ] T049 Verify navigation depth constraint: test that all pages reachable within 3 clicks from homepage (SC-006)
- [ ] T050 Test search functionality indexes all new documentation pages (if search exists from spec 004 infrastructure)
- [ ] T051 Verify capability matrix includes all features from specs 007-010 with accurate support status
- [ ] T052 Test breadcrumbs display correctly on all pages
- [ ] T053 Test mobile navigation (responsive behavior, accordion menus)
- [ ] T054 Run visual regression tests (if available from spec 004 test suite)
- [ ] T055 Build website for production with `bun run website:build` and verify no build errors
- [ ] T056 Deploy to preview environment and conduct final review with stakeholder
- [ ] T057 Verify all success criteria from spec.md (SC-001 through SC-008) are met
- [ ] T058 Document constitutional exemptions in final report: This is a content-only feature with zero code changes. Constitution Principle IX (Code Quality Standards) and Principle X (Zero Test Regression) are NOT APPLICABLE as no TypeScript implementation or test files are modified. Website visual regression tests from spec 004 will validate content rendering without code quality gates.

---

## Dependencies

### User Story Dependencies

The user stories can be implemented in this order for optimal flow:

```
Phase 1 (Setup)
  ↓
Phase 2 (Foundational) - Capability Matrix + Navigation
  ↓
Phase 3 (US4 - Value Prop) ← Depends on: nothing (can start after Phase 2)
  ↓
Phase 4 (US1 - Multi-Repo) ← Depends on: US4 (homepage mentions multi-repo)
  ↓
Phase 5 (US2 - Stacked PRs) ← Depends on: US4 (homepage mentions stacked PRs)
  ↓
Phase 6 (US5 - Spec 006 Migration) ← Depends on: US1, US2 (need new content to reference)
  ↓
Phase 7 (US3 - Performance) ← Depends on: US4 (homepage mentions performance)
  ↓
Phase 8 (Polish) ← Depends on: All content complete
```

**Critical Path**: Phase 1 → Phase 2 → Phase 3 (US4) → Phase 4 (US1) → Phase 5 (US2) → Phase 8

**Parallel Opportunities**:
- After Phase 2 complete: US4, US1, US2, US3 can be worked in parallel (different files)
- Content creation tasks within each user story are largely independent (marked [P])

---

## Parallel Execution Examples

### Within User Story 1 (Multi-Repo Discovery)

Tasks T013-T016 can be executed in parallel (different files):
```bash
# Parallel execution
Task T013: Create core-concepts/multi-repo.md
Task T014: Create advanced-features/multi-repo-support.md
Task T015: Create advanced-features/monorepos.md
Task T016: Create examples/multi-repo-workflow.md
```

Then sequentially:
```bash
Task T017: Update quickstart guide
Task T018: Update homepage
Task T019: Update commands reference
Task T020: Verify cross-links
Task T021: Test discovery flow
```

### Within User Story 2 (Stacked PR Discovery)

Tasks T022-T024 can be executed in parallel:
```bash
# Parallel execution
Task T022: Create core-concepts/stacked-prs.md
Task T023: Create advanced-features/stacked-prs.md
Task T024: Create examples/stacked-pr-workflow.md
```

### Across User Stories (After Phase 2)

User stories US4, US1, US2, US3 can be worked independently:
```bash
# Parallel execution across stories
Developer A: Phase 3 (US4 - homepage updates)
Developer B: Phase 4 (US1 - multi-repo content)
Developer C: Phase 5 (US2 - stacked PR content)
Developer D: Phase 7 (US3 - performance content)
```

---

## Implementation Strategy

### MVP Scope (Initial Release)

**Recommended MVP**: Phase 1 + Phase 2 + Phase 3 (US4) + Phase 4 (US1) + Phase 8 (validation)

**Rationale**:
- US4 (Value Proposition) is critical for new visitors (P1 priority)
- US1 (Multi-Repo Discovery) is the most differentiating feature (P1 priority)
- This delivers the core message: "Speck now supports multi-repo" with complete documentation
- Estimated effort: ~15-20 hours total

**MVP Success Criteria**:
- Homepage clearly communicates multi-repo support (FR-001, FR-002)
- Multi-repo documentation complete (FR-004 through FR-008)
- Capability matrix shows multi-repo features (FR-021)
- 3-click navigation validated (SC-006)
- All links working (SC-003)

### Incremental Delivery (Post-MVP)

**Iteration 1**: Add Phase 5 (US2 - Stacked PRs)
- Builds on MVP messaging
- Adds second major differentiator
- Estimated effort: ~8-10 hours

**Iteration 2**: Add Phase 6 (US5 - Spec 006 Migration) + Phase 7 (US3 - Performance)
- Completes all user stories
- Polishes existing content integration
- Estimated effort: ~6-8 hours

**Total Effort Estimate**: 30-40 hours for complete implementation

---

## Task Breakdown Summary

### By Phase

| Phase | Task Count | Parallel Tasks | Estimated Time |
|-------|------------|----------------|----------------|
| Phase 1: Setup | 4 | 2 | 1-2 hours |
| Phase 2: Foundational | 3 | 1 | 2-3 hours |
| Phase 3: US4 (Value Prop) | 5 | 3 | 3-4 hours |
| Phase 4: US1 (Multi-Repo) | 9 | 4 | 6-8 hours |
| Phase 5: US2 (Stacked PRs) | 9 | 3 | 6-8 hours |
| Phase 6: US5 (Spec 006) | 7 | 3 | 4-5 hours |
| Phase 7: US3 (Performance) | 8 | 3 | 4-5 hours |
| Phase 8: Polish | 13 | 3 | 4-6 hours |
| **TOTAL** | **58 tasks** | **22 parallelizable** | **30-40 hours** |

### By User Story

| User Story | Task Count | Priority | Content Pages |
|------------|------------|----------|---------------|
| US4: Value Proposition | 5 | P1 | 1 (homepage) |
| US1: Multi-Repo Discovery | 9 | P1 | 4 (concepts, setup, monorepo, example) |
| US2: Stacked PR Discovery | 9 | P1 | 3 (concepts, setup, example) |
| US5: Spec 006 Migration | 7 | P2 | 3 (updated existing) |
| US3: Performance | 8 | P2 | 3 (virtual commands, hooks, metrics) |
| Setup + Foundational + Polish | 20 | N/A | 1 (capability matrix) |

**Total New Pages**: 12 (core concepts: 2, advanced features: 3, architecture: 3, examples: 3, reference: 1)
**Updated Existing Pages**: 5 (homepage, quickstart, workflow, first feature, commands reference)

---

## Success Criteria Validation

Each user story phase includes validation tasks mapping to spec.md success criteria:

- **SC-001** (3-minute homepage comprehension): Task T012 (US4 homepage preview test)
- **SC-002** (5-minute multi-repo setup): Task T021 (US1 discovery flow test)
- **SC-003** (100% spec 006 preservation): Task T032, T035, T036 (US5 migration verification)
- **SC-004** (2-minute stacked PR decision): Task T028 (US2 decision guide), T030 (discovery flow test)
- **SC-005** (3+ complete examples): Task T016, T024, T016 (US1, US2 examples)
- **SC-006** (3-click navigation): Task T007, T049 (navigation depth validation)
- **SC-007** (3+ performance metrics): Task T040, T044 (US3 performance documentation)
- **SC-008** (Feature relationships documented): Task T005, T051 (capability matrix validation)

**Note**: Constitution Principles IX (Code Quality) and X (Test Regression) are not applicable to this content-only feature (validated in T058).

---

## Format Validation

All tasks follow strict checklist format:
- ✅ Checkbox prefix (`- [ ]`)
- ✅ Sequential task ID (T001-T058)
- ✅ [P] marker for parallelizable tasks (22/58 tasks)
- ✅ [Story] label for user story tasks (37/58 tasks mapped to US1-US5)
- ✅ Clear action with exact file path
- ✅ No tasks missing required components

**Validation Passed**: All 58 tasks formatted correctly ✓

---

**Generated**: 2025-11-22 by `/speck.tasks`
**Ready for Implementation**: Yes
**Recommended Start**: Phase 1 → Phase 2 → Phase 3 (MVP: Homepage + Multi-Repo)
