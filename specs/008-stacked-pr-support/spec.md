# Feature Specification: Stacked PR Support

**Feature Branch**: `008-stacked-pr-support`
**Created**: 2025-11-18
**Status**: Draft
**Input**: User description: "Add stacked PR support to Speck workflow to enable multiple branches per spec with explicit dependency tracking. Requirements: (1) Support tool-agnostic stacked PR workflows (Graphite, GitHub Stack, manual), (2) Allow freeform branch naming (e.g., 'username/feature-name') alongside existing NNN-feature-name pattern, (3) Centralized branch-to-spec mapping in .speck/branches.json for quick lookups, (4) Branch-aware task generation from day 1 - /speck.tasks should support --branch flag to generate subset of tasks for specific branch in stack, (5) Single-repo only (multi-repo stacking out of scope), (6) Backwards compatible - single-branch specs work unchanged without branches.json, (7) New /speck.branch command for creating stacked branches with base branch dependency, (8) Update /speck.env to display branch stack status. Use cases: Teams that want to break large features into reviewable chunks via stacked PRs, developers using tools like Graphite for stack management, teams with custom branch naming conventions (username prefixes, ticket numbers, etc.). Key insight: Decouple spec identity from single branch name - one spec can have multiple implementation branches with explicit parent-child relationships tracked in metadata."

## Clarifications

### Session 2025-11-18

- Q: When `/speck.implement` reaches a natural boundary (e.g., completed user story), how should it offer to create a stacked PR? → A: Prompt developer to confirm before creating branch (yes/no/skip), then gather metadata interactively
- Q: What constitutes a "natural boundary" for offering to create a stacked branch during `/speck.implement`? → A: Completed user story (all acceptance scenarios pass for a single US)
- Q: How should `/speck.plan` and `/speck.tasks` use the `--stacked` flag during the planning phase? → A: Plan user story groupings for future branches, defer branch creation to `/speck.implement` auto-prompts
- Q: Where should the workflow mode choice (single-branch vs stacked) be recorded when set via `/speck.plan --stacked` or `/speck.tasks --stacked`? → A: Active spec's plan.md file (feature-specific setting)
- Q: How should the system create PRs when developer confirms branch stacking during `/speck.implement`? → A: Invoke GitHub CLI (`gh pr create`) directly with collected metadata (title, description, base)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Traditional Single-Branch Workflow (Unchanged) (Priority: P1)

A developer using Speck with traditional single-branch workflow continues to use `/speck.specify`, `/speck.plan`, and `/speck.tasks` exactly as they do today. They never hear about stacked PRs and experience zero disruption.

**Why this priority**: Backwards compatibility is critical. Any regression here breaks existing users and violates the principle of least surprise.

**Independent Test**: Can be fully tested by running existing Speck commands in a fresh repository without any branches.json file and verifying identical behavior to current version.

**Acceptance Scenarios**:

1. **Given** a developer has no `.speck/branches.json` file, **When** they run `/speck.specify "Add user login"`, **Then** spec is created at `specs/NNN-feature/spec.md` with traditional single branch reference
2. **Given** a single-branch spec exists, **When** developer runs `/speck.tasks`, **Then** tasks are generated without any branch filtering or warnings
3. **Given** developer runs `/speck.env`, **When** no branches.json exists, **Then** output shows traditional branch info without stack terminology
4. **Given** a developer completes feature work, **When** they review git status, **Then** no `.speck/branches.json` file appears unless explicitly created

---

### User Story 2 - Creating First Stacked Branch with PR (Priority: P1)

A developer working on a large feature spec has completed work on the feature branch and wants to create a PR for it while starting the next piece of work. They create a stacked branch, which prompts them to create a PR for the current branch before switching.

**Why this priority**: This is the entry point for stacked PR workflows. Must be frictionless, support flexible naming conventions, and offer PR creation at the natural boundary when stacking begins.

**Independent Test**: Can be tested by creating a spec, completing work on feature branch, then using `/speck.branch create` to create first stacked branch, verifying PR creation prompt appears and `.speck/branches.json` is created with correct metadata.

**Acceptance Scenarios**:

1. **Given** developer is on `007-multi-repo` feature branch with committed work, **When** developer runs `/speck.branch create "nprbst/db-layer"`, **Then** system prompts: "Create PR for 007-multi-repo before switching? (yes/no)"
2. **Given** developer answers "yes" to PR prompt, **When** system collects metadata, **Then** interactive prompts collect PR title and description, then invoke `gh pr create` with base as main/master
3. **Given** PR is created successfully, **When** GitHub CLI returns PR number, **Then** git branch `nprbst/db-layer` is created, `.speck/branches.json` records the mapping, and system switches to new branch
4. **Given** developer answers "no" to PR prompt, **When** system processes response, **Then** new branch is created immediately without PR creation
5. **Given** developer inspects `.speck/branches.json` after PR creation, **Then** file shows branch name, base branch, spec reference, status fields, and PR number for the base branch (if PR was created)

---

### User Story 3 - Building a Stack with Dependencies and PRs (Priority: P2)

A developer has completed work on the first stacked branch and wants to create a PR for it while continuing with the next piece of work. They create another stacked branch, which prompts for PR creation, establishing a clear dependency chain with reviewable PRs at each level.

**Why this priority**: This enables the core stacked PR value proposition - sequential dependencies with clear parent-child relationships, where each branch gets its own PR for focused code review.

**Independent Test**: Can be tested by creating two stacked branches with explicit base dependencies, creating PRs at each level, and verifying branches.json tracks the chain correctly with PR numbers.

**Acceptance Scenarios**:

1. **Given** developer is on branch `nprbst/db-layer` (based on feature branch `007-multi-repo`) with committed work, **When** developer runs `/speck.branch create "nprbst/api-endpoints"`, **Then** system prompts: "Create PR for nprbst/db-layer before switching? (yes/no)"
2. **Given** developer answers "yes" to PR prompt, **When** PR is created, **Then** `gh pr create` uses `nprbst/db-layer` with base `007-multi-repo`, updates branches.json with PR number, then creates and switches to new branch
3. **Given** a stack of 3 branches exists with PRs, **When** developer runs `/speck.env`, **Then** output displays the full dependency chain with PR numbers (007-multi-repo PR#1 → db-layer PR#2 → api-endpoints → ui-components)
4. **Given** developer is on a stacked branch, **When** they run `/speck.branch list`, **Then** output shows all branches for current spec with base dependencies and PR status
5. **Given** a branch in middle of stack is merged, **When** developer runs `/speck.branch status`, **Then** output indicates which branches need rebasing onto updated base

---

### User Story 4 - Branch-Aware Task Generation (Priority: P1)

A developer creating a stacked PR workflow wants to generate task lists for specific branches in the stack, with each branch implementing a logical subset of the overall feature.

**Why this priority**: Without branch-aware tasks, developers must manually split work, defeating the purpose of workflow automation.

**Independent Test**: Can be tested by creating a spec with multiple user stories, generating tasks for specific branches using `--branch` flag, and verifying filtered output.

**Acceptance Scenarios**:

1. **Given** spec has 3 user stories (US1, US2, US3), **When** developer runs `/speck.tasks --branch nprbst/db-layer --stories US1`, **Then** tasks.md contains only tasks tagged with US1
2. **Given** branches are mapped in branches.json, **When** developer runs `/speck.tasks --branch nprbst/api-endpoints --stories US2,US3`, **Then** generated tasks include only US2 and US3 tasks
3. **Given** developer runs `/speck.tasks` without `--branch` flag, **When** branches.json exists, **Then** tasks are generated for all stories (backwards compatible behavior)
4. **Given** a branch-specific tasks.md exists, **When** developer switches branches, **Then** `/speck.tasks` can regenerate tasks appropriate to new branch context

---

### User Story 5 - Tool-Agnostic Stack Management (Priority: P2)

A developer uses Graphite (or other stacking tool) to manage their branch stack. Speck's branch metadata integrates seamlessly without interfering with their chosen tool's workflow.

**Why this priority**: Speck should complement existing tools, not compete or conflict with them. Tool choice is a team decision.

**Independent Test**: Can be tested by using Graphite commands (gt create, gt stack) alongside Speck commands and verifying no conflicts in branch management.

**Acceptance Scenarios**:

1. **Given** developer uses Graphite to create stacked branches, **When** they run `/speck.branch import`, **Then** Speck reads git branch relationships and updates branches.json accordingly
2. **Given** branches.json exists, **When** developer uses `gt restack` to rebase stack, **Then** Speck's metadata remains valid and no conflicts occur
3. **Given** developer creates PR via GitHub CLI, **When** they update branches.json with `pr: <number>`, **Then** `/speck.env` displays PR numbers alongside branch info
4. **Given** team doesn't use stacking tools, **When** they manage stack manually via git, **Then** Speck's `/speck.branch` commands provide equivalent functionality

---

### User Story 6 - Discovering Stack Status (Priority: P3)

A developer joins a project mid-feature and wants to understand the current state of the branch stack: which branches exist, their dependencies, PR status, and what's already merged.

**Why this priority**: Discoverability and onboarding are important but lower priority than core workflow functionality.

**Independent Test**: Can be tested by creating a complex stack, running `/speck.env` and `/speck.branch status`, and verifying complete visibility into stack state.

**Acceptance Scenarios**:

1. **Given** a stack exists with mixed PR states (draft, open, merged), **When** developer runs `/speck.branch status`, **Then** output shows each branch with its PR number, status, and merge state
2. **Given** developer is on a branch in the middle of a stack, **When** they run `/speck.env`, **Then** output highlights current branch position and upstream/downstream dependencies
3. **Given** a branch's base has been merged, **When** developer runs `/speck.branch status`, **Then** output warns that branch needs rebasing onto new base (e.g., main)
4. **Given** multiple specs have stacked branches, **When** developer runs `/speck.branch list --all`, **Then** output shows branches grouped by spec across the entire repository

---

### User Story 7 - Automated Stacking During Implementation (Priority: P1)

A developer using `/speck.implement` completes a user story that represents a natural boundary for an independently deployable change. The system detects this boundary and prompts them to optionally create a new stacked branch and PR, enabling seamless workflow without manual branch management.

**Why this priority**: This is the core automation value - reducing friction in stacked PR workflows by intelligently detecting boundaries and offering to stack at the right moments.

**Independent Test**: Can be tested by running `/speck.implement` with stacked-PR mode enabled, completing a user story, and verifying the system prompts for branch creation with appropriate context.

**Acceptance Scenarios**:

1. **Given** developer runs `/speck.implement --stacked` and completes user story US1, **When** all US1 tasks pass, **Then** system prompts: "US1 complete. Create stacked branch for next work? (yes/no/skip)"
2. **Given** developer answers "yes" to stacking prompt, **When** system gathers metadata, **Then** interactive prompts collect: branch name, PR title, PR description, and confirm current branch as base
3. **Given** developer answers "no" to stacking prompt, **When** implementation continues, **Then** work proceeds on current branch without creating new branch
4. **Given** developer answers "skip" to stacking prompt, **When** system processes response, **Then** no further stacking prompts appear during this implementation session
5. **Given** developer runs `/speck.implement` without `--stacked` flag, **When** user stories complete, **Then** no stacking prompts appear (traditional single-branch mode)
6. **Given** stacked-PR mode is set as default in constitution, **When** developer runs `/speck.implement`, **Then** system uses stacked mode unless `--single-branch` flag overrides

---

### Edge Cases

- What happens when a developer tries to create a stacked branch with a base that doesn't exist?
- How does system handle circular dependencies in branch stack (A � B � A)?
- What happens when developer deletes a branch in the middle of a stack?
- How does system behave when branches.json exists but is malformed or has invalid JSON?
- What happens when a branch referenced in branches.json no longer exists in git?
- How does system handle merge conflicts when rebasing a stack?
- What happens when developer creates a branch via git directly (not using `/speck.branch`)?
- How does system handle switching between single-branch and stacked-branch modes for the same spec?
- What happens when `gh` CLI is not installed or not authenticated when attempting PR creation?
- How does system handle PR creation failures (network errors, permission issues, invalid base branch)?
- What happens when developer is on a detached HEAD or non-branch ref when stacking prompt appears?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support traditional single-branch workflow without requiring `.speck/branches.json` file or any stack-related configuration
- **FR-002**: System MUST allow freeform branch naming patterns (e.g., `username/feature`, `TICKET-123-name`, `feature/description`) alongside existing `NNN-feature-name` format
- **FR-003**: System MUST maintain centralized branch-to-spec mapping in `.speck/branches.json` at repository root for quick lookups
- **FR-004**: System MUST provide `/speck.branch create <name> [--base <base-branch>]` command to create new stacked branch with explicit parent dependency (defaults to current branch if --base omitted)
- **FR-005**: System MUST update `/speck.env` to display branch stack status when `.speck/branches.json` exists
- **FR-006**: System MUST provide `/speck.tasks --branch <name> --stories <US1,US2,...>` to generate branch-specific task subsets
- **FR-007**: System MUST track branch metadata including: branch name, base branch, associated spec ID, PR number (optional), and status (active/submitted/merged)
- **FR-008**: System MUST provide `/speck.branch list` command to display all branches for current spec with dependencies and status
- **FR-009**: System MUST provide `/speck.branch status` command to show stack health (which branches merged, which pending, rebase warnings)
- **FR-010**: System MUST validate branch dependencies to prevent circular references or invalid base branches
- **FR-011**: System MUST support tool-agnostic workflow compatible with Graphite, GitHub Stack, and manual git operations
- **FR-012**: System MUST maintain `.speck/branches.json` schema version for future compatibility
- **FR-013**: System MUST provide `/speck.branch import` command to auto-detect existing branch relationships from git and populate branches.json
- **FR-014**: System MUST gracefully handle missing or malformed `.speck/branches.json` by either auto-repairing or prompting user
- **FR-015**: System MUST support single-repo only (multi-repo stacking explicitly out of scope)
- **FR-016**: System MUST define "natural boundary" as a completed user story where all acceptance scenarios pass (as determined by test execution or manual verification)
- **FR-017**: `/speck.implement` MUST detect natural boundaries (completed user stories where all acceptance scenarios pass) and prompt developer to create stacked branch and PR
- **FR-018**: Stacking prompts MUST offer three response options: "yes" (create branch + PR with interactive metadata collection), "no" (continue on current branch), "skip" (suppress further prompts this session)
- **FR-019**: `/speck.implement` MUST support `--stacked` flag to enable automated stacking prompts and `--single-branch` flag to disable them
- **FR-020**: `/speck.plan` and `/speck.tasks` MUST support `--stacked` flag to plan user story groupings for future branches, deferring actual branch creation to `/speck.implement` auto-prompts
- **FR-021**: Workflow mode choice (single-branch vs stacked) MUST be recorded in active spec's plan.md file as feature-specific metadata when set via `--stacked` or `--single-branch` flags
- **FR-022**: Constitution file MUST support `defaultWorkflowMode: "single-branch" | "stacked-pr"` setting as repository-wide default with JSON schema validation (enum constraint), overridden by plan.md feature-specific settings, defaulting to "single-branch" if unspecified
- **FR-023**: Command-line flags (`--stacked`, `--single-branch`) MUST override both constitution defaults and plan.md settings when explicitly provided
- **FR-024**: `/speck.implement` MUST read workflow mode from plan.md (if present), fall back to constitution default, or default to single-branch mode if neither exists
- **FR-025**: System MUST invoke GitHub CLI (`gh pr create`) directly with collected metadata (title, description, base branch) when developer confirms PR creation
- **FR-026**: System MUST gracefully handle `gh` CLI unavailability by displaying executable manual command template (`gh pr create --base <base> --title "<title>" --body "<body>"`) OR generating GitHub web URL (`https://github.com/<owner>/<repo>/compare/<base>...<head>?expand=1&title=<encoded-title>`)
- **FR-027**: PR creation MUST update `.speck/branches.json` with returned PR number and set status to "submitted"

### Key Entities

- **Branch Stack Entry**: Represents a single branch in a stacked PR workflow
  - Branch name (string, freeform format)
  - Base branch (string, reference to parent branch)
  - Spec ID (string, links to `specs/NNN-feature/`)
  - PR number (optional integer)
  - Status (enum: active, submitted, merged, abandoned)
  - Created timestamp
  - Last updated timestamp

- **Branch Mapping File** (`.speck/branches.json`): Centralized registry of all branch stacks in repository
  - Schema version (for future compatibility)
  - Array of Branch Stack Entries
  - Spec-to-branches index (maps spec ID to list of branch names)

- **Branch-Aware Task Subset**: Filtered task list for specific branch
  - Parent spec reference
  - Target branch name
  - Included user stories (array of US IDs)
  - Task IDs (subset of full tasks.md)

- **Stacked Plan Metadata**: Planning annotations for future branch stack structure (when `--stacked` flag used)
  - Workflow mode setting ("single-branch" | "stacked")
  - User story groupings (which US belong together for single PR scope)
  - Suggested branch boundaries (deferred to implementation)
  - Dependency order hints (US1 → US2 → US3)
  - Embedded in plan.md as structured frontmatter or metadata section

- **Constitution Workflow Settings**: Repository-wide workflow mode configuration
  - Default workflow mode (enum: "single-branch" | "stacked-pr")
  - Override hierarchy: CLI flag > plan.md > constitution > "single-branch"
  - Stored in constitution.md as Markdown metadata line
  - Validation: Must be valid enum value or absent

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Existing single-branch Speck workflows function identically with zero behavior changes when `.speck/branches.json` does not exist
- **SC-002**: Developers can create stacked branches with custom naming conventions (username, ticket ID, etc.) without restriction to `NNN-feature-name` format
- **SC-003**: Branch-to-spec lookups complete in under 100ms for repositories with up to 100 stacked branches
- **SC-004**: Task generation with `--branch` flag produces correct subset of tasks matching specified user stories in under 2 seconds
- **SC-005**: Stack status display via `/speck.env` shows complete dependency chain and PR states within 500ms
- **SC-006**: Branch dependency validation detects and prevents circular references 100% of the time
- **SC-007**: Integration with external tools (Graphite, GitHub CLI) requires zero modifications to Speck's branch metadata
- **SC-008**: Developers can discover full stack state (all branches, dependencies, PR status) within 3 commands or less
- **SC-009**: Migration from single-branch to stacked-branch mode for existing spec requires exactly 1 command (`/speck.branch create`)
- **SC-010**: System handles malformed `.speck/branches.json` by auto-repairing or providing clear recovery instructions in under 1 second

## Assumptions

- Git is available and repository is initialized (consistent with existing Speck requirements)
- Developers understand basic git branching concepts (creating branches, checking out, merging)
- PR status updates (submitted, merged) are manual or via external integrations - Speck does not automatically poll GitHub API
- Branch naming conflicts (multiple branches with same name) are prevented by git itself, not Speck
- Rebase operations are manual or tool-assisted (Graphite, git CLI) - Speck provides visibility but doesn't automate rebasing
- Spec-to-branch relationships are many-to-many at the git level but Speck enforces one-to-many (one spec, many branches)
- Teams using stacked PRs understand the concept of base branch dependencies
- `.speck/branches.json` is version-controlled and committed alongside code changes
- GitHub CLI (`gh`) is preferred for automated PR creation but system degrades gracefully if unavailable
- Automated PR creation is GitHub-specific; other platforms (GitLab, Bitbucket) require manual PR creation or custom tooling
- Developers are authenticated with `gh auth login` before attempting automated PR creation
