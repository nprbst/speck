# Contract: Path Resolution API

**Feature**: 007-multi-repo-monorepo-support
**Version**: 1.0.0
**Status**: Phase 1 Design

---

## Overview

This contract defines the TypeScript API for detecting Speck operating mode (single-repo vs multi-repo) and resolving feature paths.

---

## API Specification

### 1. detectSpeckRoot()

**Purpose**: Detect whether the current repository is in single-repo or multi-repo mode by checking for `.speck/root` symlink.

**Signature**:

```typescript
export async function detectSpeckRoot(): Promise<SpeckConfig>
```

**Return Type**:

```typescript
interface SpeckConfig {
  mode: 'single-repo' | 'multi-repo';
  speckRoot: string;     // Absolute path to directory containing specs/
  repoRoot: string;      // Absolute path to git repository root
  specsDir: string;      // Absolute path to specs directory (speckRoot/specs)
}
```

**Behavior**:

| Condition | `mode` | `speckRoot` | `repoRoot` | `specsDir` |
|-----------|--------|-------------|------------|------------|
| No `.speck/root` | `'single-repo'` | Same as repoRoot | Path to .git parent | `${repoRoot}/specs` |
| Valid `.speck/root` symlink | `'multi-repo'` | Resolved symlink target | Path to .git parent | `${speckRoot}/specs` |
| Broken `.speck/root` symlink | ERROR | N/A | N/A | N/A |
| `.speck/root` is not symlink | WARNING + `'single-repo'` | Same as repoRoot | Path to .git parent | `${repoRoot}/specs` |

**Error Conditions**:

```typescript
// Broken symlink (target does not exist)
throw new Error(
  `Multi-repo configuration broken: .speck/root → ${target} (does not exist)\n` +
  `Fix:\n` +
  `  1. Remove broken symlink: rm .speck/root\n` +
  `  2. Link to correct location: /speck.link <path-to-speck-root>`
);

// Circular symlink
throw new Error(
  `Multi-repo configuration broken: .speck/root contains circular reference\n` +
  `Fix: rm .speck/root && /speck.link <valid-path>`
);
```

**Implementation Example**:

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';

export async function detectSpeckRoot(): Promise<SpeckConfig> {
  const repoRoot = await getRepoRoot();  // Existing function
  const symlinkPath = path.join(repoRoot, '.speck', 'root');

  // Check if symlink exists
  try {
    const stats = await fs.lstat(symlinkPath);

    if (!stats.isSymbolicLink()) {
      console.warn(
        'WARNING: .speck/root exists but is not a symlink\n' +
        'Falling back to single-repo mode.'
      );
      return {
        mode: 'single-repo',
        speckRoot: repoRoot,
        repoRoot,
        specsDir: path.join(repoRoot, 'specs')
      };
    }

    // Resolve symlink
    const speckRoot = await fs.realpath(symlinkPath);

    return {
      mode: 'multi-repo',
      speckRoot,
      repoRoot,
      specsDir: path.join(speckRoot, 'specs')
    };

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Symlink does not exist - single-repo mode
      return {
        mode: 'single-repo',
        speckRoot: repoRoot,
        repoRoot,
        specsDir: path.join(repoRoot, 'specs')
      };
    }

    if (error.code === 'ELOOP') {
      // Circular symlink
      throw new Error(
        'Multi-repo configuration broken: .speck/root contains circular reference\n' +
        'Fix: rm .speck/root && /speck.link <valid-path>'
      );
    }

    throw error;
  }
}
```

---

### 2. getFeaturePaths()

**Purpose**: Get all paths for a specific feature (specs, plans, tasks, constitution) based on detected mode.

**Signature**:

```typescript
export async function getFeaturePaths(branchName?: string): Promise<FeaturePaths>
```

**Parameters**:
- `branchName` (optional): Feature branch name (e.g., `"001-user-auth"`). If not provided, uses current git branch.

**Return Type**:

```typescript
interface FeaturePaths {
  // Mode and root paths
  MODE: 'single-repo' | 'multi-repo';
  REPO_ROOT: string;           // Git repository root (for git operations)
  SPECK_ROOT: string;          // Speck root (for spec storage)
  SPECS_DIR: string;           // Full path to specs/ directory

  // Feature-specific paths
  FEATURE_DIR: string;         // specs/NNN-feature/ directory
  SPEC_FILE: string;           // spec.md path (uses SPECK_ROOT in multi-repo)
  PLAN_FILE: string;           // plan.md path (always uses REPO_ROOT)
  TASKS_FILE: string;          // tasks.md path (always uses REPO_ROOT)
  CONTRACTS_DIR: string;       // contracts/ path (uses SPECK_ROOT in multi-repo)

  // Repository-specific paths
  CONSTITUTION: string;        // constitution.md path (always uses REPO_ROOT)
  TEMPLATES_DIR: string;       // Templates directory (plugin-level, unchanged)
}
```

**Path Resolution Rules**:

| Path | Single-Repo | Multi-Repo | Rationale |
|------|-------------|------------|-----------|
| `SPEC_FILE` | `${REPO_ROOT}/specs/NNN/spec.md` | `${SPECK_ROOT}/specs/NNN/spec.md` | Shared spec in multi-repo |
| `PLAN_FILE` | `${REPO_ROOT}/specs/NNN/plan.md` | `${REPO_ROOT}/specs/NNN/plan.md` | Always local (repo-specific) |
| `TASKS_FILE` | `${REPO_ROOT}/specs/NNN/tasks.md` | `${REPO_ROOT}/specs/NNN/tasks.md` | Always local (repo-specific) |
| `CONSTITUTION` | `${REPO_ROOT}/.speck/constitution.md` | `${REPO_ROOT}/.speck/constitution.md` | Always local (never shared) |
| `CONTRACTS_DIR` | `${REPO_ROOT}/specs/NNN/contracts` | `${SPECK_ROOT}/specs/NNN/contracts` | Shared contracts in multi-repo |

**Implementation Example**:

```typescript
export async function getFeaturePaths(branchName?: string): Promise<FeaturePaths> {
  const config = await detectSpeckRoot();
  const branch = branchName || await getCurrentBranch(config.repoRoot);

  // Find feature directory (may need to handle NNN prefix matching)
  const featureDir = await findFeatureDirByPrefix(config.specsDir, branch);
  const featureName = path.basename(featureDir);

  return {
    MODE: config.mode,
    REPO_ROOT: config.repoRoot,
    SPECK_ROOT: config.speckRoot,
    SPECS_DIR: config.specsDir,

    // Feature-specific paths
    FEATURE_DIR: featureDir,
    SPEC_FILE: path.join(featureDir, 'spec.md'),                  // Uses specsDir (speck root)
    PLAN_FILE: path.join(config.repoRoot, 'specs', featureName, 'plan.md'),     // Uses repo root
    TASKS_FILE: path.join(config.repoRoot, 'specs', featureName, 'tasks.md'),   // Uses repo root
    CONTRACTS_DIR: path.join(featureDir, 'contracts'),            // Uses specsDir (speck root)

    // Repository-specific paths
    CONSTITUTION: path.join(config.repoRoot, '.speck', 'constitution.md'),  // Always local
    TEMPLATES_DIR: getTemplatesDir(),  // Existing function (plugin-level)
  };
}
```

---

## Usage Examples

### Example 1: Single-Repo Project

```typescript
const config = await detectSpeckRoot();
console.log(config);
// {
//   mode: 'single-repo',
//   speckRoot: '/Users/dev/my-app',
//   repoRoot: '/Users/dev/my-app',
//   specsDir: '/Users/dev/my-app/specs'
// }

const paths = await getFeaturePaths('001-user-auth');
console.log(paths.SPEC_FILE);
// /Users/dev/my-app/specs/001-user-auth/spec.md

console.log(paths.PLAN_FILE);
// /Users/dev/my-app/specs/001-user-auth/plan.md

console.log(paths.CONSTITUTION);
// /Users/dev/my-app/.speck/constitution.md
```

---

### Example 2: Multi-Repo Project (Frontend Repository)

**Setup**:
```
my-product/
├── specs/                    # Speck root
│   └── 001-user-auth/
│       └── spec.md
├── frontend/
│   ├── .git/
│   └── .speck/
│       └── root → ..         # Symlink to parent
└── backend/
    ├── .git/
    └── .speck/
        └── root → ..         # Symlink to parent
```

**From frontend/ directory**:

```typescript
const config = await detectSpeckRoot();
console.log(config);
// {
//   mode: 'multi-repo',
//   speckRoot: '/Users/dev/my-product',           // Followed symlink!
//   repoRoot: '/Users/dev/my-product/frontend',   // Git repo root
//   specsDir: '/Users/dev/my-product/specs'
// }

const paths = await getFeaturePaths('001-user-auth');
console.log(paths.SPEC_FILE);
// /Users/dev/my-product/specs/001-user-auth/spec.md  (shared!)

console.log(paths.PLAN_FILE);
// /Users/dev/my-product/frontend/specs/001-user-auth/plan.md  (local!)

console.log(paths.CONSTITUTION);
// /Users/dev/my-product/frontend/.speck/constitution.md  (local!)
```

**From backend/ directory** (same spec, different plan):

```typescript
const config = await detectSpeckRoot();
console.log(config);
// {
//   mode: 'multi-repo',
//   speckRoot: '/Users/dev/my-product',           // Same speck root
//   repoRoot: '/Users/dev/my-product/backend',    // Different repo root
//   specsDir: '/Users/dev/my-product/specs'
// }

const paths = await getFeaturePaths('001-user-auth');
console.log(paths.SPEC_FILE);
// /Users/dev/my-product/specs/001-user-auth/spec.md  (same shared spec!)

console.log(paths.PLAN_FILE);
// /Users/dev/my-product/backend/specs/001-user-auth/plan.md  (different local plan!)

console.log(paths.CONSTITUTION);
// /Users/dev/my-product/backend/.speck/constitution.md  (different local constitution!)
```

---

## Validation Checklist

**Pre-Conditions**:
- [ ] `.speck/root` symlink exists (multi-repo) OR does not exist (single-repo)
- [ ] Symlink target directory exists (if symlink present)
- [ ] Git repository root can be detected (`.git/` directory exists)

**Post-Conditions**:
- [ ] `config.speckRoot` is an absolute path to an existing directory
- [ ] `config.repoRoot` is an absolute path to an existing directory
- [ ] `config.specsDir === path.join(config.speckRoot, 'specs')`
- [ ] In single-repo mode: `config.speckRoot === config.repoRoot`
- [ ] In multi-repo mode: `config.speckRoot !== config.repoRoot`

**Invariants**:
- [ ] `SPEC_FILE` always uses `SPECK_ROOT` (shared in multi-repo)
- [ ] `PLAN_FILE` and `TASKS_FILE` always use `REPO_ROOT` (never shared)
- [ ] `CONSTITUTION` always uses `REPO_ROOT` (never shared)
- [ ] `CONTRACTS_DIR` uses `SPECK_ROOT` (shared in multi-repo)

---

## Error Handling Matrix

| Error Condition | Detection Method | Error Message | Suggested Fix |
|-----------------|------------------|---------------|---------------|
| Broken symlink | `fs.realpath()` throws ENOENT on target | "Multi-repo broken: .speck/root → [path] (does not exist)" | `rm .speck/root && /speck.link <correct-path>` |
| Circular symlink | `fs.realpath()` throws ELOOP | "Multi-repo broken: circular reference" | `rm .speck/root && /speck.link <valid-path>` |
| .speck/root is not symlink | `stats.isSymbolicLink() === false` | WARNING: "Not a symlink, using single-repo" | `mv .speck/root .speck/root.backup && /speck.link <path>` |
| No git repository | Cannot find `.git/` | "Not a git repository" | `git init` or run from repo root |

---

## Version History

- **1.0.0** (2025-11-17): Initial contract definition
