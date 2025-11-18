# Data Model: Stacked PR Support

**Feature**: 008-stacked-pr-support
**Date**: 2025-11-18
**Status**: Complete

## Overview

This document defines the data entities and their relationships for the stacked PR support feature. All entities are stored in `.speck/branches.json` at the repository root.

---

## Entity Definitions

### BranchEntry

Represents a single branch in a stacked PR workflow.

**Fields**:
- `name` (string, required): Branch name in git (e.g., "username/feature-name", "JIRA-123-api", "008-stacked-pr-support")
  - Must be valid git ref name (validated via `git check-ref-format`)
  - Freeform naming - no pattern enforcement
- `specId` (string, required): Spec identifier linking to `specs/<specId>/`
  - Format: `NNN-feature-name` (e.g., "008-stacked-pr-support")
  - Must reference existing spec directory
- `baseBranch` (string, required): Parent branch in dependency chain
  - Can be main/master branch or another stacked branch
  - Must exist in git when branch is created
  - Cannot create circular dependencies
- `status` (enum, required): Branch lifecycle state
  - `"active"`: Branch exists, development in progress
  - `"submitted"`: PR opened for review
  - `"merged"`: PR merged into base branch
  - `"abandoned"`: Branch no longer needed
- `pr` (integer, optional): Pull request number
  - Set manually via `/speck.branch update` command
  - No automatic GitHub API integration
- `createdAt` (ISO 8601 timestamp, required): Branch creation time
  - Generated automatically on `/speck.branch create`
- `updatedAt` (ISO 8601 timestamp, required): Last modification time
  - Updated on status changes, PR assignment, etc.

**Relationships**:
- One branch → one spec (many branches can reference same spec)
- One branch → one base branch (parent in dependency chain)
- Base branch can be → another stacked branch OR main/master branch

**Validation Rules**:
1. `name` must be unique within repository
2. `specId` must reference existing `specs/<specId>/` directory
3. `baseBranch` must exist in git (`git rev-parse --verify <base>`)
4. Dependency chain must not contain cycles (DFS validation)
5. `status` must be one of the four valid enum values
6. `pr` must be positive integer if present
7. `createdAt` and `updatedAt` must be valid ISO 8601 timestamps

**Example**:
```json
{
  "name": "nprbst/db-layer",
  "specId": "007-multi-repo",
  "baseBranch": "main",
  "status": "active",
  "pr": null,
  "createdAt": "2025-11-18T10:00:00Z",
  "updatedAt": "2025-11-18T10:00:00Z"
}
```

---

### BranchMapping

Root container for all branch stack metadata. Stored at `.speck/branches.json`.

**Fields**:
- `version` (string, required): Schema version for future compatibility
  - Current version: `"1.0.0"`
  - Follows semantic versioning (MAJOR.MINOR.PATCH)
  - Breaking changes increment MAJOR version
- `branches` (array of BranchEntry, required): All stacked branches in repository
  - Can be empty array (valid for newly initialized files)
  - Order does not matter (not a dependency chain representation)
- `specIndex` (object, required): Denormalized lookup table
  - Keys: spec IDs (e.g., "008-stacked-pr-support")
  - Values: arrays of branch names (e.g., ["nprbst/db-layer", "nprbst/api"])
  - Must stay synchronized with `branches` array (referential integrity)

**Relationships**:
- One repository → one BranchMapping file (`.speck/branches.json`)
- One BranchMapping → many BranchEntry objects
- One spec → many branches (via `specIndex`)

**Invariants**:
1. Every branch in `branches` array must have corresponding entry in `specIndex[branch.specId]`
2. Every branch name in `specIndex` must exist in `branches` array
3. No duplicate branch names in `branches` array
4. No duplicate branch names within any `specIndex[specId]` array
5. File must be valid JSON (graceful error recovery with auto-repair for minor issues)

**Example**:
```json
{
  "version": "1.0.0",
  "branches": [
    {
      "name": "nprbst/db-layer",
      "specId": "007-multi-repo",
      "baseBranch": "main",
      "status": "submitted",
      "pr": 42,
      "createdAt": "2025-11-18T10:00:00Z",
      "updatedAt": "2025-11-18T15:30:00Z"
    },
    {
      "name": "nprbst/api-endpoints",
      "specId": "007-multi-repo",
      "baseBranch": "nprbst/db-layer",
      "status": "active",
      "pr": null,
      "createdAt": "2025-11-18T11:00:00Z",
      "updatedAt": "2025-11-18T11:00:00Z"
    },
    {
      "name": "username/feature-x",
      "specId": "008-stacked-pr-support",
      "baseBranch": "main",
      "status": "active",
      "pr": null,
      "createdAt": "2025-11-18T12:00:00Z",
      "updatedAt": "2025-11-18T12:00:00Z"
    }
  ],
  "specIndex": {
    "007-multi-repo": ["nprbst/db-layer", "nprbst/api-endpoints"],
    "008-stacked-pr-support": ["username/feature-x"]
  }
}
```

---

### BranchStack (Computed View)

Virtual entity representing a dependency chain for visualization. Not persisted, computed on-demand from BranchEntry relationships.

**Fields**:
- `specId` (string): Spec identifier
- `chains` (array of BranchChain): All dependency chains for this spec

**BranchChain**:
- `branches` (array of string): Branch names in dependency order
  - First element: root branch (based on main/master)
  - Last element: leaf branch (no children)
  - Example: `["main", "nprbst/db-layer", "nprbst/api", "nprbst/ui"]`

**Computation Algorithm**:
1. Start from all branches with `baseBranch` = main/master
2. For each root, recursively follow child branches (where `baseBranch` = current branch)
3. Build chains by appending child branches to parent chain
4. Return all chains sorted by depth (shortest to longest)

**Example**:
```json
{
  "specId": "007-multi-repo",
  "chains": [
    {
      "branches": ["main", "nprbst/db-layer", "nprbst/api-endpoints"]
    },
    {
      "branches": ["main", "username/docs-update"]
    }
  ]
}
```

**Usage**:
- Displayed by `/speck.env` for stack status visualization
- Used by `/speck.branch status` to show dependency health

---

### ConstitutionWorkflowSettings

**Purpose**: Repository-wide default workflow mode configuration stored in constitution.md

**Fields**:
- `defaultWorkflowMode`: `"single-branch" | "stacked-pr"` (optional, defaults to "single-branch" if absent)

**Storage Format**:
```markdown
**Default Workflow Mode**: single-branch
```
Stored in .speck/memory/constitution.md Workflow Mode Configuration section as Markdown metadata line

**Validation Rules**:
- MUST be valid enum value ("single-branch" or "stacked-pr") if present
- MUST gracefully default to "single-branch" if line absent or malformed
- Parser MUST use regex: `^\*\*Default Workflow Mode\*\*:\s*(single-branch|stacked-pr)\s*$`

**Relationships**:
- Read by `/speck.implement`, `/speck.plan`, `/speck.tasks` for workflow mode defaults
- Overridden by plan.md **Workflow Mode** metadata (feature-specific)
- Overridden by CLI flags `--stacked` or `--single-branch` (command-specific)

**Override Hierarchy** (highest to lowest priority):
1. CLI flag (`--stacked` or `--single-branch`)
2. Plan.md metadata (`**Workflow Mode**: stacked-pr`)
3. Constitution setting (`**Default Workflow Mode**: stacked-pr`)
4. Hardcoded default (`"single-branch"`)

**Example**:
```typescript
interface ConstitutionWorkflowSettings {
  defaultWorkflowMode?: "single-branch" | "stacked-pr";
}

// Default when absent
const DEFAULT_WORKFLOW_MODE = "single-branch";
```

---

## State Transitions

### BranchEntry Status Lifecycle

```
[Create] → active
active → submitted (via /speck.branch update --status submitted --pr <num>)
submitted → merged (via /speck.branch update --status merged OR auto-detected via git)
submitted → abandoned (via /speck.branch update --status abandoned)
active → abandoned (via /speck.branch update --status abandoned)
```

**Transition Rules**:
- Cannot transition from `merged` to any other status (terminal state)
- Cannot transition from `abandoned` to any other status (terminal state)
- `submitted` requires PR number to be set (enforced by command validation)
- `merged` auto-detected via `git branch --merged <base>` (user can also set manually)

---

## Validation & Constraints

### Cross-Entity Validation

1. **Referential Integrity**:
   - Every `branch.specId` must have corresponding directory at `specs/<specId>/`
   - Every `branch.baseBranch` must either:
     - Exist in git as a branch name, OR
     - Reference another branch in `branches` array

2. **Cycle Detection**:
   - Before creating/updating branch with new `baseBranch`, run DFS cycle detection
   - Algorithm: Start from new branch, follow `baseBranch` links, detect if path revisits starting branch
   - Reject operation if cycle detected

3. **Index Consistency**:
   - After every modification to `branches` array, rebuild `specIndex`
   - Verify: For every branch B in `branches`, B.name exists in `specIndex[B.specId]`
   - Verify: For every spec S in `specIndex`, all branch names in `specIndex[S]` exist in `branches`

### File System Constraints

1. **File Location**: Must be at `.speck/branches.json` (repository root + `.speck/` directory)
2. **File Format**: UTF-8 encoded JSON
3. **Atomicity**: Write operations use temp file + rename for atomic updates
4. **Permissions**: File must be readable/writable by current user
5. **Version Control**: File should be committed to git (part of repository state)

---

## Error Recovery

### Auto-Repair Scenarios

**Scenario 1: Missing specIndex**
- **Detection**: `specIndex` field absent or empty object
- **Repair**: Rebuild from `branches` array by grouping by `specId`
- **Action**: Log warning + save repaired file

**Scenario 2: Orphaned Index Entries**
- **Detection**: Branch name in `specIndex[specId]` but not in `branches` array
- **Repair**: Remove orphaned entries from index
- **Action**: Log warning + save repaired file

**Scenario 3: Invalid Timestamps**
- **Detection**: `createdAt` or `updatedAt` not valid ISO 8601
- **Repair**: Replace with current timestamp
- **Action**: Log warning + save repaired file

### Manual Recovery Scenarios

**Scenario 4: Corrupted JSON**
- **Detection**: JSON.parse() throws SyntaxError
- **Error Message**: "Corrupted branches.json - restore from git history:\n  git show HEAD:.speck/branches.json > .speck/branches.json"
- **Action**: Block operation, require manual recovery

**Scenario 5: Schema Version Mismatch**
- **Detection**: `version` field != "1.0.0" and no migration available
- **Error Message**: "Unsupported branches.json schema version {version}. Current version: 1.0.0"
- **Action**: Block operation, require manual migration or downgrade

**Scenario 6: Missing Required Fields**
- **Detection**: Branch entry missing `name`, `specId`, or `baseBranch`
- **Error Message**: "Invalid branch entry at index {index}: missing required field '{field}'"
- **Action**: Block operation, display affected branches

---

## Performance Considerations

### Lookup Optimization

- **Spec-to-branches lookup**: O(1) via `specIndex` (target: <10ms for 100 branches)
- **Branch-to-spec lookup**: O(n) linear scan of `branches` array (acceptable: <50ms for 100 branches)
- **Cycle detection**: O(V+E) DFS (worst case: <100ms for 100 branches with 50 dependencies)

### Caching Strategy

- **In-memory cache**: Load file once per command invocation
- **Cache invalidation**: Clear cache after write operations
- **No persistent cache**: Avoid staleness issues, file read is fast enough (<10ms)

### Scalability Targets

Based on success criteria (SC-003, SC-005):
- 100 stacked branches: <100ms for all operations
- 20 branches per spec: <50ms for spec-to-branches lookup
- 10 parallel stacks: <500ms for full stack status display

---

## Migration & Versioning

### Initial Creation (v1.0.0)

When `/speck.branch create` is run for the first time:
1. Check if `.speck/branches.json` exists
2. If not, create with empty state:
   ```json
   {
     "version": "1.0.0",
     "branches": [],
     "specIndex": {}
   }
   ```
3. Add new branch entry to `branches` array
4. Update `specIndex`
5. Write file atomically

### Future Schema Migrations

If schema version changes (e.g., 1.0.0 → 2.0.0):
1. Detect version mismatch on file load
2. Run migration function based on (current_version, target_version)
3. Update `version` field
4. Write migrated file with backup of original

**Migration Strategy**:
- MAJOR version: Breaking changes (e.g., rename field, change structure)
- MINOR version: Additive changes (e.g., new optional field)
- PATCH version: Clarifications (no file format change)

---

## Summary

### Core Entities
1. **BranchEntry**: Single branch in stack (9 fields, 7 validation rules)
2. **BranchMapping**: Root container (3 fields, 5 invariants)
3. **BranchStack**: Computed view for visualization (not persisted)

### Key Design Decisions
- Centralized file (`.speck/branches.json`) for performance
- Denormalized index (`specIndex`) for O(1) spec-to-branches lookups
- Status lifecycle with terminal states (`merged`, `abandoned`)
- Auto-repair for simple corruption, manual recovery for complex cases
- Schema versioning for future compatibility

### Validation Layers
1. Field-level: Type, format, enum constraints
2. Entity-level: Required fields, timestamp validity
3. Cross-entity: Referential integrity, cycle detection
4. File-level: JSON syntax, schema version

Ready to proceed to contracts generation (API/CLI interfaces).
