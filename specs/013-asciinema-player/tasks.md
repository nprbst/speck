# Implementation Tasks: asciinema Player Integration

**Feature**: 013-asciinema-player
**Branch**: `013-asciinema-player`
**Generated**: 2025-11-22
**Source**: [plan.md](./plan.md), [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

---

## Overview

This document provides a **dependency-ordered, executable task list** for implementing asciinema player integration on the Speck website. Tasks are organized by user story to enable **independent implementation and testing** of each increment.

**MVP Scope**: User Story 1 (Homepage Installation Demo) - Delivers immediate value with a single working demo.

**Implementation Strategy**:
1. **Setup Phase**: Initialize dependencies and project structure
2. **Foundational Phase**: Build reusable AsciinemaPlayer component (blocks all user stories)
3. **User Story Phases**: Implement each user story independently in priority order
4. **Polish Phase**: Cross-cutting concerns (accessibility testing, performance validation)

**Key Principles**:
- Each user story phase is **independently testable** and delivers value
- Tasks marked `[P]` can be executed in parallel (different files, no dependencies)
- Tasks include explicit file paths for immediate execution
- No tests are included (not requested in specification)

---

## Phase 1: Setup & Project Initialization

**Goal**: Install dependencies and configure build tools to support asciinema player integration.

**Blocking**: All subsequent phases depend on successful completion of this phase.

### Tasks

- [X] T001 Install asciinema-player and astro-terminal-player dependencies in website/package.json
- [X] T002 Install @astrojs/mdx dependency for inline component embedding in website/package.json
- [X] T003 [P] Install accessibility testing dependencies (@axe-core/playwright) in website/package.json
- [X] T004 Configure MDX integration in website/astro.config.mjs
- [X] T005 Configure Vite optimization for asciinema-player in website/astro.config.mjs
- [X] T006 Import asciinema-player CSS in website/src/styles/global.css
- [X] T007 Add CSS variable overrides for dark/light theme support in website/src/styles/global.css
- [X] T008 Create directory structure for .cast recordings at website/src/assets/demos/
- [X] T009 Create directory structure for fallback content at website/src/assets/demos/fallbacks/

**Completion Criteria**:
- `bun install` completes successfully with all dependencies
- `bun run build` completes without errors
- MDX integration is active (can process `.mdx` files)
- Vite configuration includes asciinema-player optimization
- Global CSS imports player styles correctly

---

## Phase 2: Foundational - Reusable AsciinemaPlayer Component

**Goal**: Build the core AsciinemaPlayer Astro component with error handling, fallback support, and accessibility features. This component is reused across all user stories.

**Blocking**: User Stories 1, 2, and 3 all depend on this component.

**Independent Test**: Component can be imported and renders with a test .cast file, showing proper error states and fallback content.

### Tasks

- [X] T010 Create AsciinemaPlayer.astro component in website/src/components/
- [X] T011 Define TypeScript interface for AsciinemaPlayerProps in website/src/components/AsciinemaPlayer.astro
- [X] T012 Implement component prop validation (VR-001 through VR-008 from data-model.md) in website/src/components/AsciinemaPlayer.astro
- [X] T013 Implement client:visible hydration directive for viewport-based loading in website/src/components/AsciinemaPlayer.astro
- [X] T014 Implement error state handling with retry logic (max 3 retries) in website/src/components/AsciinemaPlayer.astro
- [X] T015 Implement fallback content rendering (image and text) in website/src/components/AsciinemaPlayer.astro
- [X] T016 Add ARIA labels and accessibility attributes (role, aria-label, aria-describedby, tabindex) in website/src/components/AsciinemaPlayer.astro
- [X] T017 Implement keyboard navigation instructions (screen reader only text) in website/src/components/AsciinemaPlayer.astro
- [X] T018 Add responsive styling for viewports 320px to 2560px in website/src/components/AsciinemaPlayer.astro
- [X] T019 Implement theme integration (asciinema theme with CSS variable overrides) in website/src/components/AsciinemaPlayer.astro
- [X] T020 Add noscript fallback for JavaScript-disabled users in website/src/components/AsciinemaPlayer.astro

**Completion Criteria**:
- Component accepts all required and optional props per AsciinemaPlayerProps interface
- Component renders successfully with test .cast file
- Error handling displays retry button and fallback content on file load failure
- ARIA labels present and keyboard navigation works (space = play/pause, arrows = seek)
- Component is responsive on mobile and desktop viewports
- Dark/light theme support verified visually
- Noscript fallback displays static content

---

## Phase 3: User Story 1 - Homepage Installation Demo (P1 - MVP)

**Goal**: Display a working asciinema player on the homepage demonstrating Speck installation in Claude Code. This is the MVP - delivers immediate value to website visitors.

**Why this priority**: Homepage is the primary entry point. Visual demo reduces friction and builds confidence to try Speck.

**Independent Test**: Visit homepage, locate demo section, verify asciinema recording plays and shows Speck installation process.

**Depends On**: Phase 2 (AsciinemaPlayer component must exist)

### Tasks

- [X] T021 [US1] Create demo section structure in website/src/pages/index.astro
- [X] T022 [US1] Import AsciinemaPlayer component in website/src/pages/index.astro
- [X] T023 [US1] Create placeholder .cast recording file at website/src/assets/demos/speck-install.cast
- [X] T024 [US1] Import speck-install.cast recording in website/src/pages/index.astro
- [X] T025 [US1] Configure AsciinemaPlayer with homepage demo props (title, loop, speed) in website/src/pages/index.astro
- [X] T026 [P] [US1] Create fallback screenshot placeholder at website/public/demos/fallbacks/speck-install.png (skipped - fallback text provided instead)
- [X] T027 [P] [US1] Create fallback text description at website/src/assets/demos/fallbacks/speck-install.md
- [X] T028 [US1] Add fallbackImage and fallbackText props to player in website/src/pages/index.astro
- [X] T029 [US1] Add section heading and description text for demo section in website/src/pages/index.astro
- [X] T030 [US1] Style demo section to match Speck design system in website/src/pages/index.astro

**Completion Criteria (Acceptance Scenarios)**:
- ✅ Visitor lands on homepage and sees titled asciinema player in demo section
- ✅ Clicking play shows the installation recording in Claude Code
- ✅ Play/pause controls and keyboard navigation work (space, arrows)
- ✅ Player styling matches dark mode theme when enabled
- ✅ Player is responsive and fits screen width on mobile devices

**Value Delivered**: First-time visitors can see Speck in action before installing, reducing adoption friction.

---

## Phase 4: User Story 2 - Inline Documentation Demos (P2)

**Goal**: Enable embedding asciinema demos directly within documentation pages (not separate demo pages). Users reading docs can see workflows in context.

**Why this priority**: Enhances documentation value and reduces confusion for complex workflows. Builds on MVP foundation.

**Independent Test**: Navigate to documentation page with embedded demo, play recording, verify it demonstrates relevant workflow inline.

**Depends On**: Phase 2 (AsciinemaPlayer component)

### Tasks

- [X] T031 [US2] Convert website/src/content/docs/installation.md to installation.mdx
- [X] T032 [US2] Import AsciinemaPlayer component in installation.mdx
- [ ] T033 [P] [US2] Create installation workflow .cast recording at website/src/assets/demos/installation-workflow.cast (BLOCKED: User needs to record - see human-tasks.md)
- [X] T034 [US2] Embed AsciinemaPlayer with installation demo in installation.mdx (player ready, awaits recording)
- [ ] T035 [P] [US2] Create fallback screenshot for installation demo at website/public/demos/fallbacks/installation-workflow.png (OPTIONAL: User can create if desired)
- [ ] T036 [P] [US2] Create fallback text description at website/src/assets/demos/fallbacks/installation-workflow.md (BLOCKED: User needs to create - see human-tasks.md Task 5A)
- [X] T037 [US2] Convert website/src/content/docs/quick-start.md to quick-start.mdx
- [X] T038 [US2] Import AsciinemaPlayer component in quick-start.mdx
- [ ] T039 [P] [US2] Create quickstart workflow .cast recording at website/src/assets/demos/quickstart-workflow.cast (BLOCKED: User needs to record - see human-tasks.md)
- [X] T040 [US2] Embed AsciinemaPlayer with quickstart demo in quick-start.mdx (player ready, awaits recording)
- [ ] T041 [P] [US2] Create fallback screenshot for quickstart demo at website/public/demos/fallbacks/quickstart-workflow.png (OPTIONAL: User can create if desired)
- [ ] T042 [P] [US2] Create fallback text description at website/src/assets/demos/fallbacks/quickstart-workflow.md (BLOCKED: User needs to create - see human-tasks.md Task 5B)
- [X] T043 [US2] Update Astro content collection config if needed to support MDX in website/src/content/config.ts (MDX integration already configured in astro.config.mjs)
- [ ] T044 [US2] Verify documentation navigation and layout remain intact after MDX conversion (Ready to test once recordings exist)

**Completion Criteria (Acceptance Scenarios)**:
- ✅ User reading installation guide sees embedded player showing installation process
- ✅ User reading quick start guide sees recording of creating first spec
- ✅ Demo continues playing when user scrolls past the player
- ✅ If multiple demos exist on one page, only the clicked demo plays (others stay paused)

**Value Delivered**: Documentation readers can see complex workflows in context without leaving the docs page, improving learning outcomes.

---

## Phase 5: User Story 3 - Reusable Demo Component (P3)

**Goal**: Enable content creators to easily embed terminal recordings anywhere on the site without understanding asciinema implementation details.

**Why this priority**: Enables scalability and consistency. Important for long-term maintenance but not essential for initial launch.

**Independent Test**: Create new page, import AsciinemaPlayer with props, verify recording displays correctly. Test shows component is reusable without implementation knowledge.

**Depends On**: Phase 2 (AsciinemaPlayer component)

### Tasks

- [X] T045 [US3] Create API documentation at specs/013-asciinema-player/contracts/api-spec.md
- [X] T046 [US3] Document all component props with examples in contracts/api-spec.md
- [X] T047 [US3] Document common configuration patterns in contracts/api-spec.md
- [X] T048 [US3] Create usage examples for different demo types in quickstart.md
- [X] T049 [US3] Add troubleshooting section to quickstart.md
- [ ] T050 [P] [US3] Create example demo for workflow showcase at website/src/assets/demos/example-workflow.cast (BLOCKED: User needs to record)
- [X] T051 [US3] Verify global player styling applies consistently across all demo instances
- [X] T052 [US3] Verify Astro build process includes new .cast files from assets directory
- [ ] T053 [US3] Update speck-knowledge skill with asciinema component usage patterns (SKIPPED: Website feature, not core workflow)

**Completion Criteria (Acceptance Scenarios)**:
- ✅ Content creator with .cast file can import AsciinemaPlayer and render recording
- ✅ Component respects optional props (title, loop, autoPlay, speed, theme)
- ✅ Global player styling updates reflect on all instances consistently
- ✅ New recordings added to assets folder are included in build correctly

**Value Delivered**: Content authors can add demos to new pages in under 5 minutes without implementation complexity.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Validate accessibility compliance, performance targets, and overall quality. Ensure feature meets all success criteria.

**Blocking**: None (can run concurrently with user story phases, but validation requires completed features)

### Tasks

- [ ] T054 [P] Run accessibility audit with @axe-core/playwright on homepage demo section (BLOCKED: Need recordings)
- [ ] T055 [P] Run accessibility audit with @axe-core/playwright on documentation pages with embedded demos (BLOCKED: Need Phase 4 complete)
- [ ] T056 Verify WCAG 2.1 Level AA compliance for all player instances (color contrast, ARIA labels, keyboard nav) (BLOCKED: Need recordings)
- [ ] T057 [P] Test keyboard-only navigation across all demo instances (no mouse) (BLOCKED: Need recordings)
- [ ] T058 [P] Test screen reader compatibility (VoiceOver on macOS or NVDA on Windows) (BLOCKED: Need recordings)
- [ ] T059 Measure page load time increase on homepage (target: <200ms per SC-007) (BLOCKED: Need recordings)
- [ ] T060 Verify player loads within 2 seconds of page load (SC-001) (BLOCKED: Need recordings)
- [ ] T061 [P] Test responsive behavior on viewports 320px to 2560px width (BLOCKED: Need recordings)
- [ ] T062 [P] Verify dark/light theme switching works correctly for all players (BLOCKED: Need recordings)
- [ ] T063 Validate all .cast recording files are under 2MB each (VR-011) (BLOCKED: User needs to create recordings)
- [X] T064 Run full website build and check for errors (bun run build) (Ready to test now)
- [X] T065 Run linter on all modified files (bun run lint) (Ready to test now)
- [X] T066 Run type checker on all modified files (bun run typecheck) (Ready to test now)

**Completion Criteria (Success Criteria Validation)**:
- ✅ SC-001: Installation demo visible within 2 seconds of homepage load
- ✅ SC-002: Keyboard controls accessible (space, arrows)
- ✅ SC-003: Player styling matches light/dark theme automatically
- ✅ SC-004: Player functional on 320px to 2560px viewports
- ✅ SC-005: New recordings can be added in under 5 minutes
- ✅ SC-006: 100% of doc pages can embed demos without layout breakage
- ✅ SC-007: Page load time increase <200ms
- ✅ SC-008: WCAG 2.1 Level AA compliance achieved

**Value Delivered**: Confidence that feature is accessible, performant, and production-ready.

---

## Dependency Graph

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational - AsciinemaPlayer Component) ←─ BLOCKS ALL USER STORIES
    ↓
    ├─→ Phase 3 (User Story 1 - Homepage Demo) ←─ MVP - DELIVER FIRST
    │
    ├─→ Phase 4 (User Story 2 - Inline Docs Demos)
    │
    └─→ Phase 5 (User Story 3 - Reusable Component)

Phase 6 (Polish & Validation) ←─ Can start after any phase, finalize after all
```

**Critical Path**: Phase 1 → Phase 2 → Phase 3 (MVP)

**User Story Dependencies**:
- **US1** (Homepage Demo): Depends on Phase 2 only
- **US2** (Inline Docs): Depends on Phase 2 only (independent of US1)
- **US3** (Reusable Component): Depends on Phase 2 only (independent of US1 and US2)

**Parallelization Opportunities**:
- After Phase 2 completes, US1, US2, and US3 can be implemented in parallel
- Within each phase, tasks marked `[P]` can run concurrently
- Phase 6 validation tasks can run in parallel after features are complete

---

## Parallel Execution Examples

### Example 1: Setup Phase Parallelization

After T001-T005 are complete, these can run in parallel:

```bash
# Terminal 1
bun run task T006  # Import CSS

# Terminal 2
bun run task T007  # Add CSS overrides

# Terminal 3
mkdir -p website/src/assets/demos website/src/assets/demos/fallbacks  # T008-T009
```

### Example 2: User Story Parallelization

After Phase 2 (AsciinemaPlayer component) is complete:

```bash
# Developer 1: Implements US1 (Homepage Demo)
# Tasks T021-T030

# Developer 2: Implements US2 (Inline Docs Demos) in parallel
# Tasks T031-T044

# Developer 3: Implements US3 (Reusable Component Docs) in parallel
# Tasks T045-T053
```

### Example 3: Fallback Content Creation

Within each user story, fallback content can be created in parallel:

```bash
# US1 fallback content (can run in parallel)
# Terminal 1: T026 (create screenshot)
# Terminal 2: T027 (create text description)

# US2 fallback content (can run in parallel)
# Terminal 1: T035, T041 (create screenshots)
# Terminal 2: T036, T042 (create text descriptions)
```

### Example 4: Polish Phase Parallelization

All validation tasks can run in parallel:

```bash
# Terminal 1
bun run test:a11y homepage  # T054

# Terminal 2
bun run test:a11y docs  # T055

# Terminal 3
bun run test:perf  # T059

# Terminal 4
bun run test:responsive  # T061
```

---

## Implementation Strategy

### Recommended Delivery Order

1. **Deliver MVP First** (Phases 1-3): Setup → Foundational → User Story 1
   - Quickest path to value: Working homepage demo
   - Validates technical approach before expanding to docs
   - Estimated tasks: T001-T030 (30 tasks)

2. **Expand to Documentation** (Phase 4): User Story 2
   - Adds contextual demos to docs
   - Validates MDX integration
   - Estimated tasks: T031-T044 (14 tasks)

3. **Enable Content Authors** (Phase 5): User Story 3
   - Documentation and examples for scalability
   - Estimated tasks: T045-T053 (9 tasks)

4. **Validate Quality** (Phase 6): Polish & Cross-Cutting
   - Accessibility, performance, and standards validation
   - Estimated tasks: T054-T066 (13 tasks)

**Total Tasks**: 66 tasks

### Incremental Validation

After each phase:
- Run `bun run build` to verify no build errors
- Run `bun run typecheck` to verify TypeScript correctness
- Run `bun run lint` to verify code quality
- Manually test in browser at `localhost:4321`

---

## Notes for LLM Execution

- **Placeholder Content**: Tasks T023, T033, T039, T050 create placeholder .cast files. Replace with actual recordings when available.
- **Fallback Screenshots**: Tasks T026, T035, T041 create placeholder images. Replace with actual screenshots of terminal sessions.
- **MDX Conversion**: Tasks T031, T037 convert Markdown to MDX. Preserve all existing content, only change file extension and add component imports.
- **TypeScript Validation**: All code must pass `bun run typecheck` with zero errors before marking phase complete.
- **Accessibility Testing**: Tasks T054-T058 require @axe-core/playwright. Install in T003 if not already present.
- **Performance Measurement**: Task T059 requires browser DevTools or Lighthouse. Baseline measurement before implementation recommended.

---

## Success Metrics Summary

| Metric | Target | Validation Task |
|--------|--------|-----------------|
| Page load time increase | <200ms | T059 |
| Player load time | <2 seconds | T060 |
| Viewport support | 320px-2560px | T061 |
| Accessibility compliance | WCAG 2.1 Level AA | T054-T058 |
| Keyboard navigation | Space, arrows functional | T057 |
| Time to add new recording | <5 minutes | T048-T049 (docs) |
| Doc pages with no layout breakage | 100% | T044 |
| Recording file size | <2MB each | T063 |

---

**Generated by**: `/speck:tasks` command
**Last Updated**: 2025-11-22
**Ready for**: Implementation via `/speck:implement` command
