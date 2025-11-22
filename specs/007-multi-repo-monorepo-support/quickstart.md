# Quickstart: Implementing Multi-Repo and Monorepo Support

**Feature**: 007-multi-repo-monorepo-support
**Date**: 2025-11-17
**Audience**: Developers implementing this feature

---

## Overview

This guide provides step-by-step instructions for implementing multi-repo and monorepo support in Speck. Follow the implementation order to ensure correct layering and testability.

---

## Implementation Order

```
Phase 1: Core Detection
  └─> detectSpeckRoot() in paths.ts

Phase 2: Path Resolution
  └─> Update getFeaturePaths() in paths.ts
  └─> Update create-new-feature.ts

Phase 3: Link Command
  └─> linkRepo() in link-repo.ts
  └─> /speck.link command

Phase 4: Environment Display
  └─> Update /speck.env command

Phase 5: Testing
  └─> Unit tests (paths.test.ts)
  └─> Integration tests (multi-repo.test.ts)
  └─> E2E tests (single-repo, multi-repo, monorepo)
```

---

## Phase 1: Core Detection

### Step 1.1: Add SpeckConfig Interface

**File**: `.speck/scripts/common/paths.ts`

**Add to top of file**:

```typescript
export interface SpeckConfig {
  mode: 'single-repo' | 'multi-repo';
  speckRoot: string;     // Directory containing specs/
  repoRoot: string;      // Git repository root
  specsDir: string;      // Full path to specs/
}
```

---

### Step 1.2: Implement detectSpeckRoot()

**File**: `.speck/scripts/common/paths.ts`

**Add after imports**:

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';

// [SPECK-EXTENSION:START] Multi-repo detection
export async function detectSpeckRoot(): Promise<SpeckConfig> {
  const repoRoot = await getRepoRoot();
  const symlinkPath = path.join(repoRoot, '.speck', 'root');

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

    // Resolve symlink to absolute path
    const speckRoot = await fs.realpath(symlinkPath);

    // Verify target exists
    await fs.access(speckRoot);

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
      throw new Error(
        'Multi-repo configuration broken: .speck/root contains circular reference\n' +
        'Fix: rm .speck/root && /speck.link <valid-path>'
      );
    }

    // Broken symlink (target does not exist)
    const target = await fs.readlink(symlinkPath).catch(() => 'unknown');
    throw new Error(
      `Multi-repo configuration broken: .speck/root → ${target} (does not exist)\n` +
      'Fix:\n' +
      '  1. Remove broken symlink: rm .speck/root\n' +
      '  2. Link to correct location: /speck.link <path-to-speck-root>'
    );
  }
}
// [SPECK-EXTENSION:END]
```

**Testing**:

```bash
# Create test symlink
mkdir -p /tmp/test-speck-root/specs
cd /tmp/test-repo
mkdir -p .speck
ln -s /tmp/test-speck-root .speck/root

# Run detection (in Bun REPL or test file)
const config = await detectSpeckRoot();
console.log(config);
// Should show: mode: 'multi-repo', speckRoot: '/tmp/test-speck-root'
```

---

## Phase 2: Path Resolution

### Step 2.1: Update FeaturePaths Interface

**File**: `.speck/scripts/common/paths.ts`

**Modify existing FeaturePaths interface**:

```typescript
export interface FeaturePaths {
  // NEW: Mode and root paths
  MODE: 'single-repo' | 'multi-repo';
  REPO_ROOT: string;
  SPECK_ROOT: string;
  SPECS_DIR: string;

  // Existing fields
  FEATURE_DIR: string;
  SPEC_FILE: string;
  PLAN_FILE: string;
  TASKS_FILE: string;
  CONTRACTS_DIR: string;
  CONSTITUTION: string;
  TEMPLATES_DIR: string;
  // ... other existing fields
}
```

---

### Step 2.2: Update getFeaturePaths()

**File**: `.speck/scripts/common/paths.ts`

**Find existing getFeaturePaths() and modify**:

```typescript
// [SPECK-EXTENSION:START] Multi-repo path resolution
export async function getFeaturePaths(branchName?: string): Promise<FeaturePaths> {
  const config = await detectSpeckRoot();
  const branch = branchName || await getCurrentBranch(config.repoRoot);

  // Find feature directory (may need prefix matching)
  const featureDir = await findFeatureDirByPrefix(config.specsDir, branch);
  const featureName = path.basename(featureDir);

  return {
    MODE: config.mode,
    REPO_ROOT: config.repoRoot,
    SPECK_ROOT: config.speckRoot,
    SPECS_DIR: config.specsDir,

    // Feature-specific paths
    FEATURE_DIR: featureDir,
    SPEC_FILE: path.join(featureDir, 'spec.md'),  // Uses specsDir (shared in multi-repo)
    PLAN_FILE: path.join(config.repoRoot, 'specs', featureName, 'plan.md'),  // Always local
    TASKS_FILE: path.join(config.repoRoot, 'specs', featureName, 'tasks.md'),  // Always local
    CONTRACTS_DIR: path.join(featureDir, 'contracts'),  // Uses specsDir (shared in multi-repo)

    // Repository-specific paths
    CONSTITUTION: path.join(config.repoRoot, '.speck', 'constitution.md'),  // Always local
    TEMPLATES_DIR: await getTemplatesDir(),  // Existing function

    // ... preserve other existing fields
  };
}
// [SPECK-EXTENSION:END]
```

**Testing**:

```bash
# Test in single-repo
cd /tmp/single-repo
const paths = await getFeaturePaths('001-test');
console.log(paths.MODE);  // 'single-repo'
console.log(paths.SPEC_FILE);  // Contains REPO_ROOT

# Test in multi-repo
cd /tmp/multi-repo/frontend
const paths = await getFeaturePaths('001-test');
console.log(paths.MODE);  // 'multi-repo'
console.log(paths.SPEC_FILE);  // Contains SPECK_ROOT (not REPO_ROOT!)
```

---

### Step 2.3: Update create-new-feature.ts

**File**: `.speck/scripts/create-new-feature.ts`

**Find line ~358 (hardcoded specs path) and replace**:

```typescript
// OLD:
// const specsDir = path.join(repoRoot, "specs");

// NEW:
// [SPECK-EXTENSION:START] Use detected specs directory
const config = await detectSpeckRoot();
const specsDir = config.specsDir;
// [SPECK-EXTENSION:END]
```

**Testing**:

```bash
# Test creating feature in multi-repo mode
cd /tmp/multi-repo/frontend
bun run .speck/scripts/create-new-feature.ts "Test feature"

# Verify spec.md created at speck root
ls /tmp/multi-repo/specs/001-test-feature/spec.md  # Should exist
```

---

## Phase 3: Link Command

### Step 3.1: Create link-repo.ts Script

**File**: `.speck/scripts/link-repo.ts` (NEW)

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import { detectSpeckRoot, getRepoRoot } from './common/paths.ts';

// [SPECK-EXTENSION:START] Multi-repo link command
export async function linkRepo(targetPath: string): Promise<void> {
  if (!targetPath) {
    throw new Error(
      'Missing required argument: path-to-speck-root\n' +
      'Usage: /speck.link <path>\n' +
      'Example: /speck.link ..'
    );
  }

  const repoRoot = await getRepoRoot();
  const absoluteTarget = path.resolve(repoRoot, targetPath);

  // Verify target exists and is directory
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

  // Calculate relative path
  const symlinkPath = path.join(repoRoot, '.speck', 'root');
  const symlinkDir = path.dirname(symlinkPath);
  const relativePath = path.relative(symlinkDir, absoluteTarget);

  // Check existing symlink
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
    if (error.code !== 'ENOENT') throw error;
  }

  // Create symlink
  await fs.symlink(relativePath, symlinkPath, 'dir');

  // Verify detection
  const config = await detectSpeckRoot();
  if (config.mode !== 'multi-repo') {
    throw new Error('Link created but detection failed - this is a bug');
  }

  // Report success
  console.log('✓ Multi-repo mode enabled');
  console.log(`  Speck Root: ${config.speckRoot}`);
  console.log(`  Specs: ${config.specsDir}`);
  console.log('\nNext steps:');
  console.log('  1. Create specs: /speck.specify "Feature description"');
  console.log('  2. Generate plan: /speck.plan');
}
// [SPECK-EXTENSION:END]

// CLI entry point
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('ERROR: Missing argument');
  console.error('Usage: bun run .speck/scripts/link-repo.ts <path>');
  process.exit(1);
}

try {
  await linkRepo(args[0]);
} catch (error: any) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
```

**Testing**:

```bash
# Create test setup
mkdir -p /tmp/multi-test/specs
mkdir -p /tmp/multi-test/frontend
cd /tmp/multi-test/frontend

# Run link command
bun run ../../speck/.speck/scripts/link-repo.ts ..

# Verify symlink created
ls -la .speck/root  # Should show: root -> ..

# Verify detection
bun -e 'import {detectSpeckRoot} from "../../speck/.speck/scripts/common/paths.ts"; console.log(await detectSpeckRoot())'
# Should show: mode: 'multi-repo'
```

---

### Step 3.2: Create /speck.link Command

**File**: `.claude/commands/speck.link.md` (NEW)

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

```bash
bun run $PLUGIN_ROOT/scripts/link-repo.ts {{args}}
```
```

**Testing**:

```bash
# From Claude Code
/speck.link ..

# Should create symlink and display success message
```

---

## Phase 4: Environment Display

### Step 4.1: Update /speck.env Command

**File**: `.claude/commands/speck.env.md`

**Add after existing environment checks**:

```markdown
## Multi-Repo Configuration

```typescript
import { detectSpeckRoot } from '$PLUGIN_ROOT/scripts/common/paths.ts';

const config = await detectSpeckRoot();

console.log('=== Speck Configuration ===');
console.log(`Mode: ${config.mode === 'single-repo' ? 'Single-repo' : 'Multi-repo'}`);

if (config.mode === 'multi-repo') {
  console.log(`Speck Root: ${config.speckRoot}`);
  console.log(`Repo Root: ${config.repoRoot}`);
  console.log(`Specs Directory: ${config.specsDir}`);
  console.log('\n=== Linked Configuration ===');

  // Show symlink info
  const symlinkPath = path.join(config.repoRoot, '.speck', 'root');
  const target = await fs.readlink(symlinkPath);
  console.log(`.speck/root → ${target} (valid)`);
} else {
  console.log(`Repo Root: ${config.repoRoot}`);
  console.log(`Specs Directory: ${config.specsDir}`);
}
```
```

**Testing**:

```bash
# Single-repo
cd /tmp/single-repo
/speck.env
# Should show: Mode: Single-repo

# Multi-repo
cd /tmp/multi-repo/frontend
/speck.env
# Should show: Mode: Multi-repo, Speck Root: ..., .speck/root → ..
```

---

## Phase 5: Testing

### Step 5.1: Unit Tests

**File**: `tests/unit/paths.test.ts` (NEW)

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { detectSpeckRoot } from '../../.speck/scripts/common/paths.ts';

describe('detectSpeckRoot', () => {
  const testDir = '/tmp/speck-test-' + Date.now();

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, '.speck'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.git'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('single-repo: no symlink present', async () => {
    process.chdir(testDir);
    const config = await detectSpeckRoot();

    expect(config.mode).toBe('single-repo');
    expect(config.speckRoot).toBe(testDir);
    expect(config.repoRoot).toBe(testDir);
    expect(config.specsDir).toBe(path.join(testDir, 'specs'));
  });

  test('multi-repo: valid symlink', async () => {
    const speckRoot = path.join(testDir, 'speck-root');
    await fs.mkdir(speckRoot, { recursive: true });

    const symlinkPath = path.join(testDir, '.speck', 'root');
    await fs.symlink(speckRoot, symlinkPath, 'dir');

    process.chdir(testDir);
    const config = await detectSpeckRoot();

    expect(config.mode).toBe('multi-repo');
    expect(config.speckRoot).toBe(speckRoot);
    expect(config.repoRoot).toBe(testDir);
  });

  test('broken symlink throws error', async () => {
    const symlinkPath = path.join(testDir, '.speck', 'root');
    await fs.symlink('/nonexistent', symlinkPath, 'dir');

    process.chdir(testDir);
    await expect(detectSpeckRoot()).rejects.toThrow('does not exist');
  });
});
```

**Run tests**:

```bash
bun test tests/unit/paths.test.ts
```

---

### Step 5.2: Integration Tests

**File**: `tests/integration/multi-repo.test.ts` (NEW)

```typescript
import { describe, test, expect } from 'bun:test';
import { setupMultiRepoTest, cleanupTest } from './test-helpers.ts';
import { linkRepo } from '../../.speck/scripts/link-repo.ts';
import { detectSpeckRoot } from '../../.speck/scripts/common/paths.ts';

describe('Multi-repo workflow', () => {
  test('link frontend to speck root', async () => {
    const { speckRoot, frontend } = await setupMultiRepoTest();

    process.chdir(frontend);
    await linkRepo('..');

    const config = await detectSpeckRoot();
    expect(config.mode).toBe('multi-repo');
    expect(config.speckRoot).toBe(speckRoot);

    await cleanupTest(speckRoot);
  });

  test('generate plans in multiple repos from shared spec', async () => {
    // Setup: speck root with spec.md, two linked repos
    // Execute: /speck.plan in repo1, /speck.plan in repo2
    // Assert: two different plan.md files (local), same spec.md (shared)
  });
});
```

**Run tests**:

```bash
bun test tests/integration/multi-repo.test.ts
```

---

### Step 5.3: End-to-End Tests

**File**: `tests/e2e/single-repo.test.ts`, `multi-repo.test.ts`, `monorepo.test.ts`

```typescript
// Test complete workflows
describe('Single-repo E2E', () => {
  test('full workflow unchanged', async () => {
    // Execute: /speck.specify, /speck.plan, /speck.tasks
    // Assert: all files in local specs/
  });
});

describe('Multi-repo E2E', () => {
  test('setup and workflow', async () => {
    // Setup: create speck root + linked repos
    // Execute: /speck.specify from frontend, /speck.plan in both repos
    // Assert: shared spec, separate plans
  });
});
```

**Run all tests**:

```bash
bun test
```

---

## Rollout Checklist

### Pre-Implementation

- [ ] Read spec.md, design.md, ux-flows.md, research.md
- [ ] Review data-model.md and contracts/
- [ ] Set up test environment

### Phase 1 (Detection)

- [ ] Add SpeckConfig interface
- [ ] Implement detectSpeckRoot()
- [ ] Write unit tests for detection
- [ ] Test single-repo detection (no symlink)
- [ ] Test multi-repo detection (valid symlink)
- [ ] Test error cases (broken symlink, circular symlink)

### Phase 2 (Path Resolution)

- [ ] Update FeaturePaths interface
- [ ] Modify getFeaturePaths() to use detectSpeckRoot()
- [ ] Update create-new-feature.ts to use config.specsDir
- [ ] Test path resolution in both modes
- [ ] Verify spec.md uses speck root in multi-repo
- [ ] Verify plan.md/tasks.md always use repo root

### Phase 3 (Link Command)

- [ ] Implement linkRepo() in link-repo.ts
- [ ] Add CLI entry point
- [ ] Create /speck.link slash command
- [ ] Test linking to parent directory
- [ ] Test linking to nested directory (monorepo)
- [ ] Test updating existing link
- [ ] Test error cases (missing target, not symlink)

### Phase 4 (Environment Display)

- [ ] Update /speck.env to show mode
- [ ] Display speck root and repo root in multi-repo mode
- [ ] Show symlink status
- [ ] Test output in both modes

### Phase 5 (Testing)

- [ ] Write unit tests (paths.test.ts)
- [ ] Write integration tests (multi-repo.test.ts)
- [ ] Write E2E tests (single-repo, multi-repo, monorepo)
- [ ] Run full test suite
- [ ] Verify SC-001 (100% single-repo compatibility)
- [ ] Verify SC-004 (<10ms overhead)

### Documentation

- [ ] Update CLAUDE.md with multi-repo patterns
- [ ] Document .gitignore recommendations
- [ ] Add migration guide (single-repo → multi-repo)
- [ ] Document Windows support (Developer Mode/WSL)

### Quality Gates

- [ ] All tests passing
- [ ] No regressions in single-repo mode
- [ ] Multi-repo detection <10ms overhead
- [ ] Constitution Check passed (re-evaluated)
- [ ] Code review complete

---

## Troubleshooting

### Issue: Symlink creation fails on Windows

**Solution**: Enable Developer Mode or use WSL

```powershell
# Enable Developer Mode (PowerShell as Admin)
Set-ItemProperty -Path HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock -Name AllowDevelopmentWithoutDevLicense -Value 1
```

---

### Issue: detectSpeckRoot() returns single-repo when it should be multi-repo

**Debug**:

```typescript
const symlinkPath = path.join(repoRoot, '.speck', 'root');
const stats = await fs.lstat(symlinkPath);
console.log('Is symlink?', stats.isSymbolicLink());
const target = await fs.readlink(symlinkPath);
console.log('Target:', target);
```

---

### Issue: Circular symlink not detected

**Verify**:

```bash
realpath .speck/root
# Should throw: "Too many levels of symbolic links"
```

---

## Next Steps

After completing implementation:

1. Run `/speck.analyze` to verify cross-artifact consistency
2. Run `/speck.tasks` to generate task breakdown
3. Begin implementation starting with Phase 1

---

## References

- [spec.md](spec.md): Feature specification
- [design.md](design.md): Architecture details
- [data-model.md](data-model.md): Entities and relationships
- [contracts/path-resolution-api.md](contracts/path-resolution-api.md): API contract
- [contracts/link-command-api.md](contracts/link-command-api.md): Command contract
