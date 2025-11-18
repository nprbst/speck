---
description: "Task list for multi-repo and monorepo support implementation"
---

# Tasks: Multi-Repo and Monorepo Support

**Input**: Design documents from `specs/007-multi-repo-monorepo-support/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/path-resolution-api.md, contracts/link-command-api.md

**Tests**: Not explicitly requested in spec - focusing on implementation with manual testing via quickstart scenarios.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Review existing path resolution code in .speck/scripts/common/paths.ts
- [ ] T002 [P] Create backup of existing paths.ts to paths.ts.backup
- [ ] T003 [P] Verify Bun symlink APIs (fs.symlink, readlink, realpath, lstat) work on current platform

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core path resolution infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement detectSpeckRoot() function in .speck/scripts/common/paths.ts following contracts/path-resolution-api.md
- [ ] T005 Add SpeckConfig interface to .speck/scripts/common/paths.ts (mode, speckRoot, repoRoot, specsDir fields)
- [ ] T006 Update getFeaturePaths() to call detectSpeckRoot() and return enhanced FeaturePaths with MODE, SPECK_ROOT, SPECS_DIR fields in .speck/scripts/common/paths.ts
- [ ] T007 Update getFeaturePaths() to use speckRoot for SPEC_FILE and CONTRACTS_DIR paths in .speck/scripts/common/paths.ts
- [ ] T008 Update getFeaturePaths() to ensure PLAN_FILE, TASKS_FILE, CONSTITUTION always use repoRoot in .speck/scripts/common/paths.ts
- [ ] T009 Add caching to detectSpeckRoot() to avoid repeated filesystem checks in .speck/scripts/common/paths.ts
- [ ] T010 Add error handling for broken symlinks (ENOENT on target) in detectSpeckRoot() in .speck/scripts/common/paths.ts
- [ ] T011 Add error handling for circular symlinks (ELOOP) in detectSpeckRoot() in .speck/scripts/common/paths.ts
- [ ] T012 Add warning for .speck/root that is not a symlink (fall back to single-repo) in detectSpeckRoot() in .speck/scripts/common/paths.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Single-Repo Developer (Unchanged Experience) (Priority: P1) 🎯 MVP

**Goal**: Ensure 100% backward compatibility - single-repo developers see zero changes

**Independent Test**: Run all existing Speck commands in a single-repo project and verify identical behavior to current version

### Implementation for User Story 1

- [ ] T013 [US1] Verify detectSpeckRoot() returns mode='single-repo' when .speck/root does not exist in .speck/scripts/common/paths.ts
- [ ] T014 [US1] Verify detectSpeckRoot() sets speckRoot === repoRoot in single-repo mode in .speck/scripts/common/paths.ts
- [ ] T015 [US1] Verify getFeaturePaths() SPEC_FILE uses repoRoot in single-repo mode in .speck/scripts/common/paths.ts
- [ ] T016 [US1] Verify getFeaturePaths() PLAN_FILE, TASKS_FILE use repoRoot in single-repo mode in .speck/scripts/common/paths.ts
- [ ] T017 [US1] Verify getFeaturePaths() CONSTITUTION uses repoRoot in single-repo mode in .speck/scripts/common/paths.ts
- [ ] T018 [US1] Test that /speck.specify creates spec.md at repoRoot/specs/NNN-feature/ in single-repo project
- [ ] T019 [US1] Test that /speck.plan generates plan.md using local constitution in single-repo project
- [ ] T020 [US1] Verify no performance regression in single-repo mode (detectSpeckRoot should complete in <2ms)
- [ ] T021 [US1] Verify no new configuration files appear in single-repo projects after running commands

**Checkpoint**: At this point, User Story 1 should be fully functional - single-repo workflow must be identical to current version

---

## Phase 4: User Story 2 - Multi-Repo Feature Spanning Frontend and Backend (Priority: P2)

**Goal**: Enable shared spec.md across multiple repos with independent plan.md per repo

**Independent Test**: Set up two repos (frontend/backend), link both to shared specs root, create spec at parent, verify both can generate independent plans

### Implementation for User Story 2

- [ ] T022 [P] [US2] Create linkRepo() function in new file .speck/scripts/link-repo.ts following contracts/link-command-api.md
- [ ] T023 [P] [US2] Implement input validation in linkRepo() (check targetPath is not empty) in .speck/scripts/link-repo.ts
- [ ] T024 [P] [US2] Implement target validation in linkRepo() (verify target exists and is directory) in .speck/scripts/link-repo.ts
- [ ] T025 [US2] Implement relative path calculation in linkRepo() (compute path from .speck/ to target) in .speck/scripts/link-repo.ts
- [ ] T026 [US2] Implement existing symlink check in linkRepo() (detect same target, different target, non-symlink) in .speck/scripts/link-repo.ts
- [ ] T027 [US2] Implement symlink creation using fs.symlink(relativePath, '.speck/root', 'dir') in .speck/scripts/link-repo.ts
- [ ] T028 [US2] Implement verification step in linkRepo() (call detectSpeckRoot and confirm multi-repo mode) in .speck/scripts/link-repo.ts
- [ ] T029 [US2] Add success reporting in linkRepo() (display speck root, specs dir, next steps) in .speck/scripts/link-repo.ts
- [ ] T030 [US2] Create CLI entry point at top of .speck/scripts/link-repo.ts (parse args, call linkRepo, handle errors)
- [ ] T031 [P] [US2] Create slash command file .claude/commands/speck.link.md following contracts/link-command-api.md structure
- [ ] T032 [P] [US2] Add YAML frontmatter to .claude/commands/speck.link.md (description: "Link repository to multi-repo speck root")
- [ ] T033 [US2] Add command documentation to .claude/commands/speck.link.md (usage, examples, what it does)
- [ ] T034 [US2] Add implementation line to .claude/commands/speck.link.md (bun run $PLUGIN_ROOT/scripts/link-repo.ts {{args}})
- [ ] T035 [US2] Update /speck.env command in .claude/commands/speck.env.md to display multi-repo mode status
- [ ] T036 [US2] Update /speck.env command in .claude/commands/speck.env.md to show speck root path when in multi-repo mode
- [ ] T037 [US2] Test linking frontend repo to parent directory (from frontend/, run /speck.link ..)
- [ ] T038 [US2] Test that detectSpeckRoot() returns mode='multi-repo' after linking
- [ ] T039 [US2] Test that getFeaturePaths() SPEC_FILE uses speckRoot (parent dir) in multi-repo mode
- [ ] T040 [US2] Test that getFeaturePaths() PLAN_FILE uses repoRoot (child repo) in multi-repo mode
- [ ] T041 [US2] Test creating spec at parent specs/ directory and verify both frontend/backend repos can read it
- [ ] T042 [US2] Test that /speck.plan in frontend generates plan using frontend's constitution
- [ ] T043 [US2] Test that /speck.plan in backend generates different plan using backend's constitution
- [ ] T044 [US2] Verify performance overhead <10ms for multi-repo detection (run detectSpeckRoot 100 times, average <10ms)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - single-repo unchanged, multi-repo enables shared specs

---

## Phase 5: User Story 3 - Monorepo with Multiple Workspaces (Priority: P2)

**Goal**: Support monorepo structures using identical symlink detection (no new concepts vs multi-repo)

**Independent Test**: Create monorepo with packages/, link each package to root specs/, verify plan generation respects per-package constitutions

### Implementation for User Story 3

- [ ] T045 [US3] Test linking monorepo package from nested directory (from packages/ui/, run /speck.link ../..)
- [ ] T046 [US3] Verify detectSpeckRoot() works with nested package structures (e.g., monorepo/packages/ui/)
- [ ] T047 [US3] Test that multiple packages can link to same monorepo root specs/ directory
- [ ] T048 [US3] Test that each package can have its own .speck/constitution.md with different principles
- [ ] T049 [US3] Verify /speck.plan in packages/ui/ uses ui package's constitution (e.g., React preferences)
- [ ] T050 [US3] Verify /speck.plan in packages/api/ uses api package's constitution (e.g., no frontend deps)
- [ ] T051 [US3] Test that monorepo build tools (npm workspaces) are not affected by .speck/root symlinks

**Checkpoint**: All user stories should now be independently functional - single-repo, multi-repo, and monorepo all work

---

## Phase 6: User Story 4 - Discovering Multi-Repo Configuration (Priority: P3)

**Goal**: Make multi-repo setup discoverable via /speck.env command

**Independent Test**: Clone a linked repo and run /speck.env to see configuration details

### Implementation for User Story 4

- [ ] T052 [US4] Verify /speck.env shows "Single-repo mode" when no .speck/root symlink exists
- [ ] T053 [US4] Verify /speck.env shows "Multi-repo mode: enabled" when .speck/root symlink is valid
- [ ] T054 [US4] Verify /speck.env displays speck root location in multi-repo mode
- [ ] T055 [US4] Verify /speck.env displays current repo root in multi-repo mode
- [ ] T056 [US4] Add helpful message to /speck.env output: "Specs are stored at [speck-root]/specs/ (shared across multiple repos)"
- [ ] T057 [US4] Test that developer can determine mode by running ls -la .speck/ and seeing root symlink

**Checkpoint**: Multi-repo configuration is now discoverable - developers can understand setup without documentation

---

## Phase 7: User Story 5 - Converting Single-Repo to Multi-Repo (Priority: P3)

**Goal**: Support migration from single-repo to multi-repo by moving specs/ and creating symlinks

**Independent Test**: Move specs from single repo to shared parent directory, create symlinks, verify commands still work

### Implementation for User Story 5

- [ ] T058 [US5] Test migration: Move existing specs/ from single-repo to parent directory
- [ ] T059 [US5] Test migration: Run /speck.link .. after moving specs
- [ ] T060 [US5] Verify /speck.plan works on existing spec after migration to multi-repo
- [ ] T061 [US5] Test edge case: Detect when both local specs/ and .speck/root symlink exist (warn about conflict)
- [ ] T062 [US5] Add warning in detectSpeckRoot() when local specs/ directory exists in multi-repo mode (symlink takes precedence)

**Checkpoint**: Migration path from single-repo to multi-repo is validated - existing specs remain accessible

---

## Phase 8: Shared Specs & Contracts (Cross-Cutting Feature)

**Goal**: Enable child repos to access shared spec.md and contracts/ via symlinks

**Independent Test**: Create spec at parent with contracts/, verify child repos can read both spec and contracts

### Implementation for Shared Specs & Contracts

- [ ] T063 Update /speck.specify command to prompt "Create spec at parent (shared) or local (child-only)?" when run from multi-repo child
- [ ] T064 When user chooses "parent (shared)", create spec.md at speckRoot/specs/NNN-feature/spec.md
- [ ] T065 When user chooses "parent (shared)", create local specs/NNN-feature/ directory in child repo
- [ ] T066 When user chooses "parent (shared)", symlink parent spec.md into child's local specs/NNN-feature/spec.md
- [ ] T067 When user chooses "local (child-only)", create spec.md directly in child's specs/NNN-feature/ (no symlink)
- [ ] T068 Support both shared and local specs coexisting in same multi-repo setup
- [ ] T069 When contracts/ exists at speckRoot/specs/NNN-feature/contracts/, symlink into child's local specs/NNN-feature/contracts/
- [ ] T070 Add .gitignore recommendation to /speck.link success message: "Add to .gitignore: specs/*/spec.md, specs/*/contracts/"
- [ ] T071 Test that child repos do not commit symlinked spec.md to their repository (git status should ignore if .gitignore'd)
- [ ] T072 Test that child repos DO commit local plan.md and tasks.md to their repository

**Checkpoint**: Shared specs and contracts are working - child repos access parent spec via symlink, generate local plans

---

## Phase 9: Branch Management (Multi-Repo)

**Goal**: Coordinate branch creation across parent (speck root) and child repos for shared specs

**Independent Test**: Create shared spec in parent, verify /speck.plan in child creates branch in child and validates parent branch

### Implementation for Branch Management

- [ ] T073 Update /speck.specify to create spec-named branch in parent repo when creating shared spec (if parent is git repo)
- [ ] T074 Update /speck.specify to prompt user to initialize parent as git repo if not already initialized, then create spec-named branch on confirm
- [ ] T075 Update /speck.specify to skip parent branch creation when creating local (child-only) spec
- [ ] T076 Update /speck.plan to create spec-named branch in child repo if not already on that branch
- [ ] T077 Update /speck.plan to validate parent repo is on matching spec-named branch when using shared spec (warn if mismatch)
- [ ] T078 Update /speck.plan to skip parent branch validation when using local (child-only) spec
- [ ] T079 Update branch validation to skip if parent is not a git repo (only validate when both parent and child are git repos)
- [ ] T080 Test branch creation: /speck.specify in parent creates branch 001-feature in parent repo
- [ ] T081 Test branch validation: /speck.plan in child warns if parent is on different branch than child
- [ ] T082 Test branch skipping: /speck.plan with local spec does not validate parent branch

**Checkpoint**: Branch management is coordinated - parent and child repos stay in sync for shared specs

---

## Phase 10: Edge Cases & Error Handling

**Purpose**: Handle all edge cases identified in spec.md

- [ ] T083 [P] Test broken symlink: .speck/root points to non-existent directory (should error with clear message)
- [ ] T084 [P] Test circular symlink: .speck/root points to itself (should error with ELOOP message)
- [ ] T085 [P] Test .speck/root is regular file not symlink (should warn and fall back to single-repo)
- [ ] T086 [P] Test specs/ exists at both speck root and local repo (should warn local is ignored in multi-repo mode)
- [ ] T087 Test updating symlink: Run /speck.link with different target (should prompt and update)
- [ ] T088 Test /speck.link with missing argument (should error with usage message)
- [ ] T089 Test /speck.link with non-existent target (should error "Target does not exist")
- [ ] T090 Test /speck.link with file (not directory) target (should error "Target is not a directory")
- [ ] T091 Add error message for Windows without Developer Mode (suggest enabling Dev Mode or using WSL)
- [ ] T092 Document Windows symlink support in error messages for platforms where symlink creation fails

**Checkpoint**: All edge cases handled gracefully with clear error messages

---

## Phase 11: Polish & Documentation

**Purpose**: Final improvements and documentation updates

- [ ] T093 [P] Update CLAUDE.md with multi-repo path resolution patterns and SpeckConfig interface
- [ ] T094 [P] Add inline code comments to detectSpeckRoot() explaining detection logic
- [ ] T095 [P] Add inline code comments to linkRepo() explaining validation steps
- [ ] T096 Verify all path resolution uses speckRoot vs repoRoot correctly throughout codebase
- [ ] T097 Run all quickstart.md scenarios from spec to validate end-to-end workflows
- [ ] T098 Create .gitignore template recommendation for multi-repo child repos (specs/*/spec.md, specs/*/contracts/)
- [ ] T099 Verify success criteria SC-001: 100% single-repo projects work without modification
- [ ] T100 Verify success criteria SC-002: Multi-repo setup takes <2 minutes (/speck.link per repo)
- [ ] T101 Verify success criteria SC-003: Zero new config files for single-repo usage
- [ ] T102 Verify success criteria SC-004: Multi-repo detection adds <10ms overhead
- [ ] T103 Verify success criteria SC-005: Monorepo and multi-repo have identical UX
- [ ] T104 Verify success criteria SC-007: /speck.env shows mode and paths in <1 second
- [ ] T105 Verify success criteria SC-008: Developers can determine mode via /speck.env or ls -la .speck/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Single-Repo) can start after Foundational - No dependencies on other stories
  - US2 (Multi-Repo) can start after Foundational - Builds on US1 foundation but US1 must still work
  - US3 (Monorepo) depends on US2 completion (uses same mechanisms)
  - US4 (Discovery) depends on US2 completion (requires multi-repo mode working)
  - US5 (Migration) depends on US2 completion (requires multi-repo mode working)
- **Shared Specs (Phase 8)**: Depends on US2 completion (multi-repo basics)
- **Branch Management (Phase 9)**: Depends on Shared Specs completion
- **Edge Cases (Phase 10)**: Depends on US2 completion (can run in parallel with US3-7)
- **Polish (Phase 11)**: Depends on all user stories and edge cases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - MUST work before any other stories (backward compatibility)
- **User Story 2 (P2)**: Can start after US1 verified working - Introduces multi-repo mode
- **User Story 3 (P2)**: Depends on US2 - Uses same detection mechanism for monorepo
- **User Story 4 (P3)**: Depends on US2 - Discovery of multi-repo config
- **User Story 5 (P3)**: Depends on US2 - Migration from single to multi-repo

### Within Each User Story

- Foundation (Phase 2) must complete fully before any user story
- User Story 1 must be verified working before proceeding to User Story 2 (backward compatibility critical)
- User Stories 3-5 can proceed in priority order after US2 completes
- Edge cases can be worked on in parallel once multi-repo basics (US2) work
- Polish phase runs after all stories complete

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003)
- Within Foundational phase, error handling tasks can run in parallel after core detectSpeckRoot (T010, T011, T012)
- Within US2, linkRepo implementation (T022-T024) can run in parallel with slash command creation (T031-T032)
- All edge case tests (Phase 10) marked [P] can run in parallel (T083-T086)
- Documentation tasks (Phase 11) marked [P] can run in parallel (T093-T095)

---

## Parallel Example: User Story 2 (Multi-Repo)

```bash
# Launch parallel tasks for linkRepo implementation:
Task: "Create linkRepo() function in new file .speck/scripts/link-repo.ts"
Task: "Implement input validation in linkRepo()"
Task: "Implement target validation in linkRepo()"

# Launch parallel tasks for slash command:
Task: "Create slash command file .claude/commands/speck.link.md"
Task: "Add YAML frontmatter to .claude/commands/speck.link.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Single-Repo Unchanged)
4. **STOP and VALIDATE**: Test all existing single-repo workflows
5. Confirm zero regressions before proceeding

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test single-repo unchanged → Validate (MVP baseline!)
3. Add User Story 2 → Test multi-repo basics → Validate
4. Add User Story 3 → Test monorepo → Validate
5. Add User Stories 4-5 → Test discovery and migration → Validate
6. Add Shared Specs (Phase 8) → Test spec/contract sharing → Validate
7. Add Branch Management (Phase 9) → Test branch coordination → Validate
8. Add Edge Cases (Phase 10) → Test all error conditions → Validate
9. Polish (Phase 11) → Final validation of success criteria

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Developer A focuses on User Story 1 (critical - backward compatibility)
3. Once US1 validated:
   - Developer A: User Story 2 (multi-repo basics)
   - Developer B: Slash command and /speck.env updates (US2 related)
4. Once US2 complete:
   - Developer A: User Story 3 (monorepo)
   - Developer B: User Story 4 (discovery)
   - Developer C: Edge cases (Phase 10)
5. Shared Specs and Branch Management (sequential after US2)
6. Polish together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Story 1 (backward compatibility) is NON-NEGOTIABLE - must work perfectly before proceeding
- Each user story should be independently completable and testable
- Stop at any checkpoint to validate story independently
- Verify all path resolution uses speckRoot (for specs/contracts) vs repoRoot (for plans/tasks/constitution) correctly
- Performance target: <2ms overhead for single-repo, <10ms for multi-repo detection
- Avoid: breaking single-repo workflows, configuration files, complex setup processes
