# Contract: Link Command API

**Feature**: 007-multi-repo-monorepo-support
**Version**: 1.0.0
**Status**: Phase 1 Design

---

## Overview

This contract defines the TypeScript API for the `/speck.link` command, which creates a `.speck/root` symlink to enable multi-repo mode.

---

## API Specification

### linkRepo()

**Purpose**: Create a symlink from `.speck/root` to the speck root directory, enabling multi-repo mode.

**Signature**:

```typescript
export async function linkRepo(targetPath: string): Promise<void>
```

**Parameters**:
- `targetPath` (required): Relative or absolute path to the speck root directory (e.g., `..`, `../..`, `/Users/dev/my-product`)

**Behavior**:

| Scenario | Action | Output |
|----------|--------|--------|
| No existing symlink | Create new symlink | Success message with speck root path |
| Symlink exists, same target | No-op | "Already linked to [path]" |
| Symlink exists, different target | Update symlink (prompt user) | "Updated link from [old] to [new]" |
| .speck/root exists but not symlink | Error | "`.speck/root` exists but is not a symlink" |
| Target path does not exist | Error | "Target does not exist: [path]" |
| Target path is not a directory | Error | "Target is not a directory: [path]" |

**Algorithm**:

1. **Validate input**:
   - Check `targetPath` is not empty
   - Resolve to absolute path
   - Verify target directory exists

2. **Calculate relative symlink path**:
   - Compute relative path from `.speck/` directory to target
   - Use relative paths for portability

3. **Check existing symlink**:
   - If `.speck/root` exists and is symlink with same target → success (no-op)
   - If `.speck/root` exists and is symlink with different target → prompt to update
   - If `.speck/root` exists but not symlink → error

4. **Create symlink**:
   - Use `fs.symlink(relativePath, '.speck/root', 'dir')`

5. **Verify detection**:
   - Call `detectSpeckRoot()` to ensure multi-repo mode is active
   - If detection fails → error

6. **Report success**:
   - Display speck root path, specs directory
   - Suggest next steps (`/speck.specify`, `/speck.plan`)

---

## Implementation Example

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import { detectSpeckRoot } from './common/paths.ts';
import { getRepoRoot } from './common/paths.ts';

export async function linkRepo(targetPath: string): Promise<void> {
  // 1. Validate input
  if (!targetPath) {
    throw new Error(
      'Missing required argument: path-to-speck-root\n' +
      'Usage: /speck.link <path>\n' +
      'Example: /speck.link ..'
    );
  }

  const repoRoot = await getRepoRoot();
  const absoluteTarget = path.resolve(repoRoot, targetPath);

  // Verify target exists
  try {
    const stats = await fs.stat(absoluteTarget);
    if (!stats.isDirectory()) {
      throw new Error(`Target is not a directory: ${absoluteTarget}`);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`Target does not exist: ${absoluteTarget}`);
    }
    throw error;
  }

  // 2. Calculate relative path for portability
  const symlinkPath = path.join(repoRoot, '.speck', 'root');
  const symlinkDir = path.dirname(symlinkPath);
  const relativePath = path.relative(symlinkDir, absoluteTarget);

  // 3. Check existing symlink
  try {
    const stats = await fs.lstat(symlinkPath);

    if (!stats.isSymbolicLink()) {
      throw new Error(
        '.speck/root exists but is not a symlink\n' +
        'Fix: mv .speck/root .speck/root.backup && /speck.link ' + targetPath
      );
    }

    const currentTarget = await fs.readlink(symlinkPath);
    if (currentTarget === relativePath) {
      console.log(`Already linked to ${relativePath}`);
      return;
    }

    console.log(`Updating link from ${currentTarget} to ${relativePath}`);
    await fs.unlink(symlinkPath);

  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // Symlink does not exist - proceed to create
  }

  // 4. Create symlink
  await fs.symlink(relativePath, symlinkPath, 'dir');

  // 5. Verify detection
  const config = await detectSpeckRoot();
  if (config.mode !== 'multi-repo') {
    throw new Error(
      'Link created but multi-repo detection failed\n' +
      'This is a bug - please report it'
    );
  }

  // 6. Report success
  console.log('✓ Multi-repo mode enabled');
  console.log(`  Speck Root: ${config.speckRoot}`);
  console.log(`  Specs: ${config.specsDir}`);
  console.log('\nNext steps:');
  console.log('  1. Create specs: /speck.specify "Feature description"');
  console.log('  2. Generate plan: /speck.plan');
}
```

---

## Command Interface

### Slash Command: `/speck.link`

**File**: `.claude/commands/speck.link.md`

**YAML Frontmatter**:

```yaml
---
description: Link repository to multi-repo speck root
---
```

**Command Content**:

```markdown
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

---

## CLI Interface

**File**: `.speck/scripts/link-repo.ts`

**Entry Point**:

```typescript
// Parse command-line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('ERROR: Missing required argument: path-to-speck-root');
  console.error('Usage: bun run .speck/scripts/link-repo.ts <path>');
  console.error('Example: bun run .speck/scripts/link-repo.ts ..');
  process.exit(1);
}

const targetPath = args[0];

try {
  await linkRepo(targetPath);
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
```

---

## Usage Examples

### Example 1: Link Frontend to Parent Directory

**Setup**:
```
my-product/
├── specs/              # Central spec storage (empty initially)
└── frontend/           # Git repository
    └── .git/
```

**Command** (from `frontend/` directory):

```bash
/speck.link ..
```

**Output**:
```
✓ Multi-repo mode enabled
  Speck Root: /Users/dev/my-product
  Specs: /Users/dev/my-product/specs

Next steps:
  1. Create specs: /speck.specify "Feature description"
  2. Generate plan: /speck.plan
```

**Filesystem After**:
```
my-product/
├── specs/
└── frontend/
    ├── .git/
    └── .speck/
        └── root → ..   # Symlink created!
```

---

### Example 2: Link Monorepo Package to Root

**Setup**:
```
monorepo/
├── .git/
├── specs/              # Central spec storage
└── packages/
    ├── ui/
    └── api/
```

**Command** (from `packages/ui/` directory):

```bash
/speck.link ../..
```

**Output**:
```
✓ Multi-repo mode enabled
  Speck Root: /Users/dev/monorepo
  Specs: /Users/dev/monorepo/specs

Next steps:
  1. Create specs: /speck.specify "Feature description"
  2. Generate plan: /speck.plan
```

**Filesystem After**:
```
monorepo/
├── .git/
├── specs/
└── packages/
    ├── ui/
    │   └── .speck/
    │       └── root → ../..   # Symlink created!
    └── api/
```

---

### Example 3: Update Existing Link (New Target)

**Current State**:
```
frontend/.speck/root → ../old-location
```

**Command**:

```bash
/speck.link ../new-location
```

**Output**:
```
Updating link from ../old-location to ../new-location
✓ Multi-repo mode enabled
  Speck Root: /Users/dev/new-location
  Specs: /Users/dev/new-location/specs
```

---

## Error Handling Examples

### Error 1: Missing Argument

**Command**:
```bash
/speck.link
```

**Output**:
```
ERROR: Missing required argument: path-to-speck-root
Usage: /speck.link <path>
Example: /speck.link ..
```

---

### Error 2: Target Does Not Exist

**Command**:
```bash
/speck.link /nonexistent
```

**Output**:
```
ERROR: Target does not exist: /nonexistent
```

---

### Error 3: .speck/root Already Exists (Not Symlink)

**Current State**:
```
.speck/root  (regular file or directory)
```

**Command**:
```bash
/speck.link ..
```

**Output**:
```
ERROR: .speck/root exists but is not a symlink
Fix: mv .speck/root .speck/root.backup && /speck.link ..
```

---

## Validation Checklist

**Pre-Conditions**:
- [ ] Repository root can be detected (`.git/` exists)
- [ ] `.speck/` directory exists (created during Speck installation)
- [ ] Target path argument is provided

**Post-Conditions**:
- [ ] `.speck/root` symlink exists
- [ ] Symlink target is a relative path
- [ ] Symlink target directory exists
- [ ] `detectSpeckRoot()` returns `mode: 'multi-repo'`
- [ ] `config.speckRoot` points to correct directory

**Invariants**:
- [ ] Symlink is always relative (for portability)
- [ ] Symlink is always of type 'dir' (directory symlink)
- [ ] Creating symlink does not modify target directory

---

## Version History

- **1.0.0** (2025-11-17): Initial contract definition
