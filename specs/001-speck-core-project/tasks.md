---

description: "Task list for Upstream Sync & Transformation Pipeline implementation"
---

# Tasks: Upstream Sync & Transformation Pipeline

**Input**: Design documents from `/specs/001-speck-core-project/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: Medium-weight tests included for TypeScript `.speck/scripts/` implementations and `common/` utilities (per plan.md Section "Technical Context")

**Organization**: Tasks are organized by implementation phase with a single user story (US1: Transform Spec-Kit Release to Speck)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1 = User Story 1)
- File paths included in task descriptions

## Path Conventions

- **Scripts**: `.speck/scripts/` (Bun TypeScript implementations)
- **Common utilities**: `.speck/scripts/common/`
- **Tests**: `tests/.speck-scripts/` (mirrors `.speck/scripts/` structure)
- **Commands**: `.claude/commands/`
- **Agents**: `.claude/agents/`
- **Upstream storage**: `upstream/<version>/`
- **Tracking**: `upstream/releases.json`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, directory structure, and development tooling

- [ ] T001 Create `.speck/` directory structure with `scripts/` and `scripts/common/` subdirectories
- [ ] T002 Create `upstream/` directory for storing pristine spec-kit releases
- [ ] T003 Create `.claude/commands/` directory for Speck slash commands
- [ ] T004 Create `.claude/agents/` directory for transformation agents
- [ ] T005 Create `tests/.speck-scripts/` directory structure mirroring `.speck/scripts/`
- [ ] T006 Create `tests/fixtures/` directory for test fixtures
- [ ] T007 [P] Copy contract files from `specs/001-speck-core-project/contracts/` to `.speck/scripts/contracts/` for TypeScript imports
- [ ] T008 [P] Configure Bun test framework (verify `bun test` command works)
- [ ] T009 [P] Create `.gitignore` entries for `upstream/` directory (pristine upstream content, can be re-pulled)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure and common utilities that ALL user story tasks depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Common Utilities (Shared Across All Commands)

- [ ] T010 [P] Implement GitHub API client in `.speck/scripts/common/github-api.ts` (fetch releases, rate limiting, error handling)
- [ ] T011 [P] Implement release registry manager in `.speck/scripts/common/json-tracker.ts` (read/write/validate `upstream/releases.json`)
- [ ] T012 [P] Implement symlink manager in `.speck/scripts/common/symlink-manager.ts` (create/update `upstream/latest` symlink)
- [ ] T013 [P] Implement atomic file operations in `.speck/scripts/common/file-ops.ts` (temp directories, atomic rename, rollback)

### Tests for Common Utilities (Medium-Weight)

- [ ] T014 [P] Test GitHub API client in `tests/.speck-scripts/common/github-api.test.ts` (mock responses, rate limiting, error cases)
- [ ] T015 [P] Test release registry manager in `tests/.speck-scripts/common/json-tracker.test.ts` (add release, update status, validation)
- [ ] T016 [P] Test symlink manager in `tests/.speck-scripts/common/symlink-manager.test.ts` (create/update symlinks, error handling)
- [ ] T017 [P] Test atomic file operations in `tests/.speck-scripts/common/file-ops.test.ts` (temp directories, atomic operations, rollback)

**Checkpoint**: Foundation ready - all common utilities implemented and tested - user story implementation can now begin

---

## Phase 3: User Story 1 - Transform Spec-Kit Release to Speck (Priority: P1) 🎯 MVP

**Goal**: Implement the three-command upstream sync and transformation pipeline that enables maintainers to discover, pull, and transform spec-kit releases into Speck's Claude-native implementation

**Independent Test**: Run `/speck.check-upstream`, `/speck.pull-upstream v1.0.0`, `/speck.transform-upstream`, then verify:
1. `upstream/v1.0.0/` contains pristine upstream templates and bash scripts
2. `upstream/releases.json` tracks the v1.0.0 release metadata
3. `.speck/scripts/` contains Bun TS equivalents with identical CLI behavior
4. `/speck.*` commands exist and successfully call `.speck/scripts/`
5. Transformation report shows what changed and Claude's rationale

### Command 1: `/speck.check-upstream` (Discover Available Releases)

#### Tests First (Medium-Weight) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T018 [P] [US1] Contract test: `--json` flag outputs valid JSON schema in `tests/.speck-scripts/check-upstream.test.ts`
- [X] T019 [P] [US1] Contract test: exit code 0 on success in `tests/.speck-scripts/check-upstream.test.ts`
- [X] T020 [P] [US1] Contract test: exit code 2 on network error in `tests/.speck-scripts/check-upstream.test.ts`
- [X] T021 [P] [US1] Contract test: `--help` flag shows usage information in `tests/.speck-scripts/check-upstream.test.ts`
- [X] T022 [P] [US1] Edge case test: handles GitHub rate limiting gracefully in `tests/.speck-scripts/check-upstream.test.ts`

#### Implementation

- [X] T023 [US1] Implement `check-upstream.ts` in `.speck/scripts/` (uses `common/github-api.ts`, outputs release list with versions, dates, summaries)
- [X] T024 [US1] Implement CLI flag parsing in `.speck/scripts/check-upstream.ts` (--json, --help, --version flags)
- [X] T025 [US1] Implement JSON output formatter in `.speck/scripts/check-upstream.ts` (matches `CheckUpstreamOutput` schema from `contracts/cli-interface.ts`)
- [X] T026 [US1] Implement human-readable output formatter in `.speck/scripts/check-upstream.ts` (table format with version, date, summary)
- [X] T027 [US1] Add error handling with proper exit codes in `.speck/scripts/check-upstream.ts` (0=success, 2=network/system error)

#### Slash Command Integration

- [X] T028 [US1] Create `/speck.check-upstream` command file in `.claude/commands/speck.check-upstream.md` (calls `.speck/scripts/check-upstream.ts`)

**Checkpoint**: Command 1 complete - can discover available spec-kit releases via `/speck.check-upstream`

---

### Command 2: `/speck.pull-upstream <version>` (Pull Pristine Release)

#### Tests First (Medium-Weight) ⚠️

- [X] T029 [P] [US1] Contract test: `--json` flag outputs valid JSON schema in `tests/.speck-scripts/pull-upstream.test.ts`
- [X] T030 [P] [US1] Contract test: exit code 0 on successful pull in `tests/.speck-scripts/pull-upstream.test.ts`
- [X] T031 [P] [US1] Contract test: exit code 1 on invalid version format in `tests/.speck-scripts/pull-upstream.test.ts`
- [X] T032 [P] [US1] Contract test: exit code 2 on network error in `tests/.speck-scripts/pull-upstream.test.ts`
- [X] T033 [P] [US1] Edge case test: creates `upstream/<version>/` directory in `tests/.speck-scripts/pull-upstream.test.ts`
- [X] T034 [P] [US1] Edge case test: updates `upstream/releases.json` with release metadata in `tests/.speck-scripts/pull-upstream.test.ts`
- [X] T035 [P] [US1] Edge case test: creates/updates `upstream/latest` symlink in `tests/.speck-scripts/pull-upstream.test.ts`
- [X] T036 [P] [US1] Edge case test: handles first-time pull (no existing `upstream/` directory) in `tests/.speck-scripts/pull-upstream.test.ts`
- [X] T037 [P] [US1] Edge case test: network failure leaves existing state unchanged in `tests/.speck-scripts/pull-upstream.test.ts`

#### Implementation

- [X] T038 [US1] Implement `pull-upstream.ts` in `.speck/scripts/` (fetches tarball from GitHub, extracts to `upstream/<version>/`)
- [X] T039 [US1] Implement version argument parsing and validation in `.speck/scripts/pull-upstream.ts` (semantic versioning pattern check)
- [X] T040 [US1] Implement tarball download logic in `.speck/scripts/pull-upstream.ts` (uses GitHub API tarball_url)
- [X] T041 [US1] Implement tarball extraction to `upstream/<version>/` in `.speck/scripts/pull-upstream.ts` (pristine upstream content)
- [X] T042 [US1] Implement release registry update in `.speck/scripts/pull-upstream.ts` (calls `common/json-tracker.ts` to add release with status "pulled")
- [X] T043 [US1] Implement symlink update in `.speck/scripts/pull-upstream.ts` (calls `common/symlink-manager.ts` to update `upstream/latest`)
- [X] T044 [US1] Implement atomic operations in `.speck/scripts/pull-upstream.ts` (uses `common/file-ops.ts` for rollback on failure)
- [X] T045 [US1] Implement JSON and human-readable output formatters in `.speck/scripts/pull-upstream.ts` (matches `PullUpstreamOutput` schema)
- [X] T046 [US1] Add error handling with proper exit codes in `.speck/scripts/pull-upstream.ts` (0=success, 1=user error, 2=system error)

#### Slash Command Integration

- [X] T047 [US1] Create `/speck.pull-upstream` command file in `.claude/commands/speck.pull-upstream.md` (calls `.speck/scripts/pull-upstream.ts <version>`)

**Checkpoint**: Command 2 complete - can pull pristine spec-kit releases via `/speck.pull-upstream <version>`

---

### Command 3: `/speck.transform-upstream` (Transform to Speck Implementation)

#### Transformation Agents (Core Logic)

- [X] T048 [P] [US1] Create bash-to-Bun transformation agent in `.claude/agents/transform-bash-to-bun.md` (analyzes bash scripts, generates Bun TypeScript equivalents)
- [X] T049 [P] [US1] Create command transformation agent in `.claude/agents/transform-commands.md` (transforms `/speckit.*` to `/speck.*`, factors agents/skills)

#### Tests First (Medium-Weight) ⚠️

- [X] T050 [P] [US1] Contract test: `--json` flag outputs valid JSON schema in `tests/.speck-scripts/transform-upstream.test.ts`
- [X] T051 [P] [US1] Contract test: exit code 0 on successful transformation in `tests/.speck-scripts/transform-upstream.test.ts`
- [X] T052 [P] [US1] Contract test: exit code 2 on transformation failure in `tests/.speck-scripts/transform-upstream.test.ts`
- [X] T053 [P] [US1] Contract test: defaults to `upstream/latest` when no version specified in `tests/.speck-scripts/transform-upstream.test.ts`
- [X] T054 [P] [US1] Contract test: accepts `--version` flag to target specific release in `tests/.speck-scripts/transform-upstream.test.ts`
- [X] T055 [P] [US1] Edge case test: updates status to "transformed" on success in `tests/.speck-scripts/transform-upstream.test.ts`
- [X] T056 [P] [US1] Edge case test: updates status to "failed" with error details on failure in `tests/.speck-scripts/transform-upstream.test.ts`
- [X] T057 [P] [US1] Edge case test: preserves existing `.speck/scripts/` on transformation failure in `tests/.speck-scripts/transform-upstream.test.ts`
- [X] T058 [P] [US1] Edge case test: fails early with clear message if Bun not installed in `tests/.speck-scripts/transform-upstream.test.ts`

#### Implementation

- [X] T059 [US1] Implement `/speck.transform-upstream` slash command orchestration (sequences two transformation agents and manages transformation workflow)
- [X] T060 [US1] Implement version resolution logic in slash command (defaults to `upstream/latest` symlink target, accepts `--version` arg)
- [X] T061 [US1] Implement Bun runtime check in slash command (fails early if `bun --version` fails)
- [X] T062 [US1] Implement bash-to-Bun agent invocation in slash command (launches `.claude/agents/transform-bash-to-bun.md` with source bash scripts)
- [X] T063 [US1] Implement command transformation agent invocation in slash command (launches `.claude/agents/transform-commands.md` after bash-to-Bun completes)
- [X] T064 [US1] Implement transformation report generation in slash command (collects agent outputs, creates summary)
- [X] T065 [US1] Implement release registry status update in slash command (calls `common/json-tracker.ts` to update status to "transformed" or "failed")
- [X] T066 [US1] Implement atomic transformation operations in slash command (coordinates agents to use temp directories, manages rollback on agent failure)
- [X] T067 [US1] Implement output formatting in slash command (presents transformation results to user)
- [X] T068 [US1] Add error handling in slash command (manages agent failures, reports errors to user)

#### Slash Command Integration

- [X] T069 [US1] Create `/speck.transform-upstream` command file in `.claude/commands/speck.transform-upstream.md` (orchestrates transformation agents, optional `--version` arg)

**Checkpoint**: Command 3 complete - can transform upstream releases via `/speck.transform-upstream`

---

### Integration & End-to-End Validation

- [ ] T070 [US1] Integration test: full pipeline from check → pull → transform in `tests/.speck-scripts/integration.test.ts`
- [ ] T071 [US1] Validation: verify transformation report structure matches `TransformUpstreamOutput` schema
- [ ] T072 [US1] Validation: verify generated Bun scripts have identical CLI interface to bash equivalents (same flags, exit codes, JSON output structure)
- [ ] T073 [US1] Validation: verify `/speck.*` commands successfully call `.speck/scripts/` implementations
- [ ] T074 [US1] Run quickstart.md validation scenarios (Prerequisites, Running Tests, Development Workflows)

**Checkpoint**: User Story 1 complete - upstream sync and transformation pipeline fully functional and independently testable

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple commands and overall developer experience

- [ ] T075 [P] Add JSDoc comments to all public functions in `.speck/scripts/` and `.speck/scripts/common/`
- [ ] T076 [P] Add inline comments explaining transformation strategy decisions in transformation agents
- [ ] T077 [P] Code cleanup: remove unused imports, enforce consistent formatting with `prettier`
- [ ] T078 [P] Performance validation: verify `/speck.check-upstream` completes in <10s (SC-001)
- [ ] T079 [P] Performance validation: verify `/speck.pull-upstream` completes in <2min for typical releases (SC-002)
- [ ] T080 [P] Performance validation: verify `/speck.transform-upstream` completes in <5min for typical releases (SC-003)
- [ ] T081 [P] Performance validation: verify Bun script startup time <100ms (SC-006)
- [ ] T082 Run full test suite with coverage: `bun test --coverage` (target 80%+ coverage per research.md)
- [ ] T083 Verify coverage threshold: ensure 80%+ coverage for `.speck/scripts/` and `common/` utilities (SC-007 transformation success rate validation)
- [ ] T084 Security review: ensure no secrets in `.speck/scripts/` (GitHub tokens, credentials)
- [ ] T085 Documentation: add troubleshooting section to quickstart.md based on common test failures
- [ ] T086 Final validation: run all quickstart.md scenarios end-to-end on clean repository clone

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user story tasks
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
  - Command 1 (`/speck.check-upstream`): Can start after Foundational
  - Command 2 (`/speck.pull-upstream`): Can start after Foundational (independent of Command 1)
  - Command 3 (`/speck.transform-upstream`): Depends on Command 2 (needs pulled upstream content)
- **Polish (Phase 4)**: Depends on User Story 1 completion

### User Story 1 Internal Dependencies

**Command 1** (`/speck.check-upstream`):
- Tests (T018-T022) → Implementation (T023-T027) → Slash Command (T028)

**Command 2** (`/speck.pull-upstream`):
- Tests (T029-T037) → Implementation (T038-T046) → Slash Command (T047)

**Command 3** (`/speck.transform-upstream`):
- Agents (T048-T049) can be written in parallel
- Tests (T050-T058) → Implementation (T059-T068) → Slash Command (T069)

**Integration** (T070-T074):
- Depends on all three commands being complete

### Parallel Opportunities

#### Within Setup (Phase 1)
```bash
# All directory creation can happen in parallel
Task: "Create .speck/ directory structure"
Task: "Create upstream/ directory"
Task: "Create .claude/commands/ directory"
Task: "Create .claude/agents/ directory"
Task: "Create tests/.speck-scripts/ directory"
Task: "Create tests/fixtures/ directory"
```

#### Within Foundational (Phase 2)
```bash
# All common utilities can be implemented in parallel
Task: "Implement GitHub API client in .speck/scripts/common/github-api.ts"
Task: "Implement release registry manager in .speck/scripts/common/json-tracker.ts"
Task: "Implement symlink manager in .speck/scripts/common/symlink-manager.ts"
Task: "Implement atomic file operations in .speck/scripts/common/file-ops.ts"

# All common utility tests can run in parallel
Task: "Test GitHub API client in tests/.speck-scripts/common/github-api.test.ts"
Task: "Test release registry manager in tests/.speck-scripts/common/json-tracker.test.ts"
Task: "Test symlink manager in tests/.speck-scripts/common/symlink-manager.test.ts"
Task: "Test atomic file operations in tests/.speck-scripts/common/file-ops.test.ts"
```

#### Within User Story 1 (Phase 3)
```bash
# Command 1 tests (all parallel)
Task: "Contract test: --json flag outputs valid JSON schema"
Task: "Contract test: exit code 0 on success"
Task: "Contract test: exit code 2 on network error"
Task: "Contract test: --help flag shows usage"
Task: "Edge case test: handles rate limiting"

# Command 2 tests (all parallel)
Task: "Contract test: --json flag outputs valid JSON schema"
Task: "Contract test: exit code 0 on successful pull"
Task: "Contract test: exit code 1 on invalid version"
# ... all T029-T037 tests can run in parallel

# Command 3 agents (parallel development)
Task: "Create bash-to-Bun transformation agent"
Task: "Create command transformation agent"

# Command 3 tests (all parallel)
Task: "Contract test: --json flag outputs valid JSON schema"
Task: "Contract test: exit code 0 on successful transformation"
# ... all T050-T058 tests can run in parallel
```

#### Within Polish (Phase 4)
```bash
# Most polish tasks can run in parallel
Task: "Add JSDoc comments to .speck/scripts/"
Task: "Add inline comments to transformation agents"
Task: "Code cleanup: remove unused imports"
Task: "Performance validation: check-upstream <10s"
Task: "Performance validation: pull-upstream <2min"
Task: "Performance validation: transform-upstream <5min"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

This feature has a single user story (US1), so MVP = full feature implementation:

1. Complete Phase 1: Setup (T001-T009)
2. Complete Phase 2: Foundational (T010-T017) - CRITICAL, blocks everything
3. Complete Phase 3: User Story 1
   - Command 1: `/speck.check-upstream` (T018-T028)
   - Command 2: `/speck.pull-upstream` (T029-T047)
   - Command 3: `/speck.transform-upstream` (T048-T069)
   - Integration & Validation (T070-T074)
4. **STOP and VALIDATE**: Test full pipeline end-to-end using quickstart.md
5. Complete Phase 4: Polish (T075-T086)

### Incremental Delivery Within User Story 1

Since US1 has three commands, deliver incrementally:

1. Setup + Foundational → Foundation ready
2. Add Command 1 (`/speck.check-upstream`) → Test independently → Can discover releases! ✅
3. Add Command 2 (`/speck.pull-upstream`) → Test independently → Can pull releases! ✅
4. Add Command 3 (`/speck.transform-upstream`) → Test independently → Full pipeline! 🎯
5. Integration & validation → End-to-end tests pass → Ready for polish
6. Polish & optimization → Production ready

### Parallel Team Strategy

With multiple developers working on Phase 3:

1. Team completes Setup + Foundational together (T001-T017)
2. Once Foundational is done, split into parallel workstreams:
   - **Developer A**: Command 1 (`/speck.check-upstream`) - T018-T028
   - **Developer B**: Command 2 (`/speck.pull-upstream`) - T029-T047
   - **Developer C**: Command 3 agents (T048-T049), then wait for Developer B before starting T050-T069
3. Integration tests (T070-T074) require all commands complete
4. Polish tasks (T075-T086) can be split among team members

---

## Success Criteria Validation

Per [spec.md](spec.md) Section "Success Criteria", validate these measurable outcomes:

- **SC-001**: `/speck.check-upstream` completes in <10s → Validate with T078
- **SC-002**: `/speck.pull-upstream` completes in <2min → Validate with T079
- **SC-003**: `/speck.transform-upstream` completes in <5min → Validate with T080
- **SC-004**: Generated Bun scripts produce byte-for-byte identical `--json` output → Validate with T072
- **SC-005**: Generated Bun scripts have 100% exit code compatibility → Validate with T072
- **SC-006**: Bun scripts start in <100ms → Validate with T081
- **SC-007**: Transformation succeeds without manual conflict resolution in 80% of releases → Validate with T083 (coverage threshold)
- **SC-008**: Generated `/speck.*` commands successfully call `.speck/scripts/` → Validate with T073
- **SC-009**: `upstream/releases.json` accurately tracks all pulled releases → Validate with T071

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[US1] label**: All Phase 3 tasks belong to User Story 1
- **Tests First**: All contract tests (T018-T037, T050-T058) must FAIL before implementation
- **Medium-Weight Tests**: Use `MockFilesystem`, `MockGitHubApi` from `contracts/test-utilities.ts`
- **CLI Interface Compatibility**: All Bun scripts MUST match bash equivalents (flags, exit codes, JSON output)
- **Atomic Operations**: All commands use temp directories + atomic rename for rollback safety
- **Commit Strategy**: Commit after each command is complete (T028, T047, T069) or after logical groups
- **Checkpoints**: Stop at each checkpoint to validate independently before proceeding
- **Transformation Strategy**: Pure TypeScript > Bun Shell API > Bun.spawn() (per research.md)
- **Extension Markers**: Transformation agents MUST preserve `[SPECK-EXTENSION:START/END]` boundaries
