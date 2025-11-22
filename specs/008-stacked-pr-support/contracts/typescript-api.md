# TypeScript API Contract

**Feature**: 008-stacked-pr-support
**Date**: 2025-11-18

## Overview

This contract defines the TypeScript interfaces and functions for programmatic access to branch stack functionality. All CLI commands are implemented using these APIs.

---

## Type Definitions

### BranchStatus

Status enum for branch lifecycle.

```typescript
type BranchStatus = 'active' | 'submitted' | 'merged' | 'abandoned';
```

**Values**:
- `active`: Development in progress
- `submitted`: PR open for review
- `merged`: PR merged into base (terminal state)
- `abandoned`: Branch no longer needed (terminal state)

---

### BranchEntry

Represents a single branch in stack.

```typescript
interface BranchEntry {
  /** Branch name in git (freeform format) */
  name: string;

  /** Spec identifier (format: NNN-feature-name) */
  specId: string;

  /** Parent branch in dependency chain */
  baseBranch: string;

  /** Current lifecycle status */
  status: BranchStatus;

  /** Pull request number (optional) */
  pr?: number;

  /** Creation timestamp (ISO 8601) */
  createdAt: string;

  /** Last modification timestamp (ISO 8601) */
  updatedAt: string;
}
```

**Validation Rules** (enforced by Zod schema):
- `name`: non-empty string, valid git ref format
- `specId`: non-empty string, format `NNN-feature-name`
- `baseBranch`: non-empty string
- `status`: must be valid BranchStatus enum value
- `pr`: positive integer if present
- `createdAt`, `updatedAt`: valid ISO 8601 timestamp strings

---

### BranchMapping

Root container for branch stack metadata.

```typescript
interface BranchMapping {
  /** Schema version (semantic versioning) */
  version: string;

  /** All stacked branches in repository */
  branches: BranchEntry[];

  /** Denormalized index: specId → branch names */
  specIndex: Record<string, string[]>;
}
```

**Invariants**:
1. `version` must match current schema version (`"1.0.0"`)
2. Every branch in `branches` must appear in `specIndex[branch.specId]`
3. Every branch name in `specIndex` must exist in `branches` array
4. No duplicate branch names in `branches` array

---

### BranchChain

Computed dependency chain for visualization.

```typescript
interface BranchChain {
  /** Branch names in dependency order (root to leaf) */
  branches: string[];
}
```

**Example**:
```typescript
{
  branches: ['main', 'username/db-layer', 'username/api']
}
```

---

### BranchStack

Computed view of all chains for a spec.

```typescript
interface BranchStack {
  /** Spec identifier */
  specId: string;

  /** All dependency chains for this spec */
  chains: BranchChain[];
}
```

---

### BranchStatusReport

Health check result for branch stack.

```typescript
interface BranchStatusReport {
  /** Branch name */
  branchName: string;

  /** Current status from metadata */
  status: BranchStatus;

  /** Issues detected */
  warnings: BranchWarning[];

  /** Suggested actions */
  recommendations: string[];
}

type BranchWarning =
  | { type: 'merged-mismatch'; message: string }
  | { type: 'rebase-needed'; baseBranch: string; message: string }
  | { type: 'stale'; daysSinceUpdate: number; message: string }
  | { type: 'orphaned'; message: string };
```

---

### CreateBranchOptions

Options for creating a new stacked branch.

```typescript
interface CreateBranchOptions {
  /** Branch name (freeform) */
  name: string;

  /** Base branch (parent in dependency chain) */
  baseBranch: string;

  /** Spec ID to link branch to */
  specId: string;

  /** Whether to checkout new branch after creation */
  checkout?: boolean;
}
```

---

### UpdateBranchOptions

Options for updating branch metadata.

```typescript
interface UpdateBranchOptions {
  /** Branch name to update */
  name: string;

  /** New status (optional) */
  status?: BranchStatus;

  /** PR number (optional) */
  pr?: number;

  /** New base branch (optional, for rebasing) */
  baseBranch?: string;
}
```

---

## Core Service: BranchManager

Primary service for branch stack operations.

### Constructor

```typescript
class BranchManager {
  constructor(private readonly repoRoot: string) {}
}
```

**Parameters**:
- `repoRoot`: Absolute path to repository root (where `.speck/` directory lives)

---

### isStackedMode

Check if stacked PR mode is enabled.

```typescript
isStackedMode(): boolean
```

**Returns**: `true` if `.speck/branches.json` exists, `false` otherwise

**Usage**:
```typescript
const manager = new BranchManager('/path/to/repo');
if (manager.isStackedMode()) {
  // Use stacked PR features
} else {
  // Use traditional single-branch workflow
}
```

---

### create

Create a new stacked branch.

```typescript
async create(options: CreateBranchOptions): Promise<BranchEntry>
```

**Parameters**: `CreateBranchOptions` object

**Returns**: Created `BranchEntry`

**Throws**:
- `ValidationError`: Invalid branch name, base doesn't exist, circular dependency
- `FileSystemError`: Cannot write branches.json
- `GitError`: Git branch creation failed

**Behavior**:
1. Validate branch name via `git check-ref-format`
2. Validate base branch exists via `git rev-parse --verify`
3. Load branches.json (create if doesn't exist)
4. Check for circular dependencies (DFS)
5. Create BranchEntry with current timestamps
6. Add to branches array and specIndex
7. Save branches.json atomically
8. Create git branch: `git branch <name> <base>`
9. Optionally checkout: `git checkout <name>`

**Example**:
```typescript
const entry = await manager.create({
  name: 'username/feature',
  baseBranch: 'main',
  specId: '008-stacked-pr-support',
  checkout: true
});
console.log(`Created branch: ${entry.name}`);
```

---

### list

Get all branches for a spec or entire repository.

```typescript
list(specId?: string): BranchEntry[]
```

**Parameters**:
- `specId` (optional): Filter by spec ID. If omitted, returns all branches.

**Returns**: Array of `BranchEntry` objects

**Throws**:
- `StackedModeError`: Stacked mode not enabled (branches.json doesn't exist)
- `FileSystemError`: Cannot read branches.json

**Example**:
```typescript
// Get all branches for current spec
const branches = manager.list('008-stacked-pr-support');

// Get all branches in repository
const allBranches = manager.list();
```

---

### getStack

Compute dependency chains for a spec.

```typescript
getStack(specId: string): BranchStack
```

**Parameters**:
- `specId`: Spec identifier

**Returns**: `BranchStack` with computed chains

**Algorithm**:
1. Get all branches for spec via specIndex
2. Build adjacency list (baseBranch → children)
3. Find root branches (based on main/master)
4. For each root, DFS to build chain
5. Sort chains by depth (shortest to longest)

**Example**:
```typescript
const stack = manager.getStack('007-multi-repo');
for (const chain of stack.chains) {
  console.log('Chain:', chain.branches.join(' → '));
}
// Output: "main → username/db-layer → username/api"
```

---

### getStatus

Check health of branch stack.

```typescript
async getStatus(specId?: string): Promise<BranchStatusReport[]>
```

**Parameters**:
- `specId` (optional): Filter by spec ID

**Returns**: Array of `BranchStatusReport` objects

**Checks Performed**:
1. **Merged mismatch**: Git shows merged but status is `active`/`submitted`
2. **Rebase needed**: Base branch merged, current branch needs rebasing
3. **Stale branch**: `updatedAt` > 30 days old
4. **Orphaned branch**: Base branch doesn't exist in git

**Example**:
```typescript
const reports = await manager.getStatus('007-multi-repo');
for (const report of reports) {
  if (report.warnings.length > 0) {
    console.log(`${report.branchName}: ${report.warnings.length} warnings`);
    for (const rec of report.recommendations) {
      console.log(`  → ${rec}`);
    }
  }
}
```

---

### update

Update branch metadata.

```typescript
async update(options: UpdateBranchOptions): Promise<BranchEntry>
```

**Parameters**: `UpdateBranchOptions` object

**Returns**: Updated `BranchEntry`

**Throws**:
- `ValidationError`: Invalid status, terminal state transition, submitted without PR
- `NotFoundError`: Branch doesn't exist
- `FileSystemError`: Cannot write branches.json

**Validation**:
- Cannot transition from `merged` or `abandoned` (terminal states)
- Status `submitted` requires `pr` to be set
- New `baseBranch` must not create cycles

**Example**:
```typescript
await manager.update({
  name: 'username/db-layer',
  status: 'submitted',
  pr: 42
});
```

---

### import

Import existing git branches into branches.json.

```typescript
async import(options: ImportBranchOptions): Promise<BranchEntry[]>
```

**Parameters**:
```typescript
interface ImportBranchOptions {
  /** Glob pattern to filter branches (optional) */
  pattern?: string;

  /** Interactive prompt for spec mapping (default: true) */
  interactive?: boolean;

  /** Auto-detect spec from branch name (default: false) */
  autoDetectSpec?: boolean;
}
```

**Returns**: Array of imported `BranchEntry` objects

**Behavior**:
1. List git branches: `git branch --list [pattern]`
2. Parse upstream to infer base branches
3. For each branch:
   - If interactive: prompt user for spec mapping
   - If autoDetectSpec: extract from branch name (e.g., `008-feature` → `008-feature`)
   - Otherwise: skip
4. Validate no cycles created
5. Add to branches.json

**Example**:
```typescript
// Interactive import
const imported = await manager.import({
  pattern: 'username/*',
  interactive: true
});
console.log(`Imported ${imported.length} branches`);
```

---

### delete

Remove branch from metadata.

```typescript
delete(name: string, force?: boolean): void
```

**Parameters**:
- `name`: Branch name to remove
- `force` (optional): Delete even if has children (default: false)

**Throws**:
- `NotFoundError`: Branch doesn't exist
- `ValidationError`: Has children without force flag

**Behavior**:
1. Find branch by name
2. Check if has children (other branches with baseBranch = name)
3. If children and not force: error
4. Remove from branches array
5. Remove from specIndex
6. Save branches.json

**Note**: Does NOT delete git branch (user must do that manually)

**Example**:
```typescript
manager.delete('username/old-feature');
// Git branch still exists - user must run: git branch -D username/old-feature
```

---

## Validation Functions

### validateBranchName

Validate branch name using git.

```typescript
async function validateBranchName(name: string): Promise<boolean>
```

**Implementation**:
```typescript
const result = await $`git check-ref-format --branch ${name}`.quiet();
return result.exitCode === 0;
```

---

### detectCycle

Detect circular dependencies in branch graph.

```typescript
function detectCycle(
  branchName: string,
  baseBranch: string,
  branches: BranchEntry[]
): boolean
```

**Algorithm**: DFS with recursion stack (see research.md R2)

**Returns**: `true` if adding edge `branchName → baseBranch` creates cycle

---

### validateStatusTransition

Validate status transition is allowed.

```typescript
function validateStatusTransition(
  currentStatus: BranchStatus,
  newStatus: BranchStatus
): boolean
```

**Rules**:
- Terminal states (`merged`, `abandoned`) cannot transition to any other state
- All other transitions allowed

---

## File Operations

### loadBranchMapping

Load and validate branches.json.

```typescript
function loadBranchMapping(repoRoot: string): BranchMapping
```

**Behavior**:
1. Read `.speck/branches.json`
2. Parse JSON
3. Validate with Zod schema
4. Attempt auto-repair if validation fails (see research.md R8)
5. Return validated data

**Throws**:
- `FileNotFoundError`: branches.json doesn't exist
- `ValidationError`: Cannot parse or repair
- `FileSystemError`: Cannot read file

---

### saveBranchMapping

Save branches.json atomically.

```typescript
function saveBranchMapping(
  repoRoot: string,
  mapping: BranchMapping
): void
```

**Behavior**:
1. Validate mapping with Zod schema
2. Serialize to JSON (pretty-printed, 2-space indent)
3. Write to temp file: `.speck/branches.json.tmp`
4. Atomic rename: `mv .speck/branches.json.tmp .speck/branches.json`

**Atomic Write Pattern** (prevents corruption):
```typescript
const tmpPath = path.join(repoRoot, '.speck', 'branches.json.tmp');
const finalPath = path.join(repoRoot, '.speck', 'branches.json');

await Bun.write(tmpPath, JSON.stringify(mapping, null, 2));
await $`mv ${tmpPath} ${finalPath}`.quiet();
```

---

### rebuildSpecIndex

Rebuild specIndex from branches array.

```typescript
function rebuildSpecIndex(branches: BranchEntry[]): Record<string, string[]>
```

**Algorithm**:
```typescript
const index: Record<string, string[]> = {};
for (const branch of branches) {
  if (!index[branch.specId]) {
    index[branch.specId] = [];
  }
  index[branch.specId].push(branch.name);
}
return index;
```

**Usage**: Called after every modification to branches array to ensure referential integrity

---

## Git Operations

### createGitBranch

Create git branch with validation.

```typescript
async function createGitBranch(
  name: string,
  base: string
): Promise<void>
```

**Implementation** (see research.md R6):
```typescript
// 1. Validate base exists
const baseExists = await $`git rev-parse --verify ${base}`.quiet();
if (baseExists.exitCode !== 0) {
  throw new GitError(`Base branch '${base}' does not exist`);
}

// 2. Create branch
const result = await $`git branch ${name} ${base}`.quiet();
if (result.exitCode !== 0) {
  throw new GitError(`Failed to create branch: ${result.stderr}`);
}
```

---

### checkBranchMerged

Check if branch merged into base.

```typescript
async function checkBranchMerged(
  branch: string,
  base: string
): Promise<boolean>
```

**Implementation**:
```typescript
const result = await $`git branch --merged ${base}`.quiet();
const merged = result.stdout.toString().split('\n').map(s => s.trim());
return merged.includes(branch);
```

---

### listGitBranches

List all git branches with upstream info.

```typescript
async function listGitBranches(
  pattern?: string
): Promise<GitBranchInfo[]>

interface GitBranchInfo {
  name: string;
  upstream?: string;
}
```

**Implementation**:
```typescript
const args = pattern ? `--list ${pattern}` : '';
const result = await $`git branch ${args} --format='%(refname:short) %(upstream:short)'`.quiet();

return result.stdout.toString()
  .split('\n')
  .filter(line => line.trim())
  .map(line => {
    const [name, upstream] = line.split(' ');
    return { name, upstream: upstream || undefined };
  });
```

---

## Error Classes

### StackedModeError

Thrown when stacked mode operation attempted but branches.json doesn't exist.

```typescript
class StackedModeError extends Error {
  constructor() {
    super('Stacked mode not enabled. Run /speck.branch create to start using stacked PRs.');
  }
}
```

---

### ValidationError

Thrown when validation fails (invalid input, constraint violation).

```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message);
  }
}
```

---

### GitError

Thrown when git operation fails.

```typescript
class GitError extends Error {
  constructor(
    message: string,
    public readonly command?: string,
    public readonly exitCode?: number
  ) {
    super(message);
  }
}
```

---

## Zod Schemas

### BranchEntrySchema

```typescript
const BranchStatusSchema = z.enum(['active', 'submitted', 'merged', 'abandoned']);

const BranchEntrySchema = z.object({
  name: z.string().min(1),
  specId: z.string().regex(/^\d{3}-[a-z0-9-]+$/),
  baseBranch: z.string().min(1),
  status: BranchStatusSchema,
  pr: z.number().int().positive().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
```

---

### BranchMappingSchema

```typescript
const BranchMappingSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  branches: z.array(BranchEntrySchema),
  specIndex: z.record(z.string(), z.array(z.string()))
}).refine(
  (data) => {
    // Validate referential integrity
    for (const branch of data.branches) {
      const indexed = data.specIndex[branch.specId] || [];
      if (!indexed.includes(branch.name)) {
        return false;
      }
    }
    return true;
  },
  { message: 'specIndex must reference all branches' }
);
```

---

## Usage Examples

### Example 1: Create Stacked Branch

```typescript
import { BranchManager } from './services/branch-manager';

const manager = new BranchManager(process.cwd());

// Create first branch in stack
const firstBranch = await manager.create({
  name: 'username/db-layer',
  baseBranch: 'main',
  specId: '007-multi-repo',
  checkout: true
});

// Create second branch building on first
const secondBranch = await manager.create({
  name: 'username/api-endpoints',
  baseBranch: 'username/db-layer',
  specId: '007-multi-repo',
  checkout: true
});
```

---

### Example 2: Check Stack Health

```typescript
const reports = await manager.getStatus('007-multi-repo');

for (const report of reports) {
  console.log(`${report.branchName} (${report.status})`);

  for (const warning of report.warnings) {
    console.log(`  ⚠ ${warning.message}`);
  }

  for (const rec of report.recommendations) {
    console.log(`  → ${rec}`);
  }
}
```

---

### Example 3: Import Existing Branches

```typescript
const imported = await manager.import({
  pattern: 'username/*',
  interactive: true
});

console.log(`Imported ${imported.length} branches`);
```

---

## Summary

### Core Classes
- `BranchManager`: Main service for all operations

### Key Interfaces
- `BranchEntry`: Single branch metadata
- `BranchMapping`: File format
- `BranchStack`: Computed dependency view
- `BranchStatusReport`: Health check result

### Operations
- Create, list, update, delete branches
- Import existing branches
- Compute dependency chains
- Health checks

### Design Principles
- Immutable file updates (atomic writes)
- Validation at boundaries (Zod schemas)
- Clear error types (StackedModeError, ValidationError, GitError)
- Lazy loading with in-memory cache
- Tool-agnostic (no external APIs)
