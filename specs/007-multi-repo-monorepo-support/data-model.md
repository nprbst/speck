# Data Model: Multi-Repo and Monorepo Support

**Feature**: 007-multi-repo-monorepo-support
**Date**: 2025-11-17
**Status**: Phase 1 Design

---

## Overview

This document defines the core entities, their relationships, and state transitions for multi-repo and monorepo support in Speck.

---

## Core Entities

### 1. SpeckConfig

**Definition**: Configuration object representing the detected Speck operational mode and paths.

**Fields**:

| Field | Type | Description | Example (Single-Repo) | Example (Multi-Repo) |
|-------|------|-------------|----------------------|---------------------|
| `mode` | `'single-repo' \| 'multi-repo'` | Operating mode | `'single-repo'` | `'multi-repo'` |
| `speckRoot` | `string` | Directory containing central `specs/` | `/Users/dev/my-app` | `/Users/dev/my-product` |
| `repoRoot` | `string` | Git repository root (contains `.git/`) | `/Users/dev/my-app` | `/Users/dev/my-product/frontend` |
| `specsDir` | `string` | Full path to specs directory | `/Users/dev/my-app/specs` | `/Users/dev/my-product/specs` |

**Validation Rules**:
- `speckRoot` MUST be an existing directory
- `repoRoot` MUST contain `.git/` directory (or be current working directory if no git repo)
- `specsDir` MUST equal `path.join(speckRoot, 'specs')`
- In single-repo mode: `speckRoot === repoRoot`
- In multi-repo mode: `speckRoot !== repoRoot` (symlink followed)

**Source**: Returned by `detectSpeckRoot()` in `.speck/scripts/common/paths.ts`

---

### 2. FeaturePaths

**Definition**: Comprehensive set of paths for a specific feature, including specs, plans, tasks, and constitution.

**Fields** (Enhanced):

| Field | Type | Description | Single-Repo | Multi-Repo |
|-------|------|-------------|-------------|------------|
| `REPO_ROOT` | `string` | Git repository root | `/Users/dev/my-app` | `/Users/dev/my-product/frontend` |
| `SPECK_ROOT` | `string` | Speck root (NEW) | `/Users/dev/my-app` | `/Users/dev/my-product` |
| `SPECS_DIR` | `string` | Specs directory (NEW) | `/Users/dev/my-app/specs` | `/Users/dev/my-product/specs` |
| `MODE` | `'single-repo' \| 'multi-repo'` | Operating mode (NEW) | `'single-repo'` | `'multi-repo'` |
| `SPEC_FILE` | `string` | spec.md path | `[REPO_ROOT]/specs/001-feat/spec.md` | `[SPECK_ROOT]/specs/001-feat/spec.md` |
| `PLAN_FILE` | `string` | plan.md path | `[REPO_ROOT]/specs/001-feat/plan.md` | `[REPO_ROOT]/specs/001-feat/plan.md` |
| `TASKS_FILE` | `string` | tasks.md path | `[REPO_ROOT]/specs/001-feat/tasks.md` | `[REPO_ROOT]/specs/001-feat/tasks.md` |
| `CONSTITUTION` | `string` | constitution.md path | `[REPO_ROOT]/.speck/constitution.md` | `[REPO_ROOT]/.speck/constitution.md` |
| `CONTRACTS_DIR` | `string` | contracts/ path (if exists) | `[REPO_ROOT]/specs/001-feat/contracts` | `[SPECK_ROOT]/specs/001-feat/contracts` |

**Validation Rules**:
- `SPEC_FILE` MUST use `SPECK_ROOT` in multi-repo mode (shared spec)
- `PLAN_FILE`, `TASKS_FILE` MUST always use `REPO_ROOT` (local artifacts)
- `CONSTITUTION` MUST always use `REPO_ROOT` (never shared)
- `CONTRACTS_DIR` MUST use `SPECK_ROOT` in multi-repo mode (shared contracts)

**Source**: Returned by enhanced `getFeaturePaths()` in `.speck/scripts/common/paths.ts`

---

### 3. SymlinkReference

**Definition**: Filesystem symlink at `.speck/root` pointing to the speck root directory.

**Properties**:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `path` | `string` | Symlink location | `/Users/dev/my-product/frontend/.speck/root` |
| `target` | `string` | Relative path to speck root | `..` (one level up) |
| `targetAbsolute` | `string` | Resolved absolute path | `/Users/dev/my-product` |
| `exists` | `boolean` | Symlink file exists | `true` |
| `valid` | `boolean` | Target directory exists | `true` |
| `isSymlink` | `boolean` | Is actually a symlink (not regular file) | `true` |

**Validation Rules**:
- `target` SHOULD be relative (for portability)
- `targetAbsolute` MUST exist and be a directory
- `isSymlink` MUST be true (if not, warn and ignore)

**State**:

| State | Condition | Behavior |
|-------|-----------|----------|
| **Valid** | `exists && isSymlink && valid` | Enable multi-repo mode |
| **Broken** | `exists && isSymlink && !valid` | Throw error, suggest fix |
| **Invalid** | `exists && !isSymlink` | Warn, fall back to single-repo |
| **Absent** | `!exists` | Fall back to single-repo mode |

---

## Relationships

### SpeckConfig ← SymlinkReference

**Relationship**: `SpeckConfig.mode` is determined by detecting `SymlinkReference`

```typescript
if (SymlinkReference.exists && SymlinkReference.valid) {
  SpeckConfig.mode = 'multi-repo';
  SpeckConfig.speckRoot = SymlinkReference.targetAbsolute;
} else {
  SpeckConfig.mode = 'single-repo';
  SpeckConfig.speckRoot = repoRoot;
}
```

---

### FeaturePaths ← SpeckConfig

**Relationship**: `FeaturePaths` is computed from `SpeckConfig`

```typescript
const config = await detectSpeckRoot();  // Returns SpeckConfig

const featurePaths: FeaturePaths = {
  REPO_ROOT: config.repoRoot,
  SPECK_ROOT: config.speckRoot,
  SPECS_DIR: config.specsDir,
  MODE: config.mode,
  SPEC_FILE: path.join(config.specsDir, branchName, 'spec.md'),  // Uses speckRoot
  PLAN_FILE: path.join(config.repoRoot, 'specs', branchName, 'plan.md'),  // Uses repoRoot
  TASKS_FILE: path.join(config.repoRoot, 'specs', branchName, 'tasks.md'),  // Uses repoRoot
  CONSTITUTION: path.join(config.repoRoot, '.speck', 'constitution.md'),  // Always local
  CONTRACTS_DIR: path.join(config.specsDir, branchName, 'contracts'),  // Uses speckRoot
};
```

---

## State Transitions

### Mode Transitions

```
┌─────────────┐
│ Single-Repo │  (Default state: no .speck/root symlink)
└─────┬───────┘
      │
      │ User runs: /speck.link <path>
      │ Creates: .speck/root → <path>
      ▼
┌─────────────┐
│ Multi-Repo  │  (Symlink present and valid)
└─────┬───────┘
      │
      │ User runs: rm .speck/root
      │ Removes symlink
      ▼
┌─────────────┐
│ Single-Repo │  (Back to default)
└─────────────┘
```

**Transition Events**:

| From State | Event | To State | Side Effects |
|------------|-------|----------|--------------|
| Single-Repo | `/speck.link <path>` | Multi-Repo | Create `.speck/root` symlink |
| Multi-Repo | `rm .speck/root` | Single-Repo | Remove symlink, fall back to local specs |
| Multi-Repo | Move repo (breaks symlink) | Error State | Throw error, suggest re-linking |
| Multi-Repo | `/speck.link <new-path>` | Multi-Repo | Update symlink target |

---

### Symlink Lifecycle

```
┌───────────┐
│  Absent   │  (No .speck/root)
└─────┬─────┘
      │
      │ /speck.link <path>
      ▼
┌───────────┐
│  Created  │  (.speck/root → <path>)
└─────┬─────┘
      │
      │ Target directory moved
      ▼
┌───────────┐
│  Broken   │  (Symlink exists, target missing)
└─────┬─────┘
      │
      │ /speck.link <new-path> OR rm .speck/root
      ▼
┌───────────┐
│  Fixed /  │
│  Removed  │
└───────────┘
```

---

## Derived Data

### Feature Directory Structure (Single-Repo)

```
my-app/
├── .git/
├── .speck/
│   └── constitution.md
└── specs/
    └── 001-feature/
        ├── spec.md          # Local
        ├── plan.md          # Local
        ├── tasks.md         # Local
        └── contracts/       # Local
```

**All paths use `repoRoot`**

---

### Feature Directory Structure (Multi-Repo)

```
my-product/                      # Speck root
├── specs/
│   └── 001-feature/
│       ├── spec.md              # Shared (at speck root)
│       └── contracts/           # Shared (at speck root)
│
├── frontend/                    # Repository 1
│   ├── .git/
│   ├── .speck/
│   │   ├── root → ..            # Symlink to speck root
│   │   └── constitution.md      # Local (frontend-specific)
│   └── specs/
│       └── 001-feature/
│           ├── spec.md → ../../../specs/001-feature/spec.md       # Symlink
│           ├── contracts → ../../../specs/001-feature/contracts/  # Symlink
│           ├── plan.md          # Local (frontend-specific)
│           └── tasks.md         # Local (frontend-specific)
│
└── backend/                     # Repository 2
    ├── .git/
    ├── .speck/
    │   ├── root → ..            # Symlink to speck root
    │   └── constitution.md      # Local (backend-specific)
    └── specs/
        └── 001-feature/
            ├── spec.md → ../../../specs/001-feature/spec.md       # Symlink
            ├── contracts → ../../../specs/001-feature/contracts/  # Symlink
            ├── plan.md          # Local (backend-specific, DIFFERENT)
            └── tasks.md         # Local (backend-specific, DIFFERENT)
```

**Key Observations**:
- `spec.md` at speck root: ONE copy, symlinked into each repo
- `contracts/` at speck root: ONE copy, symlinked into each repo
- `plan.md` and `tasks.md`: SEPARATE copies per repo (local, NOT symlinked)
- `constitution.md`: SEPARATE per repo (never shared)

---

## Validation Rules

### Path Resolution Invariants

**Invariant 1**: Spec files MUST resolve to speck root in multi-repo mode

```typescript
assert(SPEC_FILE.startsWith(SPECK_ROOT));  // Multi-repo
assert(SPEC_FILE.startsWith(REPO_ROOT));   // Single-repo
```

**Invariant 2**: Plan and task files MUST always resolve to repo root

```typescript
assert(PLAN_FILE.startsWith(REPO_ROOT));   // Always local
assert(TASKS_FILE.startsWith(REPO_ROOT));  // Always local
```

**Invariant 3**: Constitution MUST always be local to repo

```typescript
assert(CONSTITUTION.startsWith(REPO_ROOT));  // Never shared
```

**Invariant 4**: Speck root MUST equal repo root in single-repo mode

```typescript
if (MODE === 'single-repo') {
  assert(SPECK_ROOT === REPO_ROOT);
}
```

---

## Edge Cases and Error States

### Edge Case 1: Symlink Points to Non-Existent Directory

**Data State**:
```typescript
SymlinkReference = {
  exists: true,
  isSymlink: true,
  target: '../old-location',
  targetAbsolute: '/Users/dev/old-location',  // Does not exist
  valid: false
}
```

**Error Handling**:
```typescript
throw new Error(
  'Multi-repo configuration broken: .speck/root → /Users/dev/old-location (does not exist)\n' +
  'Fix: rm .speck/root && /speck.link <correct-path>'
);
```

---

### Edge Case 2: .speck/root is Regular File, Not Symlink

**Data State**:
```typescript
SymlinkReference = {
  exists: true,
  isSymlink: false,  // Regular file!
  target: null,
  valid: false
}
```

**Error Handling**:
```
WARNING: .speck/root exists but is not a symlink
Expected: symlink to speck root directory
Found: regular file/directory

Falling back to single-repo mode.
To enable multi-repo: mv .speck/root .speck/root.backup && /speck.link <path>
```

---

### Edge Case 3: Circular Symlink

**Data State**:
```typescript
SymlinkReference = {
  exists: true,
  isSymlink: true,
  target: '.',  // Points to itself!
  targetAbsolute: null,  // realpath() throws ELOOP
  valid: false
}
```

**Error Handling**:
```typescript
throw new Error(
  'Multi-repo configuration broken: .speck/root contains circular reference\n' +
  'Fix: rm .speck/root && /speck.link <valid-path>'
);
```

---

## Summary

**Core Entities**:
1. **SpeckConfig**: Operating mode and paths (single-repo vs multi-repo)
2. **FeaturePaths**: All paths for a feature (specs, plans, tasks, constitution)
3. **SymlinkReference**: Filesystem symlink for multi-repo detection

**Key Relationships**:
- SpeckConfig ← SymlinkReference (mode determined by symlink presence)
- FeaturePaths ← SpeckConfig (paths computed from detected config)

**State Transitions**:
- Single-Repo ↔ Multi-Repo (via `/speck.link` or `rm .speck/root`)
- Symlink lifecycle: Absent → Created → Broken → Fixed/Removed

**Validation Rules**:
- Spec files use speck root (shared in multi-repo)
- Plan/task files use repo root (always local)
- Constitution always local to repo (never shared)
