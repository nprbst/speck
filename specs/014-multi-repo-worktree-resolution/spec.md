# Feature Specification: Multi-Repo Worktree Resolution

**Feature Branch**: `014-multi-repo-worktree-resolution`
**Created**: 2025-11-23
**Status**: Draft
**Input**: User description: "handle worktrees in multi-repos based on the above discussion. also, capture the final plan above in an extra markdown document"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Parent Worktree Spec Access (Priority: P1)

A developer working on a new feature creates a worktree in the parent (speck root) repository for a new spec. Child repositories need to automatically discover and access specs from the parent's worktree rather than the main working directory.

**Why this priority**: This is the core functionality that enables worktrees to work in multi-repo setups. Without this, worktrees in the parent repo are invisible to child repos, breaking the entire feature.

**Independent Test**: Can be fully tested by creating a parent worktree with a new spec, then running `/speck.plan` in a child repo and verifying it reads the spec from the correct worktree location.

**Acceptance Scenarios**:

1. **Given** parent repo has main worktree on `main` branch and worktree on `014-new-feature` branch with a new spec, **When** child repo on `014-child-impl` branch runs spec resolution, **Then** child repo finds and reads spec from parent's `014-new-feature` worktree
2. **Given** parent repo has no worktrees (traditional workflow), **When** child repo runs spec resolution, **Then** child repo falls back to symlink-based resolution and accesses parent's main working directory
3. **Given** parent repo has multiple worktrees for different specs, **When** child repo's current branch matches spec ID `012-feature`, **Then** spec resolution finds parent's worktree for branch `012-feature` and uses that

---

### User Story 2 - Environment Variable Override (Priority: P2)

A developer needs to manually specify which parent worktree to use when automatic detection doesn't work or when testing multiple parent worktree states simultaneously.

**Why this priority**: Provides escape hatch for edge cases and debugging scenarios. Not needed for primary workflow but critical for troubleshooting.

**Independent Test**: Can be fully tested by setting `SPECK_WORKTREE_ROOT` environment variable to a specific worktree path and verifying all child repo commands use that worktree.

**Acceptance Scenarios**:

1. **Given** `SPECK_WORKTREE_ROOT=/path/to/parent-014-feature` environment variable is set, **When** child repo runs spec resolution, **Then** spec resolution uses the specified path regardless of branch names or worktree detection
2. **Given** environment variable points to non-existent path, **When** child repo runs spec resolution, **Then** system falls back to symlink-based resolution with clear warning message
3. **Given** developer wants to test against different parent worktree, **When** they export `SPECK_WORKTREE_ROOT` before running commands, **Then** all subsequent commands use the overridden path

---

### User Story 3 - Stacked PR Branch Resolution (Priority: P1)

A developer working with stacked PRs in a child repo (branches like `003-api/002-base`) needs spec resolution to correctly map branch names to spec IDs and find the appropriate parent worktree.

**Why this priority**: Stacked PRs are a core feature (spec 009) and must work seamlessly with worktrees in multi-repo contexts. This is P1 because stacked PRs break without proper resolution.

**Independent Test**: Can be fully tested by creating stacked branches in child repo, creating matching parent worktree, and verifying spec resolution uses the correct parent worktree based on spec ID extraction.

**Acceptance Scenarios**:

1. **Given** child repo on stacked branch `003-api/002-base` with `specId: "003-api"` in branches.json, **When** spec resolution runs, **Then** system extracts spec ID `003-api` and searches for parent worktree with branch `003-api`
2. **Given** parent has worktree for `003-api` and child is on `003-api/002-base`, **When** child runs `/speck.plan`, **Then** plan reads from parent's `003-api` worktree, not main
3. **Given** child branch references parent spec via `parentSpecId` field, **When** no parent worktree exists for child's spec ID, **Then** system falls back to symlink resolution pointing to parent's main worktree

---

### User Story 4 - Performance Optimization (Priority: P2)

The system needs to minimize overhead from dynamic worktree detection to maintain responsiveness during command execution.

**Why this priority**: Performance is important for developer experience but the feature must work correctly first. Can optimize after core functionality is proven.

**Independent Test**: Can be fully tested by measuring command execution time with and without worktree detection, verifying overhead is under 20ms per the SC-004 constraint from spec 007.

**Acceptance Scenarios**:

1. **Given** first command execution in a session, **When** worktree detection runs, **Then** total overhead is less than 20ms including git subprocess execution
2. **Given** worktree resolution has been cached, **When** subsequent command runs within cache TTL (60 seconds), **Then** cached result is reused with overhead under 2ms
3. **Given** cache has expired after 60 seconds, **When** next command runs, **Then** worktree detection runs again and updates cache

---

### Edge Cases

- What happens when parent worktree is deleted manually while child repo has cached reference to it?
  - System should detect missing path and fall back to symlink resolution on next lookup
  - Cache TTL (60s) ensures stale references don't persist long

- How does system handle multiple parent worktrees with similar branch names (e.g., `012-feature` and `012-feature-v2`)?
  - Git worktree list returns exact branch matches
  - Resolution searches for exact spec ID match first, then prefix match
  - If multiple matches exist, uses first match and logs warning

- What if git command fails (git not installed, corrupted repo)?
  - System catches errors from git subprocess
  - Falls back to symlink-based resolution
  - Logs warning for debugging

- How does system handle child repo with its own worktrees?
  - Child's worktrees are independent of parent detection
  - `detectSpeckRoot()` always queries parent's git directory (via symlink target)
  - Child worktree inherits .speck/root symlink from parent repo

- What if branches.json is missing or malformed in stacked PR context?
  - Falls back to extracting numeric prefix from branch name
  - If extraction fails, uses branch name as-is for worktree matching

## Requirements *(mandatory)*

### Functional Requirements

#### Core Resolution Logic

- **FR-001**: System MUST implement three-layer spec resolution priority: (1) `SPECK_WORKTREE_ROOT` environment variable, (2) dynamic git worktree detection, (3) `.speck/root` symlink fallback
- **FR-002**: System MUST cache worktree resolution results for 60 seconds to minimize git subprocess overhead
- **FR-003**: System MUST detect when child repo is in multi-repo mode by checking for `.speck/root` symlink
- **FR-004**: System MUST query parent git repository for worktree list when multi-repo mode is detected
- **FR-005**: System MUST parse `git worktree list --porcelain` output to extract worktree paths and associated branch names

#### Branch and Spec ID Mapping

- **FR-006**: System MUST read `.speck/branches.json` to extract `specId` for current branch when resolving specs
- **FR-007**: System MUST use extracted `specId` (not raw branch name) when searching for matching parent worktree
- **FR-008**: System MUST handle stacked PR branch naming format `NNN-feature/MMM-base` by extracting prefix as spec ID
- **FR-009**: System MUST fall back to numeric prefix extraction when branches.json lookup fails

#### Worktree Matching

- **FR-010**: System MUST search parent worktrees for exact branch name match to child's spec ID
- **FR-011**: System MUST search parent worktrees for prefix match (e.g., branch starting with spec ID) if exact match not found
- **FR-012**: System MUST return parent's main working directory path if no matching worktree found
- **FR-013**: System MUST validate worktree path exists before returning it as resolution result

#### Environment Variable Override

- **FR-014**: System MUST check `SPECK_WORKTREE_ROOT` environment variable before performing dynamic resolution
- **FR-015**: System MUST use environment variable value as absolute override when set, bypassing all other detection
- **FR-016**: System MUST validate environment variable path exists and contains `specs/` directory
- **FR-017**: System MUST fall back to dynamic resolution with warning if environment variable path is invalid

#### Performance and Caching

- **FR-018**: System MUST cache worktree resolution result with timestamp
- **FR-019**: System MUST invalidate cache after 60-second TTL expires
- **FR-020**: System MUST reuse cached result for repeat lookups within TTL period
- **FR-021**: System MUST provide function to manually clear cache for debugging

#### Error Handling

- **FR-022**: System MUST catch errors from git subprocess execution and fall back to symlink resolution
- **FR-023**: System MUST log warnings when worktree detection fails but continue execution
- **FR-024**: System MUST handle missing or corrupted `.speck/branches.json` gracefully
- **FR-025**: System MUST handle deleted worktrees by detecting missing path and falling back to main working directory

#### Backwards Compatibility

- **FR-026**: System MUST maintain existing symlink-based resolution as fallback for all error scenarios
- **FR-027**: System MUST work correctly in single-repo mode (no multi-repo setup) without attempting worktree detection
- **FR-028**: System MUST work correctly when parent repo doesn't use worktrees (traditional branch switching)

### Key Entities

- **Worktree**: A git working directory associated with a specific branch, created as peer directory to main repository. Contains attributes: path (absolute filesystem path), branch (git branch name), status (active/locked)

- **Spec Resolution Result**: The computed location where specs are stored for current working context. Contains attributes: mode (single-repo or multi-repo), speckRoot (absolute path to parent directory containing specs/), repoRoot (absolute path to current repository), specsDir (absolute path to specs/ directory)

- **Cache Entry**: Temporary storage of worktree resolution result. Contains attributes: path (resolved speck root path), timestamp (when result was computed), ttl (time-to-live in milliseconds)

- **Branch Mapping**: Entry in `.speck/branches.json` that maps git branch names to spec IDs. Contains attributes: name (git branch name), specId (extracted spec identifier), baseBranch (parent branch in stack), parentSpecId (parent spec in multi-repo context)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can create parent repo worktrees for new specs and child repos automatically discover specs without manual symlink updates
- **SC-002**: Command execution overhead from worktree detection is under 20ms for initial lookup and under 2ms for cached lookups
- **SC-003**: System successfully resolves specs in 100% of test scenarios covering: single-repo, multi-repo without worktrees, multi-repo with parent worktrees, multi-repo with stacked PRs
- **SC-004**: Zero manual intervention required for child repos to access parent worktree specs during normal workflow (excluding debugging scenarios)
- **SC-005**: System gracefully handles all error scenarios (deleted worktrees, missing git, corrupted config) by falling back to symlink resolution without command failure
- **SC-006**: Cache mechanism reduces git subprocess calls by at least 90% during typical development sessions (measured over 10-minute window with multiple command executions)

## Assumptions *(optional)*

- Git 2.5+ is available in all development environments (required for `git worktree list --porcelain` support)
- Parent repository uses consistent spec-based branch naming (NNN-feature-name format) for worktrees
- Developers working in child repos have filesystem access to parent repository and its worktrees (shared filesystem or mounted network drive)
- `.speck/branches.json` format follows spec 009 schema when stacked PRs are used
- Cache TTL of 60 seconds is sufficient to cover typical command sequences while short enough to detect worktree changes
- Environment variable override (`SPECK_WORKTREE_ROOT`) is primarily for debugging and edge cases, not normal workflow

## Out of Scope *(optional)*

- Automatic worktree creation in parent when child repo creates new branch (remains manual operation)
- Synchronization of worktree lifecycle between parent and child repositories
- Support for git versions older than 2.5 (no `git worktree` command)
- Remote worktree detection over network protocols (assumes local filesystem access)
- Automatic cleanup of stale cache entries across process restarts (cache is in-memory only)
- Multi-level parent-child-grandchild repository hierarchies (assumes single parent-child relationship)
- Worktree detection when parent repo uses non-standard git directory layouts (e.g., separate git-dir)
