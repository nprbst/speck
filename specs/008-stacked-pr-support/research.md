# Research: Stacked PR Support

**Feature**: 008-stacked-pr-support
**Date**: 2025-11-18
**Status**: Complete

## Research Questions

This document captures technical research and design decisions made during the planning phase. Each section addresses a specific unknown or design pattern that required investigation.

---

## R1: Branch Stack Metadata Schema Design

### Decision
Use centralized `.speck/branches.json` file at repository root with the following schema:

```json
{
  "version": "1.0.0",
  "branches": [
    {
      "name": "username/feature-name",
      "specId": "008-stacked-pr-support",
      "baseBranch": "main",
      "status": "active",
      "pr": 123,
      "createdAt": "2025-11-18T10:00:00Z",
      "updatedAt": "2025-11-18T15:30:00Z"
    }
  ],
  "specIndex": {
    "008-stacked-pr-support": ["username/feature-name", "username/api-layer"]
  }
}
```

### Rationale
- **Centralized file**: Single source of truth for branch-to-spec mapping enables fast lookups (SC-003: <100ms for 100 branches)
- **Schema version**: Enables future compatibility and safe migrations (FR-012)
- **specIndex**: Denormalized lookup table optimizes "find all branches for spec" queries (used by `/speck.branch list`)
- **status field**: Tracks branch lifecycle (active → submitted → merged → abandoned) without external API calls
- **Optional pr field**: Supports tool-agnostic workflow - PR number can be added manually or via integration
- **Timestamps**: Enable "last modified" queries and stale branch detection

### Alternatives Considered
1. **Per-spec metadata files** (`specs/008-stacked-pr-support/branches.json`): Rejected because cross-spec queries (e.g., "show all stacked branches in repo") would require filesystem traversal. Violates SC-003 performance constraint.
2. **Git notes**: Rejected because git notes are poorly supported across tools, not easily queryable, and would break tool-agnostic principle (FR-011).
3. **Branch name encoding** (e.g., `008-stacked-pr-support__username__feature-name`): Rejected because it constrains naming flexibility (violates FR-002 freeform naming requirement).

### Implementation Notes
- Use Zod schema for validation (already in dependencies: `package.json:41`)
- Atomic file writes to prevent corruption (Bun Shell API `Bun.write` with temp file + rename)
- Index updates synchronized with branch array modifications (referential integrity)

---

## R2: Branch Dependency Validation Algorithm

### Decision
Implement cycle detection using depth-first search (DFS) with visited set. Validate on every branch creation/update.

**Algorithm**:
```typescript
function detectCycle(branchName: string, branches: BranchEntry[]): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(current: string): boolean {
    if (recursionStack.has(current)) return true; // Cycle detected
    if (visited.has(current)) return false;

    visited.add(current);
    recursionStack.add(current);

    const branch = branches.find(b => b.name === current);
    if (branch && branch.baseBranch) {
      if (dfs(branch.baseBranch)) return true;
    }

    recursionStack.delete(current);
    return false;
  }

  return dfs(branchName);
}
```

### Rationale
- **DFS with recursion stack**: Standard graph cycle detection, O(V+E) complexity
- **Fail-fast validation**: Prevents invalid states from being persisted (FR-010)
- **Edge case handling**: Algorithm handles both simple cycles (A → B → A) and transitive cycles (A → B → C → A)

### Alternatives Considered
1. **Topological sort**: More expensive (O(V+E) with additional overhead), provides ordering we don't need
2. **Union-Find**: Efficient for undirected graphs, but branch dependencies are directed (parent → child)
3. **Lazy validation**: Rejected because it allows temporarily invalid states, complicating error recovery

### Implementation Notes
- Validate on `/speck.branch create` before writing to branches.json
- Validate base branch exists in git (use `git rev-parse --verify <base>`)
- Return clear error message: "Circular dependency detected: A → B → C → A"

---

## R3: Backwards Compatibility Strategy

### Decision
Use **optional presence detection** pattern: Check for `.speck/branches.json` existence before enabling stacked PR features.

**Implementation Pattern**:
```typescript
function isStackedMode(): boolean {
  return fs.existsSync('.speck/branches.json');
}

function getBranchesForSpec(specId: string): string[] {
  if (!isStackedMode()) {
    // Traditional mode: infer branch name from spec ID
    return [`${specId}`]; // e.g., "008-stacked-pr-support"
  }
  // Stacked mode: read from branches.json
  return branchMapping.specIndex[specId] || [];
}
```

### Rationale
- **Zero configuration**: Developers using single-branch workflow never interact with stacked PR features (SC-001)
- **Explicit opt-in**: Creating first stacked branch via `/speck.branch create` generates branches.json file
- **No behavior changes**: Existing commands (`/speck.tasks`, `/speck.env`) check for file presence before branching logic
- **Graceful degradation**: If branches.json is deleted, system reverts to single-branch behavior

### Alternatives Considered
1. **Configuration flag** (`.speck/config.json` with `stackedMode: true`): Rejected because it requires explicit configuration step, increasing friction (violates US2 "frictionless" requirement).
2. **Branch naming convention detection** (if branch doesn't match `NNN-feature-name`): Rejected because it breaks freeform naming (FR-002) and creates ambiguity.
3. **Always require branches.json**: Rejected because it breaks existing workflows (violates SC-001 backwards compatibility).

### Implementation Notes
- File presence check must be fast (<1ms) - use `fs.existsSync` not `fs.access`
- Commands display helpful message when stacked mode detected: "Branch stack mode: enabled"
- Graceful error handling if branches.json is malformed (FR-014)

---

## R4: Branch-Aware Task Generation Architecture

### Decision
Extend `/speck.tasks` command with optional `--branch` and `--stories` flags. Task filtering happens at generation time, not post-processing.

**Command Interface**:
```bash
/speck.tasks                              # Generate all tasks (backwards compatible)
/speck.tasks --branch username/db-layer --stories US1
/speck.tasks --branch username/api --stories US2,US3
```

**Implementation Flow**:
1. Parse `--branch` flag → lookup specId from branches.json
2. Parse `--stories` flag → filter user stories from spec.md
3. Pass filtered stories to existing task generation logic
4. Output: `tasks.md` (or `tasks-{branch}.md` if branch-specific)

### Rationale
- **Backwards compatible**: No flags = existing behavior (generate all tasks)
- **Early filtering**: Filter at user story level (not task level) for cleaner output
- **Single source of truth**: Tasks still generated from spec.md, branches.json only provides context
- **Performance**: Filtering during generation (not post-processing) avoids redundant work

### Alternatives Considered
1. **Post-generation filtering**: Generate full tasks.md, then filter. Rejected because it wastes computation and complicates task numbering.
2. **Separate tasks-{branch}.md files per branch**: Rejected because it fragments task tracking and violates single source of truth principle.
3. **Branch-specific spec.md files**: Rejected because it violates file format compatibility (Principle VII).

### Implementation Notes
- Use existing Handlebars template system (`.specify/templates/tasks-template.md`)
- Add `--branch` and `--stories` context to template rendering
- Validate user story IDs exist in spec.md before filtering
- Display warning if `--branch` used without branches.json present

---

## R5: Tool Integration Strategy (Graphite, GitHub CLI)

### Decision
**Zero integration approach**: Speck provides `/speck.branch import` command to read existing git branch relationships, but does not actively integrate with external tools.

**Import Algorithm**:
1. List all branches: `git branch --list --format='%(refname:short) %(upstream:short)'`
2. Parse upstream relationships to infer base branches
3. Prompt user to map branches to specs (CLI interactive prompt)
4. Generate branches.json from user input + git data

### Rationale
- **Tool-agnostic**: Works with Graphite (`gt`), GitHub CLI (`gh`), Sapling (`sl`), or manual git workflows
- **No API dependencies**: Speck doesn't call GitHub API, Graphite API, etc. (maintains FR-011)
- **User control**: Developer explicitly maps branches to specs, avoiding incorrect auto-detection
- **Low maintenance**: No need to track external tool changes or API versions

### Alternatives Considered
1. **Graphite API integration**: Rejected because it creates vendor lock-in and breaks tool-agnostic principle.
2. **GitHub API polling**: Rejected because it requires authentication, network calls, and breaks offline workflows.
3. **Automatic spec detection from branch name**: Rejected because freeform naming (FR-002) makes this unreliable.

### Implementation Notes
- Use `prompts` library (already in dependencies: `package.json:40`) for interactive mapping
- Support batch import: `git branch --list 'username/*'` to filter by pattern
- Validate imported branches don't create cycles (reuse R2 algorithm)

---

## R6: Git Operations Best Practices

### Decision
Use **Bun Shell API** for all git operations with proper error handling and validation.

**Pattern**:
```typescript
import { $ } from 'bun';

async function createBranch(name: string, base: string): Promise<void> {
  // 1. Validate base exists
  const baseExists = await $`git rev-parse --verify ${base}`.quiet();
  if (baseExists.exitCode !== 0) {
    throw new Error(`Base branch '${base}' does not exist`);
  }

  // 2. Create branch
  const result = await $`git branch ${name} ${base}`.quiet();
  if (result.exitCode !== 0) {
    throw new Error(`Failed to create branch: ${result.stderr}`);
  }

  // 3. Checkout (optional)
  await $`git checkout ${name}`.quiet();
}
```

### Rationale
- **Bun Shell API**: Already used in codebase (CLAUDE.md:18), provides TypeScript-native shell execution
- **Validation first**: Check base branch exists before attempting creation (prevents partial state)
- **Error handling**: Capture stderr and provide clear error messages
- **Quiet mode**: Suppress git output unless error occurs

### Alternatives Considered
1. **Node.js `child_process`**: Rejected because Bun Shell API is more ergonomic and consistent with existing codebase.
2. **Git library (isomorphic-git, simple-git)**: Rejected because it adds dependency weight and Speck already uses git CLI elsewhere.
3. **Direct libgit2 bindings**: Rejected because it complicates cross-platform compatibility.

### Implementation Notes
- Use `.quiet()` to suppress stdout, check `exitCode` for success
- Sanitize branch names to prevent command injection (whitelist: `[a-zA-Z0-9-_/.]`)
- Always run git commands from repository root (resolve with existing path utils)

---

## R7: Branch Status Detection Without API Calls

### Decision
Use **git metadata + manual status updates** hybrid approach.

**Status Detection**:
1. **Merged detection**: `git branch --merged` shows branches merged into current branch
2. **PR status**: Manual update via `/speck.branch update <name> --status submitted --pr 123`
3. **Stale detection**: Compare `updatedAt` timestamp with threshold (e.g., 30 days)

**Status Lifecycle**:
- `active`: Branch exists, not submitted
- `submitted`: PR opened (manual update or import)
- `merged`: Detected via `git branch --merged` or manual update
- `abandoned`: Manual update when branch no longer needed

### Rationale
- **No API dependencies**: Works offline, no authentication required (FR-011)
- **Accurate merge detection**: Git knows merge state from refs, reliable
- **User flexibility**: Developer updates PR status when convenient (not forced to poll)
- **Performance**: `git branch --merged` is fast, runs in <100ms even with 100 branches

### Alternatives Considered
1. **GitHub API polling**: Rejected because it requires network, auth, and breaks offline workflows.
2. **Git commit messages parsing**: Unreliable, depends on PR merge strategy (squash vs merge commit).
3. **Fully manual status**: Rejected because merge detection is trivial via git and reduces user burden.

### Implementation Notes
- Run `git branch --merged <base>` to check if branch merged into base
- Cache merged status in memory for `/speck.branch status` command (invalidate on file change)
- Display warning if branch is merged but status is still `active` or `submitted`

---

## R8: Error Recovery for Malformed branches.json

### Decision
**Graceful degradation with auto-repair** for common issues, **error + recovery instructions** for complex corruption.

**Auto-Repair Cases**:
1. Missing `specIndex`: Rebuild from `branches` array
2. Invalid timestamps: Replace with current time + log warning
3. Orphaned index entries: Remove entries with no corresponding branch

**Error Cases** (requires manual intervention):
1. Invalid JSON syntax: Display error + suggest restore from git history
2. Schema version mismatch: Display migration instructions
3. Missing required fields (`name`, `specId`, `baseBranch`): Display error + affected branches

**Implementation**:
```typescript
function validateAndRepair(data: unknown): BranchMapping {
  const result = BranchMappingSchema.safeParse(data);

  if (!result.success) {
    // Attempt auto-repair
    const repaired = attemptRepair(data);
    if (repaired) {
      logger.warn('Auto-repaired branches.json - review changes');
      return repaired;
    }

    // Cannot repair - provide recovery instructions
    throw new Error('Corrupted branches.json - restore from git history:\n' +
                    'git show HEAD:.speck/branches.json > .speck/branches.json');
  }

  return result.data;
}
```

### Rationale
- **User experience**: Auto-repair for simple issues reduces friction (FR-014)
- **Safety**: Require manual intervention for complex corruption to prevent data loss
- **Debuggability**: Log repair actions for transparency
- **Recovery path**: Git history provides backup for file-based corruption

### Alternatives Considered
1. **Always error on invalid file**: Rejected because minor issues (missing index) are easily fixable.
2. **Silent auto-repair**: Rejected because silent changes erode user trust.
3. **Backup before repair**: Considered but rejected due to added complexity (git history is sufficient backup).

### Implementation Notes
- Use Zod `.safeParse()` for validation (returns success/failure, doesn't throw)
- Log repair actions to stdout with `[WARN]` prefix
- Include git command in error messages for copy-paste convenience

---

## R9: Performance Optimization for Branch Lookups

### Decision
Use **in-memory index with lazy loading** pattern for branch-to-spec lookups.

**Implementation**:
```typescript
class BranchManager {
  private cache: BranchMapping | null = null;

  private load(): BranchMapping {
    if (!this.cache) {
      const raw = fs.readFileSync('.speck/branches.json', 'utf-8');
      this.cache = JSON.parse(raw);
    }
    return this.cache;
  }

  getBranchesForSpec(specId: string): string[] {
    const mapping = this.load();
    return mapping.specIndex[specId] || [];
  }

  invalidateCache(): void {
    this.cache = null;
  }
}
```

### Rationale
- **Performance**: Single file read per command invocation, O(1) lookup via index (SC-003: <100ms)
- **Simplicity**: No complex caching logic, cache lifetime = command lifetime
- **Correctness**: Cache invalidated after write operations (no stale data)

### Alternatives Considered
1. **No caching**: Rejected because repeated file reads add 5-10ms per lookup (fails SC-003 at scale).
2. **Persistent cache** (separate cache file): Rejected because it adds complexity and staleness risks.
3. **Database** (SQLite): Rejected because it violates file-based principle and adds dependency.

### Implementation Notes
- Cache scoped to command execution (singleton pattern within CLI context)
- Invalidate after write operations: `create`, `update`, `delete`
- For slash commands (Claude Code), cache persists within single command execution

---

## R10: Freeform Branch Naming Validation

### Decision
**Minimal validation**: Allow any valid git branch name, no enforcement of `NNN-feature-name` pattern for stacked branches.

**Validation Rules**:
1. Must be valid git ref name (use `git check-ref-format --branch <name>`)
2. Must not conflict with existing branch (checked by git on creation)
3. Must not contain `..` (git security restriction)

**No enforcement**:
- ❌ Username prefix (e.g., `username/`)
- ❌ Ticket ID prefix (e.g., `JIRA-123-`)
- ❌ Traditional `NNN-feature-name` pattern
- ❌ Length limits (beyond git's 255 char limit)

### Rationale
- **Team flexibility**: Different teams have different naming conventions (FR-002)
- **Tool compatibility**: Graphite, GitHub, etc. have their own naming patterns
- **Git enforcement**: Git already prevents invalid ref names, no need to duplicate
- **Backwards compatible**: Traditional branches can still use `NNN-feature-name`, stacked branches can use anything

### Alternatives Considered
1. **Enforce naming convention**: Rejected because it violates FR-002 freeform naming requirement.
2. **Convention detection + warning**: Considered but rejected because warnings create noise without value.
3. **Configurable naming policy**: Rejected because it adds complexity and most teams already have git hooks for this.

### Implementation Notes
- Use `git check-ref-format --branch <name>` to validate before branch creation
- Trust git to prevent conflicts (Speck doesn't need to duplicate this check)
- Document recommended patterns in quickstart.md, but don't enforce

---

## Summary

All technical unknowns have been resolved. Key decisions:
1. **Metadata schema**: Centralized `.speck/branches.json` with schema version and denormalized index
2. **Validation**: DFS cycle detection, git ref format validation
3. **Backwards compatibility**: Optional file presence detection pattern
4. **Task filtering**: Generation-time filtering with `--branch` and `--stories` flags
5. **Tool integration**: Zero integration + import command for existing stacks
6. **Git operations**: Bun Shell API with validation-first pattern
7. **Status detection**: Git metadata + manual updates (no API calls)
8. **Error recovery**: Auto-repair simple issues, error + instructions for complex cases
9. **Performance**: In-memory index with lazy loading
10. **Naming**: Minimal validation, trust git enforcement

No blocking issues identified. Ready to proceed to Phase 1 (Design & Contracts).
