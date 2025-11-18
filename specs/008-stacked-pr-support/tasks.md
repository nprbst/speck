# Tasks: Stacked PR Support

**Feature Branch**: `008-stacked-pr-support`
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)
**Total Tasks**: 125
**Estimated Completion**: 6-8 days

---

## Phase 1: Setup & Infrastructure (Shared)

**Goal**: Establish foundation for branch stack management

**Independent Test**: Can create `.speck/branches.json` file programmatically and validate its schema

### Tasks

- [x] T001 Create BranchMapper utility module in .speck/scripts/common/branch-mapper.ts
- [x] T002 [P] Define TypeScript interfaces (BranchEntry, BranchMapping, BranchStatus) in .speck/scripts/common/branch-mapper.ts
- [x] T003 [P] Implement Zod schemas (BranchEntrySchema, BranchMappingSchema) in .speck/scripts/common/branch-mapper.ts
- [x] T004 [P] Implement readBranches() function in .speck/scripts/common/branch-mapper.ts
- [x] T005 [P] Implement writeBranches() with atomic write (temp file + rename) in .speck/scripts/common/branch-mapper.ts
- [x] T006 [P] Implement rebuildSpecIndex() helper function in .speck/scripts/common/branch-mapper.ts
- [x] T007 [P] Implement getSpecForBranch() query function in .speck/scripts/common/branch-mapper.ts
- [x] T008 [P] Implement getBranchesForSpec() query function in .speck/scripts/common/branch-mapper.ts
- [x] T009 [P] Implement findBranchEntry() query function in .speck/scripts/common/branch-mapper.ts
- [x] T010 [P] Implement addBranch() mutation function in .speck/scripts/common/branch-mapper.ts
- [x] T011 [P] Implement updateBranchStatus() mutation function in .speck/scripts/common/branch-mapper.ts
- [x] T012 [P] Implement removeBranch() mutation function in .speck/scripts/common/branch-mapper.ts
- [x] T013 [P] Implement validateBranchMapping() with cycle detection (DFS algorithm) in .speck/scripts/common/branch-mapper.ts

---

## Phase 2: Foundational Utilities (Blocking Prerequisites)

**Goal**: Modify existing path detection to support stacked branches

**Independent Test**: Branch detection correctly prioritizes branches.json lookup over numeric prefix pattern

### Tasks

- [x] T014 Extend findFeatureDirByPrefix() to check branches.json first (if exists) before falling back to numeric prefix pattern matching in .speck/scripts/common/paths.ts (modifies existing function)
- [x] T015 Modify checkFeatureBranch() validation logic to skip NNN-pattern enforcement when branches.json exists and contains current branch in .speck/scripts/common/paths.ts (modifies existing function)
- [x] T016 [P] Create validateBranchName() function using git check-ref-format in .speck/scripts/common/paths.ts
- [x] T017 [P] Create detectCycle() function for circular dependency detection (DFS) in .speck/scripts/common/branch-mapper.ts
- [x] T018 [P] Implement validateStatusTransition() to prevent terminal state transitions in .speck/scripts/common/branch-mapper.ts
- [x] T019 [P] Create error classes (StackedModeError, ValidationError, GitError) in .speck/scripts/common/errors.ts
- [x] T020 [P] Implement createGitBranch() git operation wrapper in .speck/scripts/common/git-operations.ts
- [x] T021 [P] Implement checkBranchMerged() git operation wrapper in .speck/scripts/common/git-operations.ts
- [x] T022 [P] Implement listGitBranches() git operation wrapper in .speck/scripts/common/git-operations.ts

---

## Phase 3: User Story 1 - Traditional Single-Branch Workflow (P1)

**Goal**: Ensure backwards compatibility with zero disruption

**Independent Test**: Run existing Speck commands in fresh repository without branches.json and verify identical behavior

**Acceptance Scenarios**: 4 scenarios (spec.md lines 28-34)

### Tasks

- [ ] T023 [US1] Verify /speck.specify creates spec without generating branches.json in .claude/commands/speck.specify.md
- [ ] T024 [US1] Verify /speck.tasks generates tasks without branch filtering warnings in .claude/commands/speck.tasks.md
- [ ] T025 [US1] Verify /speck.env shows traditional branch info without stack terminology in .claude/commands/speck.env.md
- [ ] T026 [US1] Add regression test: Confirm branches.json not created unless /speck.branch create used in specs/008-stacked-pr-support/tests/backwards-compat.test.ts

---

## Phase 4: User Story 2 - Creating First Stacked Branch (P1)

**Goal**: Enable developers to create first branch in stack with freeform naming

**Independent Test**: Create spec, run /speck.branch create with custom name, verify .speck/branches.json created with correct metadata

**Acceptance Scenarios**: 4 scenarios (spec.md lines 46-51)

### Tasks

- [x] T027 [US2] Create /speck.branch create command in .claude/commands/speck.branch.md
- [x] T028 [US2] Implement command argument parsing (name, --base, --spec) in .claude/commands/speck.branch.md
- [x] T029 [US2] Validate branch name using git check-ref-format in .claude/commands/speck.branch.md
- [x] T030 [US2] Validate base branch exists using git rev-parse --verify in .claude/commands/speck.branch.md
- [x] T031 [US2] Auto-detect or prompt for spec ID if not provided in .claude/commands/speck.branch.md
- [x] T031a [US2] Prompt user: "Create PR for <current-branch> before switching? (yes/no)" in .claude/commands/speck.branch.md
- [x] T031b [US2] If yes to PR prompt, check if gh CLI is available using `which gh` in .claude/commands/speck.branch.md
- [x] T031c [US2] Get commits on current branch not in base: `git log <base>..<current> --format="%s%n%b"` in .claude/commands/speck.branch.md
- [x] T031d [US2] Analyze commit messages to determine if substantive (not "wip", "fix", "tmp", etc.) in .claude/commands/speck.branch.md
- [x] T031e [US2] If commits are substantive, generate PR title from first commit subject in .claude/commands/speck.branch.md
- [x] T031f [US2] If commits are substantive, generate PR body from all commit messages (bulleted list) in .claude/commands/speck.branch.md
- [x] T031g [US2] If commits are uninformative, generate title/body from `git diff <base>...<current>` summary in .claude/commands/speck.branch.md
- [x] T031h [US2] Display generated PR title and body with prompt: "[e]dit or [c]onfirm" in .claude/commands/speck.branch.md
- [x] T031i [US2] If user chooses "edit", allow inline editing of title and body in .claude/commands/speck.branch.md
- [x] T031j [US2] Determine PR base branch (main/master for feature branches, base branch for stacked branches) in .claude/commands/speck.branch.md
- [x] T031k [US2] Execute gh pr create --title "<title>" --body "<body>" --base <pr-base> in .claude/commands/speck.branch.md
- [x] T031l [US2] Parse PR number from gh CLI output in .claude/commands/speck.branch.md
- [x] T031m [US2] Update current branch entry in branches.json with PR number and status="submitted" in .claude/commands/speck.branch.md
- [x] T031n [US2] Handle gh CLI errors gracefully (not installed, not authenticated, network errors) in .claude/commands/speck.branch.md
- [x] T032 [US2] Initialize .speck/branches.json if doesn't exist (empty state: version 1.0.0, branches [], specIndex {}) in .claude/commands/speck.branch.md
- [x] T033 [US2] Create BranchEntry with ISO 8601 timestamps and add to branches array in .claude/commands/speck.branch.md
- [x] T034 [US2] Update specIndex with new branch mapping in .claude/commands/speck.branch.md
- [x] T035 [US2] Create git branch using git branch <name> <base> in .claude/commands/speck.branch.md
- [x] T036 [US2] Checkout new branch using git checkout <name> in .claude/commands/speck.branch.md
- [x] T037 [US2] Display success message with stack visualization showing PR numbers (tree format) in .claude/commands/speck.branch.md
- [x] T038 [US2] Handle error cases (invalid name, base doesn't exist, spec not found) with clear messages in .claude/commands/speck.branch.md

---

## Phase 5: User Story 3 - Building a Stack with Dependencies (P2)

**Goal**: Enable sequential dependencies with explicit parent-child relationships

**Independent Test**: Create two stacked branches with explicit base dependencies and verify branches.json tracks chain correctly

**Acceptance Scenarios**: 4 scenarios (spec.md lines 62-68)

### Tasks

- [x] T039 [US3] Extend /speck.branch create to support stacking on non-main branches in .claude/commands/speck.branch.md
- [x] T040 [US3] Implement cycle detection before creating branch (detect A → B → C → A patterns) in .claude/commands/speck.branch.md
- [x] T041 [US3] Create /speck.branch list command to display all branches for current spec in .claude/commands/speck.branch.md
- [x] T042 [US3] Implement dependency chain computation (BranchStack with BranchChain[]) in .claude/commands/speck.branch.md
- [x] T043 [US3] Display stack visualization with tree characters (└─, │) in .claude/commands/speck.branch.md
- [x] T044 [US3] Add status indicators to branch list (active, submitted PR#, merged, abandoned) in .claude/commands/speck.branch.md
- [x] T045 [US3] Implement /speck.branch status command for health checks in .claude/commands/speck.branch.md
- [x] T046 [US3] Detect merged branches via git branch --merged <base> in .claude/commands/speck.branch.md
- [x] T047 [US3] Detect rebase warnings (base branch merged but current branch not updated) in .claude/commands/speck.branch.md
- [x] T048 [US3] Display recommendations for each warning type in .claude/commands/speck.branch.md

---

## Phase 6: User Story 4 - Branch-Aware Task Generation (P1)

**Goal**: Generate task lists for specific branches in stack

**Independent Test**: Create spec with multiple user stories, generate tasks for specific branches using --branch flag, verify filtered output

**Acceptance Scenarios**: 4 scenarios (spec.md lines 80-85)

### Tasks

- [ ] T049 [US4] Extend /speck.tasks command to support --branch <name> flag in .claude/commands/speck.tasks.md
- [ ] T050 [US4] Extend /speck.tasks command to support --stories <US1,US2> flag in .claude/commands/speck.tasks.md
- [ ] T051 [US4] Load branches.json when --branch flag provided in .claude/commands/speck.tasks.md
- [ ] T052 [US4] Validate branch exists in branches.json in .claude/commands/speck.tasks.md
- [ ] T053 [US4] Parse --stories flag to extract comma-separated US IDs in .claude/commands/speck.tasks.md
- [ ] T054 [US4] Validate story IDs exist in spec.md in .claude/commands/speck.tasks.md
- [ ] T055 [US4] Filter user stories in spec.md by requested IDs in .claude/commands/speck.tasks.md
- [ ] T056 [US4] Generate tasks for filtered stories only (skip Setup/Foundational if --stories used) in .claude/commands/speck.tasks.md
- [ ] T057 [US4] Output to spec-dir/tasks.md for full spec (default) OR spec-dir/tasks-<branch-name>.md if --branch flag specified (branch-specific filtered tasks) in .claude/commands/speck.tasks.md
- [ ] T058 [US4] Display summary showing total tasks, filtered stories, and file path in .claude/commands/speck.tasks.md

---

## Phase 7: User Story 5 - Tool-Agnostic Stack Management (P2)

**Goal**: Integrate with Graphite/GitHub Stack without conflicts

**Independent Test**: Use Graphite commands (gt create, gt stack) alongside Speck commands and verify no conflicts

**Acceptance Scenarios**: 4 scenarios (spec.md lines 97-101)

### Tasks

- [ ] T059 [US5] Implement /speck.branch import command to auto-detect git branch relationships in .claude/commands/speck.branch.md
- [ ] T060 [US5] List all git branches using git branch --list --format='%(refname:short) %(upstream:short)' in .claude/commands/speck.branch.md
- [ ] T061 [US5] Parse upstream information to infer base branches in .claude/commands/speck.branch.md
- [ ] T062 [US5] Prompt user interactively for spec mapping (show available specs from specs/ directory) in .claude/commands/speck.branch.md
- [ ] T063 [US5] Allow user to skip branches during import process in .claude/commands/speck.branch.md
- [ ] T064 [US5] Validate no cycles created during import in .claude/commands/speck.branch.md
- [ ] T065 [US5] Add imported branches to branches.json with inferred metadata in .claude/commands/speck.branch.md
- [ ] T066 [US5] Display import summary (imported count, skipped count, branch → spec mappings) in .claude/commands/speck.branch.md
- [x] T067 [US5] Implement /speck.branch update command to manually update branch metadata in .claude/commands/speck.branch.md
- [x] T068 [US5] Support --status, --pr, --base flags in update command in .claude/commands/speck.branch.md
- [x] T069 [US5] Validate status transitions (cannot transition from merged/abandoned terminal states) in .claude/commands/speck.branch.md
- [x] T070 [US5] Update updatedAt timestamp on every metadata change in .claude/commands/speck.branch.md

---

## Phase 8: User Story 6 - Discovering Stack Status (P3)

**Goal**: Provide visibility into branch stack state for onboarding

**Independent Test**: Create complex stack, run /speck.env and /speck.branch status, verify complete visibility

**Acceptance Scenarios**: 4 scenarios (spec.md lines 115-119)

### Tasks

- [ ] T071 [US6] Extend /speck.env to add Branch Stack Status section (Section 8) in .claude/commands/speck.env.md
- [ ] T072 [US6] Check if .speck/branches.json exists in .claude/commands/speck.env.md
- [ ] T073 [US6] If absent, show "✓ Stacked PR mode: Not enabled" with hint to run /speck.branch create in .claude/commands/speck.env.md
- [ ] T074 [US6] If present, load branches.json and parse branches array in .claude/commands/speck.env.md
- [ ] T075 [US6] Get current branch using git rev-parse --abbrev-ref HEAD in .claude/commands/speck.env.md
- [ ] T076 [US6] Group branches by specId in .claude/commands/speck.env.md
- [ ] T077 [US6] Build dependency tree for each spec (root branches → children recursively) in .claude/commands/speck.env.md
- [ ] T078 [US6] Display tree visualization with markers (└─, │) and status indicators in .claude/commands/speck.env.md
- [ ] T079 [US6] Highlight current branch with "(current)" marker in .claude/commands/speck.env.md
- [ ] T080 [US6] Calculate warnings count (branches needing rebase, stale branches) in .claude/commands/speck.env.md
- [ ] T081 [US6] Display warning summary with hint to run /speck.branch status for details in .claude/commands/speck.env.md
- [ ] T082 [US6] Implement /speck.branch list --all flag to show branches across all specs in .claude/commands/speck.branch.md
- [ ] T083 [US6] Group branches by spec ID when --all flag used in .claude/commands/speck.branch.md
- [ ] T084 [US6] Display total count (branches across specs) in .claude/commands/speck.branch.md

---

## Phase 9: User Story 7 - Automated Stacking During Implementation (P1)

**Goal**: Intelligently detect boundaries and prompt for stacking

**Independent Test**: Run /speck.implement with stacked-PR mode enabled, complete user story, verify system prompts for branch creation

**Acceptance Scenarios**: 6 scenarios (spec.md lines 131-138)

### Tasks

- [ ] T085 [US7] Extend /speck.implement to support --stacked flag in .claude/commands/speck.implement.md
- [ ] T086 [US7] Read workflow mode from plan.md frontmatter (workflowMode field) in .claude/commands/speck.implement.md
- [ ] T087 [US7] Fall back to single-branch mode if no workflow mode specified in .claude/commands/speck.implement.md
- [ ] T088 [US7] Detect natural boundaries (completed user story where all acceptance scenarios pass) in .claude/commands/speck.implement.md
- [ ] T089 [US7] At boundary, prompt developer: "US1 complete. Create stacked branch for next work? (yes/no/skip)" in .claude/commands/speck.implement.md
- [ ] T090 [US7] If "yes": Collect metadata interactively (branch name, PR title, PR description) in .claude/commands/speck.implement.md
- [ ] T091 [US7] Use current branch as base for new stacked branch in .claude/commands/speck.implement.md
- [ ] T092 [US7] Invoke GitHub CLI (gh pr create) with collected metadata in .claude/commands/speck.implement.md
- [ ] T093 [US7] Handle gh CLI unavailability gracefully (fall back to manual command suggestion or browser URL) in .claude/commands/speck.implement.md
- [ ] T094 [US7] Update branches.json with returned PR number and set status to "submitted" in .claude/commands/speck.implement.md
- [ ] T095 [US7] If "no": Continue implementation on current branch without creating new branch in .claude/commands/speck.implement.md
- [ ] T096 [US7] If "skip": Suppress further stacking prompts for this implementation session in .claude/commands/speck.implement.md
- [ ] T097 [US7] Support --single-branch flag to explicitly disable stacking prompts in .claude/commands/speck.implement.md
- [ ] T098 [US7] Extend /speck.plan to support --stacked flag for planning user story groupings in .claude/commands/speck.plan.md
- [ ] T099 [US7] Write workflowMode metadata to plan.md frontmatter when --stacked flag used in .claude/commands/speck.plan.md
- [ ] T100 [US7] Include userStoryGroupings in plan.md (map of group name → US IDs) in .claude/commands/speck.plan.md

---

## Phase 10: Polish & Cross-Cutting Concerns

**Goal**: Error handling, documentation, and edge cases

**Independent Test**: All edge cases from spec.md handled gracefully with clear error messages

### Tasks

- [x] T101 [P] Implement auto-repair for missing specIndex (rebuild from branches array) in .speck/scripts/common/branch-mapper.ts
- [x] T102 [P] Implement auto-repair for orphaned index entries (remove from index) in .speck/scripts/common/branch-mapper.ts
- [x] T103 [P] Implement auto-repair for invalid timestamps (replace with current time) in .speck/scripts/common/branch-mapper.ts
- [x] T104 [P] Handle corrupted JSON with clear recovery instructions (restore from git history) in .speck/scripts/common/branch-mapper.ts
- [x] T105 [P] Handle schema version mismatch with migration hints in .speck/scripts/common/branch-mapper.ts
- [x] T106 [P] Handle missing required fields in branch entries with detailed error messages in .speck/scripts/common/branch-mapper.ts
- [x] T107 [P] Implement /speck.branch delete command to remove branch from metadata in .claude/commands/speck.branch.md
- [x] T108 [P] Check for child branches before deletion (require --force if has children) in .claude/commands/speck.branch.md
- [x] T109 [P] Display warning that git branch still exists after metadata deletion in .claude/commands/speck.branch.md
- [x] T110 [P] Add edge case handling: Base branch doesn't exist in git (clear error message) in .claude/commands/speck.branch.md
- [x] T111 [P] Add edge case handling: Circular dependency detection (display full cycle path) in .claude/commands/speck.branch.md
- [ ] T112 [P] Add edge case handling: Branch referenced in branches.json no longer exists in git (warning + cleanup option) in .claude/commands/speck.branch.md
- [ ] T113 [P] Add edge case handling: Malformed branches.json (auto-repair or manual recovery instructions) in .claude/commands/speck.branch.md
- [ ] T114 [P] Add edge case handling: gh CLI not installed or not authenticated (graceful fallback) in .claude/commands/speck.implement.md
- [ ] T115 [P] Add edge case handling: PR creation failure (network errors, permission issues) in .claude/commands/speck.implement.md
- [ ] T116 [P] Add edge case handling: Detached HEAD or non-branch ref during stacking prompt (skip prompt) in .claude/commands/speck.implement.md
- [ ] T117 [P] Update CLAUDE.md with stacked PR technology stack (via update-agent-context script) in CLAUDE.md
- [ ] T118 [P] Write integration tests for backwards compatibility (US1) in specs/008-stacked-pr-support/tests/integration.test.ts

---

## Phase 11: Constitution Amendment

**Goal**: Update constitution with defaultWorkflowMode setting for repository-wide defaults

**Independent Test**: Constitution file contains valid workflow mode setting with documented schema

### Tasks

- [ ] T119 [P] Draft constitution amendment for defaultWorkflowMode setting in .speck/memory/constitution.md
- [ ] T120 [P] Define Markdown format: `**Default Workflow Mode**: single-branch` in Workflow Mode Configuration section
- [ ] T121 [P] Add validation in constitution parser to detect and parse workflow mode setting from .speck/memory/constitution.md
- [ ] T122 [P] Update constitution version from 1.1.2 to 1.2.0 (MINOR: new governance section) in .speck/memory/constitution.md
- [ ] T123 [P] Add sync impact report documenting workflow mode setting addition in .speck/memory/constitution.md
- [ ] T124 [P] Update CLAUDE.md with workflow mode setting via update-agent-context script
- [ ] T125 [P] Update /speck.transform-upstream to preserve .speck/memory/constitution.md amendments during upstream syncs

---

## Dependencies & Execution Order

### Sequential Dependencies

Phase 1 (Setup) MUST complete before all other phases
Phase 2 (Foundational) MUST complete before Phases 3-9

**User Story Dependencies**:
- US1 (P1) → Independent (backwards compat baseline)
- US2 (P1) → Depends on Phase 2 (uses foundational utilities)
- US3 (P2) → Depends on US2 (extends branch create with stacking)
- US4 (P1) → Depends on US2 (requires branches.json from US2)
- US5 (P2) → Depends on US3 (imports existing relationships)
- US6 (P3) → Depends on US3 (visualizes stack status)
- US7 (P1) → Depends on US2, US4 (creates branches + reads workflow mode)

**Completion Order**:
```
Phase 1 (Setup) →
Phase 2 (Foundational) →
  ├─ US1 (P1) - Traditional workflow [Independent]
  ├─ US2 (P1) - Create first branch [Blocks US3, US4, US7]
  ├─ US4 (P1) - Branch-aware tasks [Depends on US2]
  ├─ US7 (P1) - Automated stacking [Depends on US2, US4]
  ├─ US3 (P2) - Building stacks [Depends on US2, blocks US5, US6]
  ├─ US5 (P2) - Tool-agnostic import [Depends on US3]
  └─ US6 (P3) - Stack status [Depends on US3]
→ Phase 10 (Polish)
→ Phase 11 (Constitution Amendment) [Can run in parallel with Phase 10]
```

---

## Parallel Execution Opportunities

### Phase 1 (Setup)
- **Parallel Group 1**: T002-T013 (all interface/schema/function definitions are independent)

### Phase 2 (Foundational)
- **Parallel Group 2**: T016-T018 (validation functions are independent)
- **Parallel Group 3**: T019-T022 (error classes and git operations are independent)

### US2 (Create First Branch)
- **Sequential**: All tasks depend on previous steps (command flow)

### US3 (Building Stacks)
- **Parallel Group 4**: T041-T044 (list command implementation can happen alongside status command T045-T048)

### US4 (Branch-Aware Tasks)
- **Sequential**: Flag parsing must happen before validation, validation before filtering

### US5 (Tool-Agnostic)
- **Parallel Group 5**: T059-T066 (import command) can happen in parallel with T067-T070 (update command)

### US6 (Stack Status)
- **Parallel Group 6**: T071-T081 (/speck.env extension) and T082-T084 (/speck.branch list --all) are independent

### US7 (Automated Stacking)
- **Parallel Group 7**: T085-T097 (/speck.implement changes) and T098-T100 (/speck.plan changes) are independent

### Phase 10 (Polish)
- **Parallel Group 8**: T101-T106 (auto-repair functions)
- **Parallel Group 9**: T110-T116 (edge case handling)

### Phase 11 (Constitution Amendment)
- **Parallel Group 10**: T119-T125 (all constitution amendment tasks are independent)

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)
**Phase 1 + Phase 2 + US1 + US2 = Core Stacking Functionality**

This provides:
- Branch metadata management (branches.json)
- Create first stacked branch (/speck.branch create)
- Backwards compatibility verified (US1)
- Freeform branch naming support

**Estimated MVP Time**: 2 days

### Incremental Delivery

**Sprint 1 (Days 1-2)**: MVP
- Complete Phases 1-2, US1, US2
- Deliverable: Can create stacked branches with freeform names

**Sprint 2 (Days 3-4)**: Core Features
- Complete US3 (building stacks), US4 (branch-aware tasks)
- Deliverable: Full branch stack visualization + task filtering

**Sprint 3 (Days 5-6)**: Automation
- Complete US7 (automated stacking during implementation)
- Deliverable: Intelligent boundary detection + PR prompts

**Sprint 4 (Day 7)**: Polish & Optional
- Complete US5 (tool-agnostic import), US6 (status display), Phase 10 (polish)
- Deliverable: Full feature with edge cases handled

---

## Validation Checklist

**Format Compliance**:
- [x] All tasks use checkbox format: `- [ ]`
- [x] All tasks have sequential Task IDs (T001-T118)
- [x] Story phases use [US1]-[US7] labels
- [x] Parallelizable tasks marked with [P]
- [x] All tasks include file paths

**Completeness**:
- [x] All 7 user stories mapped to task phases
- [x] All 27 functional requirements covered (FR-001 to FR-026 from spec.md)
- [x] All command interfaces from contracts/cli-commands.md implemented
- [x] All TypeScript APIs from contracts/typescript-api.md implemented
- [x] All entities from data-model.md created
- [x] All edge cases from spec.md handled (Phase 10)

**Independent Testing**:
- [x] US1: Backwards compatibility test (T026)
- [x] US2: First branch creation + branches.json validation
- [x] US3: Stack dependency chain computation
- [x] US4: Task filtering by branch + stories
- [x] US5: Import existing branches (Graphite compatibility)
- [x] US6: Full stack status display
- [x] US7: Boundary detection + PR creation prompts

**Success Criteria** (from spec.md):
- [x] SC-001: Single-branch workflows function identically (US1 phase)
- [x] SC-002: Freeform branch naming (US2: T027-T029)
- [x] SC-003: Branch lookups <100ms (US2: T032-T034 use specIndex)
- [x] SC-004: Task generation <2s (US4: T049-T058)
- [x] SC-005: Stack display <500ms (US6: T071-T081)
- [x] SC-006: Cycle detection 100% (US3: T040, Phase 2: T017)
- [x] SC-007: Tool-agnostic integration (US5: T059-T070)
- [x] SC-008: Stack discovery ≤3 commands (US6: /speck.env, /speck.branch list, /speck.branch status)
- [x] SC-009: Migration to stacked mode = 1 command (US2: /speck.branch create)
- [x] SC-010: Auto-repair malformed file <1s (Phase 10: T101-T106)
