# Feature Specification: Multi-Repo Stacked PR Support

**Feature Branch**: `009-multi-repo-stacked`
**Created**: 2025-11-19
**Status**: Draft
**Input**: User description: "add support for multi-repo stacked branches (as described in the Out of Scope section in 008-stacked-pr-support/spec.md"

## Clarifications

### Session 2025-11-19

- Q: When symlink resolution fails (permissions, broken symlinks, filesystem issues), should the system fail fast or attempt degraded operation? → A: Fail fast - Exit with error and diagnostic guidance to fix symlinks
- Q: If both root and child have `.speck/branches.json` files, how should the system resolve this conflict? → A: No conflict exists - each git repo has exactly one branches.json it cares about; child repos only read their own file, root only reads its own
- Q: When running `/speck.env` or `/speck.branch list --all` from root, should output include root repo's own branches plus all children, or only children? → A: Root branches + child branches - Complete aggregate view showing all work across entire multi-repo spec
- Q: How should child repo name be incorporated into PR metadata - as prefix in title, suffix in title, or section in description? → A: Prefix format - `[repo-name] Original PR title` for clear visual identification in PR lists
- Q: What level of operational observability should the system provide for multi-repo branch operations? → A: Minimal - Only log errors and warnings to stderr (local-only logs, simplistic approach)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Creating Stacked Branch in Multi-Repo Child (Priority: P1)

A developer working on a multi-repo spec with child repositories wants to create stacked PRs for the implementation work happening in one of the child repos. They use `/speck.branch create` from within the child repository to start a stacked workflow specific to that child's implementation.

**Why this priority**: This is the core entry point for multi-repo stacked PR workflows. Without this, teams cannot use stacked PRs in multi-repo contexts, forcing them to either abandon multi-repo mode or work with monolithic PRs.

**Independent Test**: Can be tested by creating a multi-repo spec with child repos, navigating into a child repo, and creating a stacked branch using `/speck.branch create`, verifying that `.speck/branches.json` is created in the child repo (not the root).

**Acceptance Scenarios**:

1. **Given** developer is in a multi-repo child repository linked via `/speck.link`, **When** developer runs `/speck.branch create "auth-layer"`, **Then** system creates `.speck/branches.json` in child repo root (not speck root) with branch entry referencing parent spec ID
2. **Given** developer is in a multi-repo child repo on a feature branch with committed work, **When** developer runs `/speck.branch create "database-layer"`, **Then** script exits with PR suggestion showing auto-generated title, description, and prompts to create PR against child repo's remote
3. **Given** child repo has no `.speck/` directory yet, **When** first stacked branch is created, **Then** system creates `.speck/` directory and initializes `branches.json` with schema matching root spec format
4. **Given** developer creates stacked branch in child repo, **When** they run `/speck.env`, **Then** output shows multi-repo mode indicator and child-specific branch stack without confusing it with root spec branches
5. **Given** multiple child repos exist for same spec, **When** each child creates independent stacked branches, **Then** each child maintains separate `.speck/branches.json` without cross-contamination

---

### User Story 2 - Branch Stack Status Across Multi-Repo Hierarchy (Priority: P1)

A developer working on a multi-repo spec wants to see the complete picture of branch stacks across all child repositories, understanding which child repos have stacked PRs in progress and how they relate to the overall spec.

**Why this priority**: Visibility is critical for coordinating work across multiple repos. Without aggregate status, developers lose track of PR dependencies spanning repo boundaries.

**Independent Test**: Can be tested by creating stacked branches in multiple child repos, then running `/speck.env` from root and verifying it displays aggregate view of all stacks.

**Acceptance Scenarios**:

1. **Given** developer is at speck root with root's own stacked branches and multiple child repos having stacked branches, **When** developer runs `/speck.env`, **Then** output displays complete aggregated view showing root repo's branches (labeled as "root") and each child repo name with their respective branch stack summaries
2. **Given** developer is in a child repo, **When** they run `/speck.env`, **Then** output shows both local child stack and context indicator showing parent spec relationship
3. **Given** root repo has 2 stacked branches, child repo A has 3 stacked branches, and child repo B has 2 stacked branches, **When** developer runs `/speck.branch list --all` from root, **Then** output groups branches by repo (root first, then children) with clear visual separation
4. **Given** one child repo has PR status "merged" and another has "active", **When** developer runs `/speck.branch status --all` from root, **Then** output shows per-repo status summaries without mixing branch states
5. **Given** developer is troubleshooting a multi-repo stack, **When** they run `/speck.env` from any location (root or child), **Then** output includes current working directory context to clarify which view is displayed

---

### User Story 3 - Independent Branch Stacks Per Child Repo (Priority: P2)

A development team splits a large feature implementation across three microservices (child repos). Each microservice needs its own stacked PR workflow independent of the others, but all share the same parent spec for coordination.

**Why this priority**: This enables parallel development with stacked PRs in multi-repo contexts. Without independence, bottlenecks in one child repo would block stacking in others.

**Independent Test**: Can be tested by creating stacked branches independently in two different child repos, verifying that branch creation and PR workflows in one child do not affect the other.

**Acceptance Scenarios**:

1. **Given** child repo A creates stacked branch "api-layer" based on "feature-branch", **When** child repo B independently creates stacked branch "ui-layer" based on "feature-branch", **Then** both operations succeed without conflicts or validation errors
2. **Given** child repo A has 5 branches in its stack, **When** child repo B runs `/speck.branch list`, **Then** output shows only child B's branches, not child A's
3. **Given** developer merges PR in child repo A's stack, **When** child repo B checks stack status, **Then** child B's status is unaffected and shows no rebase warnings
4. **Given** both child repos have branches named "database-layer", **When** developer runs `/speck.branch list --all` from root, **Then** output disambiguates branches by prefixing with child repo name
5. **Given** developer deletes a branch in child repo A, **When** child repo B's branch has same base branch name, **Then** child repo B's stack remains valid and operational

---

### User Story 4 - Cross-Repo Branch Dependency Validation (Priority: P2)

A developer attempts to create a branch in child repo B that depends on a branch in child repo A. The system validates that cross-repo branch dependencies are not supported and provides clear guidance.

**Why this priority**: Preventing invalid configurations upfront reduces confusion and debugging time. This is less critical than enabling basic functionality but important for robust workflows.

**Independent Test**: Can be tested by attempting to create a branch in one child repo with a base branch from another child repo, verifying the validation error and suggested alternatives.

**Acceptance Scenarios**:

1. **Given** child repo A has branch "auth-layer", **When** developer in child repo B runs `/speck.branch create "api-layer" --base "auth-layer"`, **Then** system detects "auth-layer" does not exist in child repo B and exits with error: "Cross-repo branch dependencies not supported. Base branch must exist in current repository."
2. **Given** developer attempts cross-repo dependency, **When** validation fails, **Then** error message suggests alternatives: "(1) Complete work in child A first, (2) Use shared contracts/APIs, (3) Coordinate PR merges manually"
3. **Given** child repos A and B both have "main" branch, **When** developer in child B creates branch based on "main", **Then** system correctly resolves "main" to child B's local main branch, not root or child A
4. **Given** developer accidentally specifies base branch with wrong repo prefix, **When** validation runs, **Then** system strips repo prefix and validates against local branches only
5. **Given** developer reads error message about cross-repo dependencies, **When** they check documentation via error message link, **Then** docs explain multi-repo stacking limitations and recommended patterns

---

### User Story 5 - Branch Stack Import Across Multi-Repo (Priority: P3)

A developer has manually created git branches across multiple child repos before adopting Speck's stacked PR workflow. They want to import existing branch relationships into Speck's tracking system for each child repo independently.

**Why this priority**: Migration support is valuable but lower priority than core functionality. Teams can manually track branches initially if needed.

**Independent Test**: Can be tested by creating git branches manually in child repos, then running `/speck.branch import` and verifying each child gets its own `branches.json` populated correctly.

**Acceptance Scenarios**:

1. **Given** child repo has 3 git branches in ancestor-descendant relationship, **When** developer runs `/speck.branch import` from child repo, **Then** system analyzes git merge-base relationships and populates child's `.speck/branches.json` with detected stack
2. **Given** developer runs `/speck.branch import` from speck root, **When** multiple child repos exist, **Then** system prompts: "Import branches for which child repos? (all/select/cancel)" and processes selected children
3. **Given** child repo has ambiguous branch relationships (multiple possible bases), **When** import runs, **Then** system prompts developer to disambiguate each unclear parent-child relationship
4. **Given** import detects circular dependencies in child repo, **When** validation runs, **Then** system reports error with branch names involved and skips creating invalid entries
5. **Given** child repo already has `.speck/branches.json` with some branches, **When** developer runs import, **Then** system merges new detected branches with existing entries without duplicates

---

### Edge Cases

- What happens when developer tries to use `/speck.branch` commands in multi-repo root (not a child repo)?
- How does system handle child repo that is not yet linked via `/speck.link`?
- What happens when child repo's remote URL changes after stacked branches created?
- How does system handle child repo with no remote configured (local-only)?
- What happens when child repo is deleted but parent spec still exists?
- How does system handle symlink detection failures in multi-repo mode? → System fails fast with error exit and diagnostic message directing user to fix symlink configuration (broken symlinks, permissions issues, filesystem problems)
- What happens when `.speck/branches.json` exists in both root and child repo - which takes precedence? → No precedence needed - each git repo independently manages its own `.speck/branches.json`; child repo commands only read child's file, root commands only read root's file
- How does system handle child repo that gets unlinked (symlink removed) while stacked branches exist?
- What happens when parent spec is deleted but child repos still have `.speck/branches.json` files?
- How does system handle branch name collisions across different child repos when displaying aggregate status?
- What happens when child repo's main branch name differs from root spec's branch naming convention?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect when `/speck.branch` commands are invoked from within multi-repo child repository (linked via `/speck.link`) vs. single-repo or multi-repo root context; if symlink resolution fails, system MUST exit with non-zero error code and diagnostic message instructing user to fix symlink configuration
- **FR-002**: System MUST create and maintain separate `.speck/branches.json` file in each git repository that uses stacked PRs; each repo's commands operate only on its own local file (child repo commands read child's file, root repo commands read root's file) with no cross-repo precedence or conflicts
- **FR-003**: Child repo `.speck/branches.json` MUST include `parentSpecId` field referencing the root spec directory (e.g., "007-multi-repo-monorepo-support")
- **FR-004**: System MUST validate that base branches for stacked PRs in child repos exist in the same child repo, not in other child repos or root spec
- **FR-005**: System MUST exit with clear error when `/speck.branch create` is invoked with `--base` flag pointing to non-existent branch in current child repo
- **FR-006**: `/speck.env` command MUST display child repo context indicator when run from child repo, showing parent spec relationship
- **FR-007**: `/speck.env` command MUST display aggregated branch stack summary when run from multi-repo root, listing root repo's own branches (labeled as "root") plus each child repo and their respective stack status
- **FR-008**: `/speck.branch list` command MUST show only current child repo's branches when run from child context
- **FR-009**: `/speck.branch list --all` command MUST show all branches across root repo and all child repos when run from root context, grouped by repo (root first, then children alphabetically)
- **FR-010**: `/speck.branch status` command MUST display child-specific stack health when run from child repo, without cross-repo dependency checks
- **FR-011**: `/speck.branch status --all` command MUST display per-repo status summaries when run from root, indicating which repos (root and children) have active/merged/pending branches
- **FR-012**: System MUST allow creation of stacked branches in both root repo and child repos independently; each git repository manages its own branch stack regardless of multi-repo configuration
- **FR-013**: When PR is created in child repo via `--create-pr` flag, system MUST use child repo's remote URL for PR creation, not root spec's remote
- **FR-014**: System MUST include child repo name as title prefix when creating PR from multi-repo child context using format `[repo-name] Original PR title` for clear identification in PR lists and notifications
- **FR-015**: `/speck.branch import` command MUST detect and import existing git branch relationships independently per child repo when run from child context
- **FR-016**: `/speck.branch import --all` command MUST offer to import branches for root repo and all child repos when run from multi-repo root, with interactive selection (root included in selection options)
- **FR-017**: System MUST validate `.speck/branches.json` schema in child repos matches root spec schema, with additional required `parentSpecId` field for multi-repo contexts
- **FR-018**: System MUST disambiguate branch names in aggregate views (like `--all` commands) by prefixing with repo identifier (root labeled as "root", children by directory name)
- **FR-019**: Error messages for cross-repo base branch failures MUST suggest alternatives: completing work in other child first, using shared contracts, or manual PR coordination
- **FR-020**: System MUST gracefully handle child repos without remotes configured by allowing local branch creation but warning about PR creation limitations
- **FR-021**: When child repo is unlinked (symlink removed) while `.speck/branches.json` exists, system MUST warn about orphaned branch tracking without deleting data
- **FR-022**: System MUST support child repos with different main branch names (main, master, develop) without requiring uniform naming across multi-repo spec
- **FR-023**: System MUST log only errors and warnings to stderr; success operations produce no log output to maintain clean stdout for parseable command output

### Key Entities

- **Multi-Repo Branch Stack Entry**: Extends single-repo branch stack entry with multi-repo context
  - All fields from single-repo Branch Stack Entry (branch name, base branch, status, PR number, timestamps)
  - Parent spec ID (string, e.g., "007-multi-repo-monorepo-support")
  - Child repo directory name (string, e.g., "backend-service")
  - Child repo remote URL (optional string for PR context)

- **Child Repo Branch Mapping File** (`.speck/branches.json` in child repo): Separate branch registry per child repo
  - Schema version (matches root spec format)
  - Parent spec ID (links back to root spec)
  - Child repo identifier (directory name)
  - Array of Multi-Repo Branch Stack Entries
  - Child repo remote URL (optional, for PR creation)

- **Aggregated Branch Stack View**: Read-only composite view of all child repo stacks
  - Root spec ID
  - Array of child repo identifiers
  - Per-child branch stack summaries (count, status distribution)
  - Cross-child repo name collision indicators

- **Multi-Repo Context Metadata**: Environment detection for multi-repo vs single-repo mode
  - Current working directory
  - Detected mode (single-repo, multi-repo-root, multi-repo-child)
  - Parent spec path (if child context)
  - Symlink resolution status
  - Remote URL (if child has remote)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can create stacked branches in multi-repo child repositories using same `/speck.branch create` command as single-repo mode, with zero command syntax changes
- **SC-002**: Each child repository maintains independent `.speck/branches.json` without interference from other child repos or root spec
- **SC-003**: Branch-to-spec lookups in multi-repo child contexts complete in under 150ms (50ms overhead vs. single-repo due to symlink resolution)
- **SC-004**: `/speck.env` displays complete multi-repo stack status across all child repos within 1 second for specs with up to 10 child repos and 50 total branches
- **SC-005**: Cross-repo branch dependency validation detects and prevents invalid configurations 100% of the time with clear error messages
- **SC-006**: Aggregate branch views via `--all` flags correctly disambiguate branch names across child repos without false conflicts
- **SC-007**: Developers can import existing git branch stacks independently per child repo within 5 seconds per repo
- **SC-008**: PR creation from child repos targets correct child remote URL 100% of the time without manual configuration
- **SC-009**: System gracefully handles up to 20 child repos per spec with independent stacked workflows without performance degradation
- **SC-010**: Migration from single-repo to multi-repo stacked PR workflow requires zero changes to existing child repo stacked branches
- **SC-011**: Error and warning messages provide sufficient diagnostic context (repo name, operation, failure reason) to enable troubleshooting without verbose logging

## Assumptions

- Multi-repo specs are already configured via `/speck.link` with valid symlinks before stacked PR workflows begin
- Child repositories have independent git remotes (no shared remote across all children)
- PR workflows in child repos target the child's remote, not a monorepo remote
- Developers understand that stacked PR dependencies cannot span repository boundaries
- Child repo names (directory names) are unique within a single multi-repo spec
- Root repo (speck root) can have its own implementation branches and `.speck/branches.json` independent of child repos; each git repository manages its own branch stack
- `.speck/` directory in child repo is version-controlled alongside code, similar to root spec
- Child repo remotes are GitHub repositories when using `--create-pr` flag (gh CLI requirement)
- Cross-child coordination happens through shared contracts/APIs in root spec, not branch dependencies
- When child repo is unlinked, developer manually cleans up orphaned `.speck/branches.json` if desired

## Out of Scope

- Cross-repository branch dependencies - Branches in child repo A cannot have base branches in child repo B (must be same-repo only)
- Automated branch synchronization across child repos - If child A merges work, child B is not automatically notified or rebased
- Unified PR dashboard across all child repos - Each child's PRs are managed independently via their respective remotes
- Branch stack orchestration tools - No built-in workflow for coordinating merge order across child repos
- Multi-repo branch visualization - No graph/tree view showing relationships across child repos (only per-child views)
- Automated conflict detection across child repos - System won't detect when changes in child A might conflict with child B
- Child repo auto-discovery for branch import - `/speck.branch import --all` requires interactive selection, not automatic processing of all children
