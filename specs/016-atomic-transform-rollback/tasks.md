# Tasks: Atomic Transform Rollback

**Input**: Design documents from `/specs/016-atomic-transform-rollback/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Tests**: TDD required per Constitution Principle XI. Test tasks precede implementation tasks.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- Scripts: `.speck/scripts/`
- Tests: `tests/unit/`, `tests/integration/`
- Commands: `.claude/commands/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and test infrastructure

- [ ] T001 Create test fixtures directory structure at tests/fixtures/staging/
- [ ] T002 [P] Create mock upstream release fixture at tests/fixtures/upstream/v2.1.0/
- [ ] T003 [P] Create test utilities for temp directory management in tests/helpers/staging-helpers.ts
- [ ] T004 Capture test baseline: `bun test > specs/016-atomic-transform-rollback/test-baseline.txt`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core staging infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational Types

- [ ] T005 [P] [TEST] Write Zod schema tests for StagingContext in tests/unit/staging-types.test.ts
- [ ] T006 [P] [TEST] Write Zod schema tests for StagingMetadata in tests/unit/staging-types.test.ts
- [ ] T007 [P] [TEST] Write Zod schema tests for StagedFile in tests/unit/staging-types.test.ts

### Implementation for Foundational Types

- [ ] T008 Create StagingContext, StagingMetadata, StagedFile types with Zod schemas in .speck/scripts/common/staging-types.ts
- [ ] T009 Export types from .speck/scripts/common/index.ts

### Tests for Core Staging Functions

- [ ] T010 [P] [TEST] Write tests for createStagingDirectory() in tests/unit/staging-manager.test.ts
- [ ] T011 [P] [TEST] Write tests for listStagedFiles() in tests/unit/staging-manager.test.ts
- [ ] T012 [P] [TEST] Write tests for updateStagingStatus() in tests/unit/staging-manager.test.ts
- [ ] T013 [P] [TEST] Write tests for captureProductionBaseline() in tests/unit/staging-manager.test.ts

### Implementation for Core Staging Functions

- [ ] T014 Implement createStagingDirectory(version) in .speck/scripts/common/staging-manager.ts (red-green-refactor)
- [ ] T015 Implement listStagedFiles(context) in .speck/scripts/common/staging-manager.ts (red-green-refactor)
- [ ] T016 Implement updateStagingStatus(context, status) in .speck/scripts/common/staging-manager.ts (red-green-refactor)
- [ ] T017 Implement captureProductionBaseline(context) in .speck/scripts/common/staging-manager.ts (red-green-refactor)

**Checkpoint**: Foundation ready - staging directory creation and status tracking work

---

## Phase 3: User Story 1 - Successful Two-Agent Transformation (Priority: P1) 🎯 MVP

**Goal**: Both agents write to staging, then files atomically commit to production

**Independent Test**: Run transform-upstream on a test release, verify files appear in production only after both agents complete

### Tests for User Story 1

- [ ] T018 [P] [US1] [TEST] Write tests for commitStaging() success path in tests/unit/staging-manager.test.ts
- [ ] T019 [P] [US1] [TEST] Write integration test for full successful transformation in tests/integration/transform-success.test.ts

### Implementation for User Story 1

- [ ] T020 [US1] Implement commitStaging(context) with atomic moves in .speck/scripts/common/staging-manager.ts (red-green-refactor)
- [ ] T021 [US1] Add staging cleanup after successful commit in commitStaging() in .speck/scripts/common/staging-manager.ts
- [ ] T022 [US1] Create transform orchestration script at .speck/scripts/transform-upstream/index.ts
- [ ] T023 [US1] Implement staging context creation in orchestration script
- [ ] T024 [US1] Update Agent 1 OUTPUT_DIR to staging scripts directory in orchestration
- [ ] T025 [US1] Update Agent 2 OUTPUT_DIR to staging commands directory in orchestration
- [ ] T026 [US1] Add commit trigger after both agents succeed in orchestration
- [ ] T027 [US1] Modify transform-upstream command to use new orchestration in .claude/commands/speck.transform-upstream.md

**Checkpoint**: User Story 1 complete - successful transformations use staging and atomic commit

---

## Phase 4: User Story 2 - Agent 2 Failure with Clean Rollback (Priority: P1)

**Goal**: When Agent 2 fails, staging is deleted and production remains unchanged

**Independent Test**: Simulate Agent 2 failure, verify production directories unchanged after rollback

### Tests for User Story 2

- [ ] T028 [P] [US2] [TEST] Write tests for rollbackStaging() in tests/unit/staging-manager.test.ts
- [ ] T029 [P] [US2] [TEST] Write integration test for rollback on Agent 2 failure in tests/integration/transform-rollback.test.ts

### Implementation for User Story 2

- [ ] T030 [US2] Implement rollbackStaging(context) with directory cleanup in .speck/scripts/common/staging-manager.ts (red-green-refactor)
- [ ] T031 [US2] Add rollback trigger on Agent 2 failure in orchestration script .speck/scripts/transform-upstream/index.ts
- [ ] T032 [US2] Update transformation status to 'failed' with error message on rollback in orchestration
- [ ] T033 [US2] Verify production files unchanged after rollback (assertion in test)

**Checkpoint**: User Story 2 complete - Agent 2 failures trigger clean rollback

---

## Phase 5: User Story 4 - Agent 1 Failure (Priority: P2)

**Goal**: Agent 1 failure cleans up partial staging, Agent 2 never invoked

**Independent Test**: Provide upstream content that causes Agent 1 to fail, verify no staging directory remains

### Tests for User Story 4

- [ ] T034 [P] [US4] [TEST] Write tests for partial staging cleanup on early failure in tests/unit/staging-manager.test.ts
- [ ] T035 [P] [US4] [TEST] Write integration test for Agent 1 failure handling in tests/integration/transform-agent1-failure.test.ts

### Implementation for User Story 4

- [ ] T036 [US4] Add rollback trigger on Agent 1 failure in orchestration script .speck/scripts/transform-upstream/index.ts
- [ ] T037 [US4] Ensure Agent 2 is never invoked after Agent 1 failure
- [ ] T038 [US4] Add Agent 1 error details to transformation status

**Checkpoint**: User Story 4 complete - Agent 1 failures clean up properly

---

## Phase 6: User Story 3 - Recovery from Orphaned Staging (Priority: P2)

**Goal**: Detect orphaned staging directories and offer recovery options (commit/rollback/inspect)

**Independent Test**: Create orphaned staging manually, run transform-upstream, verify recovery prompt appears

### Tests for User Story 3

- [ ] T039 [P] [US3] [TEST] Write tests for detectOrphanedStaging() in tests/unit/staging-manager.test.ts
- [ ] T040 [P] [US3] [TEST] Write tests for getStagingStatus() in tests/unit/staging-manager.test.ts
- [ ] T041 [P] [US3] [TEST] Write tests for inspectStaging() in tests/unit/staging-manager.test.ts
- [ ] T042 [P] [US3] [TEST] Write integration test for orphan recovery flow in tests/integration/orphan-recovery.test.ts

### Implementation for User Story 3

- [ ] T043 [US3] Implement detectOrphanedStaging() in .speck/scripts/common/staging-manager.ts (red-green-refactor)
- [ ] T044 [US3] Implement getStagingStatus(directory) to read staging.json metadata in .speck/scripts/common/staging-manager.ts (red-green-refactor)
- [ ] T045 [US3] Implement inspectStaging(context) to display staging contents in .speck/scripts/common/staging-manager.ts (red-green-refactor)
- [ ] T046 [US3] Add orphan detection check at transform-upstream startup in .speck/scripts/transform-upstream/index.ts
- [ ] T047 [US3] Implement recovery prompt with commit/rollback/inspect options in orchestration
- [ ] T048 [US3] Block new transformation if unresolved staging exists (FR-007)

**Checkpoint**: User Story 3 complete - orphaned staging directories detected and recoverable

---

## Phase 7: File Conflict Detection (FR-012)

**Goal**: Warn user if production files changed during staging window

### Tests for Conflict Detection

- [ ] T049 [P] [TEST] Write tests for detectFileConflicts() in tests/unit/staging-manager.test.ts
- [ ] T050 [P] [TEST] Write integration test for conflict warning in tests/integration/conflict-detection.test.ts

### Implementation for Conflict Detection

- [ ] T051 Implement detectFileConflicts(context) comparing mtimes in .speck/scripts/common/staging-manager.ts (red-green-refactor)
- [ ] T052 Add conflict check before commit in commitStaging() in .speck/scripts/common/staging-manager.ts
- [ ] T053 Add conflict warning output with option to proceed or abort in orchestration

**Checkpoint**: Conflict detection complete - users warned about concurrent modifications

---

## Phase 8: Status & Reporting (FR-008, FR-011)

**Goal**: Clear status tracking and file manifest reporting

### Tests for Status & Reporting

- [ ] T054 [P] [TEST] Write tests for file manifest generation in tests/unit/staging-manager.test.ts
- [ ] T055 [P] [TEST] Write tests for extended transformation status in tests/unit/transformation-history.test.ts

### Implementation for Status & Reporting

- [ ] T056 Implement generateFileManifest(context) in .speck/scripts/common/staging-manager.ts (red-green-refactor)
- [ ] T057 Add file manifest display before commit (FR-011) in orchestration
- [ ] T058 Extend transformation history with staging states in .speck/scripts/common/transformation-history.ts
- [ ] T059 Add rollback reason tracking to transformation status

**Checkpoint**: Status and reporting complete - clear visibility into transformation state

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T060 Run bun preflight and fix any issues
- [ ] T061 Verify all acceptance scenarios from spec.md pass
- [ ] T062 Update transformation history documentation if needed
- [ ] T063 [P] Code cleanup and remove any debug logging
- [ ] T064 Run quickstart.md validation steps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational - MVP
- **US2 (Phase 4)**: Depends on US1 (uses commitStaging for rollback counterpart)
- **US4 (Phase 5)**: Depends on US2 (reuses rollback infrastructure)
- **US3 (Phase 6)**: Depends on US1, US2 (recovery needs commit/rollback)
- **Conflict Detection (Phase 7)**: Depends on US1 (enhances commit)
- **Status (Phase 8)**: Depends on all user stories
- **Polish (Phase 9)**: Depends on all phases

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational - Independent
- **US2 (P1)**: Can start after US1 - Uses rollbackStaging
- **US4 (P2)**: Can start after US2 - Reuses rollback
- **US3 (P2)**: Can start after US1+US2 - Needs both commit and rollback

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types before functions
- Core functions before orchestration
- Orchestration before command updates
- Story complete before moving to next priority

### Parallel Opportunities

- All [P] tasks within a phase can run in parallel
- All [TEST] tasks for a user story can run in parallel
- Different user stories CANNOT run in parallel (dependency chain)

---

## Parallel Example: Foundational Phase

```bash
# Launch all type tests together:
Task: "Write Zod schema tests for StagingContext in tests/unit/staging-types.test.ts"
Task: "Write Zod schema tests for StagingMetadata in tests/unit/staging-types.test.ts"
Task: "Write Zod schema tests for StagedFile in tests/unit/staging-types.test.ts"

# Then launch all function tests together:
Task: "Write tests for createStagingDirectory() in tests/unit/staging-manager.test.ts"
Task: "Write tests for listStagedFiles() in tests/unit/staging-manager.test.ts"
Task: "Write tests for updateStagingStatus() in tests/unit/staging-manager.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test successful transformation with staging
5. Deploy if ready - basic atomic transformation works

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US1 → Staging and commit work (MVP!)
3. Add US2 → Rollback on failure works
4. Add US4 → Agent 1 failure handled
5. Add US3 → Orphan recovery works
6. Add FR-012 → Conflict detection works
7. Add reporting → Full visibility

### Single Developer Strategy

Execute phases sequentially:
1. Phase 1 → Phase 2 → Phase 3 (MVP checkpoint)
2. Phase 4 → Phase 5 → Phase 6
3. Phase 7 → Phase 8 → Phase 9

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [TEST] = TDD test task, must fail before implementation
- [Story] label maps task to user story for traceability
- Each checkpoint validates story works independently
- Commit after each task or logical group
- Total tasks: 64
- Test tasks: 22
- Implementation tasks: 42
