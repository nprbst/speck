# Tasks: Virtual Command Pattern with Dual-Mode CLI

**Input**: Design documents from `/specs/010-virtual-command-pattern/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Tests are NOT explicitly requested in the feature specification, so test tasks focus on integration validation and POC verification per the quickstart guide.

**Organization**: Tasks are grouped by user story (US0-US5) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US0, US1, US2)
- Include exact file paths in descriptions

## Path Conventions

Per plan.md Project Structure:
- Hook scripts: `.speck/scripts/hooks/`
- CLI entry point: `.speck/scripts/speck.ts`
- Command handlers: `.speck/scripts/commands/`
- Shared utilities: `.speck/scripts/lib/`
- Tests: `tests/unit/` and `tests/integration/`
- Plugin config: `.claude-plugin/plugin.json`
- Contracts: `specs/010-virtual-command-pattern/contracts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for virtual command pattern

- [X] T001 Install Commander.js dependency via bun add commander
- [X] T002 [P] Create TypeScript types file at .speck/scripts/lib/types.ts with HookInput, HookOutput, CommandResult, CommandContext interfaces from contracts/
- [X] T003 [P] Create directory structure: .speck/scripts/commands/, .speck/scripts/hooks/, .speck/scripts/lib/
- [X] T004 [P] Create base test structure: tests/unit/, tests/integration/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] Implement mode detection utility in .speck/scripts/lib/mode-detector.ts (detectMode, readHookInput functions per research.md decision 2)
- [X] T006 [P] Implement shell escaping utility in .speck/scripts/lib/shell-escape.ts (available for future use cases, but not needed for output per research.md decision 4)
- [X] T007 [P] Implement hook formatting utility in .speck/scripts/lib/hook-utils.ts (formatHookOutput using cat with heredoc - zero escaping needed per research.md decision 4)
- [X] T008 Create command registry structure in .speck/scripts/commands/index.ts (CommandHandler interface, empty registry object)
- [X] T009 Create CLI entry point skeleton in .speck/scripts/speck.ts (Commander setup, mode detection, dual-mode routing per data-model.md)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 0 - POC: Hook-Based Virtual Command Pattern (Priority: P0) 🎯 MVP

**Goal**: Prove that Claude Code's PreToolUse hooks can intercept virtual commands, route to scripts, and return results. Validate with test-hello and speck-env commands.

**Independent Test**: Per quickstart.md validation checklist - both commands work in CLI mode and hook mode with correct JSON output

### POC Validation Tasks

- [X] T010 [P] [US0] Implement test-hello command handler in .speck/scripts/commands/test-hello.ts (accepts message arg, returns "Hello {message}")
- [X] T011 [P] [US0] Implement speck-env command handler in .speck/scripts/commands/env.ts (reads plugin path, returns environment info)
- [X] T012 [US0] Register test-hello and speck-env in command registry at .speck/scripts/commands/index.ts
- [X] T013 [US0] Implement PreToolUse hook router in .speck/scripts/hooks/pre-tool-use.ts (intercepts speck-* and test-* commands, routes to CLI per research.md decision 1)
- [X] T014 [US0] Add hook registration to .claude-plugin/plugin.json (PreToolUse.Bash mapping to pre-tool-use.ts)
- [X] T015 [US0] Update CLI entry point in .speck/scripts/speck.ts to support test-hello and env subcommands via Commander
- [X] T016 [US0] Implement dual-mode logic in .speck/scripts/speck.ts (CLI mode: normal output, hook mode: JSON response per data-model.md)
- [X] T017a [US0] Create build script at .speck/scripts/build-hook.ts to bundle speck.ts into single-file output using bun build
- [X] T017b [US0] Add build:hook npm script to package.json for generating bundled hook
- [X] T017c [US0] Fix mode detection in .speck/scripts/lib/mode-detector.ts to handle undefined stdin.isTTY correctly
- [X] T017d [US0] Update .claude-plugin/plugin.json to use bundled hook (bun .speck/dist/speck-hook.js --hook)
- [X] T017e [US0] Update .claude/settings.json to use bundled hook for local testing
- [X] T017f [US0] Integrate hook build into scripts/build-plugin.ts (build hook before copying plugin files)
- [X] T017g [US0] Update scripts/build-plugin.ts to copy .speck/dist/ directory to published plugin
- [X] T017h [US0] Update scripts/build-plugin.ts generatePluginManifest to include hooks configuration
- [X] T017i [US0] Update quickstart.md to document build:hook step and bundled approach benefits
- [X] T017j [US0] Test POC per quickstart.md Section "Test POC" (validate all 6 test scenarios: CLI modes, hook modes, Claude integration with bundled hook)

**Checkpoint**: POC validated - hook mechanism proven, ready to expand to production commands

---

## Phase 4: User Story 1 - Seamless Virtual Command Invocation (Priority: P1)

**Goal**: Enable all Speck commands to be invoked as virtual commands (speck-*) without path dependencies

**Independent Test**: Invoke speck-analyze, speck-branch, speck-env from Claude without full paths and verify correct output

### Implementation for User Story 1

- [X] T018 [P] [US1] Create argument parser utility in .speck/scripts/lib/arg-parser.ts (parseCommandToArgv function for converting command strings to argv arrays)
- [X] T019 [P] [US1] Implement branch command handler in .speck/scripts/commands/branch.ts (delegates to existing branch logic, supports list/create/delete subcommands)
- [X] T020 [P] [US1] Implement analyze command handler in .speck/scripts/commands/analyze.ts (delegates to existing analyze script)
- [X] T021 [P] [US1] Implement specify command handler in .speck/scripts/commands/specify.ts (delegates to existing specify script)
- [X] T022 [P] [US1] Implement plan command handler in .speck/scripts/commands/plan.ts (delegates to existing plan script)
- [X] T023 [P] [US1] Implement tasks command handler in .speck/scripts/commands/tasks.ts (delegates to existing tasks script)
- [X] T024 [US1] Register all new command handlers in .speck/scripts/commands/index.ts registry
- [X] T025 [US1] Update PreToolUse hook router in .speck/scripts/hooks/pre-tool-use.ts to handle all speck-* virtual commands
- [X] T026 [US1] Update CLI entry point in .speck/scripts/speck.ts to add all new subcommands to Commander program
- [X] T027 [US1] Add integration test in tests/integration/virtual-command.test.ts validating virtual command invocation for all commands

**Checkpoint**: All Speck commands accessible via virtual pattern, no path dependencies

---

## Phase 5: User Story 2 - Dual-Mode CLI Operation (Priority: P1)

**Goal**: CLI operates identically in standalone and hook-invoked modes with consistent business logic

**Independent Test**: Run same command in both modes (bun speck.ts branch list vs hook JSON stdin), verify identical functional outcomes

### Implementation for User Story 2

- [X] T028 [P] [US2] Implement error handling in .speck/scripts/lib/error-handler.ts (CommandError class, formatError for both modes)
- [X] T029 [P] [US2] Create output formatter utility in .speck/scripts/lib/output-formatter.ts (formatCliOutput, formatHookOutput per mode)
- [X] T030 [US2] Add comprehensive error handling to CLI entry point in .speck/scripts/speck.ts (catch errors, format per mode, set exit codes)
- [X] T031 [US2] Implement argument validation in command handlers (validate required args, return clear error messages)
- [X] T032 [US2] Add logging utility in .speck/scripts/lib/logger.ts (mode-aware logging, debug mode support)
- [X] T033 [US2] Update all command handlers to use error-handler and output-formatter utilities
- [X] T034 [US2] Add unit tests in tests/unit/speck-cli.test.ts validating dual-mode operation for each command
- [X] T035 [US2] Add integration test in tests/integration/hook-simulation.test.ts simulating hook JSON stdin/stdout for all commands

**Checkpoint**: Dual-mode CLI fully functional with identical business logic in both modes

---

## Phase 6: User Story 3 - Automatic Prerequisites Check (Priority: P2)

**Goal**: Slash commands automatically run prerequisite checks via PrePromptSubmit hook before expansion

**Independent Test**: Trigger /speck.plan in invalid state (wrong branch), verify automatic check catches issue before command expansion

### Implementation for User Story 3

- [X] T036 [US3] Create PrePromptSubmit hook script in .speck/scripts/hooks/pre-prompt-submit.ts (detects /speck.* and /speck:* slash commands - supports both standard and plugin-qualified formats)
- [X] T037 [US3] Implement prerequisite check runner in .speck/scripts/lib/prereq-runner.ts (runs check-prerequisites.ts, caches results per research.md decision 7)
- [X] T038 [US3] Implement prompt injection logic in PrePromptSubmit hook (append prerequisite context to prompt on success, replace with error on failure)
- [X] T039 [US3] Add caching mechanism in .speck/scripts/lib/prereq-cache.ts (5-second TTL, invalidate on git operations per research.md)
- [X] T040 [US3] Register PrePromptSubmit hook in .claude-plugin/plugin.json
- [X] T041 [US3] Add integration test in tests/integration/prereq-check.test.ts validating automatic checks for slash commands (both . and : separators)
- [X] T042 [US3] Update documentation in quickstart.md with PrePromptSubmit hook behavior and caching explanation
- [X] T043a [US3] SKIPPED - No context-parser.ts needed (slash commands directly reference injected JSON comment)
- [X] T043b [US3] Update slash command template pattern to reference injected prerequisite context instead of manually running check-prerequisites
- [X] T043c [US3] Update speck.implement.md to use injected context (with fallback for backwards compatibility)
- [X] T043d [US3] Update speck.plan.md, speck.tasks.md, speck.analyze.md, speck.specify.md to use injected context pattern
- [X] T043e [US3] Update remaining /speck.* slash commands (clarify, checklist, taskstoissues, constitution) to use injected context pattern
- [X] T043f [US3] Add integration test validating slash commands can parse and use injected prerequisite context
- [X] T043g [US3] Update slash command authoring documentation with context injection pattern

**Checkpoint**: ✅ COMPLETE - Automatic prerequisite checks working for all /speck.* and /speck:* slash commands, and commands updated to consume injected context

---

## Phase 7: User Story 4 - Centralized Command Registry (Priority: P2)

**Goal**: Single registry mapping virtual command names to handlers, enabling easy command addition without hook code changes

**Independent Test**: Add new command to registry, invoke via virtual pattern, verify execution without modifying hook router

### Implementation for User Story 4

- [X] T043 [P] [US4] SKIPPED - Registry schema validator not needed (TypeScript provides compile-time validation)
- [X] T044 [P] [US4] SKIPPED - Argument parser interface not needed (parsers co-located with handlers in command files)
- [X] T045 [US4] SKIPPED - Registry loader not needed (direct import is simpler than loader abstraction)
- [X] T046 [US4] Update command registry in .speck/scripts/commands/index.ts to include handler, parseArgs, description, version for each command
- [X] T047 [US4] Refactor PreToolUse hook router in .speck/scripts/hooks/pre-tool-use.ts to use registry lookup instead of hardcoded command list
- [X] T048 [US4] Refactor CLI entry point in .speck/scripts/speck.ts to dynamically register Commander subcommands from registry
- [X] T049 [US4] Add unit test in tests/unit/registry.test.ts validating registry lookup, schema validation, and command registration
- [X] T050 [US4] Add example of adding new command to registry in quickstart.md (demonstrate adding command without hook changes)

**Checkpoint**: Registry-driven command system operational, new commands add without hook modifications

---

## Phase 8: User Story 5 - Knowledge Base Document (Priority: P3)

**Goal**: Comprehensive addendum documenting critical techniques from hook system design

**Independent Test**: Review document completeness against checklist (PreToolUse hooks, updatedInput pattern, dual-mode design, arg parsing, error handling)

### Implementation for User Story 5

- [X] T051 [P] [US5] Create addendum document at specs/010-virtual-command-pattern/addendum.md with hook system overview
- [X] T052 [P] [US5] Document PreToolUse hook mechanism in addendum.md with code examples from .speck/scripts/hooks/pre-tool-use.ts
- [X] T053 [P] [US5] Document dual-mode CLI pattern in addendum.md with examples from .speck/scripts/speck.ts
- [X] T054 [P] [US5] Document virtual command pattern in addendum.md with registry architecture and routing logic
- [X] T055 [P] [US5] Document testing patterns in addendum.md showing how to test both CLI and hook modes
- [X] T056 [P] [US5] Document error handling patterns in addendum.md with hook error propagation examples
- [X] T057 [US5] Add architectural diagrams to addendum.md (hook flow, command registry lookup, dual-mode execution)
- [X] T058 [US5] Review addendum.md against acceptance scenarios from spec.md (covers all key concepts with complete examples)

**Checkpoint**: Knowledge base complete and ready for future contributors

---

## Phase 9: Migration & Polish

**Purpose**: Incremental migration from individual scripts to unified CLI, cross-cutting improvements

### Migration Tasks

- [ ] T059 Create migration validation tests in tests/integration/migration-validation.test.ts (compare unified CLI output to individual script output for each command)
- [ ] T060 [P] Add deprecation warning to individual check-prerequisites.sh script (direct users to speck-env virtual command)
- [ ] T061 [P] Add deprecation warning to individual branch.ts script (direct users to speck-branch virtual command)
- [ ] T062 [P] Add deprecation warning to remaining individual scripts per migration strategy in research.md
- [ ] T063 Run migration validation tests to verify unified CLI produces identical output to individual scripts
- [ ] T064 Update CLAUDE.md with new technologies (Commander.js, hook system patterns per constitution principle)
- [ ] T065 **[CRITICAL]** Audit all slash command files in .claude/commands/ for embedded TypeScript and refactor to delegate to unified CLI per constitution principle VIII (NON-NEGOTIABLE)

### Performance Validation Tasks

- [ ] T065a [Performance] Add benchmarking task for SC-003: measure hook routing latency from PreToolUse trigger to CLI execution start (target: <100ms)
- [ ] T065b [Performance] Add benchmarking task for SC-005: measure baseline check-prerequisites time vs cached prerequisite time (target: 30% reduction)
- [ ] T065c [Performance] Add code coverage measurement task for SC-002 (target: >90% coverage for both CLI and hook modes)

### Polish Tasks

- [ ] T066 [P] Add comprehensive inline documentation (JSDoc) to all TypeScript files in .speck/scripts/
- [ ] T067 [P] Create README.md in .speck/scripts/ explaining CLI structure, hook architecture, and command registry
- [ ] T068 Run full test suite (bun test) and fix any failures
- [ ] T069 Run linter (bun run lint) and fix any issues
- [ ] T070 Update quickstart.md with final examples of adding new commands and testing strategies
- [ ] T071 Validate all edge cases from spec.md (malformed JSON, special characters, concurrent execution, large output)
- [ ] T072 Run quickstart.md validation end-to-end (execute all POC tests and verify success)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 0 - POC (Phase 3)**: Depends on Foundational phase - MUST complete before other stories (validation gate)
- **User Story 1 (Phase 4)**: Depends on POC success - Can run in parallel with US2 after POC validation
- **User Story 2 (Phase 5)**: Depends on POC success - Can run in parallel with US1 after POC validation
- **User Story 3 (Phase 6)**: Depends on US1 and US2 completion (needs command handlers and dual-mode CLI)
- **User Story 4 (Phase 7)**: Depends on US1 completion (needs existing command handlers)
- **User Story 5 (Phase 8)**: Can start after US0 POC - Can run in parallel with other stories (documentation task)
- **Migration & Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 0 (P0 - POC)**: Must complete FIRST - Validates entire pattern before proceeding
- **User Story 1 (P1)**: Can start after US0 POC validation - No dependencies on US2/US3/US4/US5
- **User Story 2 (P1)**: Can start after US0 POC validation - No dependencies on US1/US3/US4/US5
- **User Story 3 (P2)**: Depends on US1 and US2 (needs command infrastructure)
- **User Story 4 (P2)**: Depends on US1 (needs command handlers to put in registry)
- **User Story 5 (P3)**: Can start after US0 - Independent documentation task

### Within Each User Story

- POC (US0): Hook router → Command handlers → CLI integration → Testing (sequential due to interdependencies)
- US1: Argument parser and command handlers can run in parallel → Registry update → Hook/CLI updates → Testing
- US2: Error handler and output formatter can run in parallel → Integration into CLI → Testing
- US3: Hook script and prereq runner can run in parallel → Caching → Integration → Testing
- US4: Schema validator and parsers can run in parallel → Registry updates → Refactoring → Testing
- US5: All documentation sections can be written in parallel → Review

### Parallel Opportunities

- **Setup (Phase 1)**: T002, T003, T004 can run in parallel
- **Foundational (Phase 2)**: T005, T006, T007 can run in parallel
- **US0 POC**: T010, T011 can run in parallel (different command handlers)
- **US1**: T018, T019, T020, T021, T022, T023 can run in parallel (different files)
- **US2**: T028, T029 can run in parallel → T033 updates handlers in parallel
- **US3**: T036, T037, T039 can run in parallel (different utilities)
- **US4**: T043, T044, T045 can run in parallel (different utilities)
- **US5**: T051, T052, T053, T054, T055, T056 can all run in parallel (different doc sections)
- **Migration & Polish**: T060, T061, T062, T066, T067 can run in parallel (different files)

---

## Parallel Example: User Story 1 (Seamless Virtual Command Invocation)

```bash
# Launch all command handler implementations in parallel:
Task: "Create branch command handler in .speck/scripts/commands/branch.ts"
Task: "Implement analyze command handler in .speck/scripts/commands/analyze.ts"
Task: "Implement specify command handler in .speck/scripts/commands/specify.ts"
Task: "Implement plan command handler in .speck/scripts/commands/plan.ts"
Task: "Implement tasks command handler in .speck/scripts/commands/tasks.ts"

# These can run simultaneously because each works on a different file
# with no dependencies on each other
```

## Parallel Example: User Story 5 (Knowledge Base Document)

```bash
# Launch all documentation sections in parallel:
Task: "Document PreToolUse hook mechanism in addendum.md"
Task: "Document dual-mode CLI pattern in addendum.md"
Task: "Document virtual command pattern in addendum.md"
Task: "Document testing patterns in addendum.md"
Task: "Document error handling patterns in addendum.md"

# Can work on different sections simultaneously, then merge
```

---

## Implementation Strategy

### MVP First (User Story 0 POC Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T009) - CRITICAL
3. Complete Phase 3: User Story 0 - POC (T010-T017)
4. **STOP and VALIDATE**: Execute quickstart.md POC tests
5. If POC validation succeeds, proceed to remaining user stories
6. If POC validation fails, fix issues before expanding

**Success Criteria for MVP**: Both test-hello and speck-env work in CLI mode and hook mode with Claude integration validated

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 0 (POC) → Validate thoroughly → **Gate: Must pass before proceeding**
3. Add User Story 1 (Virtual Commands) → Test independently → Deliver seamless invocation
4. Add User Story 2 (Dual-Mode) → Test independently → Deliver production-ready CLI
5. Add User Story 3 (Auto Prerequisites) → Test independently → Deliver improved UX
6. Add User Story 4 (Registry) → Test independently → Deliver extensible architecture
7. Add User Story 5 (Documentation) → Review completeness → Deliver knowledge base
8. Migration & Polish → Deprecate old scripts → Clean launch

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (blocking)
2. **Single developer completes US0 POC** (validation gate - must succeed)
3. Once POC validated:
   - Developer A: User Story 1 (Virtual Commands)
   - Developer B: User Story 2 (Dual-Mode CLI)
   - Developer C: User Story 5 (Documentation)
4. Once US1 and US2 complete:
   - Developer A: User Story 3 (Auto Prerequisites)
   - Developer B: User Story 4 (Registry)
5. **Team completes Migration & Polish together**

---

## Notes

- **[P] marker**: Tasks that can run in parallel (different files, no shared dependencies)
- **[Story] label**: Maps task to specific user story for traceability and independent testing
- **POC is critical**: User Story 0 must succeed before expanding to other stories
- **Dual P1 priorities**: US1 and US2 both P1 because they complement each other (US1=routing, US2=quality)
- **Constitution compliance**: Phase 9 includes task T065 to audit and refactor .claude/commands/ files per Principle VIII
- **Migration strategy**: Individual scripts remain functional during migration (T063 validates equivalence)
- **Testing approach**: Integration-focused validation per quickstart.md, not unit test coverage (tests not explicitly requested in spec.md)
- Each user story checkpoint enables independent validation before proceeding
- Stop at any checkpoint to test independently and demonstrate progress
- Commit after each task or logical group of parallelizable tasks
