# Data Model: Multi-Repo Stacked PR Support

**Feature**: 009-multi-repo-stacked
**Date**: 2025-11-19
**Purpose**: Define entities, validation rules, and relationships for multi-repo stacked PR support

---

## Core Entities

### 1. Multi-Repo Branch Stack Entry

**Description**: Extends Feature 008's `BranchEntry` to support multi-repo contexts by adding parent spec tracking.

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `name` | string | Yes | Git branch name (freeform) | Non-empty, any valid git branch name |
| `specId` | string | Yes | Feature spec identifier | Matches pattern `NNN-feature-name` |
| `baseBranch` | string | Yes | Parent branch in dependency chain | Non-empty, must exist in local git repo |
| `status` | BranchStatus | Yes | Branch lifecycle state | Enum: active, submitted, merged, abandoned |
| `pr` | number \| null | No | Pull request number | Positive integer or null |
| `createdAt` | string | Yes | Creation timestamp | ISO 8601 datetime |
| `updatedAt` | string | Yes | Last modification timestamp | ISO 8601 datetime |
| `parentSpecId` | string | No | Parent spec ID (multi-repo only) | Matches pattern `NNN-feature-name`, required if in child repo context |

**Validation Rules**:
- `baseBranch` MUST exist in local git repository (no cross-repo dependencies)
- `specId` MUST reference valid spec directory in current context (root or child)
- `parentSpecId` MUST be present when repository is multi-repo child
- `parentSpecId` MUST be absent when repository is single-repo or multi-repo root
- `pr` MUST be positive integer if present
- `createdAt` MUST be <= `updatedAt`
- No circular dependencies allowed (validated via graph traversal)

**State Transitions**:
```
active → submitted (when PR created)
submitted → merged (when PR merged)
submitted → abandoned (when PR closed without merge)
active → abandoned (when branch deleted)
merged → [terminal state]
abandoned → [terminal state]
```

**Example (Child Repo)**:
```json
{
  "name": "nprbst/auth-db-layer",
  "specId": "009-multi-repo-stacked",
  "baseBranch": "main",
  "status": "active",
  "pr": 42,
  "createdAt": "2025-11-19T10:30:00Z",
  "updatedAt": "2025-11-19T14:22:00Z",
  "parentSpecId": "007-multi-repo-monorepo-support"
}
```

**Example (Root Repo)**:
```json
{
  "name": "nprbst/core-refactor",
  "specId": "008-stacked-pr-support",
  "baseBranch": "007-multi-repo-monorepo-support",
  "status": "submitted",
  "pr": 38,
  "createdAt": "2025-11-18T09:15:00Z",
  "updatedAt": "2025-11-18T16:45:00Z"
}
```

---

### 2. Multi-Repo Branch Mapping File

**Description**: Root container for branch stack metadata, stored as `.speck/branches.json` in each git repository.

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `version` | string | Yes | Schema version (semver) | Matches pattern `^\d+\.\d+\.\d+$` |
| `branches` | BranchEntry[] | Yes | Array of all stacked branches | Each entry validated against BranchEntry schema |
| `specIndex` | Record<string, string[]> | Yes | Denormalized lookup: specId → branch names | Keys match `NNN-feature-name`, values are non-empty arrays |

**Validation Rules**:
- `version` MUST be semver format (e.g., "1.1.0")
- All `branches` entries MUST pass BranchEntry validation
- `specIndex` MUST be consistent with `branches` array (no orphaned entries)
- No duplicate branch names allowed
- No circular dependencies in branch chains
- All `baseBranch` references MUST exist (either in `branches` array or as git branches)

**Schema Version Migration**:
- **v1.0.0**: Original schema from Feature 008 (no `parentSpecId` field)
- **v1.1.0**: Adds optional `parentSpecId` field for multi-repo support (backward compatible)
- Parser MUST accept both v1.0.0 and v1.1.0 files
- Writer SHOULD use v1.1.0 when creating new files

**Example (Child Repo)**:
```json
{
  "version": "1.1.0",
  "branches": [
    {
      "name": "nprbst/auth-db",
      "specId": "009-multi-repo-stacked",
      "baseBranch": "main",
      "status": "merged",
      "pr": 50,
      "createdAt": "2025-11-19T08:00:00Z",
      "updatedAt": "2025-11-19T12:00:00Z",
      "parentSpecId": "007-multi-repo-monorepo-support"
    },
    {
      "name": "nprbst/auth-api",
      "specId": "009-multi-repo-stacked",
      "baseBranch": "nprbst/auth-db",
      "status": "active",
      "pr": 51,
      "createdAt": "2025-11-19T10:00:00Z",
      "updatedAt": "2025-11-19T15:30:00Z",
      "parentSpecId": "007-multi-repo-monorepo-support"
    }
  ],
  "specIndex": {
    "009-multi-repo-stacked": ["nprbst/auth-db", "nprbst/auth-api"]
  }
}
```

---

### 3. Aggregated Branch Stack View

**Description**: Computed read-only view of branch stacks across all repositories in a multi-repo spec. Not persisted to disk.

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `rootRepo` | RepoBranchSummary | Root repository's branch stack summary |
| `childRepos` | Record<string, RepoBranchSummary> | Child repo name → branch stack summary |

**RepoBranchSummary** structure:
```typescript
interface RepoBranchSummary {
  repoPath: string;           // Absolute path to git repository
  repoName: string;           // Directory name (for display)
  specId: string | null;      // Current spec ID or null if no branches
  branchCount: number;        // Total branches
  statusCounts: {             // Count by status
    active: number;
    submitted: number;
    merged: number;
    abandoned: number;
  };
  chains: BranchChain[];      // Dependency chains
}

interface BranchChain {
  root: string;               // Root branch name
  branches: string[];         // Branch names in dependency order
}
```

**Computation Algorithm**:
1. Detect multi-repo mode via `detectSpeckRoot()`
2. Read root repository's `.speck/branches.json`
3. Discover child repositories via `.speck-link-*` symlinks
4. For each child: Read `.speck/branches.json` if exists
5. Build `RepoBranchSummary` for each repository
6. Return aggregated view

**Example (Computed View)**:
```typescript
{
  rootRepo: {
    repoPath: "/Users/dev/speck-root",
    repoName: "root",
    specId: "008-stacked-pr-support",
    branchCount: 2,
    statusCounts: { active: 2, submitted: 0, merged: 0, abandoned: 0 },
    chains: [
      { root: "main", branches: ["nprbst/refactor-core", "nprbst/refactor-tests"] }
    ]
  },
  childRepos: {
    "backend-service": {
      repoPath: "/Users/dev/backend-service",
      repoName: "backend-service",
      specId: "009-multi-repo-stacked",
      branchCount: 2,
      statusCounts: { active: 1, submitted: 0, merged: 1, abandoned: 0 },
      chains: [
        { root: "main", branches: ["nprbst/auth-db", "nprbst/auth-api"] }
      ]
    }
  }
}
```

**Usage**: `/speck.env` command when displaying multi-repo aggregate status

---

### 4. Multi-Repo Context Metadata

**Description**: Runtime environment detection for determining whether commands execute in single-repo, multi-repo root, or multi-repo child context.

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `mode` | 'single-repo' \| 'multi-repo' | Detected repository mode |
| `context` | 'single' \| 'root' \| 'child' | Command execution context |
| `speckRoot` | string | Directory containing specs/ |
| `repoRoot` | string | Git repository root (current repo) |
| `specsDir` | string | Full path to specs/ directory |
| `parentSpecId` | string \| null | Parent spec ID (only for child context) |
| `childRepoName` | string \| null | Child directory name (only for child context) |

**Context Determination Logic**:
```
if mode == 'single-repo':
  context = 'single'
else: // multi-repo
  if repoRoot == speckRoot:
    context = 'root'
  else:
    context = 'child'
```

**Validation Rules**:
- `mode` detected via symlink presence (`.speck-link` in current directory)
- `repoRoot` MUST be valid git repository (has `.git/` directory)
- `speckRoot` MUST contain `specs/` directory
- In child context: `parentSpecId` MUST be non-null and match parent spec
- In child context: `childRepoName` MUST match directory name containing child repo

**Example (Single-Repo)**:
```typescript
{
  mode: 'single-repo',
  context: 'single',
  speckRoot: '/Users/dev/my-project',
  repoRoot: '/Users/dev/my-project',
  specsDir: '/Users/dev/my-project/specs',
  parentSpecId: null,
  childRepoName: null
}
```

**Example (Multi-Repo Root)**:
```typescript
{
  mode: 'multi-repo',
  context: 'root',
  speckRoot: '/Users/dev/speck-root',
  repoRoot: '/Users/dev/speck-root',
  specsDir: '/Users/dev/speck-root/specs',
  parentSpecId: null,
  childRepoName: null
}
```

**Example (Multi-Repo Child)**:
```typescript
{
  mode: 'multi-repo',
  context: 'child',
  speckRoot: '/Users/dev/speck-root',
  repoRoot: '/Users/dev/backend-service',
  specsDir: '/Users/dev/speck-root/specs',
  parentSpecId: '007-multi-repo-monorepo-support',
  childRepoName: 'backend-service'
}
```

**Usage**: Passed to all branch management functions to determine behavior (local vs aggregate operations)

---

## Relationships

### Entity Relationship Diagram

```
┌─────────────────────────────┐
│ MultiRepoContextMetadata    │
│ (Runtime Detection)         │
└─────────────┬───────────────┘
              │ provides context to
              ▼
┌─────────────────────────────┐
│ BranchMappingFile           │       ┌──────────────────────┐
│ (.speck/branches.json)      │◄──────│ BranchEntry          │
│                             │ 1:N   │ (extends Feature 008)│
│ - version: string           │       │ + parentSpecId?      │
│ - branches: BranchEntry[]   │       └──────────────────────┘
│ - specIndex: Record<>       │
└─────────────┬───────────────┘
              │ aggregated to form
              ▼
┌─────────────────────────────┐
│ AggregatedBranchStackView   │
│ (Computed, Not Persisted)   │       ┌──────────────────────┐
│                             │◄──────│ RepoBranchSummary    │
│ - rootRepo: Summary         │ 1:1   │ (Per Repo)           │
│ - childRepos: Record<>      │ 1:N   └──────────────────────┘
└─────────────────────────────┘
```

### Key Relationships

1. **BranchEntry ↔ BranchMappingFile**: One-to-many
   - Each BranchMappingFile contains multiple BranchEntry objects
   - Enforced via `branches` array field

2. **BranchEntry ↔ Git Branch**: One-to-one
   - Each BranchEntry references exactly one git branch via `name` field
   - Git branch existence validated during creation

3. **BranchEntry ↔ Spec**: Many-to-one
   - Multiple branches can belong to same spec via `specId` field
   - Indexed via `specIndex` for fast lookups

4. **BranchEntry (Child) ↔ Spec (Parent)**: Many-to-one (multi-repo only)
   - Child repo branches reference parent spec via `parentSpecId` field
   - Used for aggregate status reporting

5. **BranchEntry ↔ BranchEntry (Dependency)**: Tree structure
   - Each branch references parent via `baseBranch` field
   - Forms directed acyclic graph (DAG) with cycle detection

6. **BranchMappingFile ↔ Git Repository**: One-to-one
   - Each git repository has at most one `.speck/branches.json` file
   - File located at repository root (`.speck/`)

7. **MultiRepoContextMetadata ↔ BranchMappingFile**: One-to-many (multi-repo)
   - Root context reads root's branches.json
   - Child context reads only local branches.json
   - Root can aggregate multiple child branches.json files

---

## Validation Rules Summary

### Cross-Entity Validation

1. **Branch Name Uniqueness**:
   - Within single repository: All branch names MUST be unique
   - Across repositories: Names CAN collide (disambiguated by repo name in display)

2. **Base Branch Existence**:
   - `baseBranch` MUST exist in one of:
     - Local git branches (verified via `git branch --list`)
     - Other entries in same `branches` array
   - Cross-repo base branches are INVALID

3. **Spec ID References**:
   - In single-repo: `specId` MUST reference spec in `specs/` directory
   - In child repo: `specId` can reference local spec or parent spec
   - `parentSpecId` (if present) MUST reference spec at speck root

4. **Circular Dependency Detection**:
   - Build dependency graph from `baseBranch` references
   - Detect cycles using depth-first search
   - Reject branch creation if cycle detected

5. **Schema Version Compatibility**:
   - Parser MUST accept v1.0.0 (no `parentSpecId`) and v1.1.0 (with `parentSpecId`)
   - Writer SHOULD use v1.1.0 for new files
   - Migration: v1.0.0 files remain valid (no upgrade required)

### Field-Level Validation

| Field | Validation Function | Error Message |
|-------|---------------------|---------------|
| `name` | Non-empty string | "Branch name cannot be empty" |
| `specId` | Regex: `^\d{3}-.+$` | "Spec ID must match pattern NNN-feature-name" |
| `baseBranch` | Exists in git or branches array | "Base branch 'X' does not exist in current repository" |
| `status` | Enum: active\|submitted\|merged\|abandoned | "Invalid status 'X'" |
| `pr` | Positive integer or null | "PR number must be positive integer" |
| `createdAt` | ISO 8601 datetime | "Invalid ISO 8601 timestamp" |
| `updatedAt` | ISO 8601 datetime, >= createdAt | "Updated timestamp must be >= created timestamp" |
| `parentSpecId` | Regex: `^\d{3}-.+$` (if present) | "Parent spec ID must match pattern NNN-feature-name" |

---

## Data Model Evolution

### Version History

**v1.0.0** (Feature 008 - Stacked PR Support):
- Initial BranchEntry schema
- Single-repo only
- No `parentSpecId` field

**v1.1.0** (Feature 009 - Multi-Repo Stacked):
- Added optional `parentSpecId` field to BranchEntry
- Backward compatible with v1.0.0
- Multi-repo context support

### Forward Compatibility

Future features MAY extend `BranchEntry` with additional optional fields:
- MUST increment schema version (MINOR for optional fields, MAJOR for breaking changes)
- MUST maintain backward compatibility with v1.0.0 and v1.1.0 parsers
- SHOULD document migration path in plan.md

---

**Data Model Complete**: 2025-11-19
