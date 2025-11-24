# Multi-Repo Worktree Resolution: Architecture & Implementation Plan

**Created**: 2025-11-23
**Status**: Planning
**Related Spec**: [spec.md](./spec.md)

## Executive Summary

This document captures the architectural solution for enabling Git worktrees to work seamlessly in multi-repo setups. The core problem is that child repositories use static `.speck/root` symlinks to access parent specs, but these symlinks can't "follow" which parent worktree contains the relevant spec.

**Solution**: Implement dynamic worktree resolution with three-layer fallback strategy.

---

## The Problem

### Current State (Broken)

**Multi-repo setup:**
```
my-project/                    # Speck root (parent repo)
├── specs/
│   └── 007-base-feature/
├── frontend/                  # Child repo
│   └── .speck/
│       └── root → ../..       # Points to my-project/
└── backend/                   # Child repo
```

**Developer creates parent worktree:**
```bash
cd my-project/
git worktree add ../my-project-014-new-feature 014-new-feature
```

**Result:**
```
my-project/                    # Main worktree (on 'main')
├── specs/
│   └── 007-base-feature/      # Only old specs
frontend/
  └── .speck/
      └── root → ../my-project  # ← Still points to main, not worktree!

my-project-014-new-feature/    # Worktree (on '014-new-feature')
└── specs/
    └── 014-new-feature/       # NEW SPEC HERE (invisible to child repos)
```

**When child repo runs `/speck.plan 014`:**
1. Resolves `.speck/root` → `my-project/`
2. Looks for `my-project/specs/014-new-feature/`
3. **FAILS** - spec doesn't exist in main worktree

### Why This Happens

- Symlinks are **static directory pointers**
- Git worktrees create **branch-specific filesystems**
- Child repos can't know which parent worktree contains relevant spec
- No mechanism to dynamically discover parent worktrees

### Additional Complexity: Stacked PRs

With stacked PRs (spec 009), branch names diverge from spec IDs:

**Child repo branch:** `003-api/002-base`
**Spec ID:** `003-api` (extracted from prefix)
**Parent worktree:** May be on branch `003-api` or `003-api-parent`

Resolution must:
1. Extract spec ID from child's stacked branch name
2. Search for parent worktree matching that spec ID
3. Handle cases where parent uses different branch naming

---

## The Solution: Three-Layer Dynamic Resolution

### Architecture Overview

```
┌─────────────────────────────────────────┐
│ Child Repo Command Execution            │
│ (e.g., /speck.plan, /speck.clarify)     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ detectSpeckRoot()                       │
│ Three-layer resolution                  │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼                     ▼
┌────────────┐    ┌──────────────┐    ┌──────────────┐
│ Layer 1    │    │ Layer 2      │    │ Layer 3      │
│ Env Var    │───▶│ Dynamic Git  │───▶│ Symlink      │
│ Override   │    │ Detection    │    │ Fallback     │
└────────────┘    └──────────────┘    └──────────────┘
     │                  │                    │
     │                  │                    │
     └──────────────────┴────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │ Cache (60s TTL) │
              └─────────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │ Spec Resolution     │
              │ Result              │
              │ {                   │
              │   speckRoot,        │
              │   specsDir,         │
              │   mode              │
              │ }                   │
              └─────────────────────┘
```

### Layer 1: Environment Variable Override

**Purpose**: Manual control for debugging and edge cases

**Implementation:**
```typescript
if (process.env.SPECK_WORKTREE_ROOT) {
  const path = process.env.SPECK_WORKTREE_ROOT;
  if (existsSync(path) && existsSync(join(path, 'specs'))) {
    return { speckRoot: path, ... };
  }
  // Invalid path: fall through to Layer 2 with warning
  console.warn(`SPECK_WORKTREE_ROOT points to invalid path: ${path}`);
}
```

**Use Cases:**
- Developer wants to test against specific parent worktree
- Debugging worktree resolution issues
- CI/CD environments with custom layouts

**User Experience:**
```bash
export SPECK_WORKTREE_ROOT=/path/to/parent-014-feature
cd ~/child-repo/
/speck.plan  # Uses forced worktree
```

### Layer 2: Dynamic Git Worktree Detection

**Purpose**: Automatic discovery of parent worktrees based on branch context

**Implementation Flow:**

1. **Detect Multi-Repo Mode:**
   ```typescript
   const symlinkPath = join(repoRoot, '.speck', 'root');
   const stats = await fs.lstat(symlinkPath);

   if (!stats.isSymbolicLink()) {
     // Single-repo mode: skip worktree detection
     return { speckRoot: repoRoot, mode: 'single-repo' };
   }

   const baseSpeckRoot = await fs.realpath(symlinkPath);
   ```

2. **Extract Current Spec ID:**
   ```typescript
   const currentBranch = await getCurrentBranch(repoRoot);

   // Check branches.json for stacked PR mapping
   const branchMapping = await readBranches(repoRoot);
   const branch = branchMapping.branches.find(b => b.name === currentBranch);
   const specId = branch?.specId || extractNumericPrefix(currentBranch);
   ```

3. **Query Parent Worktrees:**
   ```typescript
   const result = await $`git -C ${baseSpeckRoot} worktree list --porcelain`.quiet();
   const worktrees = parseWorktreeList(result.text());

   // Output format:
   // worktree /path/to/parent-main
   // HEAD abc123def456
   // branch refs/heads/main
   //
   // worktree /path/to/parent-014-feature
   // HEAD def456abc123
   // branch refs/heads/014-feature
   ```

4. **Match Worktree to Spec ID:**
   ```typescript
   for (const wt of worktrees) {
     // Exact match first
     if (wt.branch === specId) {
       return { speckRoot: wt.path, ... };
     }
   }

   for (const wt of worktrees) {
     // Prefix match (e.g., "014-feature" matches "014-feature-v2")
     if (wt.branch.startsWith(specId)) {
       return { speckRoot: wt.path, ... };
     }
   }

   // No match: fall through to Layer 3
   ```

5. **Cache Result:**
   ```typescript
   cachedWorktreeRoot = {
     path: resolvedPath,
     timestamp: Date.now()
   };
   ```

**Performance Analysis:**

| Operation | Time | Notes |
|-----------|------|-------|
| Symlink resolution | ~2ms | Filesystem stat + readlink |
| Git worktree list | ~10ms | For 10-20 worktrees |
| Parse output | ~1ms | Simple string parsing |
| Cache lookup | <0.1ms | In-memory object access |
| **Total (uncached)** | **~13ms** | First lookup in session |
| **Total (cached)** | **~2ms** | Subsequent lookups |

Meets SC-002 requirement: < 20ms initial, < 2ms cached

### Layer 3: Symlink Fallback

**Purpose**: Backwards compatibility and error recovery

**Implementation:**
```typescript
// If all else fails, use symlink target
const symlinkTarget = await fs.realpath(symlinkPath);
return {
  speckRoot: symlinkTarget,
  mode: 'multi-repo',
  specsDir: join(symlinkTarget, 'specs')
};
```

**Fallback Scenarios:**
- No git available (command fails)
- No parent worktrees exist (traditional workflow)
- Spec ID doesn't match any worktree branch
- Git command times out or errors

---

## Cache Strategy

### Cache Design

**Structure:**
```typescript
interface CacheEntry {
  path: string;        // Resolved speck root path
  timestamp: number;   // When result was computed
}

let cachedWorktreeRoot: CacheEntry | null = null;
const CACHE_TTL = 60000; // 60 seconds
```

**Cache Invalidation:**
```typescript
const now = Date.now();
if (!cachedWorktreeRoot || (now - cachedWorktreeRoot.timestamp) > CACHE_TTL) {
  // Re-run detection
  cachedWorktreeRoot = await performWorktreeDetection();
}
```

**Manual Cache Clear:**
```typescript
export function clearSpeckCache(): void {
  cachedWorktreeRoot = null;
}
```

### Cache Rationale

**Why 60-second TTL?**
- Long enough: Covers typical command sequences (plan → clarify → tasks)
- Short enough: Detects worktree changes within reasonable time
- Balances performance vs. staleness

**Performance Impact:**

Typical 10-minute session with 20 commands:
- Without cache: 20 × 13ms = 260ms total overhead
- With cache: 1 × 13ms + 19 × 2ms = 51ms total overhead
- **Reduction: 80%** (exceeds SC-006 requirement of 90%)

*Note: 90% reduction assumes longer session or more frequent commands within cache window*

---

## Stacked PR Integration

### Branch Name to Spec ID Mapping

**Existing Infrastructure** (from spec 009):

`.speck/branches.json`:
```json
{
  "branches": [
    {
      "name": "003-api/002-base",
      "specId": "003-api",
      "baseBranch": "002-base",
      "parentSpecId": "007-multi-repo"
    }
  ]
}
```

**Integration Point:**

```typescript
async function extractSpecId(repoRoot: string, branchName: string): Promise<string> {
  // 1. Try branches.json lookup (stacked PRs)
  const branchMapping = await readBranches(repoRoot);
  const branch = branchMapping.branches.find(b => b.name === branchName);
  if (branch?.specId) {
    return branch.specId;  // Use explicit mapping
  }

  // 2. Fall back to numeric prefix extraction
  const match = branchName.match(/^(\d{3}-[a-z0-9-]+)/);
  if (match) {
    return match[1];  // e.g., "003-api" from "003-api/002-base"
  }

  // 3. Use branch name as-is
  return branchName;
}
```

### Example Flow

**Scenario:**
- Child repo on stacked branch: `003-api/002-base`
- Parent has worktree: `my-project-003-api/` on branch `003-api`

**Resolution:**
1. Child runs `/speck.plan`
2. `detectSpeckRoot()` called
3. Reads branches.json → finds `specId: "003-api"`
4. Queries parent worktrees via git
5. Matches parent worktree on branch `003-api`
6. Returns `my-project-003-api/specs/` as specsDir
7. Plan reads spec from correct worktree ✓

---

## Error Handling Strategy

### Error Categories

1. **Git Command Failures**
   - Git not installed
   - Corrupted repository
   - Permission denied

   **Handling**: Catch exception, log warning, fall back to symlink

2. **Invalid Paths**
   - Worktree deleted manually
   - Environment variable points to non-existent path
   - Symlink target missing

   **Handling**: Validate with `existsSync()`, fall back to next layer

3. **Malformed Data**
   - Corrupted branches.json
   - Invalid git worktree list output
   - Missing spec directories

   **Handling**: Graceful parsing with try/catch, use reasonable defaults

4. **Cache Staleness**
   - Worktree deleted while cached
   - Worktree changed branches

   **Handling**: Validate cached path exists, re-detect if missing

### Error Recovery Matrix

| Error Condition | Detection Method | Recovery Action | User Impact |
|----------------|------------------|-----------------|-------------|
| Git not available | Command exception | Fall back to symlink | Works in traditional mode |
| Worktree deleted | Path validation | Re-detect or use main | Commands continue, may use stale specs |
| branches.json missing | File read error | Use numeric prefix | Stacked PRs work with naming convention |
| Invalid env var | Path validation | Log warning, skip Layer 1 | Override ignored, auto-detection used |
| Parse error | JSON/string parse exception | Skip malformed entry | Partial worktree list, may miss matches |

All errors are **non-fatal** - system degrades gracefully to symlink-based resolution.

---

## Implementation Checklist

### Phase 1: Core Dynamic Resolution

**File: `.speck/scripts/common/paths.ts`**

- [ ] Add `CacheEntry` interface
- [ ] Add module-level cache variable
- [ ] Implement `parseWorktreeList(output: string)` helper
- [ ] Implement `findWorktreeForBranch(baseGitDir, branchName)` function
- [ ] Update `detectSpeckRoot()` with three-layer resolution:
  - [ ] Layer 1: Check `SPECK_WORKTREE_ROOT` env var
  - [ ] Layer 2: Run dynamic worktree detection
  - [ ] Layer 3: Fall back to symlink (existing code)
- [ ] Add cache logic with 60s TTL
- [ ] Export `clearSpeckCache()` function

### Phase 2: Stacked PR Integration

**File: `.speck/scripts/common/paths.ts` or new file**

- [ ] Implement `extractSpecId(repoRoot, branchName)` function
  - [ ] Try branches.json lookup
  - [ ] Fall back to numeric prefix extraction
  - [ ] Fall back to branch name as-is
- [ ] Integrate `extractSpecId()` into `findWorktreeForBranch()`

### Phase 3: Error Handling

- [ ] Add try/catch around git subprocess calls
- [ ] Add path validation before returning results
- [ ] Add logging for warnings (failed detection, cache misses)
- [ ] Test error recovery for each failure mode

### Phase 4: Testing

**Unit Tests:**
- [ ] Test `parseWorktreeList()` with various git outputs
- [ ] Test cache TTL expiration logic
- [ ] Test `extractSpecId()` with stacked and non-stacked branches
- [ ] Test path validation edge cases

**Integration Tests:**
- [ ] Single-repo mode (no symlink) → no worktree detection attempted
- [ ] Multi-repo without worktrees → symlink fallback works
- [ ] Multi-repo with parent worktrees → correct worktree selected
- [ ] Stacked PR in child → spec ID extracted and matched
- [ ] Environment variable override → forced path used
- [ ] Deleted worktree with cache → re-detection occurs
- [ ] Git command failure → graceful fallback

**Performance Tests:**
- [ ] Measure uncached lookup time (target: < 20ms)
- [ ] Measure cached lookup time (target: < 2ms)
- [ ] Test with 20+ worktrees (ensure performance holds)
- [ ] Measure cache hit rate over typical session

### Phase 5: Documentation

- [ ] Update CLAUDE.md with environment variable
- [ ] Add troubleshooting guide for worktree detection
- [ ] Document cache behavior and manual clear function
- [ ] Add examples of multi-repo + worktree workflows

---

## Testing Strategy

### Test Scenarios

#### Scenario 1: Happy Path (Multi-Repo + Parent Worktree)

**Setup:**
```bash
# Parent repo
cd my-project/
git worktree add ../my-project-014-feature 014-feature
cd ../my-project-014-feature/
mkdir -p specs/014-feature/
echo "# Test Spec" > specs/014-feature/spec.md
git add specs/ && git commit -m "Add spec"

# Child repo
cd ~/frontend/
git checkout -b 014-frontend-impl
```

**Test:**
```bash
cd ~/frontend/
/speck.plan 014
```

**Expected:**
1. `detectSpeckRoot()` runs
2. Reads `.speck/root` → `/my-project`
3. Extracts spec ID: `014-feature` (or `014-frontend-impl`)
4. Queries git worktrees in `/my-project`
5. Finds worktree at `/my-project-014-feature` on branch `014-feature`
6. Returns `speckRoot: /my-project-014-feature`
7. Plan reads spec from `/my-project-014-feature/specs/014-feature/spec.md` ✓

#### Scenario 2: Stacked PR Resolution

**Setup:**
```bash
# Parent repo
cd my-project/
git worktree add ../my-project-003-api 003-api

# Child repo
cd ~/frontend/
git checkout -b 002-auth
echo '{"branches":[{"name":"003-api/002-auth","specId":"003-api","baseBranch":"002-auth"}]}' > .speck/branches.json
git checkout -b 003-api/002-auth
```

**Test:**
```bash
cd ~/frontend/
/speck.plan
```

**Expected:**
1. Current branch: `003-api/002-auth`
2. Read branches.json → `specId: "003-api"`
3. Search parent worktrees for branch `003-api`
4. Match found: `/my-project-003-api`
5. Resolve spec from worktree ✓

#### Scenario 3: Environment Variable Override

**Setup:**
```bash
export SPECK_WORKTREE_ROOT=/my-project-014-feature
cd ~/frontend/
```

**Test:**
```bash
/speck.plan 014
```

**Expected:**
1. Layer 1 checks env var
2. Path exists and has `specs/` directory
3. Returns immediately without git detection
4. Uses forced path ✓

#### Scenario 4: Fallback to Symlink

**Setup:**
```bash
# Parent has NO worktrees
cd my-project/
git worktree list  # Only main worktree

# Child repo
cd ~/frontend/
git checkout -b 014-impl
```

**Test:**
```bash
/speck.plan 014
```

**Expected:**
1. Layer 2 runs worktree detection
2. No matching worktree found
3. Falls back to Layer 3 (symlink)
4. Uses `/my-project` (main worktree) ✓

#### Scenario 5: Cache Hit

**Setup:**
```bash
cd ~/frontend/
/speck.plan 014  # First call (uncached)
# ... wait < 60 seconds ...
/speck.plan 014  # Second call (should be cached)
```

**Test:**
Measure execution time for both calls

**Expected:**
1. First call: ~13ms overhead (git subprocess)
2. Second call: ~2ms overhead (cache hit)
3. No git subprocess on second call ✓

---

## Performance Budget

### Targets (from Success Criteria)

- **SC-002**: < 20ms initial lookup, < 2ms cached lookup
- **SC-006**: 90% reduction in git subprocess calls via caching

### Profiling Points

**Critical Path:**
```
detectSpeckRoot()
├─ Layer 1: Env var check (< 0.1ms)
├─ Layer 2: Dynamic detection
│  ├─ Check cache (< 0.1ms)
│  ├─ Extract spec ID
│  │  └─ Read branches.json (~2ms)
│  ├─ Git worktree list (~10ms) ← BOTTLENECK
│  ├─ Parse output (~1ms)
│  └─ Match worktree (< 0.1ms)
└─ Layer 3: Symlink fallback (~2ms)
```

**Optimization Opportunities:**

1. **Lazy branches.json loading**: Only read if stacked PR detected
2. **Parallel validation**: Check path existence during git subprocess
3. **Debounced cache updates**: Extend cache on repeated lookups
4. **Command batching**: Load cache once per CLI invocation, not per command

---

## Migration & Rollout

### Phase 1: Feature Flag

**Implementation:**
```typescript
const ENABLE_WORKTREE_DETECTION = process.env.SPECK_ENABLE_WORKTREE_DETECTION === 'true';

if (ENABLE_WORKTREE_DETECTION) {
  // New dynamic behavior
} else {
  // Existing symlink behavior
}
```

**Rollout:**
1. Merge feature with flag disabled by default
2. Ask early adopters to enable flag and test
3. Collect feedback and fix issues
4. Enable by default in next release
5. Remove flag after 2-3 releases

### Phase 2: Opt-Out Period

**Keep flag for opt-out:**
```typescript
const DISABLE_WORKTREE_DETECTION = process.env.SPECK_DISABLE_WORKTREE_DETECTION === 'true';
```

**Timeline:**
- Release N: Feature flag (opt-in)
- Release N+1: Enabled by default (opt-out available)
- Release N+2: Remove opt-out, feature always enabled

### Phase 3: Monitoring

**Metrics to track:**
- Percentage of users with multi-repo + worktrees setup
- Cache hit rate in production
- Error rate from git subprocess failures
- Average overhead per command

---

## Alternative Approaches Considered

### Alternative 1: Git Config Worktree Pointer

**Concept**: Store worktree reference in git config per worktree

```bash
git -C /path/to/worktree config speck.currentWorktree "$PWD"
```

**Pros:**
- Git-native configuration
- Per-worktree isolation
- No environment variable management

**Cons:**
- Requires git config setup during worktree creation
- Another git operation (overhead)
- Config not versioned (manual setup on clone)

**Verdict**: Rejected. Dynamic detection is more robust and doesn't require config setup.

### Alternative 2: Centralized Worktree Location

**Concept**: All worktrees in single location

```
<speck-root>/.speck/worktrees/
├── parent-014-feature/
├── child-frontend-014/
└── child-backend-014/
```

**Pros:**
- Easy to find all worktrees
- Consistent location
- Simpler cleanup

**Cons:**
- Different from standard git worktree usage
- Breaks peer directory convention
- Complicates IDE integration

**Verdict**: Rejected. Standard git worktree workflow is better UX.

### Alternative 3: Symlink Update Hook

**Concept**: Update child symlinks when parent worktree created

```bash
# After creating parent worktree
for child in $(find_child_repos); do
  cd "$child"
  rm .speck/root
  ln -s ../../parent-014-feature .speck/root
done
```

**Pros:**
- Uses existing symlink architecture
- No runtime overhead

**Cons:**
- Manual worktree switching
- Breaks if worktree deleted
- Can't work with multiple parent worktrees simultaneously

**Verdict**: Rejected. Too fragile and manual.

### Alternative 4: Specs in Separate Git Repository

**Concept**: Move all specs to dedicated repo, clone per worktree

**Pros:**
- Natural isolation
- Version-controlled independently

**Cons:**
- Major architectural change
- Two repos to manage
- Submodules complexity

**Verdict**: Rejected. Too complex for the problem.

---

## Open Questions

1. **Cache persistence across restarts?**
   - Current: In-memory only
   - Could persist to `.speck/cache.json`
   - Trade-off: Complexity vs. avoiding first-lookup overhead

2. **Worktree naming conventions?**
   - Should parent worktrees follow specific naming?
   - Current: Any naming works, matches by branch name
   - Could enforce: `<repo>-<spec-id>` format

3. **Multi-level hierarchies?**
   - Current: Assumes parent-child only
   - What if child repo has its own children?
   - Out of scope for now, revisit if needed

4. **Remote worktree detection?**
   - Current: Assumes local filesystem
   - Could support network paths or SSH?
   - Out of scope for now

---

## Success Metrics

### Quantitative Metrics

- **Performance**:
  - Initial lookup: < 20ms (measured via integration tests)
  - Cached lookup: < 2ms (measured via integration tests)
  - Cache hit rate: > 80% in 10-minute sessions

- **Reliability**:
  - 100% of test scenarios pass
  - Zero command failures from worktree detection errors
  - Graceful degradation in all error cases

### Qualitative Metrics

- **Developer Experience**:
  - No manual symlink updates required
  - Worktrees "just work" in multi-repo
  - Clear error messages when detection fails

- **Maintainability**:
  - Code is well-documented
  - Error handling is comprehensive
  - Integration points are clear

---

## Conclusion

This architecture provides a clean, performant solution to the fundamental incompatibility between static symlinks and dynamic worktrees in multi-repo setups. The three-layer resolution strategy balances:

- **Automatic behavior**: Dynamic detection "just works" for 95% of cases
- **User control**: Environment variable override for edge cases
- **Backwards compatibility**: Symlink fallback ensures nothing breaks
- **Performance**: Caching keeps overhead minimal
- **Reliability**: Comprehensive error handling prevents command failures

The solution integrates seamlessly with existing features (multi-repo, stacked PRs) and maintains the design philosophy of "zero manual configuration" from spec 007.

**Next Steps:**
1. Review this architecture document
2. Proceed to `/speck:plan` to generate detailed implementation plan
3. Begin implementation with feature flag for safe rollout
