# Data Model: Worktree Integration

## Overview

This document defines the core entities, relationships, validation rules, and state transitions for the worktree integration feature (spec 012). The data model supports opt-in worktree creation, IDE auto-launch, dependency pre-installation, and configurable file operations.

## Core Entities

### Entity: SpeckConfig
**Purpose**: Root configuration object for all Speck settings, stored in `.speck/config.json`
**Storage**: File-based (JSON), one per repository

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| version | string | Yes | Semantic version (default: "1.0") | Configuration schema version for migration support |
| worktree | WorktreeConfig | No | Must validate against WorktreeConfigSchema | Worktree integration settings (optional, defaults applied if missing) |

---

### Entity: WorktreeConfig
**Purpose**: Contains all worktree integration preferences and behavior settings
**Storage**: Nested within SpeckConfig in `.speck/config.json`

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| enabled | boolean | No | Default: false | Master switch for worktree integration (FR-001) |
| worktreePath | string | No | Default: ".speck/worktrees" | Base directory for worktree storage relative to repo root (FR-003) |
| branchPrefix | string | No | Optional, e.g., "specs/" | Prefix for spec branch names (FR-017); breaks spec-kit compatibility if set |
| ide | IDEConfig | No | Must validate against IDEConfigSchema | IDE launch preferences (FR-004, FR-005) |
| dependencies | DependencyConfig | No | Must validate against DependencyConfigSchema | Dependency installation preferences (FR-007, FR-008) |
| files | FileConfig | No | Must validate against FileConfigSchema | File copy/symlink rules (FR-009, FR-010) |

---

### Entity: IDEConfig
**Purpose**: Controls IDE auto-launch behavior and preferences
**Storage**: Nested within WorktreeConfig

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| autoLaunch | boolean | No | Default: false | Whether to auto-launch IDE when worktree is created (FR-006) |
| editor | string | No | Enum: "vscode", "cursor", "webstorm", "idea", "pycharm"; Default: "vscode" | Which IDE to launch (FR-005) |
| newWindow | boolean | No | Default: true | true = new window (-n), false = add to existing workspace (-r) |

---

### Entity: DependencyConfig
**Purpose**: Controls dependency installation behavior
**Storage**: Nested within WorktreeConfig

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| autoInstall | boolean | No | Default: false | Whether to install dependencies before IDE launch (FR-008) |
| packageManager | string | No | Enum: "npm", "yarn", "pnpm", "bun", "auto"; Default: "auto" | Package manager to use; "auto" triggers detection (FR-007) |

---

### Entity: FileConfig
**Purpose**: Defines file/directory handling rules for worktrees
**Storage**: Nested within WorktreeConfig

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| rules | FileRule[] | No | Array of FileRule objects; Default: [] (uses built-in defaults) | Custom copy/symlink/ignore rules (FR-009, FR-010) |
| includeUntracked | boolean | No | Default: true | Whether to copy untracked files matching copy rules (FR-009, clarification answer) |

---

### Entity: FileRule
**Purpose**: Represents a single rule for how a file/directory should be handled
**Storage**: Array element within FileConfig.rules

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| pattern | string | Yes | Non-empty glob pattern or relative path | Glob pattern (e.g., "*.env", "node_modules") or explicit path |
| action | string | Yes | Enum: "copy", "symlink", "ignore" | How to handle matching files/directories |

---

### Entity: WorktreeMetadata
**Purpose**: Runtime metadata about a created worktree (not persisted in config)
**Storage**: In-memory only (could be tracked in future `.speck/worktrees.json` if needed)

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| branchName | string | Yes | Non-empty, valid Git branch name | The feature branch checked out in this worktree |
| worktreePath | string | Yes | Absolute path, must exist | Full filesystem path to the worktree directory |
| createdAt | string | Yes | ISO 8601 timestamp | When the worktree was created |
| status | string | Yes | Enum: "creating", "ready", "installing_deps", "error" | Current state of the worktree (see State Transitions) |
| parentRepo | string | Yes | Absolute path, must exist | Path to the main repository that owns this worktree |

---

### Entity: BranchMetadata
**Purpose**: Information about a spec branch (extends existing branch tracking)
**Storage**: Could extend `.speck/branches.json` (existing from spec 008/009)

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| branchName | string | Yes | Non-empty, valid Git branch name | Branch name (e.g., "002-user-auth" or "specs/002-user-auth") |
| hasWorktree | boolean | No | Default: false | Whether this branch has an associated worktree |
| worktreePath | string | No | Required if hasWorktree=true | Relative path to worktree from repo root |
| specNumber | string | Yes | Format: "NNN" (zero-padded) | Spec number (e.g., "002") |
| shortName | string | Yes | Non-empty | Short descriptive name (e.g., "user-auth") |

---

## Relationships

### SpeckConfig → WorktreeConfig
- **Type**: One-to-one (composition)
- **Cardinality**: 1:0..1 (SpeckConfig may or may not have worktree config)
- **Description**: SpeckConfig contains an optional WorktreeConfig. If missing, defaults are applied.

### WorktreeConfig → IDEConfig, DependencyConfig, FileConfig
- **Type**: One-to-one (composition)
- **Cardinality**: 1:1 (all nested configs have defaults if not specified)
- **Description**: WorktreeConfig is composed of three sub-configurations for different concerns

### FileConfig → FileRule[]
- **Type**: One-to-many (composition)
- **Cardinality**: 1:0..* (FileConfig may have zero or more rules)
- **Description**: FileConfig contains an ordered array of FileRule objects

### BranchMetadata → WorktreeMetadata
- **Type**: One-to-zero-or-one (association)
- **Cardinality**: 1:0..1 (branch may or may not have a worktree)
- **Description**: When a branch has a worktree, BranchMetadata.hasWorktree=true and worktreePath points to it

### Repository → Worktrees
- **Type**: One-to-many
- **Cardinality**: 1:0..* (repository can have multiple worktrees)
- **Description**: Main repository can have multiple worktrees, each in `.speck/worktrees/[branch-name]`

---

## Default Values

### Default FileRule[] (when FileConfig.rules is empty)
Applied when user has not configured custom rules:

```typescript
[
  // Copy configuration files (isolation)
  { pattern: ".env*", action: "copy" },
  { pattern: "*.config.js", action: "copy" },
  { pattern: "*.config.ts", action: "copy" },
  { pattern: "*.config.json", action: "copy" },
  { pattern: ".nvmrc", action: "copy" },
  { pattern: ".node-version", action: "copy" },

  // Symlink large dependency directories (if they exist in parent)
  { pattern: "node_modules", action: "symlink" },
  { pattern: ".bun", action: "symlink" },
  { pattern: ".cache", action: "symlink" },

  // Ignore (don't copy or symlink)
  { pattern: ".git", action: "ignore" },
  { pattern: ".speck", action: "ignore" },
  { pattern: "dist", action: "ignore" },
  { pattern: "build", action: "ignore" },
]
```

### Default WorktreeConfig (when worktree field is missing)
```json
{
  "enabled": false,
  "worktreePath": ".speck/worktrees",
  "ide": {
    "autoLaunch": false,
    "editor": "vscode",
    "newWindow": true
  },
  "dependencies": {
    "autoInstall": false,
    "packageManager": "auto"
  },
  "files": {
    "rules": [],
    "includeUntracked": true
  }
}
```

---

## State Transitions

### Worktree Lifecycle States

```
┌──────────┐
│  NONE    │  (No worktree exists for branch)
└────┬─────┘
     │ User runs /speck:specify or /speck:branch with worktree.enabled=true
     ▼
┌──────────────┐
│  CREATING    │  (Git worktree add in progress)
└──────┬───────┘
       │ Success: Worktree created
       ▼
┌──────────────────┐
│ COPYING_FILES    │  (Applying file rules: copy/symlink operations)
└──────┬───────────┘
       │ Success: Files copied/symlinked
       ▼
┌──────────────────────┐
│ INSTALLING_DEPS      │  (Optional: if dependencies.autoInstall=true)
└──────┬───────────────┘
       │ Success OR autoInstall=false
       ▼
┌──────────┐
│  READY   │  (Worktree ready for use, IDE launches if autoLaunch=true)
└──────────┘
       │
       │ User works in worktree...
       │
       ▼
┌──────────────┐
│  DELETED     │  (User deletes worktree via git worktree remove or manual deletion)
└──────────────┘

Error paths:
- CREATING → ERROR: Git worktree add fails (disk space, invalid path, etc.)
- COPYING_FILES → ERROR: File copy/symlink fails (permissions, missing source, etc.)
- INSTALLING_DEPS → ERROR: Dependency installation fails (network, lockfile, etc.)
- Any ERROR state: Cleanup partial worktree, display error, abort IDE launch
```

### Stale Worktree Detection & Cleanup

When a worktree is manually deleted but Git still has references:

```
┌──────────────────┐
│  STALE_REFERENCE │  (Git has worktree entry, but directory doesn't exist)
└────────┬─────────┘
         │ System detects via `git worktree list`
         ▼
┌──────────────────┐
│  AUTO_PRUNE      │  (Run `git worktree prune`)
└────────┬─────────┘
         │ Success
         ▼
┌──────────┐
│  CLEAN   │  (Stale reference removed, notify user)
└──────────┘
```

**Trigger**: Before creating new worktree (FR-018)
**Notification**: Log to user: "Cleaned up N stale worktree reference(s)"

---

## Validation Rules

### FR-001: Opt-in Validation
- **Rule**: Worktree creation MUST be skipped if `worktree.enabled=false` (default)
- **Enforcement**: Check config before worktree operations
- **Error**: N/A (silent skip, not an error)

### FR-002: Worktree Creation on Branch Creation
- **Rule**: When creating branch via `/speck:specify` or `/speck:branch`, create worktree if enabled
- **Enforcement**: Command hooks check `worktree.enabled` and call worktree creation logic
- **Error**: If worktree creation fails, abort branch creation and report error

### FR-003: Predictable Worktree Location
- **Rule**: Worktree path MUST be `{worktreePath}/{branchName}` (default: `.speck/worktrees/{branchName}`)
- **Enforcement**: Path construction in worktree creation function
- **Error**: N/A (deterministic)

### FR-004: IDE Auto-launch Preference Persistence
- **Rule**: `ide.autoLaunch` setting MUST be persisted in `.speck/config.json`
- **Enforcement**: Config save/load functions
- **Error**: Configuration validation error if invalid type

### FR-005: IDE Selection
- **Rule**: `ide.editor` MUST be one of supported IDEs (vscode, cursor, webstorm, idea, pycharm)
- **Enforcement**: Zod enum validation
- **Error**: "Invalid IDE editor: {value}. Must be one of: vscode, cursor, webstorm, idea, pycharm"

### FR-006: IDE Launch
- **Rule**: If `ide.autoLaunch=true`, launch IDE after worktree is READY
- **Enforcement**: Post-creation hook checks autoLaunch setting
- **Error**: If IDE command not found, warn user but don't fail worktree creation

### FR-007: Package Manager Detection
- **Rule**: If `dependencies.packageManager="auto"`, detect from lockfiles (bun.lockb → pnpm-lock.yaml → yarn.lock → package-lock.json → package.json#packageManager → npm)
- **Enforcement**: Detection function with priority order
- **Error**: N/A (fallback to npm if no markers found)

### FR-008: Blocking Dependency Installation
- **Rule**: If `dependencies.autoInstall=true`, install dependencies BEFORE IDE launch, with progress indicator
- **Enforcement**: Worktree state machine enforces INSTALLING_DEPS → READY order
- **Error**: If installation fails, abort IDE launch and display error with troubleshooting steps

### FR-009: Copy Rules with Untracked Files
- **Rule**: Files matching `{ action: "copy" }` rules MUST be copied, including untracked files if `files.includeUntracked=true`
- **Enforcement**: Glob matching + git ls-files --others for untracked
- **Error**: If source file doesn't exist (for explicit paths), log warning and skip

### FR-010: Symlink Rules
- **Rule**: Directories matching `{ action: "symlink" }` rules MUST be symlinked (if source exists)
- **Enforcement**: Symlink creation after copy operations
- **Error**: If source doesn't exist, skip silently (common for node_modules before install)

### FR-011: Default Rules
- **Rule**: If `files.rules=[]`, apply DEFAULT_FILE_RULES (see Default Values section)
- **Enforcement**: Rule merging in file operations logic
- **Error**: N/A (defaults always valid)

### FR-012: Error Handling
- **Rule**: All errors MUST provide clear, actionable error messages
- **Enforcement**: Specialized error classes with context (DiskSpaceError, GitWorktreeError, etc.)
- **Error**: Display error type, context, and suggested actions

### FR-013: Worktree Collision Detection
- **Rule**: If directory exists at worktree path, abort unless `--reuse-worktree` flag provided
- **Enforcement**: Pre-creation check for directory existence
- **Error**: "Worktree directory already exists at {path}. Use --reuse-worktree to skip recreation."

### FR-014: Config Persistence
- **Rule**: Configuration MUST be stored in `.speck/config.json`
- **Enforcement**: Fixed path in config save/load functions
- **Error**: File I/O errors (permission denied, invalid JSON, etc.)

### FR-015: Schema Validation
- **Rule**: Configuration MUST validate against Zod schemas (SpeckConfigSchema)
- **Enforcement**: Parse config with Zod on load, before save
- **Error**: "Invalid configuration in .speck/config.json:\n  - {field}: {message}\n  - ..."

### FR-016: Branch Name Approval
- **Rule**: Automatically calculated branch names MUST be presented to user for approval before creation
- **Enforcement**: Interactive prompt before `git branch` or `git worktree add`
- **Error**: If user rejects, abort branch/worktree creation

### FR-017: Optional Branch Prefix
- **Rule**: If `worktree.branchPrefix` is set, prepend to spec branch names (e.g., "specs/002-feature")
- **Enforcement**: Branch name construction adds prefix if configured
- **Error**: N/A (validation ensures non-empty string if present)

### FR-018: Stale Worktree Cleanup
- **Rule**: Before creating worktree, run `git worktree prune` to clean stale references; notify user of cleanup
- **Enforcement**: Pre-creation hook runs prune, parses output for removed entries
- **Error**: If prune fails, log warning but continue (non-fatal)

---

## Constraints and Invariants

### Invariants
1. **Unique worktree paths**: No two worktrees can have the same path (enforced by Git)
2. **Branch-worktree mapping**: A branch can have at most one worktree (enforced by Git)
3. **Config version**: `version` field must always be present with valid semver (enforced by Zod default)
4. **File rule precedence**: Rules are processed in order; first match wins (enforced by application logic)
5. **Symlink safety**: Never symlink `.git` or `.speck` directories (enforced by default ignore rules)

### Constraints
1. **Git version**: Requires Git 2.5+ for worktree support (assumption #2)
2. **Disk space**: Requires sufficient space for worktree + dependencies (checked before creation)
3. **IDE availability**: IDE commands must be in PATH or known locations (checked before launch)
4. **Package manager**: At least one package manager must be available for autoInstall (npm always available with Node)
5. **File permissions**: User must have read access to parent repo files and write access to worktree path

---

## Schema Versioning

### Current Version: 1.0
**Released**: 2025-11-22 (spec 012)

### Migration Strategy
When loading config, if `version < 1.0`:
1. Apply migration transformations (field renames, structure changes, etc.)
2. Update `version` to "1.0"
3. Save migrated config back to disk
4. Notify user: "Migrated config from v{old} to v{new}"

Future versions will follow semver:
- **Patch** (1.0.x): Bug fixes, no schema changes
- **Minor** (1.x.0): Backward-compatible additions (new optional fields)
- **Major** (x.0.0): Breaking changes (field removals, type changes)
