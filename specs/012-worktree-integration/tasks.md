# Tasks: Worktree Integration

**Input**: Design documents from `/specs/012-worktree-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No test tasks included (not explicitly requested in specification)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md, this feature uses:
- `.speck/scripts/worktree/` for implementation scripts
- `specs/012-worktree-integration/contracts/` for type definitions
- `.claude/commands/` for command integration
- `tests/integration/` and `tests/unit/` for tests

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, configuration schema setup, and test baseline capture

- [ ] T000 [Constitution] Capture test baseline before implementation (`bun test > specs/012-worktree-integration/test-baseline.txt`) to enable zero-regression validation per Constitution Principle X
- [ ] T001 Add Zod dependency to package.json
- [ ] T002 [P] Create .speck/scripts/worktree/ directory structure
- [ ] T003 [P] Copy contracts/config-schema.ts to .speck/scripts/worktree/config-schema.ts
- [ ] T004 [P] Copy contracts/internal-api.ts to .speck/scripts/worktree/types.ts (as type definitions only)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core configuration and Git worktree operations that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Implement loadConfig function in .speck/scripts/worktree/config.ts
- [ ] T006 [P] Implement saveConfig function in .speck/scripts/worktree/config.ts
- [ ] T007 [P] Implement migrateConfig function in .speck/scripts/worktree/config.ts
- [ ] T008 [P] Implement hasWorktreeSupport function (Git version check) in .speck/scripts/worktree/validation.ts
- [ ] T009 Implement isValidBranchName function in .speck/scripts/worktree/validation.ts
- [ ] T010 [P] Implement constructBranchName function in .speck/scripts/worktree/naming.ts
- [ ] T011 [P] Implement constructWorktreePath function in .speck/scripts/worktree/naming.ts
- [ ] T012 Create Git worktree operations (listWorktrees, getWorktreePath, isWorktree) in .speck/scripts/worktree/git.ts
- [ ] T013 [P] Implement pruneWorktrees function in .speck/scripts/worktree/git.ts
- [ ] T014 [P] Implement checkWorktreePath function in .speck/scripts/worktree/validation.ts
- [ ] T015 [P] Implement hasSufficientDiskSpace function in .speck/scripts/worktree/validation.ts
- [ ] T016 Define error classes (WorktreeError, GitWorktreeError, etc.) in .speck/scripts/worktree/errors.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Isolated Feature Development (Priority: P1) 🎯 MVP

**Goal**: Enable developers to work on multiple features simultaneously by creating isolated Git worktrees for each spec branch

**Independent Test**: Create a new spec branch and verify a worktree is created at the expected location with the feature branch checked out. The worktree should be immediately usable for development work.

### Implementation for User Story 1

- [ ] T017 [P] [US1] Implement repository layout detection in .speck/scripts/worktree/naming.ts
- [ ] T018 [P] [US1] Implement worktree naming logic based on repo layout in .speck/scripts/worktree/naming.ts
- [ ] T019 [US1] Implement basic createWorktree function (Git worktree add only) in .speck/scripts/worktree/create.ts
- [ ] T020 [US1] Implement removeWorktree function in .speck/scripts/worktree/remove.ts
- [ ] T021 [US1] Add worktree collision detection to createWorktree in .speck/scripts/worktree/create.ts
- [ ] T022 [US1] Add --reuse-worktree flag support in .speck/scripts/worktree/create.ts
- [ ] T023 [US1] Implement stale worktree cleanup (call pruneWorktrees before creation) in .speck/scripts/worktree/create.ts
- [ ] T024 [US1] Add --no-worktree flag to .claude/commands/speck.specify.md
- [ ] T025 [US1] Add --no-worktree flag to .claude/commands/speck.branch.md
- [ ] T026 [US1] Integrate worktree creation into /speck:specify command in .claude/commands/speck.specify.md
- [ ] T027 [US1] Integrate worktree creation into /speck:branch command in .claude/commands/speck.branch.md
- [ ] T028 [US1] Add branch name approval prompt before worktree creation in .speck/scripts/worktree/workflows.ts
- [ ] T029 [US1] Create integration test for basic worktree creation in tests/integration/worktree-create.test.ts
- [ ] T030 [US1] Create integration test for worktree lifecycle (create/list/remove) in tests/integration/worktree-lifecycle.test.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - developers can create spec branches with worktrees and work on multiple features simultaneously

---

## Phase 4: User Story 2 - Automated IDE Launch (Priority: P2)

**Goal**: Automatically launch the developer's IDE when a worktree is created to eliminate manual navigation

**Independent Test**: Create a new spec branch with IDE auto-launch enabled and verify that the configured IDE opens with the worktree directory as the workspace root

### Implementation for User Story 2

- [ ] T031 [P] [US2] Implement detectAvailableIDEs function in .speck/scripts/worktree/ide-launch.ts
- [ ] T032 [P] [US2] Implement isIDEAvailable function in .speck/scripts/worktree/ide-launch.ts
- [ ] T033 [P] [US2] Implement getIDECommand function for VSCode in .speck/scripts/worktree/ide-launch.ts
- [ ] T034 [P] [US2] Implement getIDECommand function for Cursor in .speck/scripts/worktree/ide-launch.ts
- [ ] T035 [P] [US2] Implement getIDECommand function for JetBrains IDEs in .speck/scripts/worktree/ide-launch.ts
- [ ] T036 [US2] Implement launchIDE function with error handling in .speck/scripts/worktree/ide-launch.ts
- [ ] T037 [US2] Integrate IDE launch into createWorktree workflow in .speck/scripts/worktree/create.ts
- [ ] T038 [US2] Add --no-ide flag support to createWorktree in .speck/scripts/worktree/create.ts
- [ ] T039 [US2] Add --no-ide flag to .claude/commands/speck.specify.md
- [ ] T040 [US2] Add --no-ide flag to .claude/commands/speck.branch.md
- [ ] T041 [US2] Handle IDE launch failure gracefully (non-fatal) in .speck/scripts/worktree/create.ts
- [ ] T042 [US2] Create integration test for IDE launch in tests/integration/ide-launch.test.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - worktrees can be created with or without IDE auto-launch

---

## Phase 5: User Story 4 - Configurable Worktree Setup (Priority: P2)

**Goal**: Configure which files and directories should be copied or symlinked to worktrees for proper isolation and resource sharing

**Independent Test**: Configure copy/symlink rules, create a worktree, and verify that specified files/directories are copied or symlinked as configured

**Note**: Implementing US4 before US3 because file operations are a dependency for US3's dependency installation

### Implementation for User Story 4

- [ ] T043 [P] [US4] Implement matchFiles function using Bun.Glob in .speck/scripts/worktree/file-ops.ts
- [ ] T044 [P] [US4] Implement getUntrackedFiles function in .speck/scripts/worktree/file-ops.ts
- [ ] T045 [P] [US4] Implement copyFiles function with concurrency in .speck/scripts/worktree/file-ops.ts
- [ ] T046 [P] [US4] Implement symlinkDirectories function with relative paths in .speck/scripts/worktree/file-ops.ts
- [ ] T047 [US4] Implement applyFileRules function in .speck/scripts/worktree/file-ops.ts
- [ ] T048 [US4] Integrate file operations into createWorktree workflow in .speck/scripts/worktree/create.ts
- [ ] T049 [US4] Add support for includeUntracked in applyFileRules in .speck/scripts/worktree/file-ops.ts
- [ ] T050 [US4] Apply DEFAULT_FILE_RULES when config.files.rules is empty in .speck/scripts/worktree/file-ops.ts
- [ ] T051 [US4] Create unit test for file matching in tests/unit/file-ops.test.ts
- [ ] T052 [US4] Create integration test for file copy/symlink operations in tests/integration/file-ops.test.ts

**Checkpoint**: At this point, User Stories 1, 2, AND 4 should all work independently - worktrees have proper file isolation and shared resources

---

## Phase 6: User Story 3 - Pre-installed Dependencies (Priority: P3)

**Goal**: Install dependencies in the worktree before the IDE opens to enable immediate coding without wait time

**Independent Test**: Create a new spec branch, wait for the IDE to open, and verify that dependencies are already installed (e.g., node_modules exists and is populated)

### Implementation for User Story 3

- [ ] T053 [P] [US3] Implement detectPackageManager function in .speck/scripts/worktree/deps-install.ts
- [ ] T054 [P] [US3] Implement getInstallCommand function in .speck/scripts/worktree/deps-install.ts
- [ ] T055 [US3] Implement installDependencies function with progress streaming in .speck/scripts/worktree/deps-install.ts
- [ ] T056 [US3] Implement interpretInstallError function in .speck/scripts/worktree/deps-install.ts
- [ ] T057 [US3] Integrate dependency installation into createWorktree workflow (blocking, before IDE launch) in .speck/scripts/worktree/create.ts
- [ ] T058 [US3] Add progress indicator for dependency installation in .speck/scripts/worktree/create.ts
- [ ] T059 [US3] Add --no-deps flag support to createWorktree in .speck/scripts/worktree/create.ts
- [ ] T060 [US3] Add --no-deps flag to .claude/commands/speck.specify.md
- [ ] T061 [US3] Add --no-deps flag to .claude/commands/speck.branch.md
- [ ] T062 [US3] Handle dependency installation failure (abort IDE launch, show error) in .speck/scripts/worktree/create.ts
- [ ] T063 [US3] Create integration test for dependency installation in tests/integration/deps-install.test.ts

**Checkpoint**: All user stories should now be independently functional - worktrees are created with files, dependencies, and IDE launch

---

## Phase 7: Manual Worktree Management Commands

**Purpose**: Provide standalone CLI commands for advanced users to manage worktrees manually

- [ ] T064 [P] Create speck worktree create command wrapper in .speck/scripts/worktree/cli-create.ts
- [ ] T065 [P] Create speck worktree remove command wrapper in .speck/scripts/worktree/cli-remove.ts
- [ ] T066 [P] Create speck worktree list command wrapper in .speck/scripts/worktree/cli-list.ts
- [ ] T067 [P] Create speck worktree prune command wrapper in .speck/scripts/worktree/cli-prune.ts
- [ ] T068 Implement interactive setup wizard (speck worktree init) in .speck/scripts/worktree/cli-init.ts
- [ ] T069 [P] Add CLI argument parsing for all worktree commands in .speck/scripts/worktree/cli.ts
- [ ] T070 [P] Add --json flag support to speck worktree list in .speck/scripts/worktree/cli-list.ts
- [ ] T071 [P] Add --verbose flag support to speck worktree list in .speck/scripts/worktree/cli-list.ts
- [ ] T072 [P] Add --dry-run flag support to speck worktree prune in .speck/scripts/worktree/cli-prune.ts
- [ ] T073 [P] Add --defaults and --minimal flags to speck worktree init in .speck/scripts/worktree/cli-init.ts

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T074 [P] Add comprehensive error messages with troubleshooting steps in .speck/scripts/worktree/errors.ts
- [ ] T075 [P] Add progress indicators for all long-running operations in .speck/scripts/worktree/create.ts
- [ ] T076 [P] Implement branch prefix support (FR-017) in .speck/scripts/worktree/naming.ts
- [ ] T077 [P] Add disk space checking before worktree creation in .speck/scripts/worktree/validation.ts
- [ ] T078 [P] Add Git version validation on first worktree operation in .speck/scripts/worktree/validation.ts
- [ ] T079 [P] Update quickstart.md with manual testing scenarios
- [ ] T080 [P] Create unit tests for configuration validation in tests/unit/config-schema.test.ts
- [ ] T081 [P] Create unit tests for naming logic in tests/unit/naming.test.ts
- [ ] T082 [P] Create integration test for edge cases (collisions, errors) in tests/integration/worktree-edge-cases.test.ts
- [ ] T083 Code cleanup and refactoring across all worktree scripts
- [ ] T084 Run bun run typecheck to ensure no TypeScript errors
- [ ] T085 Run bun run lint to ensure code style compliance
- [ ] T086 Run quickstart.md validation workflows
- [ ] T087 [Constitution] Validate zero test regression by running `bun test` and comparing against baseline in specs/012-worktree-integration/test-baseline.txt per Constitution Principle X
- [ ] T088 [P] Create integration test for multi-repo worktree configuration independence in tests/integration/worktree-multi-repo.test.ts

---

## Phase 9: Website Documentation (Constitution Principle XI)

**Purpose**: Update project website to document worktree integration feature per Constitution Principle XI

- [ ] T089 [Constitution] Create comprehensive worktree feature guide at website/src/content/docs/features/worktrees.md covering all user stories, configuration options, and workflows
- [ ] T090 [Constitution] [P] Create .speck/config.json schema reference at website/src/content/docs/configuration/speck-config.md documenting all worktree configuration options
- [ ] T091 [Constitution] [P] Update quickstart guide at website/src/content/docs/getting-started/quickstart.md to include worktree setup instructions and first-time configuration
- [ ] T092 [Constitution] [P] Update /speck:specify command documentation at website/src/content/docs/commands/specify.md to document --no-worktree, --no-ide, --no-deps, --reuse-worktree flags
- [ ] T093 [Constitution] [P] Update /speck:branch command documentation at website/src/content/docs/commands/branch.md to document worktree integration flags
- [ ] T094 [Constitution] [P] Update feature development workflow guide at website/src/content/docs/workflows/feature-development.md to include worktree-based parallel development workflow
- [ ] T095 [Constitution] Verify website builds without errors: `bun run website:build`
- [ ] T096 [Constitution] Preview website documentation locally at localhost:4321 using `bun run website:dev` and verify all links, examples, and screenshots are correct

**Checkpoint**: Website documentation complete and verified - feature ready for release

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start after Foundational - No dependencies on other stories
  - US2 (Phase 4): Depends on US1 completion (needs createWorktree workflow)
  - US4 (Phase 5): Depends on US1 completion (integrates into createWorktree workflow)
  - US3 (Phase 6): Depends on US1 AND US4 completion (needs file operations before installing deps)
- **Manual Commands (Phase 7)**: Depends on all user stories being complete
- **Polish (Phase 8)**: Depends on all desired user stories being complete
- **Website Documentation (Phase 9)**: Depends on implementation completion (Phases 1-8) - BLOCKS feature release per Constitution Principle XI

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 (integrates into createWorktree workflow)
- **User Story 4 (P2)**: Depends on User Story 1 (integrates into createWorktree workflow)
- **User Story 3 (P3)**: Depends on User Story 1 AND User Story 4 (needs file operations before installing deps)

### Within Each User Story

- Implementation tasks before integration tasks
- Core functionality before edge case handling
- Command integration after script implementation
- Tests after implementation (if included)

### Parallel Opportunities

- All Setup tasks (T002-T004) can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Within US1: T017-T018 can run in parallel, T024-T025 can run in parallel, T026-T027 can run in parallel, T029-T030 can run in parallel
- Within US2: T031-T035 can run in parallel, T039-T040 can run in parallel
- Within US4: T043-T046 can run in parallel, T051-T052 can run in parallel
- Within US3: T053-T056 can run in parallel, T060-T061 can run in parallel
- All Manual Commands (T064-T073) can run in parallel
- All Polish tasks marked [P] can run in parallel
- Within Website Documentation (Phase 9): T090-T094 can run in parallel (different files)

---

## Parallel Example: User Story 1

```bash
# Launch repository layout and naming logic together:
Task: "Implement repository layout detection in .speck/scripts/worktree/naming.ts"
Task: "Implement worktree naming logic based on repo layout in .speck/scripts/worktree/naming.ts"

# Launch command flag additions together:
Task: "Add --no-worktree flag to .claude/commands/speck.specify.md"
Task: "Add --no-worktree flag to .claude/commands/speck.branch.md"

# Launch integration tests together:
Task: "Create integration test for basic worktree creation in tests/integration/worktree-create.test.ts"
Task: "Create integration test for worktree lifecycle in tests/integration/worktree-lifecycle.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 4 → Test independently → Deploy/Demo
5. Add User Story 3 → Test independently → Deploy/Demo
6. Add Manual Commands → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
3. Once User Story 1 is complete:
   - Developer A: User Story 2
   - Developer B: User Story 4
4. Once User Stories 2 and 4 are complete:
   - Developer C: User Story 3
5. Once all user stories are complete:
   - Team: Manual Commands + Polish in parallel
6. Once implementation complete:
   - Team: Website Documentation (MANDATORY - Constitution Principle XI)

---

## Task Summary

**Total Tasks**: 97
- **Phase 1 (Setup)**: 5 tasks (includes constitution test baseline - T000)
- **Phase 2 (Foundational)**: 12 tasks (BLOCKING)
- **Phase 3 (US1 - P1)**: 14 tasks
- **Phase 4 (US2 - P2)**: 12 tasks
- **Phase 5 (US4 - P2)**: 10 tasks
- **Phase 6 (US3 - P3)**: 11 tasks
- **Phase 7 (Manual Commands)**: 10 tasks
- **Phase 8 (Polish)**: 15 tasks (includes constitution validation - T087, multi-repo test - T088)
- **Phase 9 (Website Documentation)**: 8 tasks (MANDATORY - Constitution Principle XI)

**Parallel Opportunities**: 53 tasks marked [P] can run in parallel with other tasks in same phase

**MVP Scope** (Phases 1-3): 31 tasks
**Feature Complete** (Phases 1-8): 89 tasks
**Release Ready** (All phases including docs): 97 tasks

---

## Notes

- [P] tasks = different files, no dependencies within same phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Tests are not included as they were not explicitly requested in the specification
- All TypeScript code must pass `bun run typecheck` and `bun run lint` before feature completion