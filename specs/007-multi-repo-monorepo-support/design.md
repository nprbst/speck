# Design Document: Multi-Repo and Monorepo Support

**Feature**: 007-multi-repo-monorepo-support
**Created**: 2025-11-17
**Status**: Draft

## Table of Contents

1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Directory Structures](#directory-structures)
4. [Detection Mechanism](#detection-mechanism)
5. [Path Resolution System](#path-resolution-system)
6. [Command Behavior](#command-behavior)
7. [Implementation Details](#implementation-details)
8. [Migration Strategies](#migration-strategies)
9. [Trade-offs and Alternatives](#trade-offs-and-alternatives)
10. [Testing Strategy](#testing-strategy)

---

## Overview

### Problem Statement

Teams with multiple repositories (microservices, frontend/backend split, monorepos with packages) need to implement features that span multiple codebases. Currently, each repository must maintain its own spec.md, leading to:

- **Duplication**: Same requirements copied across repos
- **Drift**: Specs diverge as teams update them independently
- **Coordination overhead**: Manual synchronization of spec changes

However, implementation details differ:

- **Different architectures**: Frontend uses React, backend uses Node.js
- **Different constraints**: Frontend has no database, backend has no UI
- **Different constitutions**: Each repo has its own architectural principles

### Solution Summary

**Central specs, distributed plans**:

- **One spec.md** per feature at a shared speck root
- **Multiple plan.md/tasks.md** files (one per repository) generated against each repo's constitution
- **Automatic detection** via symlink presence (no configuration files)
- **Zero impact** on single-repo projects (opt-in via explicit `/speck.link` or manual symlink creation)

---

## Architecture Principles

### Principle 1: Single-Repo First

**Default behavior**: Assume single-repo mode unless explicitly configured otherwise.

**Rationale**:
- Most projects are single-repo
- Adding complexity to the common case is unacceptable
- New users should not encounter multi-repo concepts

**Implementation**: All commands default to single-repo paths. Multi-repo is detected and handled as an override.

### Principle 2: Automatic Detection Over Configuration

**No config files**: Use directory structure (symlinks) as the source of truth.

**Rationale**:
- Configuration files add maintenance burden
- Symlinks are self-documenting (visible in `ls -la`)
- Filesystem is the single source of truth

**Implementation**: Check for `.speck/root` symlink; if present, follow it to find speck root.

### Principle 3: Constitution Locality

**Each repo owns its constitution**: Never share `.speck/constitution.md` across repos.

**Rationale**:
- Repositories have different architectural constraints
- Constitutional principles enforce repo-specific patterns
- Plan generation must respect repo-specific rules

**Implementation**: Always read constitution from `[repo-root]/.speck/constitution.md`, never from speck root.

### Principle 4: Minimal Surface Area

**Add only what's necessary**: One new command (`/speck.link`), one detection function.

**Rationale**:
- Reduce maintenance burden
- Easier to test and validate
- Less to document

**Implementation**: Reuse existing command infrastructure; only modify path resolution layer.

### Principle 5: Monorepo = Multi-Repo

**Identical UX**: Monorepo packages are treated exactly like separate repositories.

**Rationale**:
- Reduces learning curve (one mental model)
- Reuses all multi-repo infrastructure
- Simplifies documentation

**Implementation**: Detection logic doesn't distinguish monorepo from multi-repo. Both use `.speck/root` symlink.

---

## Directory Structures

### Single-Repo Structure (Current, Unchanged)

```
my-project/
├── .git/
├── .speck/
│   ├── constitution.md
│   ├── scripts/
│   └── templates/
├── specs/
│   ├── 001-user-auth/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   └── 002-payment-system/
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
└── src/
    └── (implementation)
```

**Characteristics**:
- All specs live in `specs/` at repo root
- No `.speck/root` symlink
- All Speck commands use local `specs/` directory

---

### Multi-Repo Structure (New, Opt-In)

```
my-product/                          # Speck root (not necessarily a git repo)
├── specs/                           # Central spec storage
│   ├── 001-user-auth/
│   │   ├── spec.md                  # Shared spec (single source of truth)
│   │   └── contracts/
│   │       ├── auth-api.md          # API contract
│   │       └── user-model.md        # Data model
│   └── 002-payment-system/
│       ├── spec.md
│       └── contracts/
│           └── payment-api.md
│
├── frontend/                        # Frontend repository
│   ├── .git/
│   ├── .speck/
│   │   ├── root -> ..               # Symlink to speck root!
│   │   └── constitution.md          # Frontend-specific constitution
│   ├── specs/
│   │   ├── 001-user-auth/
│   │   │   ├── spec.md -> ../../../specs/001-user-auth/spec.md       # Symlink to shared spec
│   │   │   ├── contracts -> ../../../specs/001-user-auth/contracts/  # Symlink to contracts
│   │   │   ├── plan.md              # Frontend-specific plan (real file)
│   │   │   └── tasks.md             # Frontend-specific tasks (real file)
│   │   └── 002-payment-system/
│   │       ├── spec.md -> ../../../specs/002-payment-system/spec.md
│   │       ├── contracts -> ../../../specs/002-payment-system/contracts/
│   │       ├── plan.md
│   │       └── tasks.md
│   └── src/
│       └── (frontend implementation)
│
└── backend/                         # Backend repository
    ├── .git/
    ├── .speck/
    │   ├── root -> ..               # Symlink to speck root!
    │   └── constitution.md          # Backend-specific constitution
    ├── specs/
    │   ├── 001-user-auth/
    │   │   ├── spec.md -> ../../../specs/001-user-auth/spec.md       # Same shared spec!
    │   │   ├── contracts -> ../../../specs/001-user-auth/contracts/  # Same contracts!
    │   │   ├── plan.md              # Backend-specific plan (real file)
    │   │   └── tasks.md             # Backend-specific tasks (real file)
    │   └── 002-payment-system/
    │       ├── spec.md -> ../../../specs/002-payment-system/spec.md
    │       ├── contracts -> ../../../specs/002-payment-system/contracts/
    │       ├── plan.md
    │       └── tasks.md
    └── src/
        └── (backend implementation)
```

**Characteristics**:
- Shared `specs/` at speck root contains all spec.md files
- Each repo has `.speck/root` symlink pointing to speck root
- Each repo has local plan.md/tasks.md (not shared)
- Contracts live at speck root, accessible via symlinks
- Git commits in each repo only track local plan.md/tasks.md

**Key Insight**: Symlinks create a "projection" of the central specs into each repo, while keeping plan/task files local.

---

### Monorepo Structure (Same as Multi-Repo)

```
my-monorepo/                         # Monorepo root = Speck root
├── .git/                            # Single git repo
├── specs/                           # Central spec storage
│   └── 001-shared-ui/
│       ├── spec.md
│       └── contracts/
│           └── component-api.md
│
├── packages/
│   ├── ui/                          # Package 1
│   │   ├── .speck/
│   │   │   ├── root -> ../..        # Points to monorepo root
│   │   │   └── constitution.md      # UI-specific constitution
│   │   ├── specs/
│   │   │   └── 001-shared-ui/
│   │   │       ├── spec.md -> ../../../../specs/001-shared-ui/spec.md
│   │   │       ├── contracts -> ../../../../specs/001-shared-ui/contracts/
│   │   │       ├── plan.md
│   │   │       └── tasks.md
│   │   └── src/
│   │
│   └── api/                         # Package 2
│       ├── .speck/
│       │   ├── root -> ../..        # Points to monorepo root
│       │   └── constitution.md      # API-specific constitution
│       ├── specs/
│       │   └── 001-shared-ui/
│       │       ├── spec.md -> ../../../../specs/001-shared-ui/spec.md
│       │       ├── contracts -> ../../../../specs/001-shared-ui/contracts/
│       │       ├── plan.md
│       │       └── tasks.md
│       └── src/
│
└── package.json                     # Monorepo workspace config
```

**Characteristics**:
- Identical structure to multi-repo
- Monorepo root serves as speck root
- Each package treated as independent "repo" for Speck purposes
- Works with npm workspaces, Yarn workspaces, pnpm workspaces, Nx, Turborepo, etc.

---

## Detection Mechanism

### Algorithm

```typescript
// Pseudocode for detection
async function detectSpeckRoot(): Promise<SpeckConfig> {
  const repoRoot = await getRepoRoot(); // Find .git directory or CWD
  const symlinkPath = path.join(repoRoot, '.speck', 'root');

  if (await exists(symlinkPath) && await isSymlink(symlinkPath)) {
    // Multi-repo mode: follow symlink
    const speckRoot = await fs.realpath(symlinkPath);
    return {
      mode: 'multi-repo',
      speckRoot: speckRoot,
      repoRoot: repoRoot,
      specsDir: path.join(speckRoot, 'specs')
    };
  } else {
    // Single-repo mode: specs in local repo
    return {
      mode: 'single-repo',
      speckRoot: repoRoot,
      repoRoot: repoRoot,
      specsDir: path.join(repoRoot, 'specs')
    };
  }
}
```

### Decision Tree

```
Start
  │
  ├─ Does .speck/root exist?
  │    │
  │    No → SINGLE-REPO MODE
  │    │     - speckRoot = repoRoot
  │    │     - specsDir = [repoRoot]/specs
  │    │
  │    Yes → Is it a symlink?
  │         │
  │         No → SINGLE-REPO MODE (ignore regular file/dir)
  │         │     - Warn: ".speck/root should be a symlink"
  │         │
  │         Yes → Does symlink target exist?
  │              │
  │              No → ERROR
  │              │     - "Multi-repo broken: .speck/root → [missing]"
  │              │     - "Run /speck.link to fix"
  │              │
  │              Yes → MULTI-REPO MODE
  │                    - speckRoot = realpath(.speck/root)
  │                    - specsDir = [speckRoot]/specs
```

### Error Handling

**Broken Symlink**:
```
ERROR: Multi-repo configuration broken

.speck/root points to: /Users/dev/old-location/my-product
This directory does not exist.

Fix:
  1. Remove broken symlink: rm .speck/root
  2. Link to correct location: /speck.link <path-to-speck-root>

Or fall back to single-repo mode:
  1. Remove symlink: rm .speck/root
  2. Create local specs: mkdir -p specs
```

**Invalid Symlink Target**:
```
WARNING: .speck/root exists but is not a symlink

Expected: symlink to speck root directory
Found: regular file/directory

Action: Renaming to .speck/root.backup and using single-repo mode
```

---

## Path Resolution System

### Current Implementation (Single-Repo Only)

```typescript
// From .speck/scripts/common/paths.ts (current)
export async function getFeaturePaths(): Promise<FeaturePaths> {
  const repoRoot = await getRepoRoot();
  const featureDir = path.join(repoRoot, "specs", branchName);

  return {
    REPO_ROOT: repoRoot,
    SPEC_FILE: path.join(featureDir, "spec.md"),
    PLAN_FILE: path.join(featureDir, "plan.md"),
    TASKS_FILE: path.join(featureDir, "tasks.md"),
    // ...
  };
}
```

### New Implementation (Multi-Repo Aware)

```typescript
// Enhanced paths.ts
export interface SpeckConfig {
  mode: 'single-repo' | 'multi-repo';
  speckRoot: string;     // Where specs/ lives
  repoRoot: string;      // Where .git/ lives
  specsDir: string;      // Full path to specs directory
}

export async function detectSpeckRoot(): Promise<SpeckConfig> {
  const repoRoot = await getRepoRoot();
  const symlinkPath = path.join(repoRoot, '.speck', 'root');

  if (await exists(symlinkPath) && await isSymlink(symlinkPath)) {
    const speckRoot = await fs.realpath(symlinkPath);

    // Validate speck root
    if (!await exists(speckRoot)) {
      throw new Error(`Multi-repo broken: .speck/root → ${speckRoot} (does not exist)`);
    }

    return {
      mode: 'multi-repo',
      speckRoot,
      repoRoot,
      specsDir: path.join(speckRoot, 'specs')
    };
  }

  return {
    mode: 'single-repo',
    speckRoot: repoRoot,
    repoRoot,
    specsDir: path.join(repoRoot, 'specs')
  };
}

export async function getFeaturePaths(): Promise<FeaturePaths> {
  const config = await detectSpeckRoot();
  const branchName = await getCurrentBranch(config.repoRoot);

  // Use speckRoot for specs, repoRoot for git operations
  const featureDir = findFeatureDirByPrefix(config.specsDir, branchName);

  return {
    REPO_ROOT: config.repoRoot,        // For git operations
    SPECK_ROOT: config.speckRoot,      // For spec storage
    SPECS_DIR: config.specsDir,        // Full path to specs/
    MODE: config.mode,                 // 'single-repo' | 'multi-repo'
    SPEC_FILE: path.join(featureDir, "spec.md"),
    PLAN_FILE: path.join(featureDir, "plan.md"),
    TASKS_FILE: path.join(featureDir, "tasks.md"),
    CONSTITUTION: path.join(config.repoRoot, '.speck', 'constitution.md'), // Always local!
    // ...
  };
}
```

### Path Resolution Rules

| Path Type | Single-Repo | Multi-Repo | Notes |
|-----------|-------------|------------|-------|
| `spec.md` | `[repoRoot]/specs/NNN/spec.md` | `[speckRoot]/specs/NNN/spec.md` | Shared in multi-repo |
| `plan.md` | `[repoRoot]/specs/NNN/plan.md` | `[repoRoot]/specs/NNN/plan.md` | Always local |
| `tasks.md` | `[repoRoot]/specs/NNN/tasks.md` | `[repoRoot]/specs/NNN/tasks.md` | Always local |
| `constitution.md` | `[repoRoot]/.speck/constitution.md` | `[repoRoot]/.speck/constitution.md` | Always local |
| `contracts/` | `[repoRoot]/specs/NNN/contracts/` | `[speckRoot]/specs/NNN/contracts/` | Shared in multi-repo |
| `.git/` | `[repoRoot]/.git/` | `[repoRoot]/.git/` | Always local |
| Templates | `$PLUGIN_ROOT/templates/` | `$PLUGIN_ROOT/templates/` | Plugin-level (unchanged) |

---

## Command Behavior

### Unchanged Commands (Transparent Multi-Repo Support)

These commands work identically in single-repo and multi-repo modes by using the updated `getFeaturePaths()`:

#### `/speck.specify`

**Single-repo**:
```bash
cd my-project/
/speck.specify "User authentication"
# Creates: my-project/specs/001-user-auth/spec.md
```

**Multi-repo**:
```bash
cd my-product/frontend/
/speck.specify "User authentication"
# Creates: my-product/specs/001-user-auth/spec.md (at speck root)
```

**Implementation**: No changes needed. `getFeaturePaths()` returns correct spec path.

---

#### `/speck.plan`

**Single-repo**:
```bash
cd my-project/
/speck.plan
# Reads: my-project/specs/001-user-auth/spec.md
# Reads: my-project/.speck/constitution.md
# Creates: my-project/specs/001-user-auth/plan.md
```

**Multi-repo**:
```bash
cd my-product/frontend/
/speck.plan
# Reads: my-product/specs/001-user-auth/spec.md (shared)
# Reads: my-product/frontend/.speck/constitution.md (local!)
# Creates: my-product/frontend/specs/001-user-auth/plan.md (local!)

cd my-product/backend/
/speck.plan
# Reads: my-product/specs/001-user-auth/spec.md (same shared spec)
# Reads: my-product/backend/.speck/constitution.md (different constitution!)
# Creates: my-product/backend/specs/001-user-auth/plan.md (different plan!)
```

**Implementation**: No changes needed. Constitution path already uses `repoRoot`.

---

#### `/speck.tasks`

**Behavior**: Identical to `/speck.plan` - reads shared spec, generates local tasks.md.

---

#### `/speck.implement`

**Single-repo**:
```bash
/speck.implement
# Reads: my-project/specs/001-user-auth/tasks.md
# Implements tasks in my-project/src/
```

**Multi-repo**:
```bash
cd my-product/frontend/
/speck.implement
# Reads: my-product/frontend/specs/001-user-auth/tasks.md (local tasks)
# Implements tasks in my-product/frontend/src/

cd my-product/backend/
/speck.implement
# Reads: my-product/backend/specs/001-user-auth/tasks.md (different local tasks)
# Implements tasks in my-product/backend/src/
```

**Implementation**: No changes needed. Tasks path already local.

---

### Modified Commands

#### `/speck.env` (Enhanced)

**New Output Section**:

```bash
/speck.env

=== Speck Configuration ===
Mode: Multi-repo
Speck Root: /Users/dev/my-product
Repo Root: /Users/dev/my-product/frontend
Specs Directory: /Users/dev/my-product/specs

=== Linked Configuration ===
.speck/root → .. (valid)

=== Constitution ===
Location: /Users/dev/my-product/frontend/.speck/constitution.md (local)
Status: Found

# ... rest of existing env output
```

**Single-repo output**:
```bash
Mode: Single-repo
Repo Root: /Users/dev/my-project
Specs Directory: /Users/dev/my-project/specs
```

**Implementation**:
```typescript
// In speck.env.md command
const config = await detectSpeckRoot();

echo "Mode: ${config.mode === 'single-repo' ? 'Single-repo' : 'Multi-repo'}";
echo "Speck Root: ${config.speckRoot}";
if (config.mode === 'multi-repo') {
  echo "Repo Root: ${config.repoRoot}";
  echo "Linked via: .speck/root";
}
```

---

### New Commands

#### `/speck.link <path-to-speck-root>`

**Purpose**: Create `.speck/root` symlink to enable multi-repo mode.

**Usage**:
```bash
cd my-product/frontend/
/speck.link ..

cd my-product/backend/
/speck.link ..

cd monorepo/packages/ui/
/speck.link ../..
```

**Algorithm**:
1. Validate arguments
2. Resolve target path (convert relative to absolute, then back to relative)
3. Validate target exists
4. Check if `.speck/root` already exists
5. Create symlink
6. Verify detection
7. Report success

**Implementation** (pseudocode):
```typescript
async function linkRepo(targetPath: string) {
  const repoRoot = await getRepoRoot();
  const symlinkPath = path.join(repoRoot, '.speck', 'root');

  // 1. Validate target
  const absoluteTarget = path.resolve(targetPath);
  if (!await exists(absoluteTarget)) {
    throw new Error(`Target does not exist: ${absoluteTarget}`);
  }

  // 2. Calculate relative path for portability
  const relativePath = path.relative(
    path.join(repoRoot, '.speck'),
    absoluteTarget
  );

  // 3. Check existing symlink
  if (await exists(symlinkPath)) {
    if (await isSymlink(symlinkPath)) {
      const current = await fs.readlink(symlinkPath);
      if (current === relativePath) {
        console.log(`Already linked to ${relativePath}`);
        return;
      }
      console.log(`Updating link from ${current} to ${relativePath}`);
    } else {
      throw new Error(`.speck/root exists but is not a symlink`);
    }
  }

  // 4. Create symlink
  await fs.symlink(relativePath, symlinkPath, 'dir');

  // 5. Verify detection
  const config = await detectSpeckRoot();
  if (config.mode !== 'multi-repo') {
    throw new Error(`Link created but detection failed`);
  }

  // 6. Report success
  console.log(`✓ Multi-repo mode enabled`);
  console.log(`  Speck Root: ${config.speckRoot}`);
  console.log(`  Specs: ${config.specsDir}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Create specs: /speck.specify "Feature description"`);
  console.log(`  2. Generate plan: /speck.plan`);
}
```

**Error Handling**:
```bash
# Missing argument
/speck.link
ERROR: Missing required argument: path-to-speck-root
Usage: /speck.link <path>
Example: /speck.link ..

# Invalid target
/speck.link /nonexistent
ERROR: Target does not exist: /nonexistent

# Symlink already exists (different target)
/speck.link ../other-location
WARNING: .speck/root already points to ../old-location
Update to ../other-location? (y/n)
```

---

## Implementation Details

### Files to Modify

#### 1. `.speck/scripts/common/paths.ts`

**Changes**:
- Add `SpeckConfig` interface
- Add `detectSpeckRoot()` function
- Modify `getFeaturePaths()` to use detected config
- Update all hardcoded `repoRoot + "specs"` to use `config.specsDir`

**Estimated Lines Changed**: ~50 lines added, ~10 lines modified

---

#### 2. `.speck/scripts/create-new-feature.ts`

**Current Issue**: Line 358 hardcodes `path.join(repoRoot, "specs")`

**Fix**:
```typescript
// OLD
const specsDir = path.join(repoRoot, "specs");

// NEW
const config = await detectSpeckRoot();
const specsDir = config.specsDir;
```

**Estimated Lines Changed**: ~5 lines

---

#### 3. `.claude/commands/speck.env.md`

**Changes**:
- Add section to display mode (single-repo vs multi-repo)
- Show speck root and repo root paths
- Show symlink status

**Estimated Lines Changed**: ~15 lines added

---

#### 4. NEW: `.claude/commands/speck.link.md`

**New File**:
```markdown
---
description: Link repository to multi-repo speck root
---

# Link Repository to Multi-Repo Speck Root

Creates a `.speck/root` symlink to enable multi-repo mode.

## Usage

/speck.link <path-to-speck-root>

## Examples

From frontend repo in my-product/ directory:
/speck.link ..

From nested monorepo package:
/speck.link ../..

## What This Does

1. Creates symlink: .speck/root → <path>
2. Enables multi-repo mode (automatic detection)
3. Specs now read/written to <path>/specs/
4. Plans/tasks remain local to this repo

## Implementation

bun run $PLUGIN_ROOT/scripts/link-repo.ts {{args}}
```

**Estimated Lines**: ~30 lines

---

#### 5. NEW: `.speck/scripts/link-repo.ts`

**New File**: Implementation of `/speck.link` command

**Estimated Lines**: ~100 lines

---

### Backward Compatibility Testing

**Test Matrix**:

| Scenario | Expected Behavior |
|----------|-------------------|
| Existing single-repo project (no changes) | All commands work identically |
| Existing single-repo with `.speck/root` file (not symlink) | Ignore file, use single-repo mode, warn user |
| New single-repo project | No awareness of multi-repo features |
| Multi-repo setup after `/speck.link` | Specs read from speck root, plans written locally |
| Broken symlink (target moved) | Clear error with fix instructions |
| Symlink to empty directory | Works (specs/ created on first `/speck.specify`) |

---

### Performance Impact

**Single-Repo Mode**:
- Additional check: `exists(.speck/root)` + `isSymlink()`
- Filesystem calls: +2 (negligible)
- Estimated overhead: <5ms

**Multi-Repo Mode**:
- Additional operations: `readlink()` + `realpath()`
- Filesystem calls: +4
- Estimated overhead: <10ms

**Mitigation**: Cache detection result in command execution context (avoid re-detecting for every path resolution).

---

## Migration Strategies

### Strategy 1: Greenfield Multi-Repo Setup

**Scenario**: Starting a new multi-repo project from scratch.

**Steps**:
1. Create parent directory: `mkdir my-product && cd my-product`
2. Create central specs: `mkdir specs`
3. Clone/create repositories: `git clone <frontend>`, `git clone <backend>`
4. Link repositories:
   ```bash
   cd frontend && /speck.link ..
   cd ../backend && /speck.link ..
   ```
5. Create first spec: `cd frontend && /speck.specify "User auth"`
6. Generate plans in both repos:
   ```bash
   cd frontend && /speck.plan
   cd ../backend && /speck.plan
   ```

**Duration**: 5 minutes

---

### Strategy 2: Converting Existing Single-Repo to Multi-Repo

**Scenario**: Team has existing single-repo frontend project, splits into frontend + backend.

**Steps**:
1. Create parent directory: `mkdir my-product`
2. Move existing repo: `mv frontend-repo my-product/frontend`
3. Create backend repo: `cd my-product && git clone <backend-repo> backend`
4. Move specs to central location:
   ```bash
   cd my-product
   mv frontend/specs ./specs
   ```
5. Link frontend to central specs:
   ```bash
   cd frontend
   /speck.link ..
   # Creates .speck/root → ..
   # Frontend now reads specs from ../specs/
   ```
6. Create symlinks for each feature (manual or scripted):
   ```bash
   cd frontend/specs
   for dir in ../../specs/*/; do
     feature=$(basename "$dir")
     mkdir -p "$feature"
     ln -s "../../../specs/$feature/spec.md" "$feature/spec.md"
     # Keep local plan.md and tasks.md
   done
   ```
7. Link backend repo: `cd backend && /speck.link ..`
8. Update `.gitignore` in both repos:
   ```gitignore
   # Ignore symlinked specs
   specs/*/spec.md
   specs/*/contracts/

   # Track local plans/tasks
   !specs/*/plan.md
   !specs/*/tasks.md
   ```

**Duration**: 15 minutes (manual), 5 minutes (scripted)

**Future Enhancement**: `/speck.migrate-to-multirepo` command to automate this.

---

### Strategy 3: Monorepo Setup

**Scenario**: Existing monorepo (e.g., Nx, Turborepo) with packages.

**Steps**:
1. Create central specs at monorepo root: `mkdir specs` (if not exists)
2. Link each package:
   ```bash
   cd packages/ui && /speck.link ../..
   cd ../api && /speck.link ../..
   cd ../shared && /speck.link ../..
   ```
3. Create specs at root: `cd <monorepo-root> && /speck.specify "Shared components"`
4. Generate package-specific plans:
   ```bash
   cd packages/ui && /speck.plan
   cd ../api && /speck.plan
   ```

**Duration**: 5 minutes

---

## Trade-offs and Alternatives

### Design Decision: Symlinks vs Config File

**Chosen**: Symlinks (`.speck/root` → `<speck-root>`)

**Alternative**: Configuration file (`.speck/config.json`)

```json
{
  "mode": "multi-repo",
  "speckRoot": "../.."
}
```

**Comparison**:

| Aspect | Symlinks | Config File |
|--------|----------|-------------|
| Discoverability | Visible in `ls -la` | Requires reading file |
| Cross-platform | Works on Unix/WSL, limited Windows | Works everywhere |
| Self-documenting | Filesystem shows relationship | Need to parse JSON |
| Maintenance | Breaks if moved | Breaks if moved (but easier to fix) |
| Precedent | Used by Node.js (`node_modules`), Git (`.git` symlink in worktrees) | Used by many tools |

**Verdict**: Symlinks chosen for discoverability and simplicity. Config file could be added later for Windows compatibility if needed.

---

### Design Decision: Shared Specs vs Duplicated Specs

**Chosen**: Shared specs (single `spec.md` at speck root)

**Alternative**: Duplicate `spec.md` in each repo with sync mechanism

**Comparison**:

| Aspect | Shared Specs | Duplicated Specs |
|--------|--------------|------------------|
| Source of truth | Single file | Must sync manually or automatically |
| Drift risk | None | High |
| Edit workflow | Edit once, visible everywhere | Edit in one repo, sync to others |
| Conflict resolution | N/A | Complex (last-write-wins, merge conflicts) |
| Simplicity | Symlinks handle sharing | Sync logic needed |

**Verdict**: Shared specs eliminate entire class of problems (drift, conflicts, sync failures).

---

### Design Decision: Monorepo = Multi-Repo vs Separate Detection

**Chosen**: Monorepo uses same mechanism as multi-repo (symlinks)

**Alternative**: Detect monorepo via `package.json` workspaces, `nx.json`, `turbo.json`, etc.

**Comparison**:

| Aspect | Unified Mechanism | Monorepo-Specific Detection |
|--------|-------------------|----------------------------|
| Complexity | Simple (one code path) | Complex (detect Nx, Turbo, npm, Yarn, pnpm) |
| Consistency | Identical UX for multi-repo and monorepo | Different UX depending on tool |
| Maintenance | Single detection function | Must update as new monorepo tools emerge |
| Flexibility | Works with any directory structure | Tied to specific tools |

**Verdict**: Unified mechanism reduces complexity and maintenance burden.

---

### Design Decision: Manual Symlink Creation vs Automatic Discovery

**Chosen**: Manual symlink creation (via `/speck.link` or `ln -s`)

**Alternative**: Automatic workspace discovery (scan parent directories for `specs/`)

**Comparison**:

| Aspect | Manual | Automatic |
|--------|--------|-----------|
| Explicitness | User opts in explicitly | "Magic" discovery |
| Predictability | Always know where specs come from | May discover unexpected specs/ directory |
| Control | User decides when to link | System decides |
| Debugging | Symlink visible in filesystem | Hidden logic |

**Verdict**: Manual creation is more predictable and gives users control.

---

## Testing Strategy

### Unit Tests

**File**: `.speck/scripts/common/paths.test.ts`

```typescript
describe('detectSpeckRoot', () => {
  test('single-repo: no symlink present', async () => {
    const config = await detectSpeckRoot();
    expect(config.mode).toBe('single-repo');
    expect(config.speckRoot).toBe(config.repoRoot);
  });

  test('multi-repo: valid symlink', async () => {
    // Setup: create symlink
    const config = await detectSpeckRoot();
    expect(config.mode).toBe('multi-repo');
    expect(config.speckRoot).not.toBe(config.repoRoot);
  });

  test('multi-repo: broken symlink throws error', async () => {
    // Setup: create symlink to nonexistent target
    await expect(detectSpeckRoot()).rejects.toThrow('does not exist');
  });

  test('single-repo: .speck/root is regular file (not symlink)', async () => {
    // Setup: create regular file .speck/root
    const config = await detectSpeckRoot();
    expect(config.mode).toBe('single-repo');
    // Should warn about unexpected file
  });
});
```

---

### Integration Tests

**File**: `tests/integration/multi-repo.test.ts`

```typescript
describe('Multi-repo workflow', () => {
  test('create spec in multi-repo mode', async () => {
    // Setup: create speck root + linked repo
    // Execute: /speck.specify "test feature"
    // Assert: spec.md created at speck root, not repo root
  });

  test('generate plans in multiple repos from shared spec', async () => {
    // Setup: speck root with spec.md, two linked repos
    // Execute: /speck.plan in repo1, /speck.plan in repo2
    // Assert: two different plan.md files (local), same spec.md (shared)
  });

  test('constitution check uses local constitution', async () => {
    // Setup: shared spec, repo1 constitution forbids X, repo2 allows X
    // Execute: /speck.plan in both repos
    // Assert: repo1 plan shows violation, repo2 plan passes
  });
});
```

---

### End-to-End Tests

**Scenario 1**: Complete single-repo workflow (unchanged)

```bash
# Setup: clean repo
mkdir test-single-repo && cd test-single-repo
git init

# Execute: full workflow
/speck.specify "User authentication"
/speck.plan
/speck.tasks

# Assert: all files in local specs/
test -f specs/001-user-auth/spec.md
test -f specs/001-user-auth/plan.md
test -f specs/001-user-auth/tasks.md
```

**Scenario 2**: Multi-repo setup and workflow

```bash
# Setup: multi-repo structure
mkdir speck-root && cd speck-root
mkdir specs frontend backend

cd frontend && git init
/speck.link ..

cd ../backend && git init
/speck.link ..

# Execute: create spec from frontend
cd frontend
/speck.specify "User authentication"

# Assert: spec at speck root
test -f ../specs/001-user-auth/spec.md

# Execute: generate plans in both repos
/speck.plan
cd ../backend
/speck.plan

# Assert: separate plans
test -f specs/001-user-auth/plan.md  # backend plan
test -f ../frontend/specs/001-user-auth/plan.md  # frontend plan
test "$(cat specs/001-user-auth/plan.md)" != "$(cat ../frontend/specs/001-user-auth/plan.md)"
```

**Scenario 3**: Monorepo workflow

```bash
# Setup: monorepo with packages
mkdir monorepo && cd monorepo
git init
mkdir -p packages/ui packages/api specs

cd packages/ui
/speck.link ../..

cd ../api
/speck.link ../..

# Execute: create spec and plans
cd ../ui
/speck.specify "Shared components"
/speck.plan

cd ../api
/speck.plan

# Assert: shared spec, separate plans
test -f ../../specs/001-shared-components/spec.md
test -f ../ui/specs/001-shared-components/plan.md
test -f ../api/specs/001-shared-components/plan.md
```

---

## Open Questions

1. **Should `/speck.link` validate that target directory has `specs/` subdirectory?**
   - Pro: Early validation, clearer errors
   - Con: Prevents creating empty speck root (specs/ created later)
   - **Recommendation**: No validation. Allow empty speck roots.

2. **Should we provide `/speck.unlink` command?**
   - Pro: Symmetric with `/speck.link`
   - Con: Simple `rm .speck/root` is sufficient
   - **Recommendation**: Document `rm .speck/root` in help text. Add `/speck.unlink` if users request it.

3. **Should `.gitignore` be automatically updated?**
   - Pro: Prevents accidentally committing symlinked specs
   - Con: Modifying user's `.gitignore` is invasive
   - **Recommendation**: Document recommended `.gitignore` patterns. Don't auto-modify.

4. **Should we support absolute symlinks or only relative?**
   - Pro (absolute): Works if repos move independently
   - Con (absolute): Not portable across machines
   - **Recommendation**: Only create relative symlinks. Users can create absolute manually if needed.

5. **What if user has both local `specs/` AND `.speck/root` symlink?**
   - **Current behavior**: Multi-repo mode takes precedence, local `specs/` ignored
   - **Alternative**: Detect conflict, throw error
   - **Recommendation**: Warn about conflict but use multi-repo mode (symlink = explicit intent).

---

## Future Enhancements (Out of Scope)

### Cross-Repo Task Dependencies

**Feature**: Track that "Frontend US1 is blocked by Backend US2"

**Implementation Ideas**:
- Add `dependencies` field to tasks.md frontmatter
- `/speck.status --all-repos` shows cross-repo blockers
- Contracts define handoff points

---

### Spec Versioning

**Feature**: Lock repos to specific version of shared spec

**Implementation Ideas**:
- Specs stored in git repo
- Symlinks point to specific commit: `specs/001-auth@v1.2.0/spec.md`
- `/speck.update-spec` pulls latest version

---

### Migration Automation

**Feature**: `/speck.migrate-to-multirepo` command

**Implementation**:
- Detects single-repo layout
- Prompts for new structure
- Moves `specs/` to parent directory
- Creates symlinks automatically
- Updates `.gitignore`

---

### IDE Integration

**Feature**: VSCode extension to visualize multi-repo relationships

**Implementation**:
- Shows which repos share a spec
- Highlights linked specs differently
- Jump to related repos' plans

---

## Conclusion

This design enables multi-repo and monorepo support through:

1. **Automatic detection** via `.speck/root` symlink
2. **Zero impact** on single-repo projects
3. **Unified UX** for multi-repo and monorepo
4. **Minimal changes** to existing codebase

**Implementation effort**: ~200 lines of new code, ~50 lines modified

**Risk**: Low (backward compatible, well-isolated changes)

**Value**: Unlocks Speck usage for teams with microservices, frontend/backend split, or monorepos while preserving constitutional principles per repository.
