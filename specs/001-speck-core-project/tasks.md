# Tasks: Speck - Claude Code-Optimized Specification Framework

**Input**: Design documents from `/specs/001-speck-core-project/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the feature specification. This implementation focuses on core functionality with manual E2E validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths follow hexagonal architecture: `src/core/`, `src/adapters/`, `src/cli/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure per implementation plan with src/, tests/, .claude/, .speck/, upstream/ directories
- [X] T002 Initialize TypeScript project with Bun runtime - configure package.json with dependencies
- [X] T003 [P] Configure TypeScript compiler in tsconfig.json with strict mode and Bun target
- [X] T004 [P] Configure Bun test runner in bunfig.toml
- [X] T005 [P] Setup ESLint and Prettier for code formatting
- [X] T006 Create .gitignore with node_modules/, dist/, .env patterns
- [X] T007 Install core dependencies - Bun, Commander.js, Zod, Handlebars, Marked, Prompts, Chalk, Ora

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Core Domain Models & Types

- [X] T008 [P] Create Feature model with Zod schema in src/core/models/Feature.ts
- [X] T009 [P] Create Specification model with Zod schema in src/core/models/Specification.ts
- [X] T010 [P] Create Plan model with Zod schema in src/core/models/Plan.ts
- [X] T011 [P] Create Task model with Zod schema in src/core/models/Task.ts
- [X] T012 [P] Create Checklist model with Zod schema in src/core/models/Checklist.ts
- [X] T013 [P] Create Constitution model with Zod schema in src/core/models/Constitution.ts
- [X] T014 [P] Create UpstreamTracker model with Zod schema in src/core/models/UpstreamTracker.ts
- [X] T015 [P] Create Clarification model with Zod schema in src/core/models/Clarification.ts

### Adapter Interfaces (Ports)

- [X] T016 [P] Create GitAdapter interface in src/adapters/git/GitAdapter.ts
- [X] T017 [P] Create FileSystemAdapter interface in src/adapters/filesystem/FileSystemAdapter.ts
- [X] T018 [P] Create RuntimeAdapter interface in src/adapters/runtime/RuntimeAdapter.ts
- [X] T019 [P] Create TemplateEngine interface in src/adapters/template/TemplateEngine.ts

### Adapter Implementations (Bun-Specific)

- [ ] T020 [P] Implement BunRuntimeAdapter in src/adapters/runtime/BunRuntimeAdapter.ts with Bun.spawn and Bun.$ support
- [ ] T021 Implement BunGitAdapter in src/adapters/git/BunGitAdapter.ts using BunRuntimeAdapter
- [ ] T022 Implement BunFsAdapter in src/adapters/filesystem/BunFsAdapter.ts with Bun.file and Bun.write
- [ ] T023 Implement WorktreeAdapter in src/adapters/git/WorktreeAdapter.ts for git worktree operations
- [ ] T024 Implement HandlebarsAdapter in src/adapters/template/HandlebarsAdapter.ts with custom helpers

### Configuration & Utilities

- [ ] T025 [P] Create SpeckConfig Zod schema in src/config/schemas/SpeckConfig.ts
- [ ] T026 [P] Create WorktreeConfig Zod schema in src/config/schemas/WorktreeConfig.ts
- [ ] T027 Implement ConfigLoader in src/config/ConfigLoader.ts with Zod validation
- [ ] T028 [P] Create path utilities in src/utils/paths.ts
- [ ] T029 [P] Create markdown utilities in src/utils/markdown.ts
- [ ] T030 [P] Create JSON utilities in src/utils/json.ts
- [ ] T031 [P] Create logger utility in src/utils/logger.ts with Chalk integration
- [ ] T032 [P] Create validation utilities in src/utils/validation.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Solo Developer Creates First Feature Specification (Priority: P1) 🎯 MVP

**Goal**: Enable a solo developer to create structured specifications via `/speck.specify` command in Claude Code

**Independent Test**: Run `/speck.specify "Add user authentication"` in Claude Code and verify complete specification is generated with all required sections in specs/001-user-authentication/spec.md

### Implementation for User Story 1

#### Core Services

- [ ] T033 [P] [US1] Create FeatureService in src/core/services/FeatureService.ts with createFeature method
- [ ] T034 [P] [US1] Create SpecificationService in src/core/services/SpecificationService.ts with generateSpecification method
- [ ] T035 [US1] Implement feature number assignment logic in FeatureService checking branches, worktrees, and specs directories
- [ ] T036 [US1] Implement short name generation from description in FeatureService using keyword extraction
- [ ] T037 [US1] Implement branch name validation in FeatureService with 244-character limit check
- [ ] T038 [US1] Implement duplicate short-name collision detection with auto-append counter in FeatureService

#### Generators

- [ ] T039 [P] [US1] Create SpecGenerator in src/core/generators/SpecGenerator.ts using Handlebars templates
- [ ] T040 [US1] Implement spec generation with max 3 clarification markers in SpecGenerator
- [ ] T041 [US1] Implement user scenario parsing and formatting in SpecGenerator

#### Validators

- [ ] T042 [P] [US1] Create SpecValidator in src/core/validators/SpecValidator.ts enforcing zero implementation details
- [ ] T043 [US1] Implement technology-agnostic success criteria validation in SpecValidator
- [ ] T044 [US1] Implement mandatory sections validation in SpecValidator

#### CLI Command

- [ ] T045 [US1] Create CLI entry point in src/cli/index.ts with Commander.js setup
- [ ] T046 [US1] Implement specify command in src/cli/commands/specify.ts
- [ ] T047 [US1] Add interactive prompts for missing parameters in src/cli/shared/prompts.ts
- [ ] T048 [US1] Add JSON output support with --json flag in src/cli/shared/output.ts
- [ ] T049 [US1] Implement dependency injection composition root in src/cli/index.ts

#### Claude Code Integration

- [ ] T050 [US1] Create /speck.specify slash command markdown in .claude/commands/speck.specify.md
- [ ] T051 [US1] Add specification examples and usage docs to speck.specify.md
- [ ] T052 [US1] Test specify workflow end-to-end via CLI and verify spec generation

**Checkpoint**: At this point, User Story 1 should be fully functional - developers can create specs via CLI or slash command

---

## Phase 4: User Story 5 - Developer Clarifies Ambiguous Requirements (Priority: P1)

**Goal**: Enable developers to systematically resolve spec ambiguities through `/speck.clarify` command

**Independent Test**: Generate spec with clarification markers, run `/speck.clarify`, answer questions, verify spec is updated with resolved answers

**Note**: Implementing User Story 5 before US2 because clarification is part of the specify→clarify→plan workflow

### Implementation for User Story 5

#### Core Services

- [ ] T053 [US5] Extend SpecificationService with clarify method in src/core/services/SpecificationService.ts
- [ ] T054 [US5] Implement ambiguity detection logic scanning for explicit markers and detected gaps
- [ ] T055 [US5] Implement question generation with max 5 questions per session
- [ ] T056 [US5] Implement spec update logic replacing markers with answers

#### Generators

- [ ] T057 [US5] Create ClarificationGenerator in src/core/generators/ClarificationGenerator.ts
- [ ] T058 [US5] Implement question-answer formatting and spec section integration

#### CLI Command

- [ ] T059 [US5] Implement clarify command in src/cli/commands/clarify.ts
- [ ] T060 [US5] Add interactive Q&A prompts in clarify command
- [ ] T061 [US5] Track clarification sessions in Clarification model with session IDs

#### Claude Code Integration

- [ ] T062 [US5] Create /speck.clarify slash command markdown in .claude/commands/speck.clarify.md
- [ ] T063 [US5] Create clarification-agent markdown in .claude/agents/clarification-agent.md for autonomous Q&A loops
- [ ] T064 [US5] Test clarify workflow end-to-end - verify 90% single-session resolution

**Checkpoint**: User Stories 1 AND 5 should both work independently - developers can specify and clarify specs

---

## Phase 5: User Story 2 - Developer Syncs Upstream Spec-Kit Changes (Priority: P2)

**Goal**: Enable syncing upstream spec-kit releases while preserving Speck-specific enhancements

**Independent Test**: Run `/speck.transform-upstream` after upstream has new release, verify Speck commands updated with preserved [SPECK-EXTENSION] blocks

### Implementation for User Story 2

#### Core Services

- [ ] T065 [P] [US2] Create UpstreamSyncService in src/core/services/UpstreamSyncService.ts
- [ ] T066 [US2] Implement GitHub Releases fetching in UpstreamSyncService
- [ ] T067 [US2] Implement release comparison and diff generation
- [ ] T068 [US2] Implement extension marker preservation logic
- [ ] T069 [US2] Implement sync manifest tracking in .speck/sync-manifest.json

#### Generators

- [ ] T070 [US2] Create SyncReportGenerator in src/core/generators/SyncReportGenerator.ts
- [ ] T071 [US2] Implement transformation report with upstream changes, preserved extensions, and rationale

#### CLI Commands

- [ ] T072 [P] [US2] Implement check-upstream-releases command in src/cli/commands/checkUpstreamReleases.ts
- [ ] T073 [P] [US2] Implement download-upstream command in src/cli/commands/downloadUpstream.ts
- [ ] T074 [P] [US2] Implement diff-upstream-releases command in src/cli/commands/diffUpstreamReleases.ts
- [ ] T075 [US2] Implement transform-upstream command in src/cli/commands/transformUpstream.ts
- [ ] T076 [US2] Add Claude agent integration for semantic transformation in transform-upstream

#### Upstream Tracking Infrastructure

- [ ] T077 [P] [US2] Create upstream-tracker.json template in .speck/upstream-tracker.json
- [ ] T078 [P] [US2] Create sync-manifest.json template in .speck/sync-manifest.json
- [ ] T079 [P] [US2] Create extension-markers.json template in .speck/extension-markers.json
- [ ] T080 [US2] Implement release-info.json management in upstream/.release-info.json

#### Claude Code Integration

- [ ] T081 [US2] Create /speck.check-upstream-releases slash command in .claude/commands/speck.check-upstream-releases.md
- [ ] T082 [US2] Create /speck.download-upstream slash command in .claude/commands/speck.download-upstream.md
- [ ] T083 [US2] Create /speck.diff-upstream-releases slash command in .claude/commands/speck.diff-upstream-releases.md
- [ ] T084 [US2] Create /speck.transform-upstream slash command in .claude/commands/speck.transform-upstream.md
- [ ] T085 [US2] Test upstream sync workflow - verify 100% extension preservation

**Checkpoint**: User Story 2 complete - developers can sync upstream changes with preserved enhancements

---

## Phase 6: User Story 3 - Developer Uses Bun-Powered TypeScript CLI (Priority: P3)

**Goal**: Provide fast CLI alternative to Claude Code with sub-100ms startup time

**Independent Test**: Run `speck specify "Add feature"` in terminal without Claude Code, verify feature creation identical to slash command version

### Implementation for User Story 3

#### CLI Enhancements

- [ ] T086 [P] [US3] Optimize CLI startup time using Bun native TS execution
- [ ] T087 [P] [US3] Add structured error messages with actionable guidance in src/cli/shared/validation.ts
- [ ] T088 [P] [US3] Implement --json flag support for all commands
- [ ] T089 [US3] Add CLI help text and command documentation
- [ ] T090 [US3] Implement version command showing Speck version

#### Build & Distribution

- [ ] T091 [US3] Configure Bun build for standalone binary in package.json with --compile flag
- [ ] T092 [US3] Create installation script for global CLI installation
- [ ] T093 [US3] Document CLI usage in README.md with examples

#### Performance Validation

- [ ] T094 [US3] Benchmark CLI startup time and verify <100ms requirement
- [ ] T095 [US3] Test behavioral parity between CLI and slash commands - verify <1% deviation

**Checkpoint**: User Story 3 complete - CLI provides full functionality with fast startup

---

## Phase 7: User Story 4 - Team Works on Multiple Features in Parallel (Priority: P2)

**Goal**: Enable multiple developers to work on different features using git worktrees without interference

**Independent Test**: Create two features using worktree mode, verify isolated directories with independent specs, confirm no cross-contamination

### Implementation for User Story 4

#### Worktree Support

- [ ] T096 [US4] Extend FeatureService with createWorktreeFeature method
- [ ] T097 [US4] Implement git worktree creation in WorktreeAdapter
- [ ] T098 [US4] Implement specs directory mode auto-detection - git-tracked vs gitignored
- [ ] T099 [US4] Implement symlink creation for gitignored specs mode
- [ ] T100 [US4] Add worktree cleanup and removal support
- [ ] T101 [US4] Implement feature number collision prevention across worktrees

#### CLI Integration

- [ ] T102 [US4] Add --worktree flag to specify command in src/cli/commands/specify.ts
- [ ] T103 [US4] Add worktree path validation and directory creation

#### Claude Code Integration

- [ ] T104 [US4] Update /speck.specify slash command with worktree option
- [ ] T105 [US4] Document worktree workflow in quickstart.md
- [ ] T106 [US4] Test parallel feature development - create 3 worktrees and verify isolation

**Checkpoint**: User Story 4 complete - teams can work on 10+ parallel features without conflicts

---

## Phase 8: Remaining Core Commands (Planning & Tasks Workflows)

**Purpose**: Complete the full workflow with plan and tasks generation

### Planning Workflow

- [ ] T107 [P] Create PlanningService in src/core/services/PlanningService.ts
- [ ] T108 [P] Create ConstitutionValidator in src/core/validators/ConstitutionValidator.ts
- [ ] T109 Create PlanGenerator in src/core/generators/PlanGenerator.ts
- [ ] T110 Implement constitution check validation with principle compliance
- [ ] T111 Implement complexity tracking for violations
- [ ] T112 Implement plan command in src/cli/commands/plan.ts
- [ ] T113 Create /speck.plan slash command in .claude/commands/speck.plan.md
- [ ] T114 Create research-agent markdown in .claude/agents/research-agent.md

### Tasks Workflow

- [ ] T115 [P] Create TaskGenerationService in src/core/services/TaskGenerationService.ts
- [ ] T116 Create TaskGenerator in src/core/generators/TaskGenerator.ts
- [ ] T117 Implement user story mapping from spec.md to tasks
- [ ] T118 Implement dependency graph generation with topological sort
- [ ] T119 Implement task prioritization and parallel opportunity detection
- [ ] T120 Implement tasks command in src/cli/commands/tasks.ts
- [ ] T121 Create /speck.tasks slash command in .claude/commands/speck.tasks.md

### Checklists & Analysis

- [ ] T122 [P] Create ChecklistService in src/core/services/ChecklistService.ts
- [ ] T123 [P] Create AnalysisService in src/core/services/AnalysisService.ts
- [ ] T124 Create ChecklistGenerator in src/core/generators/ChecklistGenerator.ts
- [ ] T125 Implement CrossArtifactValidator in src/core/validators/CrossArtifactValidator.ts
- [ ] T126 Implement checklist command in src/cli/commands/checklist.ts
- [ ] T127 Implement analyze command in src/cli/commands/analyze.ts
- [ ] T128 Create /speck.checklist slash command in .claude/commands/speck.checklist.md
- [ ] T129 Create /speck.analyze slash command in .claude/commands/speck.analyze.md

### Constitution & Implementation

- [ ] T130 [P] Create ImplementationService in src/core/services/ImplementationService.ts
- [ ] T131 Implement constitution command in src/cli/commands/constitution.ts
- [ ] T132 Implement implement command in src/cli/commands/implement.ts
- [ ] T133 Create /speck.constitution slash command in .claude/commands/speck.constitution.md
- [ ] T134 Create /speck.implement slash command in .claude/commands/speck.implement.md

---

## Phase 9: Skills & Reusable Patterns

**Purpose**: Extract reusable patterns as Claude Code skills

- [ ] T135 [P] Create template-renderer skill in .claude/skills/template-renderer.md
- [ ] T136 [P] Create spec-analyzer skill in .claude/skills/spec-analyzer.md
- [ ] T137 [P] Create constitution-validator skill in .claude/skills/constitution-validator.md
- [ ] T138 Add skill metadata files in .claude/skills/_metadata.json, .claude/agents/_metadata.json, .claude/commands/_metadata.json

---

## Phase 10: Testing & Quality

**Purpose**: Ensure quality through automated tests

### Unit Tests

- [ ] T139 [P] Write FeatureService unit tests in tests/unit/FeatureService.test.ts
- [ ] T140 [P] Write SpecificationService unit tests in tests/unit/SpecificationService.test.ts
- [ ] T141 [P] Write GitAdapter unit tests in tests/unit/GitAdapter.test.ts
- [ ] T142 [P] Write SpecValidator unit tests in tests/unit/SpecValidator.test.ts
- [ ] T143 [P] Write ConfigLoader unit tests in tests/unit/ConfigLoader.test.ts

### Integration Tests

- [ ] T144 [P] Write specify command integration test in tests/integration/specify-command.test.ts
- [ ] T145 [P] Write clarify command integration test in tests/integration/clarify-command.test.ts
- [ ] T146 [P] Write worktree creation integration test in tests/integration/worktree-creation.test.ts
- [ ] T147 Write upstream sync integration test in tests/integration/upstream-sync.test.ts

### E2E Manual Validation

- [ ] T148 Create E2E validation checklist in tests/e2e/full-workflow.md
- [ ] T149 Validate full workflow manually in Claude Code

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T150 [P] Create comprehensive README.md with quickstart guide
- [ ] T151 [P] Document architecture in docs/architecture.md
- [ ] T152 [P] Create CONTRIBUTING.md with development setup
- [ ] T153 [P] Create LICENSE file (MIT recommended)
- [ ] T154 Code cleanup and refactoring for consistency
- [ ] T155 [P] Add JSDoc comments to public APIs
- [ ] T156 Performance optimization - verify all success criteria met
- [ ] T157 Security review - validate no command injection vulnerabilities
- [ ] T158 Run quickstart.md validation end-to-end
- [ ] T159 Verify all constitutional principles compliance
- [ ] T160 Create GitHub repository and push initial commit

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - First MVP story
- **User Story 5 (Phase 4)**: Depends on User Story 1 - Part of specify→clarify workflow
- **User Story 2 (Phase 5)**: Depends on Foundational - Can run parallel to US1/US5 if staffed
- **User Story 3 (Phase 6)**: Depends on User Story 1 - CLI enhancements
- **User Story 4 (Phase 7)**: Depends on User Story 1 - Worktree features
- **Remaining Commands (Phase 8)**: Depends on Foundational - Can run parallel to user stories
- **Skills (Phase 9)**: Depends on Commands being implemented
- **Testing (Phase 10)**: Depends on implementation completion
- **Polish (Phase 11)**: Depends on all features being complete

### User Story Dependencies

- **User Story 1 (P1) - Solo Developer Specify**: Can start after Foundational - No dependencies on other stories ✅ MVP START
- **User Story 5 (P1) - Developer Clarify**: Depends on User Story 1 - Extends specify workflow
- **User Story 2 (P2) - Upstream Sync**: Can start after Foundational - Independent of US1 but benefits from testing US1 first
- **User Story 3 (P3) - Bun CLI**: Depends on User Story 1 - Provides CLI alternative to slash commands
- **User Story 4 (P2) - Worktrees**: Depends on User Story 1 - Extends feature creation with worktree mode

### Within Each User Story

- Models and interfaces before services
- Services before generators
- Generators before commands
- Commands before Claude Code integration
- Core implementation before integration tests

### Parallel Opportunities

**Setup Phase (Phase 1):**
- T003, T004, T005 can run in parallel (config files)

**Foundational Phase (Phase 2):**
- T008-T015: All domain models can run in parallel
- T016-T019: All adapter interfaces can run in parallel
- T020-T024: Adapter implementations depend on interfaces but can run in parallel once interfaces ready
- T025-T032: Config and utilities can run in parallel

**User Story 1 (Phase 3):**
- T033, T034: Core services can run in parallel
- T039, T042: Generator and validator can run in parallel

**User Story 5 (Phase 4):**
- No parallel opportunities (sequential extension of SpecificationService)

**User Story 2 (Phase 5):**
- T065-T071: Services and generators can run in parallel
- T072-T074: CLI commands can run in parallel
- T077-T079: Tracking infrastructure files can run in parallel

**User Story 3 (Phase 6):**
- T086-T088: CLI enhancements can run in parallel

**User Story 4 (Phase 7):**
- No parallel opportunities (extends FeatureService sequentially)

**Phase 8 (Commands):**
- T107-T108: Services and validators can run in parallel
- T122-T123: ChecklistService and AnalysisService can run in parallel

**Phase 9 (Skills):**
- T135-T137: All skills can run in parallel

**Phase 10 (Testing):**
- T139-T143: All unit tests can run in parallel
- T144-T146: All integration tests can run in parallel

**Phase 11 (Polish):**
- T150-T153, T155: Documentation tasks can run in parallel

---

## Parallel Example: User Story 1 Core Services

```bash
# Launch core services together:
Task T033: "Create FeatureService in src/core/services/FeatureService.ts"
Task T034: "Create SpecificationService in src/core/services/SpecificationService.ts"

# Then launch generator and validator together:
Task T039: "Create SpecGenerator in src/core/generators/SpecGenerator.ts"
Task T042: "Create SpecValidator in src/core/validators/SpecValidator.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 5 Only)

1. Complete Phase 1: Setup (T001-T007)
2. Complete Phase 2: Foundational (T008-T032) - CRITICAL
3. Complete Phase 3: User Story 1 (T033-T052)
4. Complete Phase 4: User Story 5 (T053-T064)
5. **STOP and VALIDATE**: Test specify→clarify workflow end-to-end
6. Deploy/demo if ready

**MVP Success**: Developers can create and clarify specifications via Claude Code

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + User Story 5 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Upstream Sync) → Test independently → Deploy/Demo
4. Add User Story 3 (CLI) → Test independently → Deploy/Demo
5. Add User Story 4 (Worktrees) → Test independently → Deploy/Demo
6. Add Phase 8 commands → Complete workflow → Deploy/Demo
7. Each increment adds value without breaking previous functionality

### Parallel Team Strategy

With multiple developers:

1. **Week 1**: Team completes Setup (Phase 1) + Foundational (Phase 2) together
2. **Week 2**: Once Foundational done:
   - Developer A: User Story 1 (Specify)
   - Developer B: User Story 2 (Upstream Sync)
   - Developer C: Foundational testing + documentation
3. **Week 3**:
   - Developer A: User Story 5 (Clarify) - extends US1
   - Developer B: User Story 3 (CLI) - extends US1
   - Developer C: User Story 4 (Worktrees) - extends US1
4. **Week 4**: Phase 8 commands, skills, testing, polish
5. Stories complete and integrate independently

---

## Task Summary

**Total Tasks**: 160 tasks

**Breakdown by Phase**:
- Phase 1 (Setup): 7 tasks
- Phase 2 (Foundational): 25 tasks
- Phase 3 (User Story 1 - Specify): 20 tasks
- Phase 4 (User Story 5 - Clarify): 12 tasks
- Phase 5 (User Story 2 - Upstream Sync): 21 tasks
- Phase 6 (User Story 3 - CLI): 10 tasks
- Phase 7 (User Story 4 - Worktrees): 11 tasks
- Phase 8 (Commands): 28 tasks
- Phase 9 (Skills): 4 tasks
- Phase 10 (Testing): 11 tasks
- Phase 11 (Polish): 11 tasks

**Breakdown by User Story**:
- User Story 1 (Solo Developer Specify): 20 tasks
- User Story 2 (Upstream Sync): 21 tasks
- User Story 3 (Bun CLI): 10 tasks
- User Story 4 (Worktrees): 11 tasks
- User Story 5 (Clarify): 12 tasks
- Infrastructure/Shared: 86 tasks

**Parallel Opportunities**: 89 tasks marked with [P] can run in parallel with other tasks in same phase

**MVP Scope** (Recommended):
- Phase 1: Setup (7 tasks)
- Phase 2: Foundational (25 tasks)
- Phase 3: User Story 1 (20 tasks)
- Phase 4: User Story 5 (12 tasks)
- **Total MVP**: 64 tasks (40% of total)

**Independent Test Criteria**:
- User Story 1: Run `/speck.specify "Add feature"` → verify spec generated in correct directory
- User Story 5: Run `/speck.clarify` → verify spec updated with resolved answers
- User Story 2: Run `/speck.transform-upstream` → verify extensions preserved
- User Story 3: Run `speck specify "Add feature"` → verify CLI works identically to slash command
- User Story 4: Create 2 features with `--worktree` → verify isolation and no cross-contamination

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [US#] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution compliance verified throughout (Principle IV: Quality Gates)
- File format compatibility maintained (Principle VII)
- All success criteria mapped to tasks (SC-001 through SC-010)
