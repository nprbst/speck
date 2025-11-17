---

description: "Task list for website content update for plugin installation"
---

# Tasks: Website Content Update for Plugin Installation

**Input**: Design documents from `/specs/006-website-content-update/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), data-model.md (complete), contracts/ (complete)

**Tests**: No test tasks included - tests not requested in feature specification

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Website content: `website/src/content/docs/`
- Homepage: `website/src/pages/`
- All paths relative to repository root

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and validation prep

- [X] T001 Verify Astro project structure exists and website builds successfully
- [X] T002 Review existing website content structure in website/src/content/docs/
- [X] T003 Create backup branch or commit point before content changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational phase needed - content updates can proceed directly to user stories

**Note**: Since this feature involves independent content file updates with no shared infrastructure changes, we can proceed directly to user story implementation.

---

## Phase 3: User Story 1 - New User Installation (Priority: P1) 🎯 MVP

**Goal**: Provide clear, accurate plugin installation instructions so new users can install Speck in under 5 minutes using the Claude plugin system

**Independent Test**: Follow installation instructions as a new user with no prior Speck installation and verify successful installation via the Claude plugin system completes in under 5 minutes

### Implementation for User Story 1

- [X] T004 [P] [US1] Update installation.md: Replace git clone prerequisites section with Claude Code version requirement in website/src/content/docs/getting-started/installation.md
- [X] T005 [P] [US1] Update installation.md: Replace "Clone Speck Repository" section with "Install Speck Plugin" section using /plugin command workflow in website/src/content/docs/getting-started/installation.md
- [X] T006 [P] [US1] Update installation.md: Add marketplace setup instructions and plugin installation steps in website/src/content/docs/getting-started/installation.md
- [X] T007 [P] [US1] Update installation.md: Update verification section to check plugin installation instead of git clone in website/src/content/docs/getting-started/installation.md
- [X] T008 [P] [US1] Update installation.md: Update troubleshooting section for plugin-specific issues (version compatibility, marketplace connection) in website/src/content/docs/getting-started/installation.md
- [X] T009 [P] [US1] Update installation.md: Add version compatibility section with minimum Claude Code version and upgrade instructions in website/src/content/docs/getting-started/installation.md
- [X] T010 [P] [US1] Update installation.md: Update frontmatter lastUpdated field to current date in website/src/content/docs/getting-started/installation.md
- [X] T011 [P] [US1] Update quick-start.md: Simplify prerequisites to Claude Code with plugin support only in website/src/content/docs/getting-started/quick-start.md
- [X] T012 [P] [US1] Update quick-start.md: Replace git clone installation section with /plugin workflow in website/src/content/docs/getting-started/quick-start.md
- [X] T013 [P] [US1] Update quick-start.md: Remove "Install Dependencies" section (not needed for plugin) in website/src/content/docs/getting-started/quick-start.md
- [X] T014 [P] [US1] Update quick-start.md: Update frontmatter lastUpdated field to current date in website/src/content/docs/getting-started/quick-start.md
- [X] T015 [P] [US1] Update homepage: Change hero headline to emphasize "Claude Plugin" status in website/src/pages/index.astro
- [X] T016 [P] [US1] Update homepage: Update Quick Start Preview step 2 from "Clone Speck" to "Install Plugin" in website/src/pages/index.astro
- [X] T017 [P] [US1] Update homepage: Update CTA links to point to updated plugin installation guide in website/src/pages/index.astro
- [X] T018 [US1] Validate US1: Verify no "git clone" references remain in primary installation paths (getting-started directory)
- [X] T019 [US1] Validate US1: Verify /plugin command is documented in installation.md and quick-start.md
- [X] T020 [US1] Validate US1: Build website and manually test installation guide as new user (target: under 5 minutes)

**Checkpoint**: At this point, new users can successfully install Speck via plugin system with clear instructions (User Story 1 complete and independently testable)

---

## Phase 4: User Story 2 - Understanding the Speck skill (Priority: P2)

**Goal**: Document the Speck skill feature so users understand when and how to use natural language interaction versus slash commands

**Independent Test**: Review the documentation for the Speck skill feature and verify users can understand when and how to use it versus slash commands within 2 minutes

### Implementation for User Story 2

- [X] T021 [P] [US2] Update workflow.md: Add new section "Working with Speck: Two Ways to Interact" in website/src/content/docs/concepts/workflow.md
- [X] T022 [P] [US2] Update workflow.md: Document Speck skill capabilities (understanding specs, querying plans, checking tasks) in website/src/content/docs/concepts/workflow.md
- [X] T023 [P] [US2] Update workflow.md: Provide 5 skill example queries covering understanding, planning, tasks, workflow, and requirements categories in website/src/content/docs/concepts/workflow.md
- [X] T024 [P] [US2] Update workflow.md: Add decision guide section with table or visual for "when to use skill vs commands" in website/src/content/docs/concepts/workflow.md
- [X] T025 [P] [US2] Update workflow.md: Update each workflow phase section to mention skill usage alongside slash commands in website/src/content/docs/concepts/workflow.md
- [X] T026 [P] [US2] Update workflow.md: Update frontmatter lastUpdated field to current date in website/src/content/docs/concepts/workflow.md
- [X] T027 [P] [US2] Update reference.md: Add new top-level section "Speck skill" with overview and when to use in website/src/content/docs/commands/reference.md
- [X] T028 [P] [US2] Update reference.md: Document skill invocation (natural language in conversation) and list all capabilities in website/src/content/docs/commands/reference.md
- [X] T029 [P] [US2] Update reference.md: Provide 5 skill example queries with purposes in website/src/content/docs/commands/reference.md
- [X] T030 [P] [US2] Update reference.md: Add comparison table showing skill vs slash commands with use cases in website/src/content/docs/commands/reference.md
- [X] T031 [P] [US2] Update reference.md: Add plugin update instructions section using /plugin marketplace workflow in website/src/content/docs/commands/reference.md
- [X] T032 [P] [US2] Update reference.md: Update frontmatter lastUpdated field to current date in website/src/content/docs/commands/reference.md
- [X] T033 [P] [US2] Update quick-start.md: Add brief "Using the Speck skill" section with example queries in website/src/content/docs/getting-started/quick-start.md
- [X] T034 [P] [US2] Update quick-start.md: Update "Your First Specification" to include skill usage example alongside /speck.specify command in website/src/content/docs/getting-started/quick-start.md
- [X] T035 [P] [US2] Update homepage: Update hero subheadline to mention skill feature alongside commands in website/src/pages/index.astro
- [X] T036 [P] [US2] Update homepage: Update "Claude-Native Commands" feature card to include skill in website/src/pages/index.astro
- [X] T037 [P] [US2] Update homepage: Update Quick Start Preview step 3 to mention skill option in website/src/pages/index.astro
- [X] T038 [US2] Validate US2: Verify at least 5 skill examples present across workflow.md and reference.md
- [X] T039 [US2] Validate US2: Verify decision guide exists and clearly distinguishes skill (questions) from commands (actions)
- [X] T040 [US2] Validate US2: Build website and manually test skill documentation clarity (target: understand in under 2 minutes)

**Checkpoint**: At this point, users can understand both installation (US1) AND the Speck skill feature (US2) independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [X] T041 [P] Update first-feature.md: Replace git clone references with plugin installation in website/src/content/docs/examples/first-feature.md
- [X] T042 [P] Update first-feature.md: Add skill usage examples showing both skill queries and slash commands in workflow in website/src/content/docs/examples/first-feature.md
- [X] T043 [P] Update first-feature.md: Update frontmatter lastUpdated field to current date in website/src/content/docs/examples/first-feature.md
- [X] T044 [P] Validate all code blocks have language identifiers for syntax highlighting across all updated files
- [X] T045 [P] Validate all internal links use relative paths and work correctly across all updated files
- [X] T046 [P] Validate frontmatter in all updated files conforms to schema (title, description, category, order, lastUpdated)
- [X] T047 Run full website build (bun run build from website directory)
- [X] T048 [P] Run type checking (bun run typecheck from website directory)
- [X] T049 Manual testing: Test all internal links on updated pages work correctly
- [X] T050 Manual testing: Verify responsive design on mobile for updated pages
- [X] T051 Content validation: Grep search for "git clone" in getting-started directory (should return 0 results)
- [X] T052 Content validation: Grep search for "/plugin" references across docs (should have multiple results)
- [X] T053 Content validation: Grep search for "Speck skill" references (should appear in workflow.md and reference.md)
- [X] T054 Final review: Verify all 9 functional requirements (FR-001 through FR-009) are implemented
- [X] T055 Final review: Verify all 5 success criteria (SC-001 through SC-005) can be validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Skipped - no blocking prerequisites needed
- **User Story 1 (Phase 3)**: Can start after Setup completion - No dependencies on other stories
- **User Story 2 (Phase 4)**: Can start after Setup completion - Independent of US1, but logically follows installation docs
- **Polish (Phase 5)**: Depends on both US1 and US2 being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent - installation documentation updates
- **User Story 2 (P2)**: Independent - skill documentation (though homepage changes reference both US1 and US2)

### Within Each User Story

**User Story 1 (Installation)**:
- T004-T010: All installation.md updates can run in parallel (different sections)
- T011-T014: All quick-start.md updates can run in parallel (different sections)
- T015-T017: All homepage updates can run in parallel (different sections)
- T018-T020: Validation must run after all implementation tasks complete

**User Story 2 (Skill)**:
- T021-T026: All workflow.md updates can run in parallel (different sections)
- T027-T032: All reference.md updates can run in parallel (different sections)
- T033-T034: Quick-start.md skill additions can run in parallel
- T035-T037: Homepage skill additions can run in parallel (different sections)
- T038-T040: Validation must run after all implementation tasks complete

### Parallel Opportunities

- **Within Setup**: All 3 tasks can run sequentially (quick verification tasks)
- **User Story 1**: Tasks T004-T017 (14 tasks) can all run in parallel - different files and different sections
- **User Story 2**: Tasks T021-T037 (17 tasks) can all run in parallel - different files and different sections
- **Between Stories**: US1 and US2 can be worked on in parallel by different team members after Setup
- **Polish Phase**: Tasks T041-T046 can all run in parallel - different files

---

## Parallel Example: User Story 1

```bash
# Launch all installation.md updates in parallel:
Task: "T004 Update installation.md prerequisites section"
Task: "T005 Update installation.md Clone section to Plugin section"
Task: "T006 Update installation.md marketplace setup instructions"
Task: "T007 Update installation.md verification section"
Task: "T008 Update installation.md troubleshooting section"
Task: "T009 Update installation.md version compatibility section"
Task: "T010 Update installation.md frontmatter"

# Launch all quick-start.md updates in parallel:
Task: "T011 Update quick-start.md prerequisites"
Task: "T012 Update quick-start.md installation section"
Task: "T013 Update quick-start.md remove dependencies section"
Task: "T014 Update quick-start.md frontmatter"

# Launch all homepage updates in parallel:
Task: "T015 Update homepage hero headline"
Task: "T016 Update homepage Quick Start Preview"
Task: "T017 Update homepage CTA links"
```

---

## Parallel Example: User Story 2

```bash
# Launch all workflow.md updates in parallel:
Task: "T021 Update workflow.md add Two Ways section"
Task: "T022 Update workflow.md skill capabilities"
Task: "T023 Update workflow.md 5 skill examples"
Task: "T024 Update workflow.md decision guide"
Task: "T025 Update workflow.md phase sections with skill usage"
Task: "T026 Update workflow.md frontmatter"

# Launch all reference.md updates in parallel:
Task: "T027 Update reference.md add Speck skill section"
Task: "T028 Update reference.md skill invocation and capabilities"
Task: "T029 Update reference.md 5 skill examples"
Task: "T030 Update reference.md comparison table"
Task: "T031 Update reference.md plugin update instructions"
Task: "T032 Update reference.md frontmatter"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 3: User Story 1 (T004-T020)
3. **STOP and VALIDATE**: Test User Story 1 independently
   - Follow installation guide as new user
   - Verify completion under 5 minutes
   - Verify no git clone references
4. Deploy/demo if ready

**Result**: New users can install Speck via plugin system (MVP achieved!)

### Incremental Delivery

1. Complete Setup → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - installation works!)
3. Add User Story 2 → Test independently → Deploy/Demo (skill documented!)
4. Add Polish → Final validation → Deploy/Demo (examples updated, all validated)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup together (quick - 3 tasks)
2. Once Setup is done:
   - **Developer A**: User Story 1 (Installation docs - T004-T020)
   - **Developer B**: User Story 2 (Skill docs - T021-T040)
3. Both developers can work completely independently on different files
4. Merge US1 first for MVP, then US2 for enhanced documentation
5. Together: Polish phase (T041-T055)

### Solo Developer Strategy

1. Complete Setup (15 minutes)
2. Complete User Story 1 (45-60 minutes) - MVP priority
3. Validate US1 independently
4. Complete User Story 2 (45-60 minutes)
5. Validate US2 independently
6. Complete Polish phase (30 minutes)

**Total estimated time**: 2.5-3 hours

---

## Notes

- [P] tasks = different files or different sections, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each logical group (e.g., all installation.md changes)
- Stop at each checkpoint to validate story independently
- No tests included - not requested in feature specification
- Focus on content accuracy and clarity

---

## Validation Checklist

### User Story 1 - Installation (FR-001, FR-003, FR-004, FR-007)

- [ ] FR-001: `/plugin` command documented as primary installation method
- [ ] FR-003: Git clone removed from primary installation workflow
- [ ] FR-004: Minimum Claude Code version documented with upgrade instructions
- [ ] FR-007: Plugin update instructions using `/plugin` marketplace workflow
- [ ] SC-001: Installation completes in under 5 minutes (manual test)
- [ ] SC-002: 100% `/plugins` references, zero git clone in primary paths

### User Story 2 - Skill Documentation (FR-002, FR-005, FR-006)

- [ ] FR-002: Speck skill feature documented in workflow.md and reference.md
- [ ] FR-005: 5 representative skill examples provided covering different categories
- [ ] FR-006: Decision guide explaining when to use skill vs slash commands
- [ ] SC-003: Skill vs commands distinction clear in under 2 minutes (manual test)
- [ ] SC-004: Content accurately reflects spec 002 (plugin) and spec 005 (skill)

### Cross-Cutting (FR-008, FR-009)

- [ ] FR-008: Examples updated to reflect plugin-based workflow
- [ ] FR-009: Homepage clearly indicates Speck is a Claude Plugin
- [ ] SC-005: Plugin update instructions clear and complete

### Quality Checks

- [ ] All code blocks have language identifiers
- [ ] All internal links use relative paths and work
- [ ] All external links open in new tab with proper rel attributes
- [ ] Frontmatter validates against schema for all updated files
- [ ] No broken images or assets
- [ ] Consistent terminology (skill vs commands, plugin vs git clone)
- [ ] Build succeeds without errors
- [ ] Type checking passes

---

## Task Summary

**Total Tasks**: 55

**By Phase**:
- Setup: 3 tasks
- Foundational: 0 tasks (skipped - no blocking prerequisites)
- User Story 1 (P1 - Installation): 17 tasks
- User Story 2 (P2 - Skill): 20 tasks
- Polish: 15 tasks

**By Story**:
- User Story 1: 17 tasks (T004-T020)
- User Story 2: 20 tasks (T021-T040)
- Cross-cutting: 18 tasks (Setup + Polish)

**Parallel Opportunities**:
- Within US1: 14 tasks can run in parallel (T004-T017)
- Within US2: 17 tasks can run in parallel (T021-T037)
- Between stories: US1 and US2 can be developed in parallel after Setup
- Polish phase: 7 tasks can run in parallel (T041-T046, T048)

**Suggested MVP Scope**: User Story 1 only (installation documentation)
- Enables new users to install Speck
- Can be deployed independently
- Provides immediate value

**Files Modified**: 7 files total
1. `website/src/content/docs/getting-started/installation.md` (US1)
2. `website/src/content/docs/getting-started/quick-start.md` (US1, US2)
3. `website/src/pages/index.astro` (US1, US2)
4. `website/src/content/docs/concepts/workflow.md` (US2)
5. `website/src/content/docs/commands/reference.md` (US2)
6. `website/src/content/docs/examples/first-feature.md` (Polish)
7. Multiple files for validation (Polish)

**Implementation Time Estimates**:
- Setup: 15 minutes
- User Story 1: 45-60 minutes (MVP)
- User Story 2: 45-60 minutes
- Polish: 30 minutes
- **Total**: 2.5-3 hours

**Independent Testing**:
- US1: Follow installation guide as new user (under 5 minutes)
- US2: Review skill documentation and understand distinction (under 2 minutes)
