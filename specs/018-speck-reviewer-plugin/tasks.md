# Tasks: Speck Reviewer Plugin

**Input**: Design documents from `/specs/018-speck-reviewer-plugin/`
**Prerequisites**: plan.md (required), spec.md (required for user stories),
research.md, data-model.md, contracts/

**Tests**: Included per plan.md TDD requirement (Phase testing strategy)

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md monorepo structure:

- Root: `.claude-plugin/marketplace.json`
- Plugin: `plugins/speck-reviewer/`
- CLI: `plugins/speck-reviewer/cli/src/`
- Tests: `tests/unit/`, `tests/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and monorepo plugin structure

- [x] T001 Create `plugins/` directory structure for monorepo layout
- [x] T002 Create `plugins/speck-reviewer/` directory with subdirectories:
      `.claude-plugin/`, `commands/`, `skills/pr-review/`, `cli/src/`,
      `cli/dist/`
- [x] T003 [P] Initialize `plugins/speck-reviewer/cli/package.json` with Bun
      runtime configuration
- [x] T004 [P] Create `plugins/speck-reviewer/cli/tsconfig.json` with strict
      TypeScript settings
- [x] T005 Migrate existing speck plugin to `plugins/speck/` directory structure
      (per FR-004)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core CLI infrastructure that MUST be complete before ANY user story
can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create `plugins/speck-reviewer/cli/src/logger.ts` with
      debug/info/warn/error levels and SPECK_DEBUG env support
- [x] T007 [P] Create `plugins/speck-reviewer/cli/src/types.ts` with core
      interfaces: ReviewSession, FileCluster, ClusterFile, ReviewComment,
      CommentEdit, QAEntry, SpecContext (per data-model.md)
- [x] T008 Create `plugins/speck-reviewer/cli/src/index.ts` with command
      dispatch pattern and help/version commands
- [x] T009 [P] Create `tests/unit/logger.test.ts` with tests for logging levels
      and debug mode

**Checkpoint**: Foundation ready - user story implementation can now begin ✓

---

## Phase 3: User Story 1 - Install Speck Reviewer Plugin (Priority: P1)

**Goal**: Enable plugin installation via marketplace with `/review` command
available

**Independent Test**: Run `/plugin marketplace add` and
`/plugin install speck-reviewer@speck-market`, verify `/review` command becomes
available

### Tests for User Story 1

- [x] T010 [P] [US1] [TEST] Create validation test for plugin.json schema in
      `tests/unit/plugin-manifest.test.ts`
- [x] T011 [P] [US1] [TEST] Create validation test for marketplace.json schema
      in `tests/unit/marketplace.test.ts`

### Implementation for User Story 1

- [x] T012 [P] [US1] Create `.claude-plugin/marketplace.json` at repository root
      listing both speck and speck-reviewer plugins (per
      contracts/plugin-manifest.md)
- [x] T013 [P] [US1] Create `plugins/speck-reviewer/.claude-plugin/plugin.json`
      with name, description, commands, skills (per
      contracts/plugin-manifest.md)
- [x] T014 [US1] Create `plugins/speck-reviewer/commands/review.md` slash
      command that loads pr-review skill (per contracts/plugin-manifest.md)
- [x] T015 [US1] Verify both plugins (speck and speck-reviewer) can be installed
      without conflicts (SC-006) [Tests pass: 28 tests, no conflicts]

**Checkpoint**: Plugin installable and `/review` command available ✓

---

## Phase 4: User Story 2 - Review a PR with Cluster Analysis (Priority: P1)

**Goal**: Analyze PR diffs, group files into semantic clusters, and guide
reviewer through structured walkthrough

**Independent Test**: Check out a PR with 5+ files, run review command, verify
cluster analysis and guided walkthrough functionality

### Tests for User Story 2

- [x] T016 [P] [US2] [TEST] Create `tests/unit/state.test.ts` with tests for
      session creation, loading, saving, schema versioning
- [x] T017 [P] [US2] [TEST] Create `tests/unit/clustering.test.ts` with tests
      for file grouping, directory-based clustering, cross-cutting detection,
      large cluster subdivision (50+ files)

### Implementation for User Story 2

- [x] T018 [US2] Extract and adapt `state.ts` from POC to
      `plugins/speck-reviewer/cli/src/state.ts` with ReviewSession, atomic file
      writes, schema versioning, AND immutable helpers per FR-029:
      `updateCommentState()`, `recordCommentEdit()`, `recordQuestion()`,
      `isReviewComplete()`, `setNarrative()`, `setClusters()`
- [x] T019 [US2] Extract and adapt `clustering.ts` from POC to
      `plugins/speck-reviewer/cli/src/clustering.ts` with two-stage heuristic
      clustering (FR-010), AND advanced analysis per FR-028: `analyzeImports()`,
      `topologicalSort()`, `detectTestPairs()`
- [x] T020 [US2] Implement `analyze` command in
      `plugins/speck-reviewer/cli/src/index.ts` that outputs clustered JSON with
      narrative summary (FR-011, per contracts/cli-commands.md)
- [x] T021 [US2] Implement `state show` command to display current session
      progress with cluster status
- [x] T022 [US2] Implement `state clear` command to remove session state file
- [x] T023 [US2] Implement `files` command to list changed files with metadata
- [x] T024 [US2] Add cluster navigation support (next/back/go-to logic) in
      state.ts for skill-driven navigation

**Checkpoint**: Cluster analysis works, session state persists to
`.speck/review-state.json` ✓

---

## Phase 5: User Story 3 - Speck-Aware Review Context (Priority: P1)

**Goal**: Load Speck specification for feature branches and include in review
context

**Independent Test**: Create a branch with spec in `specs/NNN-name/spec.md`, run
review, verify spec context is loaded and referenced

### Tests for User Story 3

- [x] T025 [P] [US3] [TEST] Create `tests/unit/speck.test.ts` with tests for
      spec detection via specs/ directory and .speck/branches.json

### Implementation for User Story 3

- [x] T026 [US3] Create `plugins/speck-reviewer/cli/src/speck.ts` with spec
      detection logic (check `specs/{branch-name}/spec.md` and
      `.speck/branches.json`)
- [x] T027 [US3] Implement spec parsing in speck.ts to extract requirements,
      user stories, success criteria (per SpecContext in data-model.md)
- [x] T028 [US3] Implement `spec-context` command in
      `plugins/speck-reviewer/cli/src/index.ts` returning JSON spec context
- [x] T029 [US3] Integrate spec context into `analyze` command output when spec
      exists
- [x] T030 [US3] Ensure graceful degradation when no spec exists (FR-022) -
      proceed with standard review

**Checkpoint**: Speck specs are loaded for feature branches, review proceeds
normally without spec ✓

---

## Phase 6: User Story 4 - Stage and Post Review Comments (Priority: P2)

**Goal**: Stage, refine, and batch-post review comments to GitHub with final
review action

**Independent Test**: Generate comments, modify with "reword"/"skip", post with
"post all then approve"

### Tests for User Story 4

- [ ] T031 [P] [US4] [TEST] Create `tests/unit/github.test.ts` with mocked tests
      for PR operations, comment posting, batch operations, review submission
      [DEFERRED - requires mocking]

### Implementation for User Story 4

- [x] T032 [US4] Extract and adapt `github.ts` from POC to
      `plugins/speck-reviewer/cli/src/github.ts` with gh CLI wrapper functions,
      AND advanced features per FR-030: `ghGraphQL()`,
      `fetchReviewThreadResolvedStatus()`, `fetchExistingComments()` with reply
      counts
- [x] T033 [US4] Implement `comment <file> <line> <body>` command in index.ts
      for line comments (FR-015)
- [x] T034 [US4] Implement `comment-reply <comment-id> <body>` command for
      thread replies
- [x] T035 [US4] Implement `comment-delete <comment-id>` command
- [x] T036 [US4] Implement `list-comments` command showing open/resolved status
      (per contracts/cli-commands.md)
- [x] T037 [US4] Implement `review <event> [body]` command for
      approve/request-changes/comment (FR-017)
- [x] T038 [US4] Add staged comment management in state.ts with states:
      suggested/staged/skipped/posted
- [x] T039 [US4] Add comment edit history tracking in state.ts (CommentEdit per
      data-model.md)
- [x] T040 [US4] Add batch posting logic in github.ts for "post all", "post 1,
      3", "post all then approve" (FR-018) [Implemented in review command]
- [ ] T041 [US4] Add comment combine functionality in state.ts to merge multiple
      comments (FR-016) [DEFERRED - skill-driven operation]
- [x] T042 [US4] Add error handling with retry support - preserve staged
      comments on GitHub API failure (FR-018a)

**Checkpoint**: Comments can be staged, refined, and posted to GitHub ✓

---

## Phase 7: User Story 5 - Resume Interrupted Review (Priority: P2)

**Goal**: Resume review session after interruption with progress preserved

**Independent Test**: Start review, close session, re-run `/review`, verify
state is restored

### Implementation for User Story 5

- [x] T043 [US5] Add resume detection logic in state.ts - check for existing
      session matching current PR
- [x] T044 [US5] Add resume prompt output when existing session found (offer to
      resume or start fresh) [In analyze command]
- [x] T045 [US5] Add stale session detection - warn when state exists for
      different PR [In analyze command]
- [x] T046 [US5] Preserve reviewed clusters, staged comments, and current
      position on resume

**Checkpoint**: Review sessions can be resumed after interruption ✓

---

## Phase 8: User Story 6 - Self-Review Mode (Priority: P3)

**Goal**: Self-review mode posts issue comments (not review comments) and hides
approve/request-changes

**Independent Test**: Review a PR where current user is author, verify issue
comments and hidden actions

### Implementation for User Story 6

- [x] T047 [US6] Implement `check-self-review <author>` command in index.ts
      returning JSON isSelfReview result (FR-023)
- [x] T048 [US6] Add reviewMode field to ReviewSession state
      (normal/self-review)
- [x] T049 [US6] Modify comment posting in github.ts to use issue comments in
      self-review mode (FR-024)
- [x] T050 [US6] Add self-review mode detection in analyze output

**Checkpoint**: Self-review mode works with appropriate comment type and hidden
actions ✓

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Skill creation, integration testing, edge case handling, and final
validation

- [x] T051 Create `plugins/speck-reviewer/skills/pr-review/SKILL.md` with FULL
      comprehensive review guidance per FR-026 (~1100 lines): example session,
      output formats, cluster refinement, Q&A handling, edge cases, CLI
      reference, state schema, read-only mode, navigation commands, comment
      workflow
- [ ] T052 [P] [TEST] Create `tests/integration/cli-workflow.test.ts` with
      end-to-end CLI workflow tests [DEFERRED - requires live gh CLI]
- [ ] T053 [P] Update root CLAUDE.md with speck-reviewer plugin information [See
      CLAUDE.md auto-update]
- [x] T054 [P] Add edge case handling: gh CLI auth errors with clear
      instructions in github.ts
- [x] T055 [P] Add edge case handling: malformed spec graceful degradation in
      speck.ts
- [x] T056 [P] Add edge case handling: fork PR limitations documentation in
      SKILL.md
- [x] T057 Build CLI binary:
      `bun build src/index.ts --compile --outfile dist/speck-review`
- [x] T058 Run `bun test` to verify all tests pass (72 tests pass)
- [x] T059 Run `bun run lint` to verify code quality (pre-existing error in
      handoff.ts, speck-reviewer code clean)
- [ ] T060 Verify plugin installation and coexistence manually (per SC-006)
      [Manual verification needed]

**Implementation Status**: Tasks unchecked for POC parity restoration. See Phase
9b.

---

## Phase 9b: POC Parity Restoration (Priority: P1)

**Purpose**: Restore full behavioral richness from the original
claude-pr-review-extensions-poc that was lost during initial extraction.
Addresses critical regressions identified in the POC comparison analysis.

**POC Source**: `../claude-pr-review-extensions-poc`

### Output Formatting Module (FR-025)

- [x] T065 [P] Create `plugins/speck-reviewer/cli/src/links.ts` with output
      formatting module extracted from POC:
  - `formatActionMenu()` - Generate lettered action menus (a/b/c pattern)
  - `formatReviewTable()` - Structured comment table with file:line references
  - `getNavActions()` - Navigation action presets (files, comments, state)
  - `getReviewActions()` - Review action presets (approve, request-changes,
    comment)
  - `escapeForShell()` - Shell-safe command escaping
  - `diffLink()`, `fileLink()`, `commentLink()` - Link generators

### Utility Commands (FR-027)

- [x] T066 [P] Implement `link <file> [line]` command in index.ts - Generate
      file:line navigation reference
- [x] T067 [P] Implement `actions` command in index.ts - Display navigation
      action menu using links.ts
- [x] T068 [P] Implement `run-actions` command in index.ts - Display review
      action menu using links.ts
- [x] T069 [P] Implement `review-table [--example]` command in index.ts -
      Generate formatted comment table
- [x] T070 [P] Implement `submit-actions [body]` command in index.ts - Display
      submit review menu
- [x] T071 [P] Implement `logs` command in index.ts - Display log file locations
      and debug instructions

### Tests for POC Parity

- [x] T072 [P] [TEST] Create `plugins/speck-reviewer/cli/tests/links.test.ts`
      with tests for action menu formatting, review tables, shell escaping
- [x] T073 [P] [TEST] Create `plugins/speck-reviewer/cli/tests/state.test.ts`
      with tests for immutable helpers: updateCommentState, recordCommentEdit,
      recordQuestion, isReviewComplete
- [x] T074 [P] [TEST] Create
      `plugins/speck-reviewer/cli/tests/clustering.test.ts` with tests for
      analyzeImports, topologicalSort, detectTestPairs

**Checkpoint**: Full POC feature parity achieved ✓

---

## Phase 10: Website Documentation (Constitution X & XII)

**Purpose**: Document plugin extensibility and speck-reviewer on the website.
Required by Constitution Principle X (Website Documentation Synchronization) and
Principle XII (Documentation Skill Synchronization).

**Rationale**: This feature adds user-facing commands (`/review`), a new plugin
(`speck-reviewer`), and new capabilities (cluster-based PR review, Speck-aware
reviews). Per constitution, these triggers MUST result in website documentation
updates.

- [x] T061 [P] Create `website/src/content/docs/plugins/index.md` describing
      Speck's optional plugin architecture and extensibility model
- [x] T062 [P] Create `website/src/content/docs/plugins/speck-reviewer.md` with
      installation guide, usage examples, and feature overview
- [x] T063 Update website navigation (`website/src/components/Sidebar.astro`) to
      include Plugins section
- [x] T064 Update `speck-help` skill (`.claude/skills/speck-help/SKILL.md`) to
      document that Speck can be extended with optional plugins, with
      speck-reviewer as the first example

**Checkpoint**: Website documents plugin extensibility, speck-reviewer is
discoverable ✓

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user
  stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1, US2, US3 are all P1 priority and can proceed in parallel
  - US4, US5 are P2 priority, depend on US2 (state management)
  - US6 is P3 priority, depends on US4 (github.ts)
- **Polish (Phase 9)**: Depends on all user stories being complete
- **POC Parity (Phase 9b)**: Depends on Phase 9 baseline. PRIORITY P1 - restores
  critical functionality
- **Website Documentation (Phase 10)**: Depends on Phase 9b completion. REQUIRED
  by Constitution X and XII.

### User Story Dependencies

- **User Story 1 (P1)**: Plugin installation - foundational only, no
  dependencies on other stories
- **User Story 2 (P1)**: Cluster analysis - foundational only, no dependencies
  on other stories
- **User Story 3 (P1)**: Speck context - foundational only, may integrate with
  US2 analyze command (T029)
- **User Story 4 (P2)**: Comment management - depends on US2 state.ts (T018) for
  staged comments
- **User Story 5 (P2)**: Resume session - depends on US2 state.ts (T018) for
  session persistence
- **User Story 6 (P3)**: Self-review - depends on US4 github.ts (T032) for
  comment posting

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types/interfaces before implementations
- Core logic before command handlers
- Story complete before moving to next priority
- Commit after each task or logical group

### Parallel Opportunities

**Phase 1-2 Parallel**:

- T003, T004 can run in parallel (package.json, tsconfig.json)
- T007, T009 can run in parallel (types.ts, logger.test.ts)

**User Story Phase Parallel (after Foundational)**:

- US1, US2, US3 can all start in parallel (all P1, independent)
- T010, T011 can run in parallel (plugin validation tests)
- T012, T013 can run in parallel (marketplace.json, plugin.json)
- T016, T017 can run in parallel (state.test.ts, clustering.test.ts)
- T025, T031 can run in parallel (spec tests, github tests)

**Polish Phase Parallel**:

- T052, T053, T054, T055, T056 can run in parallel

**POC Parity Phase Parallel (Phase 9b)**:

- T065 (links.ts) MUST complete first - other commands depend on it
- T066, T067, T068, T069, T070, T071 can run in parallel (different commands)
- T072, T073, T074 can run in parallel (different test files)

**Website Documentation Phase Parallel (Phase 10)**:

- T061, T062 can run in parallel (different documentation pages)
- T063 depends on T061, T062 (navigation needs pages to exist)
- T064 can run in parallel with T061-T063 (different file: speck-help skill)

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Create tests/unit/state.test.ts with tests for session creation, loading, saving"
Task: "Create tests/unit/clustering.test.ts with tests for file grouping, clustering"

# After tests fail, implement in order:
Task: "Extract state.ts from POC"
Task: "Extract clustering.ts from POC"

# Then CLI commands (some parallel):
Task: "Implement analyze command"
Task: "Implement state show command"
Task: "Implement state clear command"
Task: "Implement files command"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Plugin installation)
4. Complete Phase 4: User Story 2 (Cluster analysis)
5. Complete Phase 5: User Story 3 (Speck-aware context)
6. **STOP and VALIDATE**: Test all P1 stories independently
7. Deploy/demo if ready - core review functionality complete

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Plugin installable (MVP entry point!)
3. Add User Story 2 -> Cluster analysis works (MVP core!)
4. Add User Story 3 -> Speck integration works (MVP differentiation!)
5. Add User Story 4 -> Comment management (enhanced workflow)
6. Add User Story 5 -> Session resume (large PR support)
7. Add User Story 6 -> Self-review (complete feature set)

### Suggested MVP Scope

**MVP = User Stories 1, 2, 3** (all P1)

- Plugin can be installed
- PRs can be analyzed with clusters
- Speck specs are loaded when available
- Basic workflow established for P2/P3 features

---

## Notes

- [P] tasks = different files, no dependencies
- [TEST] marker = test task per Constitution XI (TDD)
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (red-green-refactor)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- POC extraction files: state.ts (407 lines), clustering.ts (476 lines),
  github.ts (~300 lines), links.ts (191 lines), SKILL.md (1114 lines)
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break
  independence
- Total tasks: 74 (T001-T074)
- POC parity tasks: T065-T074 (Phase 9b)
- Unchecked for enhancement: T018, T019, T032, T051 (require FR-025 to FR-030
  implementation)
