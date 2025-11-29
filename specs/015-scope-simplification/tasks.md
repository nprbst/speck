# Tasks: Scope Simplification

**Input**: Design documents from `/specs/015-scope-simplification/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: This feature uses TDD per Constitution Principle XII. Test tasks are included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md project structure:
- CLI entry: `src/cli/`
- Scripts: `.speck/scripts/`
- Commands: `.speck/scripts/commands/`
- Tests: `tests/`
- Skills: `.claude/skills/`
- Slash commands: `.claude/commands/`

---

## Phase 1: Setup (Code Removal & Migration Prep)

**Purpose**: Remove stacked PR and virtual command code, prepare for new structure

- [X] T001 Capture test baseline with `bun test > specs/015-scope-simplification/test-baseline.txt`
- [X] T002 [P] Delete stacked PR command `.speck/scripts/commands/branch.ts`
- [X] T003 [P] Delete stacked PR slash command `.claude/commands/speck.branch.md`
- [X] T004 [P] Delete virtual command hook utils `.speck/scripts/lib/hook-utils.ts` (if exists)
- [X] T005 [P] Delete virtual command mode detector `.speck/scripts/lib/mode-detector.ts` (if exists)
- [X] T006 [P] Delete virtual command build script `.speck/scripts/build-hook.ts` (if exists)
- [X] T007 Remove branch command registration from `.speck/scripts/commands/index.ts`
- [X] T008 Remove PreToolUse hook from `.claude-plugin/plugin.json`
- [X] T009 Grep verify: no remaining references to removed files in codebase

---

## Phase 2: Foundational (Branch Mapping Simplification)

**Purpose**: Simplify branches.json schema by removing stacked PR fields

**CRITICAL**: This must complete before user stories as they depend on simplified branch mapping

- [X] T010 Write unit test for simplified BranchEntry schema in `tests/unit/branch-mapper.test.ts`
- [X] T011 Write unit test for schema migration (v1.x → v2.0.0) in `tests/unit/branch-mapper.test.ts`
- [X] T012 Refactor `BranchEntry` interface to remove baseBranch, status, pr fields in `.speck/scripts/common/branch-mapper.ts`
- [X] T013 Implement `migrateBranchMapping()` function for v1.x → v2.0.0 migration in `.speck/scripts/common/branch-mapper.ts`
- [X] T014 Implement `needsMigration()` detection in `.speck/scripts/common/branch-mapper.ts`
- [X] T015 Add auto-migration on load in branch-mapper.ts
- [X] T016 Write contract test for branches.json v2.0.0 schema in `tests/contract/branch-schema-validation.test.ts`
- [X] T017 Verify migration tests pass with `bun test tests/unit/branch-mapper.test.ts`

**Checkpoint**: Branch mapping simplified - CLI consolidation can now begin

---

## Phase 3: User Story 1 - Developer Invokes Speck CLI Directly (Priority: P1)

**Goal**: Single `speck` CLI entry point with subcommands callable from terminal

**Independent Test**: Run `speck --help` and `speck create-new-feature --help` from any directory

### Tests for User Story 1

- [ ] T018 [P] [US1] Write unit test for CLI argument parsing in `tests/unit/cli.test.ts`
- [ ] T019 [P] [US1] Write integration test for CLI mode detection in `tests/integration/cli-modes.test.ts`

### Implementation for User Story 1

- [ ] T020 [US1] Create CLI entry point with Commander.js in `src/cli/index.ts`
- [ ] T021 [US1] Add shebang `#!/usr/bin/env bun` and make executable
- [ ] T022 [US1] Implement global `--json` flag for JSON output in `src/cli/index.ts`
- [ ] T023 [US1] Implement global `--hook` flag for hook output in `src/cli/index.ts`
- [ ] T024 [US1] Wire existing `create-new-feature` command to CLI in `src/cli/index.ts`
- [ ] T025 [US1] Wire existing `check-prerequisites` command to CLI in `src/cli/index.ts`
- [ ] T026 [US1] Wire existing `env` command to CLI in `src/cli/index.ts`
- [ ] T027 [US1] Add `help` subcommand (alias to --help) in `src/cli/index.ts`
- [ ] T028 [US1] Update package.json with `bin` entry for `speck`
- [ ] T029 [US1] Verify `bun run src/cli/index.ts --help` shows all commands

**Checkpoint**: User Story 1 complete - CLI is callable from terminal

---

## Phase 4: User Story 2 - Claude Code Invokes Speck via Hooks (Priority: P1)

**Goal**: CLI works equally well for human interactive use and programmatic hook invocation

**Independent Test**: Invoke CLI with `--hook` and `--json` flags, verify correct output formats

### Tests for User Story 2

- [ ] T030 [P] [US2] Write unit test for JSON output format in `tests/unit/cli-output.test.ts`
- [ ] T031 [P] [US2] Write unit test for hook output format in `tests/unit/cli-output.test.ts`
- [ ] T032 [P] [US2] Write integration test for error handling with `--json` in `tests/integration/cli-modes.test.ts`

### Implementation for User Story 2

- [ ] T033 [US2] Create output formatter module at `.speck/scripts/lib/output-formatter.ts`
- [ ] T034 [US2] Implement `formatJsonOutput()` matching `JsonOutput` contract in output-formatter.ts
- [ ] T035 [US2] Implement `formatHookOutput()` matching `HookOutput` contract in output-formatter.ts
- [ ] T036 [US2] Integrate output formatter into `check-prerequisites` command
- [ ] T037 [US2] Integrate output formatter into `create-new-feature` command
- [ ] T038 [US2] Integrate output formatter into `env` command
- [ ] T039 [US2] Ensure all errors return structured JSON when `--json` flag is used
- [ ] T040 [US2] Verify exit codes match `ExitCode` contract for all error cases

**Checkpoint**: User Story 2 complete - CLI works for both humans and hooks

---

## Phase 5: User Story 3 - New Spec Creates Worktree with Session Handoff (Priority: P2)

**Goal**: Worktree creation with handoff document for new Claude session context

**Independent Test**: Run `speck create-new-feature "Test"`, verify worktree + handoff exist, IDE launches

**Reference**: See [session-handoff-addendum.md](./session-handoff-addendum.md) for detailed implementation patterns

### Tests for User Story 3

- [ ] T041 [P] [US3] Write unit test for handoff document generation in `tests/unit/handoff.test.ts`
- [ ] T042 [P] [US3] Write unit test for handoff document parsing in `tests/unit/handoff.test.ts`
- [ ] T043 [P] [US3] Write integration test for worktree + handoff creation in `tests/integration/worktree-handoff.test.ts`
- [ ] T043a [P] [US3] Write unit test for SessionStart hook JSON output format in `tests/unit/session-hook.test.ts`
- [ ] T043b [P] [US3] Write unit test for hook self-cleanup logic in `tests/unit/session-hook.test.ts`

### Implementation for User Story 3

- [ ] T044 [US3] Create handoff module at `.speck/scripts/worktree/handoff.ts`
- [ ] T045 [US3] Implement `createHandoffDocument()` per contract in handoff.ts
- [ ] T046 [US3] Implement `generateHandoffMarkdown()` per contract in handoff.ts
- [ ] T047 [US3] Implement `parseHandoffMarkdown()` per contract in handoff.ts
- [ ] T048 [US3] Update `create-new-feature` to use atomic `git worktree add -b <branch> <path> HEAD` (no checkout switching)
- [ ] T048a [US3] Write `.speck/handoff.md` to worktree during creation
- [ ] T048b [US3] Write `.claude/scripts/handoff.sh` shell script to worktree (see addendum §3)
- [ ] T048c [US3] Write `.claude/settings.json` with SessionStart hook config to worktree (see addendum §2)
- [ ] T048d [US3] Write `.vscode/tasks.json` with auto-open Claude panel config to worktree (see addendum §4)
- [ ] T049 [US3] Implement session start hook script at `.speck/scripts/worktree/handoff-hook.sh`
- [ ] T050 [US3] Implement hook JSON output with `hookSpecificOutput.additionalContext` format
- [ ] T050a [US3] Use `jq -Rs` for safe JSON encoding of handoff content in hook script
- [ ] T051 [US3] Implement handoff archival after loading (rename to `.speck/handoff.done.md`)
- [ ] T051a [US3] Implement hook self-cleanup: remove SessionStart hook from `.claude/settings.json` after firing
- [ ] T052 [US3] Create template constants for settings.json and tasks.json in handoff module
- [ ] T053 [US3] Add `--no-worktree` flag handling in create-new-feature
- [ ] T054 [US3] Ensure non-fatal behavior when handoff creation fails (graceful degradation per addendum §7)

**Checkpoint**: User Story 3 complete - Worktrees have handoff documents with auto-loading Claude sessions

---

## Phase 6: User Story 4 - Developer Installs Speck CLI via /speck.init (Priority: P2)

**Goal**: One-time installation to make `speck` globally available

**Independent Test**: Run `/speck.init` or `speck install`, then `speck` from different directory

**Reference**: See [bootstrap-addendum.md](./bootstrap-addendum.md) for Bun bootstrap implementation details

### Tests for User Story 4

- [ ] T055 [P] [US4] Write unit test for symlink creation in `tests/unit/install.test.ts`
- [ ] T056 [P] [US4] Write unit test for PATH detection in `tests/unit/install.test.ts`
- [ ] T057 [P] [US4] Write integration test for idempotent install in `tests/integration/install.test.ts`
- [ ] T057a [P] [US4] Write unit test for `detect_platform()` in `tests/unit/bootstrap.test.ts`
- [ ] T057b [P] [US4] Write unit test for `find_bun()` in `tests/unit/bootstrap.test.ts`
- [ ] T057c [P] [US4] Write integration test for bootstrap self-removal flow in `tests/integration/bootstrap.test.ts`

### Implementation for User Story 4

#### Bootstrap Script (Bun Detection)

- [ ] T058 [US4] Create `src/cli/bootstrap.sh` with Bun detection logic (see addendum §3)
- [ ] T058a [US4] Implement `detect_platform()` for macOS/Linux/WSL detection in bootstrap.sh
- [ ] T058b [US4] Implement `find_bun()` to check PATH and common install locations in bootstrap.sh
- [ ] T058c [US4] Implement `install_instructions()` with platform-specific Bun install commands
- [ ] T058d [US4] Implement `create_runner_script()` to generate `.runner.sh` wrapper
- [ ] T058e [US4] Implement `update_symlink()` to rewire symlink from bootstrap.sh to .runner.sh
- [ ] T058f [US4] Make bootstrap.sh executable with `chmod +x`

#### Install Command

- [ ] T059 [US4] Create install command handler at `.speck/scripts/commands/install.ts`
- [ ] T060 [US4] Implement `~/.local/bin` directory creation if missing
- [ ] T061 [US4] Implement symlink creation at `~/.local/bin/speck` → `src/cli/bootstrap.sh`
- [ ] T062 [US4] Implement PATH detection and warning
- [ ] T063 [US4] Implement idempotent behavior (detect existing symlink)
- [ ] T064 [US4] Add `--force` flag for reinstall
- [ ] T065 [US4] Wire install command to CLI in `src/cli/index.ts`
- [ ] T066 [US4] Create `/speck.init` slash command at `.claude/commands/speck.init.md`
- [ ] T067 [US4] Verify install command works end-to-end (including bootstrap flow)

**Checkpoint**: User Story 4 complete - Speck can be installed globally with Bun bootstrap

---

## Phase 7: User Story 5 - Developer Gets Help via /speck.help (Priority: P2)

**Goal**: Skill-based help for Speck questions

**Independent Test**: Run `/speck.help`, ask "how do I create a feature?", verify accurate answer

### Implementation for User Story 5

- [ ] T068 [US5] Rename skill directory: `.claude/skills/speck-knowledge/` → `.claude/skills/speck-help/`
- [ ] T069 [US5] Update skill name in `.claude/skills/speck-help/SKILL.md` frontmatter
- [ ] T070 [US5] Remove stacked PR section from speck-help skill content
- [ ] T071 [US5] Remove virtual command section from speck-help skill content
- [ ] T072 [US5] Update slash command table (remove /speck.branch, add /speck.init, /speck.help)
- [ ] T073 [US5] Add session handoff documentation to speck-help skill
- [ ] T074 [US5] Create `/speck.help` slash command at `.claude/commands/speck.help.md`
- [ ] T075 [US5] Update any references to speck-knowledge → speck-help

**Checkpoint**: User Story 5 complete - Help skill is available

---

## Phase 8: User Story 6 - Developer Uses Non-Standard Branch Names (Priority: P2)

**Goal**: Non-standard branch names are tracked in branches.json

**Independent Test**: Create feature with custom branch name, verify branches.json entry

### Tests for User Story 6

- [ ] T076 [P] [US6] Write unit test for `getSpecForBranch()` lookup in `tests/unit/branch-mapper.test.ts`
- [ ] T077 [P] [US6] Write unit test for `addBranchEntry()` in `tests/unit/branch-mapper.test.ts`

### Implementation for User Story 6

- [ ] T078 [US6] Implement `getSpecForBranch()` function in `.speck/scripts/common/branch-mapper.ts`
- [ ] T079 [US6] Implement `addBranchEntry()` function in `.speck/scripts/common/branch-mapper.ts`
- [ ] T080 [US6] Implement `removeBranchEntry()` function in `.speck/scripts/common/branch-mapper.ts`
- [ ] T081 [US6] Integrate branch mapping into `create-new-feature` for non-standard names
- [ ] T082 [US6] Integrate branch lookup into `check-prerequisites` command
- [ ] T083 [US6] Verify non-standard branch names are correctly resolved

**Checkpoint**: User Story 6 complete - Non-standard branch names work

---

## Phase 9: User Story 7 - Developer Works in Multi-Repo Setup (Priority: P2)

**Goal**: Multi-repo functionality is retained and works correctly

**Independent Test**: Set up root + child repo, verify spec operations work

### Implementation for User Story 7

- [ ] T084 [US7] Verify multi-repo detection in check-prerequisites is unaffected
- [ ] T085 [US7] Verify shared spec access works in multi-repo mode
- [ ] T086 [US7] Verify parentSpecId is retained in simplified branches.json
- [ ] T087 [US7] Add integration test for multi-repo mode in `tests/integration/multi-repo.test.ts`
- [ ] T088 [US7] Verify no multi-repo code was accidentally removed during cleanup

**Checkpoint**: User Story 7 complete - Multi-repo works correctly

---

## Phase 10: User Story 8 - Developer Reads Streamlined Documentation (Priority: P3)

**Goal**: Website documentation is pruned and updated

**Independent Test**: Search website for "stacked PR", "virtual command" - no results

### Implementation for User Story 8

- [ ] T089 [US8] Search website content for "stacked PR" references in `website/src/content/docs/`
- [ ] T090 [US8] Remove all stacked PR documentation from website
- [ ] T091 [US8] Search website content for "virtual command" references
- [ ] T092 [US8] Remove all virtual command documentation from website
- [ ] T093 [US8] Search website for "/speck.branch" references
- [ ] T094 [US8] Remove /speck.branch documentation from website
- [ ] T095 [US8] Add /speck.init command documentation to website
- [ ] T096 [US8] Add /speck.help command documentation to website
- [ ] T097 [US8] Add session handoff documentation to website
- [ ] T098 [US8] Update getting-started guide for under 5-minute completion
- [ ] T099 [US8] Verify multi-repo documentation is retained
- [ ] T100 [US8] Update CLI command reference with new structure
- [ ] T101 [US8] Verify website builds without errors with `bun run website:build`

**Checkpoint**: User Story 8 complete - Website is streamlined

---

## Phase 11: Polish & Validation

**Purpose**: Final verification and cleanup

- [ ] T102 Run full test suite: `bun test`
- [ ] T103 Compare test results to baseline: verify pass count equals (baseline - intentionally deleted tests)
- [ ] T104 [P] Run typecheck: `bun run typecheck`
- [ ] T105 [P] Run lint: `bun run lint`
- [ ] T106 Grep verify SC-006: zero mentions of "stacked PR" in codebase (except this spec)
- [ ] T107 Grep verify SC-006: zero mentions of "virtual command" in codebase (except this spec)
- [ ] T108 Verify SC-001: Install completes in <2 minutes (including bootstrap flow)
- [ ] T109 Verify SC-002: CLI commands respond in <500ms (after bootstrap rewiring)
- [ ] T110 Verify SC-003: Feature creation with worktree completes in <10 seconds
- [ ] T111 Verify SC-004: All commands work identically for humans and hooks
- [ ] T112 Verify SC-009: Multi-repo workflows function correctly
- [ ] T113 Verify SC-010: Non-standard branch names are resolved via branches.json
- [ ] T114 Verify SC-011: New Claude sessions load handoff context
- [ ] T115 Verify SC-012: /speck.help answers common questions
- [ ] T116 Run quickstart.md validation scenarios
- [ ] T117 Final cleanup: remove any TODO comments, dead code

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phases 3-10)**: All depend on Foundational phase completion
  - US1 and US2 (both P1) can proceed in parallel
  - US3-US7 (all P2) can proceed in parallel after US1/US2
  - US8 (P3) depends on US5 (skill rename) for consistent references
- **Polish (Phase 11)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational - No story dependencies
- **US2 (P1)**: After Foundational - No story dependencies (can parallel with US1)
- **US3 (P2)**: After US1/US2 - Needs CLI integration
- **US4 (P2)**: After US1 - Needs CLI entry point
- **US5 (P2)**: After Foundational - Independent (skill rename)
- **US6 (P2)**: After Foundational - Uses branch-mapper from Phase 2
- **US7 (P2)**: After Foundational - Verification only, no changes needed
- **US8 (P3)**: After US5 - Website needs consistent skill name

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Contract schemas before implementation
- Core logic before integration
- Integration before verification

### Parallel Opportunities

**Setup (Phase 1)**:
```
T002, T003, T004, T005, T006 (all file deletions)
```

**User Story Tests** (within each story):
```
All tests marked [P] within a story can run in parallel
```

**Cross-Story Parallelism** (after Foundational):
```
US1 + US2 (both P1, independent CLIs)
US3 + US4 + US5 + US6 + US7 (all P2, after US1/US2 complete)
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (code removal)
2. Complete Phase 2: Foundational (branch mapping)
3. Complete Phase 3: User Story 1 (CLI direct invoke)
4. Complete Phase 4: User Story 2 (hook invoke)
5. **STOP and VALIDATE**: Test CLI works for humans and hooks
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Code cleaned up
2. Add US1 + US2 → CLI works → MVP!
3. Add US3 → Worktree handoff → Demo
4. Add US4 → Install command → Demo
5. Add US5 → Help skill → Demo
6. Add US6 → Non-standard branches → Demo
7. Add US7 → Multi-repo verification → Demo
8. Add US8 → Website pruned → Release

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Constitution Principle XII requires TDD - tests before implementation
- SC-006 verification requires grepping for removed feature mentions
