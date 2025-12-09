# Tasks: OpenSpec Changes Plugin

**Input**: Design documents from `/specs/019-openspec-changes-plugin/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md
**Last Analysis**: 2025-12-08 via `/speck:analyze` | **Progress**: 63/63 tasks (100%)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Implementation Complete**: All 63 tasks completed via `/speck:implement` on 2025-12-08.
- Foundation: T011a-T011f (skills, agents, templates)
- Upstream: T014a (OpenSpec CLI template extraction)
- Quality: T019, T019a (validation, tests)
- Documentation: T051, T052, T053 (skill docs, website, quickstart validation)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and plugin structure

- [x] T001 Create plugin directory structure at `plugins/changes/`
- [x] T002 [P] Create plugin manifest at `plugins/changes/.claude-plugin/plugin.json`
- [x] T002a [P] Create `plugins/changes/package.json` with `@speck/common` dependency
- [x] T002b [P] Create `plugins/changes/tsconfig.json` extending root config
- [x] T003 [P] Create commands directory at `plugins/changes/commands/`
- [x] T004 [P] Create upstream storage directory at `upstream/openspec/`
- [x] T005 [P] Create change management directories at `.speck/changes/` and `.speck/archive/`
- [x] T006 Create Zod schemas for validation in `plugins/changes/scripts/lib/schemas.ts`
- [x] T006a [P] Create test fixtures directory at `plugins/changes/tests/fixtures/`
- [x] T006b [P] Set up test infrastructure (mock GitHub API responses, temp directories)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

**TDD Note**: Each implementation task is preceded by its test task (red-green-refactor workflow per Constitution XI)

**Shared Utilities**: GitHub API, logging, errors, file-ops, and output formatting are provided by `@speck/common`. Import via:
```typescript
import { GitHubCli, GitHubApi } from '@speck/common/github';
import { Logger, SpeckError, fileOps, output } from '@speck/common';
```

- [x] T007-TEST [TEST] [P] Write tests for delta file parser/generator (ADDED/MODIFIED/REMOVED sections)
- [x] T007 [P] Implement delta file parser/generator in `plugins/changes/scripts/lib/delta.ts` (red-green-refactor)
- [x] T008-TEST [TEST] [P] Write tests for transformation utilities (Node.js→Bun patterns)
- [x] T008 [P] Implement transformation utilities in `plugins/changes/scripts/lib/transform.ts` (red-green-refactor)
- [x] T009 Create proposal templates at `plugins/changes/templates/proposal.md`
- [x] T010 [P] Create tasks template at `plugins/changes/templates/tasks.md`
- [x] T011 [P] Create design template at `plugins/changes/templates/design.md`
- [x] T011a [P] Create delta-spec template at `plugins/changes/templates/delta-spec.md` (FR-048, FR-049, FR-050)
  - Use structure from spec.md L246-265: `## ADDED/MODIFIED/REMOVED Requirements` sections
  - Include `### Requirement:` and `#### Scenario:` block examples with RFC 2119 keywords (SHALL, MUST, SHOULD)
  - Template variables: `{{capability}}`, `{{requirement_name}}`, `{{scenario_name}}`
- [x] T011b [P] Create skills directory at `plugins/changes/skills/changes-workflow/`
- [x] T011c [P] Create SKILL.md skill at `plugins/changes/skills/changes-workflow/SKILL.md` (FR-040)
  - Content: TL;DR summary, three-stage workflow (Draft → Review → Implement → Archive), pre-task checklist
  - Source: Extract from OpenSpec AGENTS.md sections per spec.md L231-236
- [x] T011d [P] Create spec-format.md skill at `plugins/changes/skills/changes-workflow/spec-format.md` (FR-041)
  - Content: Delta specification format, `## ADDED/MODIFIED/REMOVED` structure, requirement-scenario pairing, RFC 2119 keywords
  - Source: Extract from OpenSpec AGENTS.md "Spec File Format + Delta Operations + Creating Change Proposals"
- [x] T011e [P] Create troubleshooting.md skill at `plugins/changes/skills/changes-workflow/troubleshooting.md` (FR-042)
  - Content: Validation error explanations, common mistakes, recovery procedures for malformed proposals
  - Source: Extract from OpenSpec AGENTS.md "Troubleshooting + Error Recovery + Validation Tips"
- [x] T011f [P] Create agents directory and transform-openspec agent at `plugins/changes/agents/transform-openspec.md` (FR-043-047)
  - Responsibilities: AGENTS.md → skills (3 files), CLI → scripts (Bun TypeScript), path normalization (spec.md L284-291)
  - Must preserve `<!-- SPECK-EXTENSION -->` blocks with absolute priority (FR-047)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Transform OpenSpec Release to Speck Plugin (Priority: P1)

**Goal**: Enable maintainers to fetch OpenSpec releases from GitHub, pull them locally, and transform Node.js CLI to Bun TypeScript with Claude Code commands

**Independent Test**: Run `/speck-changes.check-upstream`, `/speck-changes.pull-upstream v0.16.0`, `/speck-changes.transform-upstream` and verify:
1. `upstream/openspec/v0.16.0/` contains pristine OpenSpec source
2. `upstream/openspec/releases.json` tracks release metadata
3. `plugins/changes/scripts/` contains Bun TypeScript equivalents
4. `/speck-changes.*` commands exist and execute successfully

### Implementation for User Story 1

- [x] T012-TEST [TEST] [P] [US1] Write tests for check-upstream in `plugins/changes/tests/check-upstream.test.ts`
- [x] T012 [P] [US1] Implement check-upstream script in `plugins/changes/scripts/check-upstream.ts` (red-green-refactor)
- [x] T013 [P] [US1] Create check-upstream command in `plugins/changes/commands/check-upstream.md`
- [x] T014-TEST [TEST] [P] [US1] Write tests for pull-upstream in `plugins/changes/tests/pull-upstream.test.ts`
- [x] T014 [P] [US1] Implement pull-upstream script in `plugins/changes/scripts/pull-upstream.ts` including `upstream/openspec/latest` symlink creation (red-green-refactor)
- [x] T014a [US1] Install OpenSpec CLI in temp location and extract embedded template files (proposal.md, tasks.md, design.md) from CLI source (FR-004b)
  - Locate embedded templates in OpenSpec CLI source code (search for template string literals)
  - Extract to `upstream/openspec/<version>/templates/` for reference during transformation
  - Templates serve as source-of-truth for transform agent skill generation
- [x] T015 [P] [US1] Create pull-upstream command in `plugins/changes/commands/pull-upstream.md`
- [x] T016-TEST [TEST] [US1] Write tests for transform-upstream in `plugins/changes/tests/transform-upstream.test.ts`
- [x] T016 [US1] Implement transform-upstream script in `plugins/changes/scripts/transform-upstream.ts` (red-green-refactor)
- [x] T017 [US1] Create transform-upstream command in `plugins/changes/commands/transform-upstream.md`
- [x] T018 [US1] Implement SPECK-EXTENSION block preservation logic in transform-upstream.ts
- [x] T019 [US1] Add TypeScript compilation and ESLint validation in transform-upstream.ts (FR-007, Constitution IX)
  - After code generation, run `bun run typecheck` on generated files
  - Run `bun run lint` on generated files
  - Report errors with file:line references; only report success if both pass
  - Maintainer performs manual review before committing (per FR-007)
- [x] T019a [US1] Generate test files for each transformed script in `plugins/changes/tests/` (FR-006)
  - NOTE: Core tests already exist via TDD workflow (T021-TEST through T054-TEST)
  - This task covers any additional tests needed for transformation-specific behavior
  - Focus on error paths and edge cases not covered by existing tests
- [x] T020 [US1] Create transformation history tracking in `plugins/changes/transform-history.json`

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

- [x] T021-TEST [TEST] [P] [US2] Write tests for propose in `plugins/changes/tests/propose.test.ts`
- [x] T021 [P] [US2] Implement propose script in `plugins/changes/scripts/propose.ts` (red-green-refactor)
- [x] T022 [US2] Implement kebab-case name validation (FR-010a) in propose.ts
- [x] T023-TEST [TEST] [US2] Write tests for delta file creation (ADDED/MODIFIED/REMOVED section generation)
- [x] T023 [US2] Implement delta file creation logic for affected specs in propose.ts (red-green-refactor)
- [x] T024 [US2] Implement `--with-design` flag support in propose.ts
- [x] T025 [US2] Create propose command in `plugins/changes/commands/propose.md`

**Checkpoint**: User Story 2 complete - change proposal creation functional

---

## Phase 4.5: User Story 7 - Apply Change Proposal (Priority: P1)

**Goal**: Enable developers to implement change proposals with Claude assistance, marking tasks complete as they progress

**Independent Test**: Create a change proposal with tasks, run `/speck-changes.apply add-auth` and verify:
1. System reads tasks from `.speck/changes/add-auth/tasks.md`
2. Claude assists with implementing each task
3. Tasks are marked complete as they're finished
4. Progress is visible via `/speck-changes.show`

### Implementation for User Story 7

- [x] T054-TEST [TEST] [P] [US7] Write tests for apply in `plugins/changes/tests/apply.test.ts`
- [x] T054 [P] [US7] Implement apply script in `plugins/changes/scripts/apply.ts` (red-green-refactor)
- [x] T055 [US7] Implement task parsing from change proposal's `tasks.md` in apply.ts
- [x] T056 [US7] Implement task completion marking (FR-016a) in apply.ts
- [x] T057 [US7] Implement delta spec context loading for related tasks (FR-016b) in apply.ts
- [x] T058 [US7] Implement completion detection and archive suggestion (FR-017) in apply.ts
- [x] T059 [US7] Create apply command in `plugins/changes/commands/speck-changes.apply.md`

**Checkpoint**: User Story 7 complete - change implementation workflow functional

---

## Phase 5: User Story 3 - Review and Manage Changes (Priority: P2)

**Goal**: Enable developers to view all active change proposals and their details

**Independent Test**: Create two change proposals, run `/speck-changes.list` and verify both appear with status indicators

### Implementation for User Story 3

- [x] T026-TEST [TEST] [P] [US3] Write tests for list in `plugins/changes/tests/list.test.ts`
- [x] T026 [P] [US3] Implement list script in `plugins/changes/scripts/list.ts` (red-green-refactor)
- [x] T027 [P] [US3] Create list command in `plugins/changes/commands/speck-changes.list.md`
- [x] T028-TEST [TEST] [P] [US3] Write tests for show in `plugins/changes/tests/show.test.ts`
- [x] T028 [P] [US3] Implement show script in `plugins/changes/scripts/show.ts` (red-green-refactor)
- [x] T029 [P] [US3] Create show command in `plugins/changes/commands/speck-changes.show.md`
- [x] T030 [US3] Implement `--json` flag support for machine-readable output in list.ts and show.ts

**Checkpoint**: User Story 3 complete - change listing and viewing functional

---

## Phase 6: User Story 4 - Validate Change Proposal (Priority: P2)

**Goal**: Enable developers to validate change proposal formatting before team review

**Independent Test**: Create a change with malformed delta, run `/speck-changes.validate`, and verify error is reported with line numbers

### Implementation for User Story 4

- [x] T031-TEST [TEST] [P] [US4] Write tests for validate in `plugins/changes/tests/validate.test.ts`
- [x] T031 [P] [US4] Implement validate script in `plugins/changes/scripts/validate.ts` (red-green-refactor)
- [x] T032 [US4] Implement proposal structure validation (required sections) in validate.ts
- [x] T033 [US4] Implement delta file format validation (ADDED/MODIFIED/REMOVED sections) in validate.ts
- [x] T034 [US4] Implement scenario block validation (Given-When-Then format with SHALL/MUST per RFC 2119) in validate.ts
- [x] T035 [US4] Create validate command in `plugins/changes/commands/speck-changes.validate.md`

**Checkpoint**: User Story 4 complete - change validation functional

---

## Phase 7: User Story 5 - Archive Completed Change (Priority: P2)

**Goal**: Enable developers to merge delta specs back into source specs and archive completed changes

**Independent Test**: Create a change with delta additions, run `/speck-changes.archive`, and verify deltas merged into source specs

### Implementation for User Story 5

- [x] T036-TEST [TEST] [P] [US5] Write tests for archive in `plugins/changes/tests/archive.test.ts`
- [x] T036 [P] [US5] Implement archive script in `plugins/changes/scripts/archive.ts` with timestamped folder move to `.speck/archive/<name>-<YYYYMMDD>/` (red-green-refactor)
- [x] T037 [US5] Implement task completion check in archive.ts (FR-022)
- [x] T038 [US5] Implement delta file merge logic for ADDED/MODIFIED/REMOVED sections in archive.ts
- [x] T038a [US5] Implement delta conflict resolution prompts for overlapping changes in archive.ts
- [x] T039 [US5] Implement conflict detection for overlapping changes (FR-023) in archive.ts
- [x] T040 [US5] Implement `--force` flag to bypass incomplete task check in archive.ts
- [x] T041 [US5] Create archive command in `plugins/changes/commands/speck-changes.archive.md`

**Checkpoint**: User Story 5 complete - archive workflow functional

---

## Phase 8: User Story 6 - Migrate from OpenSpec (Priority: P3)

**Goal**: Enable existing OpenSpec users to migrate their projects to Speck while preserving specs and changes

**Independent Test**: Set up mock OpenSpec directory, run `/speck-changes.migrate`, verify specs and changes imported correctly

### Implementation for User Story 6

- [x] T042-TEST [TEST] [P] [US6] Write tests for migrate in `plugins/changes/tests/migrate.test.ts`
- [x] T042 [P] [US6] Implement migrate script in `plugins/changes/scripts/migrate.ts` (red-green-refactor)
- [x] T043 [US6] Implement OpenSpec directory detection in migrate.ts
- [x] T044 [US6] Implement spec format conversion (openspec/specs → specs/) in migrate.ts
- [x] T045 [US6] Implement change import logic (openspec/changes → .speck/changes/) in migrate.ts
- [x] T046 [US6] Implement post-migration validation in migrate.ts (FR-033)
- [x] T047 [US6] Create migrate command in `plugins/changes/commands/speck-changes.migrate.md`

**Checkpoint**: User Story 6 complete - OpenSpec migration functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cross-story improvements

- [x] T048 [P] Create mock-openspec fixture at `plugins/changes/tests/fixtures/mock-openspec/` (tests create fixtures inline)
- [x] T049 [P] Create mock-releases fixture at `plugins/changes/tests/fixtures/mock-releases/` (tests create fixtures inline)
- [x] T050 Run all tests and verify passes (134 tests pass)
- [x] T051 Update speck-help skill with new `/speck-changes.*` commands (Constitution XII)
  - Location: `.claude/skills/speck-help/SKILL.md` or equivalent skill file
  - Add section: "## OpenSpec Changes Plugin Commands"
  - Document all 10 commands: check-upstream, pull-upstream, transform-upstream, propose, list, show, validate, apply, archive, migrate
  - Include usage examples and common workflows
- [x] T052 Create plugin documentation at `website/src/content/docs/plugins/speck-changes.md` (Constitution X)
  - Sections: Overview, Installation, Command Reference (all 10 commands), Workflow Guide, Migration Guide
  - Workflow Guide: propose → validate → apply → archive lifecycle
  - Migration Guide: OpenSpec users transitioning to Speck
  - Verify with `bun run website:build` and `bun run website:dev`
- [x] T053 Run quickstart.md validation - verify all commands work as documented
  - Execute each command example from quickstart.md
  - Verify output matches documentation
  - Update quickstart.md if any discrepancies found

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
Task: "Implement delta file parser/generator in plugins/changes/scripts/lib/delta.ts"
Task: "Implement transformation utilities in plugins/changes/scripts/lib/transform.ts"

# Launch all templates in parallel:
Task: "Create tasks template at plugins/changes/templates/tasks.md"
Task: "Create design template at plugins/changes/templates/design.md"
```

---

## Parallel Example: User Story 1

```bash
# Launch check-upstream and pull-upstream in parallel:
Task: "Implement check-upstream script in plugins/changes/scripts/check-upstream.ts"
Task: "Create check-upstream command in plugins/changes/commands/check-upstream.md"
Task: "Implement pull-upstream script in plugins/changes/scripts/pull-upstream.ts"
Task: "Create pull-upstream command in plugins/changes/commands/pull-upstream.md"
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
- GitHub API utilities imported from `@speck/common/github` (provides `gh` CLI auth with unauthenticated fallback)
- All scripts use Bun Shell API for filesystem and subprocess operations
- Plugin follows monorepo pattern: `plugins/changes/` with `@speck/common` dependency
