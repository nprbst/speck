# Tasks: OpenSpec Changes Plugin

**Input**: Design documents from `/specs/019-openspec-changes-plugin/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and plugin structure

- [ ] T001 Create plugin directory structure at `.speck/plugins/speck-changes/`
- [ ] T002 [P] Create plugin manifest at `.speck/plugins/speck-changes/plugin.json`
- [ ] T003 [P] Create slash commands directory at `.claude/commands/speck-changes/`
- [ ] T004 [P] Create upstream storage directory at `upstream/openspec/`
- [ ] T005 [P] Create change management directories at `.speck/changes/` and `.speck/archive/`
- [ ] T006 Create Zod schemas for validation in `.speck/plugins/speck-changes/scripts/lib/schemas.ts`
- [ ] T006a [P] Create test fixtures directory at `tests/.speck-plugins/speck-changes/fixtures/`
- [ ] T006b [P] Set up test infrastructure (mock GitHub API responses, temp directories)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

**TDD Note**: Each implementation task is preceded by its test task (red-green-refactor workflow per Constitution XI)

- [ ] T007-TEST [TEST] Write tests for GitHub API wrapper (auth detection, rate limiting, error handling)
- [ ] T007 Implement GitHub API wrapper with `gh` CLI auth in `.speck/plugins/speck-changes/scripts/lib/github.ts` (red-green-refactor)
- [ ] T008-TEST [TEST] [P] Write tests for delta file parser/generator (ADDED/MODIFIED/REMOVED sections)
- [ ] T008 [P] Implement delta file parser/generator in `.speck/plugins/speck-changes/scripts/lib/delta.ts` (red-green-refactor)
- [ ] T009-TEST [TEST] [P] Write tests for validation utilities (schema validation, error formatting)
- [ ] T009 [P] Implement validation utilities in `.speck/plugins/speck-changes/scripts/lib/validation.ts` (red-green-refactor)
- [ ] T010-TEST [TEST] [P] Write tests for transformation utilities (Node.js→Bun patterns)
- [ ] T010 [P] Implement transformation utilities in `.speck/plugins/speck-changes/scripts/lib/transform.ts` (red-green-refactor)
- [ ] T011 Create proposal templates at `.speck/plugins/speck-changes/templates/proposal.md`
- [ ] T012 [P] Create tasks template at `.speck/plugins/speck-changes/templates/tasks.md`
- [ ] T013 [P] Create design template at `.speck/plugins/speck-changes/templates/design.md`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Transform OpenSpec Release to Speck Plugin (Priority: P1)

**Goal**: Enable maintainers to fetch OpenSpec releases from GitHub, pull them locally, and transform Node.js CLI to Bun TypeScript with Claude Code commands

**Independent Test**: Run `/speck-changes.check-upstream`, `/speck-changes.pull-upstream v0.16.0`, `/speck-changes.transform-upstream` and verify:
1. `upstream/openspec/v0.16.0/` contains pristine OpenSpec source
2. `upstream/openspec/releases.json` tracks release metadata
3. `.speck/plugins/speck-changes/scripts/` contains Bun TypeScript equivalents
4. `/speck-changes.*` commands exist and execute successfully

### Implementation for User Story 1

- [ ] T015-TEST [TEST] [P] [US1] Write tests for check-upstream (release fetching, JSON parsing, display formatting)
- [ ] T015 [P] [US1] Implement check-upstream script in `.speck/plugins/speck-changes/scripts/check-upstream.ts` (red-green-refactor)
- [ ] T016 [P] [US1] Create check-upstream command in `.claude/commands/speck-changes/check-upstream.md`
- [ ] T017-TEST [TEST] [P] [US1] Write tests for pull-upstream (fetch, store, symlink creation, releases.json update)
- [ ] T017 [P] [US1] Implement pull-upstream script in `.speck/plugins/speck-changes/scripts/pull-upstream.ts` including `upstream/openspec/latest` symlink creation (red-green-refactor)
- [ ] T017a [US1] Install OpenSpec CLI in temp location and extract embedded .md template files (FR-004b)
- [ ] T018 [P] [US1] Create pull-upstream command in `.claude/commands/speck-changes/pull-upstream.md`
- [ ] T019-TEST [TEST] [US1] Write tests for transform-upstream (Node.js→Bun conversion, agent orchestration)
- [ ] T019 [US1] Implement transform-upstream script in `.speck/plugins/speck-changes/scripts/transform-upstream.ts` (red-green-refactor)
- [ ] T020 [US1] Create transform-upstream command in `.claude/commands/speck-changes/transform-upstream.md`
- [ ] T021 [US1] Implement SPECK-EXTENSION block preservation logic in transform-upstream.ts
- [ ] T022 [US1] Add TypeScript compilation and ESLint validation in transform-upstream.ts (FR-007)
- [ ] T022a [US1] Generate or update tests for transformed scripts in `tests/.speck-plugins/speck-changes/` (FR-006)
- [ ] T023 [US1] Create transformation history tracking in `.speck/plugins/speck-changes/transform-history.json`

**Checkpoint**: User Story 1 complete - upstream sync and transformation pipeline functional

---

## Phase 4: User Story 2 - Create a Change Proposal (Priority: P1)

**Goal**: Enable developers to create structured change proposals with proposal.md, tasks.md, and delta spec files

**Independent Test**: Run `/speck-changes.propose add-auth` and verify:
1. `.speck/changes/add-auth/` folder is created
2. `proposal.md` contains structured template with rationale section
3. `tasks.md` contains implementation checklist template
4. Claude can assist with populating proposal content

### Implementation for User Story 2

- [ ] T024-TEST [TEST] [P] [US2] Write tests for propose (folder creation, template population, kebab-case validation)
- [ ] T024 [P] [US2] Implement propose script in `.speck/plugins/speck-changes/scripts/propose.ts` (red-green-refactor)
- [ ] T025 [US2] Implement kebab-case name validation (FR-010a) in propose.ts
- [ ] T026-TEST [TEST] [US2] Write tests for delta file creation (ADDED/MODIFIED/REMOVED section generation)
- [ ] T026 [US2] Implement delta file creation logic for affected specs in propose.ts (red-green-refactor)
- [ ] T027 [US2] Implement `--with-design` flag support in propose.ts
- [ ] T028 [US2] Create propose command in `.claude/commands/speck-changes/propose.md`

**Checkpoint**: User Story 2 complete - change proposal creation functional

---

## Phase 5: User Story 3 - Review and Manage Changes (Priority: P2)

**Goal**: Enable developers to view all active change proposals and their details

**Independent Test**: Create two change proposals, run `/speck-changes.list` and verify both appear with status indicators

### Implementation for User Story 3

- [ ] T029-TEST [TEST] [P] [US3] Write tests for list (change discovery, status display, date formatting)
- [ ] T029 [P] [US3] Implement list script in `.speck/plugins/speck-changes/scripts/list.ts` (red-green-refactor)
- [ ] T030 [P] [US3] Create list command in `.claude/commands/speck-changes/list.md`
- [ ] T031-TEST [TEST] [P] [US3] Write tests for show (proposal parsing, task status, delta summary)
- [ ] T031 [P] [US3] Implement show script in `.speck/plugins/speck-changes/scripts/show.ts` (red-green-refactor)
- [ ] T032 [P] [US3] Create show command in `.claude/commands/speck-changes/show.md`
- [ ] T033 [US3] Implement `--json` flag support for machine-readable output in list.ts and show.ts

**Checkpoint**: User Story 3 complete - change listing and viewing functional

---

## Phase 6: User Story 4 - Validate Change Proposal (Priority: P2)

**Goal**: Enable developers to validate change proposal formatting before team review

**Independent Test**: Create a change with malformed delta, run `/speck-changes.validate`, and verify error is reported with line numbers

### Implementation for User Story 4

- [ ] T034-TEST [TEST] [P] [US4] Write tests for validate (structure checks, delta format, scenario validation, error output)
- [ ] T034 [P] [US4] Implement validate script in `.speck/plugins/speck-changes/scripts/validate.ts` (red-green-refactor)
- [ ] T035 [US4] Implement proposal structure validation (required sections) in validate.ts
- [ ] T036 [US4] Implement delta file format validation (ADDED/MODIFIED/REMOVED sections) in validate.ts
- [ ] T037 [US4] Implement scenario block validation (Given-When-Then format with SHALL/MUST per RFC 2119) in validate.ts
- [ ] T038 [US4] Create validate command in `.claude/commands/speck-changes/validate.md`

**Checkpoint**: User Story 4 complete - change validation functional

---

## Phase 7: User Story 5 - Archive Completed Change (Priority: P2)

**Goal**: Enable developers to merge delta specs back into source specs and archive completed changes

**Independent Test**: Create a change with delta additions, run `/speck-changes.archive`, and verify deltas merged into source specs

### Implementation for User Story 5

- [ ] T039-TEST [TEST] [P] [US5] Write tests for archive (task check, delta merge, conflict detection, timestamped move)
- [ ] T039 [P] [US5] Implement archive script in `.speck/plugins/speck-changes/scripts/archive.ts` with timestamped folder move to `.speck/archive/<name>-<YYYYMMDD>/` (red-green-refactor)
- [ ] T040 [US5] Implement task completion check in archive.ts (FR-022)
- [ ] T041 [US5] Implement delta file merge logic for ADDED/MODIFIED/REMOVED sections in archive.ts
- [ ] T041a [US5] Implement delta conflict resolution prompts for overlapping changes in archive.ts
- [ ] T042 [US5] Implement conflict detection for overlapping changes (FR-023) in archive.ts
- [ ] T043 [US5] Implement `--force` flag to bypass incomplete task check in archive.ts
- [ ] T044 [US5] Create archive command in `.claude/commands/speck-changes/archive.md`

**Checkpoint**: User Story 5 complete - archive workflow functional

---

## Phase 8: User Story 6 - Migrate from OpenSpec (Priority: P3)

**Goal**: Enable existing OpenSpec users to migrate their projects to Speck while preserving specs and changes

**Independent Test**: Set up mock OpenSpec directory, run `/speck-changes.migrate`, verify specs and changes imported correctly

### Implementation for User Story 6

- [ ] T045-TEST [TEST] [P] [US6] Write tests for migrate (directory detection, spec conversion, change import, validation)
- [ ] T045 [P] [US6] Implement migrate script in `.speck/plugins/speck-changes/scripts/migrate.ts` (red-green-refactor)
- [ ] T046 [US6] Implement OpenSpec directory detection in migrate.ts
- [ ] T047 [US6] Implement spec format conversion (openspec/specs → specs/) in migrate.ts
- [ ] T048 [US6] Implement change import logic (openspec/changes → .speck/changes/) in migrate.ts
- [ ] T049 [US6] Implement post-migration validation in migrate.ts (FR-033)
- [ ] T050 [US6] Create migrate command in `.claude/commands/speck-changes/migrate.md`

**Checkpoint**: User Story 6 complete - OpenSpec migration functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cross-story improvements

- [ ] T051 [P] Create mock-openspec fixture at `tests/.speck-plugins/speck-changes/fixtures/mock-openspec/`
- [ ] T052 [P] Create mock-releases fixture at `tests/.speck-plugins/speck-changes/fixtures/mock-releases/`
- [ ] T053 Run `bun preflight` and verify zero introduced failures (Constitution IX)
- [ ] T054 Update speck-help skill with new `/speck-changes.*` commands (Constitution XII)
- [ ] T055 Create plugin documentation at `website/src/content/docs/plugins/speck-changes.md` (Constitution X)
- [ ] T056 Run quickstart.md validation - verify all commands work as documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 and US2 are both P1, can proceed in parallel
  - US3, US4, US5 are P2, can proceed in parallel after Foundational
  - US6 is P3, can proceed after Foundational
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (US1)**: Upstream sync - No dependencies on other stories
- **User Story 2 (US2)**: Propose - No dependencies on other stories
- **User Story 3 (US3)**: List/Show - Depends on US2 having created proposals to list
- **User Story 4 (US4)**: Validate - Depends on US2 having created proposals to validate
- **User Story 5 (US5)**: Archive - Depends on US2 having created proposals to archive
- **User Story 6 (US6)**: Migrate - No dependencies on other stories

### Within Each User Story

- Foundation lib modules before command scripts
- Scripts before slash commands
- Core functionality before flags/options

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- US1 and US2 can run in parallel (both P1, no interdependencies)
- US3, US4, US5 can run in parallel (all P2, test dependencies are soft)
- US6 is independent and can run anytime after Foundational

---

## Parallel Example: Foundational Phase

```bash
# Launch all lib modules in parallel:
Task: "Implement delta file parser/generator in .speck/plugins/speck-changes/scripts/lib/delta.ts"
Task: "Implement validation utilities in .speck/plugins/speck-changes/scripts/lib/validation.ts"
Task: "Implement transformation utilities in .speck/plugins/speck-changes/scripts/lib/transform.ts"

# Launch all templates in parallel:
Task: "Create tasks template at .speck/plugins/speck-changes/templates/tasks.md"
Task: "Create design template at .speck/plugins/speck-changes/templates/design.md"
```

---

## Parallel Example: User Story 1

```bash
# Launch check-upstream and pull-upstream in parallel:
Task: "Implement check-upstream script in .speck/plugins/speck-changes/scripts/check-upstream.ts"
Task: "Create check-upstream command in .claude/commands/speck-changes/check-upstream.md"
Task: "Implement pull-upstream script in .speck/plugins/speck-changes/scripts/pull-upstream.ts"
Task: "Create pull-upstream command in .claude/commands/speck-changes/pull-upstream.md"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Upstream sync)
4. Complete Phase 4: User Story 2 (Propose)
5. **STOP and VALIDATE**: Test core workflow - fetch upstream, create proposals
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 + US2 → Core plugin functional (MVP!)
3. Add US3 (List/Show) → Visibility into changes
4. Add US4 (Validate) → Quality gate for proposals
5. Add US5 (Archive) → Complete lifecycle
6. Add US6 (Migrate) → Adoption path for OpenSpec users

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- GitHub API wrapper (T007) uses `gh` CLI auth with unauthenticated fallback
- All scripts use Bun Shell API for filesystem and subprocess operations
