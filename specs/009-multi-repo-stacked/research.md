# Research: Multi-Repo Stacked PR Support

**Feature**: 009-multi-repo-stacked
**Date**: 2025-11-19
**Purpose**: Resolve technical unknowns before design phase

---

## Research Scope

This research resolves architectural questions and design decisions needed to extend Feature 008 (stacked PR support) to work in multi-repo contexts established by Feature 007 (multi-repo/monorepo support).

---

## 1. Multi-Repo Detection Architecture

### Current Implementation (Feature 007)

**File**: `.speck/scripts/common/paths.ts`

**Key Function**: `detectSpeckRoot()`
- Returns `SpeckConfig` with `mode: 'single-repo' | 'multi-repo'`
- Detection method: Checks for `.speck-link` symlink in current directory
- Symlink resolution: Uses `fs.readlink()` to get target path
- Caching: Results cached in `cachedConfig` to avoid repeated filesystem checks
- Fail-fast: Throws error if symlink is broken or unreadable

**Data Structure**:
```typescript
interface SpeckConfig {
  mode: 'single-repo' | 'multi-repo';
  speckRoot: string;     // Directory containing specs/
  repoRoot: string;      // Git repository root
  specsDir: string;      // Full path to specs/
}
```

**Performance**: <10ms median for multi-repo detection (SC-009 from Feature 007)

### Integration Points for Feature 009

**Where to detect multi-repo mode**:
1. `branch-command.ts` - At entry point before branch operations
2. `env-command.ts` - Before displaying status (aggregate vs local view)
3. `common/branch-mapper.ts` - When determining branches.json file path

**Decision**: Reuse `detectSpeckRoot()` without modification
- **Rationale**: Proven implementation, meets performance requirements, cached for efficiency
- **Extension needed**: Add `isMultiRepoChild()` helper to distinguish root vs child context
- **Child detection logic**: Multi-repo mode AND current working directory != speckRoot

---

## 2. Branch Metadata Storage Strategy

### Current Implementation (Feature 008)

**File**: `.speck/branches.json` at repository root
**Schema version**: 1.0.0
**Data structure**: `BranchMapping` interface with `branches[]`, `specIndex{}`

**Key Entity**: `BranchEntry`
```typescript
interface BranchEntry {
  name: string;          // Git branch name
  specId: string;        // NNN-feature-name
  baseBranch: string;    // Parent branch
  status: BranchStatus;  // active|submitted|merged|abandoned
  pr: number | null;     // PR number
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
}
```

### Multi-Repo Extension Design

**Decision**: Add `parentSpecId` field to `BranchEntry` when in child repo context

**Rationale**:
- Links child repo branches back to root spec for aggregate status
- Enables validation of spec ID references (prevent orphaned branches)
- Supports `/speck.env` aggregate view (root + all children)
- Preserves single-repo compatibility (field optional, absent in single-repo mode)

**Updated schema**:
```typescript
interface BranchEntry {
  name: string;
  specId: string;
  baseBranch: string;
  status: BranchStatus;
  pr: number | null;
  createdAt: string;
  updatedAt: string;
  parentSpecId?: string;  // OPTIONAL: Only present in multi-repo child contexts
}
```

**Schema version bump**: 1.0.0 → 1.1.0 (backward compatible minor change)
- Version 1.0.0 files (single-repo) remain valid
- Version 1.1.0 files include optional `parentSpecId` field
- Validator accepts both versions (forward/backward compatible)

**Storage locations**:
- Root repo: `.speck/branches.json` at speck root (links to root's own specs)
- Child repo A: `.speck/branches.json` in child A's git root (links to child A's work)
- Child repo B: `.speck/branches.json` in child B's git root (links to child B's work)

**Key principle**: Each git repository's `.speck/branches.json` file operates independently (FR-002)

---

## 3. Branch-to-Spec Lookup in Multi-Repo Contexts

### Current Implementation (Feature 008)

**File**: `.speck/scripts/common/branch-mapper.ts`

**Functions**:
- `readBranches(repoRoot)` - Reads `.speck/branches.json` from repo root
- `getSpecForBranch(branchName, repoRoot)` - Looks up specId for given branch
- `getBranchesForSpec(specId, repoRoot)` - Returns all branches for a spec

**Performance**: Direct lookup via `specIndex` hash map

### Multi-Repo Lookup Strategy

**Challenge**: When `/speck.env` runs from root, need to aggregate branches across multiple repos

**Solution**: Iterate child repos and read each `.speck/branches.json` independently

**Algorithm**:
```
function getAggregatedBranchStatus(speckRoot):
  config = detectSpeckRoot()

  if config.mode == 'single-repo':
    return readBranches(config.repoRoot)

  // Multi-repo: aggregate root + children
  result = {
    root: readBranches(config.repoRoot),
    children: {}
  }

  for each childDir in findChildRepos(speckRoot):
    childRepoRoot = getGitRoot(childDir)
    if hasBranchesFile(childRepoRoot):
      result.children[childDir] = readBranches(childRepoRoot)

  return result
```

**Child repo discovery**: Read symlinks from speck root directory
- Look for all `.speck-link-*` symlinks (naming convention from Feature 007)
- Resolve each symlink to child directory
- Verify child has `.git/` directory (is a git repo)
- Check for `.speck/branches.json` existence

**Performance target**: <1 second for 10 repos, 50 total branches (SC-004)
- Assume 10 child repos × 100ms per repo = 1000ms worst case
- Optimization: Parallel reads using `Promise.all()` if needed

**Decision**: Implement sequential reads first, optimize to parallel only if SC-004 fails in testing

---

## 4. Cross-Repo Branch Dependency Validation

### Constraint (FR-004)

Branches in child repo A cannot have `baseBranch` pointing to branches in child repo B (or root).

### Validation Strategy

**Validation point**: `branch-command.ts` during `/speck.branch create`

**Algorithm**:
```
function validateBaseBranch(baseBranch, repoRoot):
  // Get all git branches in current repo
  localBranches = await listGitBranches(repoRoot)

  if baseBranch not in localBranches:
    throw ValidationError(
      "Base branch '{baseBranch}' does not exist in current repository.\n" +
      "Cross-repo branch dependencies are not supported.\n" +
      "Alternatives:\n" +
      "  1. Complete work in other repo first and merge\n" +
      "  2. Use shared contracts/APIs for coordination\n" +
      "  3. Manually coordinate PR merge order"
    )
```

**Git command**: `git branch --list` (local branches only, no remotes)

**Edge case**: What if user specifies remote branch like `origin/feature-branch`?
- **Decision**: Strip `origin/` prefix and validate against local branches only
- **Rationale**: Stacked PRs are local development workflow, base branches must be local

**Validation timing**: Before creating git branch, after dirty working tree check

---

## 5. Aggregate Status Display Design

### Current Implementation (Feature 008)

**File**: `.speck/scripts/env-command.ts` (hypothetical - may not exist yet)

**Command**: `/speck.env`
**Output sections**: Git status, current branch, feature detection, specs directory

### Multi-Repo Extension

**New section**: Branch Stack Status (added after existing sections)

**Single-repo output**:
```
Branch Stack Status:
  Feature: 008-stacked-pr-support
  Branches: 3 active, 1 merged
  └─ nprbst/db-layer (active) → PR #42
     └─ nprbst/api-layer (active) → PR #43
        └─ nprbst/ui-components (submitted) → PR #44
```

**Multi-repo output (from root)**:
```
Branch Stack Status (Multi-Repo):
  Root (008-stacked-pr-support):
    2 active branches

  Child: backend-service
    Feature: 009-multi-repo-stacked
    3 active, 1 merged
    └─ nprbst/auth-db (merged) → PR #50
       └─ nprbst/auth-api (active) → PR #51

  Child: frontend-app
    Feature: 009-multi-repo-stacked
    1 active
    └─ nprbst/login-ui (active) → PR #52
```

**Multi-repo output (from child)**:
```
Branch Stack Status:
  Context: Child repo (backend-service)
  Parent Spec: 009-multi-repo-stacked
  Feature: backend-auth-layer
  Branches: 2 active
  └─ nprbst/auth-db (active) → PR #50
     └─ nprbst/auth-api (submitted) → PR #51
```

**Display logic**:
1. Detect context: root vs child (using `isMultiRepoChild()`)
2. If child: Show local stack + parent spec reference
3. If root: Show root stack + iterate children with formatted child sections
4. Use tree visualization for dependency chains
5. Include PR numbers and status for each branch

**Implementation location**: Modify existing `/speck.env` command delegation
- Update `.claude/commands/speck.env.md` documentation
- Add multi-repo logic to env-command.ts script

---

## 6. PR Creation in Child Repos

### Current Implementation (Feature 008)

**File**: `.speck/scripts/branch-command.ts`

**PR suggestion flow**:
1. Detect commits on current branch not in base
2. Generate PR title/body from commit messages
3. Display `gh pr create` command for user to copy/paste
4. User manually runs command and updates metadata

**Key function**: `generatePRSuggestion()` (hypothetical based on Feature 008 plan)

### Multi-Repo Extension

**Challenge**: PR must target child repo's remote, not root remote

**Solution**: Detect remote URL from child repo's git config

**Algorithm**:
```
function generatePRSuggestionMultiRepo(branch, repoRoot):
  config = detectSpeckRoot()

  // Determine PR base branch
  if config.mode == 'multi-repo':
    // Child repos typically use 'main' or 'master' as PR base
    prBase = detectDefaultBranch(repoRoot) // e.g., 'main'
  else:
    // Single-repo uses spec branch (e.g., '008-stacked-pr-support')
    prBase = getCurrentBranch(config.repoRoot)

  // Get commits between PR base and current branch
  commits = getCommits(prBase, branch, repoRoot)

  // Generate title/body
  prData = generatePRFromCommits(commits)

  // Add child repo prefix to title (FR-014)
  if config.mode == 'multi-repo':
    childRepoName = getChildRepoName(repoRoot, config.speckRoot)
    prData.title = `[${childRepoName}] ${prData.title}`

  return prData
```

**Child repo name extraction**:
```
function getChildRepoName(repoRoot, speckRoot):
  // Child repo directory name (e.g., "backend-service")
  return path.basename(repoRoot)
```

**PR title format** (FR-014): `[repo-name] Original PR title`
- Example: `[backend-service] Add authentication endpoints`

**Default branch detection**:
```
function detectDefaultBranch(repoRoot):
  // git symbolic-ref refs/remotes/origin/HEAD
  output = exec(`git -C ${repoRoot} symbolic-ref refs/remotes/origin/HEAD`)
  // Output: refs/remotes/origin/main
  return output.split('/').pop() // 'main'
```

**Validation**: Ensure child repo has remote configured (FR-020)
- Check `git remote -v` output
- If no remote: Display warning, still create branch but skip PR suggestion

---

## 7. Backward Compatibility Strategy

### Constraint

Existing workflows (single-repo, multi-repo without stacking) must continue working without changes.

### Compatibility Matrix

| Mode | Stacking | Expected Behavior | Verification |
|------|----------|------------------|--------------|
| Single-repo | No | Existing workflows unchanged | Feature 007 tests pass |
| Single-repo | Yes | Feature 008 works as-is | Feature 008 tests pass |
| Multi-repo | No | Specs at root, no stacking | Feature 007 tests pass |
| Multi-repo | Yes | Feature 009 functionality | New tests |

### Implementation Strategy

**Principle**: Additive changes only, no breaking modifications

**Code changes**:
1. `branch-mapper.ts`: Add optional `parentSpecId` field (backward compatible)
2. `branch-command.ts`: Add multi-repo detection (no-op if single-repo)
3. `env-command.ts`: Add aggregate status section (only if multi-repo + branches exist)
4. Schema version: 1.0.0 remains valid, 1.1.0 adds optional field

**Validation strategy**:
- Run existing Feature 007 and 008 test suites
- Verify zero regressions (SC-TEST-008)
- Add new tests for Feature 009 without modifying old tests

**Fallback behavior**:
- If `.speck/branches.json` absent: Commands gracefully suggest creating first branch
- If symlink broken: Fail fast with diagnostic message (FR-001)
- If child repo has no remote: Warn but allow local branch creation (FR-020)

---

## 8. Testing Strategy Integration

### Existing Testing Infrastructure (Feature 009 Spec)

**Four-layer approach**:
1. Contract tests (Layer 1): Script exit codes, JSON schemas
2. Integration tests (Layer 2): Agent → script invocation
3. E2E tests (Layer 3): Single-command workflows
4. Multi-step tests (Layer 4): Session continuity

**Hook-based validation**: PostToolUse, UserPromptSubmit, PreToolUse hooks

### Research Findings

**Reusable test utilities** (from Feature 008 implementation):
- `createTestRepo()` - Single-repo fixtures
- `executeClaudeCommand()` - Slash command execution with session tracking
- Custom matchers: `toContainMatch`, `toHaveScriptCall`

**New test fixtures needed for Feature 009**:
- `createMultiRepoTestSetup()` - Root + child repos with symlinks
- `createChildRepoWithBranches()` - Child repo with pre-populated branches.json
- `assertAggregateStatus()` - Validate multi-repo status output format

**Performance test requirements** (from spec):
- SC-003: Branch lookups <150ms in multi-repo
- SC-004: Aggregate status <1s for 10 repos, 50 branches
- Implement using Bun's `performance.now()` for timing

**Hook integration for Feature 009**:
- PreToolUse hook: Inject multi-repo context before `/speck.branch` commands
- PostToolUse hook: Validate child repo branch creation produces correct JSON
- Session tracking: Verify multi-repo context preserved across `/speck.env` calls

---

## 9. Performance Optimization Considerations

### Identified Bottlenecks

**Symlink resolution** (FR-001):
- `fs.readlink()` syscall per child repo
- Worst case: 20 repos × 5ms = 100ms overhead
- Mitigation: Cache in `detectSpeckRoot()` already implemented

**Aggregate status collection** (SC-004):
- Reading 10 `.speck/branches.json` files sequentially
- Worst case: 10 repos × 50ms I/O = 500ms
- Target: <1 second total

**Optimization strategy**:
- Phase 1: Implement sequential reads (simpler, maintainable)
- Phase 2: If SC-004 fails, switch to `Promise.all()` parallel reads
- Phase 3: Consider in-memory caching if still too slow (unlikely)

### Git Operations Performance

**Branch validation** (`validateBaseBranch`):
- `git branch --list` execution time: ~20ms
- Cached by git internally (recent commands fast)
- No optimization needed

**Commit analysis** (`getCommits`):
- `git log baseBranch..currentBranch` execution time: ~50ms
- Only runs during PR suggestion (infrequent operation)
- No optimization needed

**Default branch detection** (`detectDefaultBranch`):
- `git symbolic-ref refs/remotes/origin/HEAD` execution time: ~10ms
- Cache result per repo (changes rarely)
- Implement simple Map cache in branch-command.ts

---

## 10. Error Handling and Edge Cases

### Symlink Resolution Failures (FR-001)

**Error scenarios**:
1. Broken symlink (target deleted)
2. Permission denied reading symlink
3. Symlink points outside project
4. Circular symlink references

**Handling strategy**: Fail fast with diagnostic message

**Example error message**:
```
Error: Failed to resolve multi-repo symlink '.speck-link-backend'

Possible causes:
  - Symlink target does not exist
  - Permission denied reading symlink
  - Filesystem does not support symlinks

Fix:
  1. Verify symlink target exists: ls -l .speck-link-backend
  2. Check permissions: ls -ld .speck-link-backend
  3. Re-create symlink: /speck.link /path/to/backend-repo

Exit code: 1
```

### Cross-Repo Branch Dependencies (FR-004, FR-005)

**Error scenario**: User runs `/speck.branch create api-layer --base auth-layer` where `auth-layer` exists in different child repo

**Validation**: Check if base branch exists in local git branches

**Example error message**:
```
Error: Base branch 'auth-layer' does not exist in current repository.

Cross-repo branch dependencies are not supported. Base branches must exist
in the same repository as the new branch.

Alternatives:
  1. Complete work in other repo first and merge to main
  2. Use shared contracts/APIs for coordination
  3. Coordinate PR merge order manually across repos

Exit code: 1
```

### Missing Remote Configuration (FR-020)

**Error scenario**: Child repo has no remote configured (local-only development)

**Handling**: Warning (not error), allow branch creation, skip PR suggestion

**Example warning**:
```
Warning: No git remote configured for this repository.

Branch 'api-layer' created successfully, but PR creation requires a remote.

To configure remote:
  git remote add origin https://github.com/org/repo.git
  git push -u origin api-layer

Continuing...
```

### Orphaned Branch Metadata (FR-021)

**Error scenario**: Child repo unlinked (symlink removed) while `.speck/branches.json` exists

**Handling**: Warn about orphaned metadata, do not auto-delete

**Example warning**:
```
Warning: .speck/branches.json found but no parent spec symlink detected.

This may indicate:
  - Child repo was previously linked to a multi-repo spec
  - Symlink was removed manually

If this is incorrect:
  1. Re-link repo: /speck.link /path/to/speck-root
  2. Or remove orphaned metadata: rm -rf .speck/
```

---

## Research Conclusions

### Key Decisions

1. **Multi-repo detection**: Reuse `detectSpeckRoot()` from Feature 007, add `isMultiRepoChild()` helper
2. **Branch metadata**: Extend `BranchEntry` with optional `parentSpecId` field, bump schema to v1.1.0
3. **Branch lookups**: Sequential aggregation initially, optimize to parallel if needed
4. **Cross-repo validation**: Validate base branch exists in local git branches only
5. **Aggregate status**: Tree-based visualization, context-aware (root vs child)
6. **PR creation**: Auto-prefix title with child repo name, use child's default branch as PR base
7. **Backward compatibility**: Additive changes only, existing tests must pass
8. **Error handling**: Fail fast on symlink errors, warnings for missing remotes

### Unknowns Resolved

All technical unknowns from planning phase are now resolved:
- ✅ Multi-repo detection mechanism understood
- ✅ Branch metadata storage strategy defined
- ✅ Branch-to-spec lookup algorithm designed
- ✅ Cross-repo validation approach determined
- ✅ Aggregate status display format specified
- ✅ PR creation workflow extended for multi-repo
- ✅ Backward compatibility strategy validated
- ✅ Performance optimization plan established

### Ready for Phase 1

With all research complete, proceed to Phase 1 design:
- Generate data-model.md (entities with parentSpecId field)
- Generate contracts/ (updated JSON schemas, command interfaces)
- Generate quickstart.md (multi-repo usage examples)
- Update agent context (CLAUDE.md with Feature 009 technologies)

---

**Research Complete**: 2025-11-19
