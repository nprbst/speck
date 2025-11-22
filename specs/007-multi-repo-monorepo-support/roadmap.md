# Implementation Roadmap: Multi-Repo and Monorepo Support

**Feature**: 007-multi-repo-monorepo-support
**Created**: 2025-11-17
**Status**: Planning

---

## Executive Summary

**Goal**: Enable Speck to support features spanning multiple repositories and monorepo packages while maintaining zero impact on single-repo workflows.

**Approach**: Symlink-based detection with minimal code changes (1 new command, ~200 lines new code, ~50 lines modified).

**Estimated Effort**: 3-5 days (1 developer)

**Risk Level**: Low (backward compatible, isolated changes)

---

## Milestones

### Milestone 1: Core Detection Infrastructure
**Duration**: 1 day
**Dependencies**: None
**Deliverables**: Path resolution works in both modes

### Milestone 2: Link Command & UX
**Duration**: 1 day
**Dependencies**: M1
**Deliverables**: Users can set up multi-repo mode

### Milestone 3: Testing & Validation
**Duration**: 1 day
**Dependencies**: M2
**Deliverables**: Comprehensive test coverage

### Milestone 4: Documentation & Migration
**Duration**: 1 day
**Dependencies**: M3
**Deliverables**: User-facing docs, migration guides

### Milestone 5: Polish & Release
**Duration**: 0.5 days
**Dependencies**: M4
**Deliverables**: Feature ready for production

---

## Detailed Phase Breakdown

---

## Phase 1: Core Detection Infrastructure

**Goal**: Implement automatic multi-repo detection without breaking single-repo behavior.

### Tasks

#### Task 1.1: Add Detection Function
**File**: `.speck/scripts/common/paths.ts`
**Estimated Time**: 2 hours

**Implementation**:

```typescript
export interface SpeckConfig {
  mode: 'single-repo' | 'multi-repo';
  speckRoot: string;
  repoRoot: string;
  specsDir: string;
}

export async function detectSpeckRoot(): Promise<SpeckConfig> {
  const repoRoot = await getRepoRoot();
  const symlinkPath = path.join(repoRoot, '.speck', 'root');

  // Check if .speck/root exists and is a symlink
  if (await exists(symlinkPath)) {
    const stats = await fs.lstat(symlinkPath);

    if (stats.isSymbolicLink()) {
      // Multi-repo mode
      try {
        const speckRoot = await fs.realpath(symlinkPath);

        // Validate speck root exists
        if (!await exists(speckRoot)) {
          throw new Error(
            `Multi-repo broken: .speck/root → ${speckRoot} (does not exist)\n` +
            `Fix: rm .speck/root && /speck.link <path-to-speck-root>`
          );
        }

        return {
          mode: 'multi-repo',
          speckRoot,
          repoRoot,
          specsDir: path.join(speckRoot, 'specs')
        };
      } catch (error) {
        // Broken symlink
        throw new Error(
          `Multi-repo configuration broken: ${error.message}\n` +
          `Fix: rm .speck/root && /speck.link <path-to-speck-root>`
        );
      }
    } else {
      // .speck/root exists but is not a symlink (warn and ignore)
      console.warn(
        `WARNING: .speck/root exists but is not a symlink\n` +
        `Expected: symlink to speck root\n` +
        `Using single-repo mode`
      );
    }
  }

  // Single-repo mode (default)
  return {
    mode: 'single-repo',
    speckRoot: repoRoot,
    repoRoot,
    specsDir: path.join(repoRoot, 'specs')
  };
}
```

**Acceptance Criteria**:
- ✓ Returns single-repo config when no `.speck/root` exists
- ✓ Returns multi-repo config when valid symlink exists
- ✓ Throws error when symlink is broken
- ✓ Warns when `.speck/root` is not a symlink

---

#### Task 1.2: Update `getFeaturePaths()`
**File**: `.speck/scripts/common/paths.ts`
**Estimated Time**: 1 hour

**Changes**:

```typescript
export interface FeaturePaths {
  REPO_ROOT: string;
  SPECK_ROOT: string;        // NEW
  SPECS_DIR: string;         // NEW
  MODE: 'single-repo' | 'multi-repo';  // NEW
  FEATURE_DIR: string;
  SPEC_FILE: string;
  PLAN_FILE: string;
  TASKS_FILE: string;
  CONSTITUTION_FILE: string;
  // ... rest unchanged
}

export async function getFeaturePaths(): Promise<FeaturePaths> {
  const config = await detectSpeckRoot();
  const currentBranch = await getCurrentBranch(config.repoRoot);

  // Find feature directory in specs/ (at speck root)
  const featureDir = findFeatureDirByPrefix(config.specsDir, currentBranch);

  return {
    REPO_ROOT: config.repoRoot,
    SPECK_ROOT: config.speckRoot,
    SPECS_DIR: config.specsDir,
    MODE: config.mode,
    FEATURE_DIR: featureDir,
    SPEC_FILE: path.join(featureDir, "spec.md"),
    PLAN_FILE: path.join(featureDir, "plan.md"),
    TASKS_FILE: path.join(featureDir, "tasks.md"),
    CONSTITUTION_FILE: path.join(config.repoRoot, ".speck", "constitution.md"),
    // ... rest using config.speckRoot or config.repoRoot appropriately
  };
}
```

**Acceptance Criteria**:
- ✓ Returns correct paths for single-repo mode
- ✓ Returns correct paths for multi-repo mode
- ✓ Constitution path always uses `repoRoot`
- ✓ Spec path uses `speckRoot`

---

#### Task 1.3: Update `findFeatureDirByPrefix()`
**File**: `.speck/scripts/common/paths.ts`
**Estimated Time**: 30 minutes

**Changes**:

```typescript
// OLD signature
export function findFeatureDirByPrefix(branchName: string): string

// NEW signature
export function findFeatureDirByPrefix(specsDir: string, branchName: string): string {
  // Use specsDir instead of hardcoded repoRoot + "specs"
  const features = fs.readdirSync(specsDir);
  // ... rest of logic unchanged
}
```

**Acceptance Criteria**:
- ✓ Accepts `specsDir` as first parameter
- ✓ Searches in correct directory (speck root in multi-repo mode)

---

#### Task 1.4: Update `create-new-feature.ts`
**File**: `.speck/scripts/create-new-feature.ts`
**Estimated Time**: 30 minutes

**Changes** (around line 358):

```typescript
// OLD
const specsDir = path.join(repoRoot, "specs");

// NEW
const config = await detectSpeckRoot();
const specsDir = config.specsDir;
```

**Acceptance Criteria**:
- ✓ Creates specs at speck root in multi-repo mode
- ✓ Creates specs at repo root in single-repo mode

---

#### Task 1.5: Write Unit Tests for Detection
**File**: `tests/unit/detection.test.ts` (new file)
**Estimated Time**: 2 hours

**Test Cases**:

```typescript
describe('detectSpeckRoot', () => {
  test('single-repo: no symlink', async () => {
    // Setup: repo with no .speck/root
    const config = await detectSpeckRoot();
    expect(config.mode).toBe('single-repo');
    expect(config.speckRoot).toBe(config.repoRoot);
  });

  test('multi-repo: valid symlink', async () => {
    // Setup: create .speck/root → ../
    const config = await detectSpeckRoot();
    expect(config.mode).toBe('multi-repo');
    expect(config.speckRoot).not.toBe(config.repoRoot);
  });

  test('multi-repo: broken symlink throws error', async () => {
    // Setup: symlink to nonexistent dir
    await expect(detectSpeckRoot()).rejects.toThrow('broken');
  });

  test('single-repo: .speck/root is regular file', async () => {
    // Setup: create regular file .speck/root
    const config = await detectSpeckRoot();
    expect(config.mode).toBe('single-repo');
    // Should have warned
  });
});

describe('getFeaturePaths', () => {
  test('single-repo: paths use repo root', async () => {
    const paths = await getFeaturePaths();
    expect(paths.SPECS_DIR).toContain('/specs');
    expect(paths.MODE).toBe('single-repo');
  });

  test('multi-repo: spec at speck root, plan at repo root', async () => {
    // Setup: multi-repo structure
    const paths = await getFeaturePaths();
    expect(paths.SPEC_FILE).toContain(paths.SPECK_ROOT);
    expect(paths.PLAN_FILE).toContain(paths.REPO_ROOT);
  });
});
```

**Acceptance Criteria**:
- ✓ All detection scenarios covered
- ✓ Path resolution tested for both modes
- ✓ Error cases tested

---

**Phase 1 Completion Criteria**:
- ✓ Detection function works correctly
- ✓ All existing commands use new path resolution
- ✓ Unit tests pass
- ✓ Single-repo behavior unchanged (verified by tests)

**Phase 1 Risks**:
- Risk: Breaking existing single-repo behavior
  - Mitigation: Comprehensive unit tests for single-repo mode
- Risk: Performance regression from additional filesystem calls
  - Mitigation: Benchmark detection overhead (<10ms acceptable)

---

## Phase 2: Link Command & UX

**Goal**: Provide `/speck.link` command for users to set up multi-repo mode.

### Tasks

#### Task 2.1: Implement Link Script
**File**: `.speck/scripts/link-repo.ts` (new file)
**Estimated Time**: 3 hours

**Implementation**:

```typescript
#!/usr/bin/env bun
import { $ } from "bun";
import * as fs from "fs/promises";
import * as path from "path";

async function linkRepo(targetPath: string) {
  // 1. Validate arguments
  if (!targetPath) {
    console.error("ERROR: Missing required argument: path-to-speck-root");
    console.error("Usage: /speck.link <path>");
    console.error("Example: /speck.link ..");
    process.exit(1);
  }

  // 2. Resolve paths
  const repoRoot = process.cwd(); // Assume running from repo root
  const symlinkPath = path.join(repoRoot, ".speck", "root");
  const absoluteTarget = path.resolve(targetPath);

  // 3. Validate target exists
  try {
    await fs.access(absoluteTarget);
  } catch {
    console.error(`ERROR: Target does not exist: ${absoluteTarget}`);
    process.exit(1);
  }

  // 4. Calculate relative path (for portability)
  const symlinkDir = path.dirname(symlinkPath);
  const relativePath = path.relative(symlinkDir, absoluteTarget);

  // 5. Check if symlink already exists
  try {
    const stats = await fs.lstat(symlinkPath);
    if (stats.isSymbolicLink()) {
      const currentTarget = await fs.readlink(symlinkPath);
      if (currentTarget === relativePath) {
        console.log(`✓ Already linked to ${relativePath}`);
        return;
      }
      // Update existing symlink
      console.log(`Updating link from ${currentTarget} to ${relativePath}`);
      await fs.unlink(symlinkPath);
    } else {
      console.error(`ERROR: .speck/root exists but is not a symlink`);
      process.exit(1);
    }
  } catch (error) {
    // Symlink doesn't exist, proceed to create
  }

  // 6. Create symlink
  await fs.symlink(relativePath, symlinkPath, "dir");

  // 7. Verify detection
  const { detectSpeckRoot } = await import("./common/paths.ts");
  const config = await detectSpeckRoot();

  if (config.mode !== "multi-repo") {
    console.error("ERROR: Link created but detection failed");
    process.exit(1);
  }

  // 8. Report success
  console.log("✓ Multi-repo mode enabled");
  console.log(`  Speck Root: ${config.speckRoot}`);
  console.log(`  Specs: ${config.specsDir}`);
  console.log();
  console.log("Next steps:");
  console.log("  1. Create specs: /speck.specify \"Feature description\"");
  console.log("  2. Generate plan: /speck.plan");
}

// Parse command-line arguments
const targetPath = process.argv[2];
await linkRepo(targetPath);
```

**Acceptance Criteria**:
- ✓ Creates relative symlink
- ✓ Validates target directory exists
- ✓ Handles existing symlink (update or skip)
- ✓ Provides clear error messages
- ✓ Verifies detection after creation

---

#### Task 2.2: Create Slash Command
**File**: `.claude/commands/speck.link.md` (new file)
**Estimated Time**: 30 minutes

**Content**:

```markdown
---
description: Link repository to multi-repo speck root
---

# Link Repository to Multi-Repo Speck Root

Creates a `.speck/root` symlink to enable multi-repo mode.

## Usage

/speck.link <path-to-speck-root>

## Examples

**From frontend repo in `my-product/` directory:**
```bash
/speck.link ..
```

**From nested monorepo package:**
```bash
/speck.link ../..
```

## What This Does

1. Creates symlink: `.speck/root` → `<path>`
2. Enables multi-repo mode (automatic detection)
3. Specs now read/written to `<path>/specs/`
4. Plans/tasks remain local to this repo

## Notes

- Use relative paths for portability
- Each repository must link independently
- Remove symlink with `rm .speck/root` to revert to single-repo mode

## Implementation

```bash
bun run $PLUGIN_ROOT/scripts/link-repo.ts {{args}}
```
```

**Acceptance Criteria**:
- ✓ Command documented with examples
- ✓ Explains what happens
- ✓ Shows how to undo (remove symlink)

---

#### Task 2.3: Enhance `/speck.env` Command
**File**: `.claude/commands/speck.env.md`
**Estimated Time**: 1 hour

**Changes**:

Add section after existing checks:

```bash
echo ""
echo "=== Speck Configuration ==="
bun run $PLUGIN_ROOT/scripts/show-config.ts
```

**New File**: `.speck/scripts/show-config.ts`

```typescript
import { detectSpeckRoot } from "./common/paths.ts";

const config = await detectSpeckRoot();

console.log(`Mode: ${config.mode === 'single-repo' ? 'Single-repo' : 'Multi-repo'}`);
console.log(`Speck Root: ${config.speckRoot}`);
if (config.mode === 'multi-repo') {
  console.log(`Repo Root: ${config.repoRoot}`);
  console.log(`Linked via: .speck/root`);
}
console.log(`Specs Directory: ${config.specsDir}`);
```

**Acceptance Criteria**:
- ✓ Shows mode (single-repo or multi-repo)
- ✓ Shows relevant paths
- ✓ Clear indication of multi-repo configuration

---

#### Task 2.4: Integration Tests for Link Command
**File**: `tests/integration/link-command.test.ts` (new file)
**Estimated Time**: 2 hours

**Test Cases**:

```typescript
describe('/speck.link command', () => {
  test('links repo to parent directory', async () => {
    // Setup: create parent with specs/, child repo
    // Execute: bun run link-repo.ts ..
    // Assert: .speck/root symlink created, detection works
  });

  test('updates existing symlink', async () => {
    // Setup: existing .speck/root → ../old
    // Execute: bun run link-repo.ts ../new
    // Assert: symlink updated to ../new
  });

  test('errors when target does not exist', async () => {
    // Execute: bun run link-repo.ts /nonexistent
    // Assert: exits with error
  });

  test('errors when .speck/root is regular file', async () => {
    // Setup: create regular file .speck/root
    // Execute: bun run link-repo.ts ..
    // Assert: exits with error
  });
});
```

**Acceptance Criteria**:
- ✓ All link scenarios tested
- ✓ Error cases handled gracefully

---

**Phase 2 Completion Criteria**:
- ✓ `/speck.link` command works
- ✓ `/speck.env` shows configuration
- ✓ Integration tests pass
- ✓ User can set up multi-repo mode in <2 minutes

**Phase 2 Risks**:
- Risk: Symlinks don't work on Windows
  - Mitigation: Document WSL requirement, consider copy-mode fallback in future
- Risk: Users confused about relative paths
  - Mitigation: Clear examples in command help

---

## Phase 3: Testing & Validation

**Goal**: Ensure all Speck commands work correctly in both modes.

### Tasks

#### Task 3.1: End-to-End Single-Repo Tests
**File**: `tests/e2e/single-repo.test.ts`
**Estimated Time**: 2 hours

**Test Workflow**:

```typescript
describe('Single-repo workflow (unchanged)', () => {
  test('complete feature workflow', async () => {
    // Setup: clean repo
    // Execute: /speck.specify, /speck.plan, /speck.tasks
    // Assert: all files in local specs/
    // Assert: no .speck/root created
  });

  test('existing projects work without changes', async () => {
    // Setup: existing repo with specs/
    // Execute: /speck.plan on existing spec
    // Assert: plan.md generated correctly
    // Assert: behavior identical to pre-multi-repo version
  });
});
```

**Acceptance Criteria**:
- ✓ All single-repo workflows work identically to current version
- ✓ No new files created
- ✓ No performance regression

---

#### Task 3.2: End-to-End Multi-Repo Tests
**File**: `tests/e2e/multi-repo.test.ts`
**Estimated Time**: 3 hours

**Test Workflow**:

```typescript
describe('Multi-repo workflow', () => {
  test('shared spec, separate plans', async () => {
    // Setup: speck root with specs/, two linked repos
    // Execute: /speck.specify in repo1
    // Assert: spec.md created at speck root
    // Execute: /speck.plan in repo1, /speck.plan in repo2
    // Assert: two different plan.md files
    // Assert: both read same spec.md
  });

  test('constitution check per repo', async () => {
    // Setup: shared spec, different constitutions
    // Execute: /speck.plan in both repos
    // Assert: different constitution checks
  });

  test('git commits only local files', async () => {
    // Setup: multi-repo with generated plans
    // Execute: git status in repo1
    // Assert: plan.md shown, spec.md (symlink) not shown
  });
});
```

**Acceptance Criteria**:
- ✓ Multi-repo workflows function correctly
- ✓ Spec sharing works
- ✓ Plans remain local

---

#### Task 3.3: End-to-End Monorepo Tests
**File**: `tests/e2e/monorepo.test.ts`
**Estimated Time**: 2 hours

**Test Workflow**:

```typescript
describe('Monorepo workflow', () => {
  test('packages link to monorepo root', async () => {
    // Setup: monorepo with packages/ui, packages/api
    // Execute: /speck.link ../.. in each package
    // Assert: both linked to monorepo root
  });

  test('shared spec, package-specific plans', async () => {
    // Execute: /speck.specify in packages/ui
    // Assert: spec.md at monorepo root
    // Execute: /speck.plan in ui, /speck.plan in api
    // Assert: different plans based on package constitutions
  });
});
```

**Acceptance Criteria**:
- ✓ Monorepo setup works
- ✓ Behavior identical to multi-repo

---

#### Task 3.4: Backward Compatibility Validation
**File**: `tests/regression/backward-compat.test.ts`
**Estimated Time**: 2 hours

**Test Cases**:

```typescript
describe('Backward compatibility', () => {
  test('existing repos work without migration', async () => {
    // Setup: clone existing Speck project
    // Execute: all standard commands
    // Assert: no errors, identical behavior
  });

  test('plugin upgrade preserves existing workflows', async () => {
    // Setup: repo with old plugin version
    // Execute: upgrade plugin
    // Execute: standard commands
    // Assert: no breaking changes
  });
});
```

**Acceptance Criteria**:
- ✓ Zero breaking changes for existing users
- ✓ All existing projects work after upgrade

---

**Phase 3 Completion Criteria**:
- ✓ All test suites pass
- ✓ Test coverage >90%
- ✓ No regressions detected
- ✓ Performance benchmarks met (<10ms overhead)

**Phase 3 Risks**:
- Risk: Edge cases not covered by tests
  - Mitigation: Manual testing with real-world repos
- Risk: Performance issues in large monorepos
  - Mitigation: Benchmark with repo containing 50+ packages

---

## Phase 4: Documentation & Migration

**Goal**: Provide comprehensive user-facing documentation.

### Tasks

#### Task 4.1: Update README
**File**: `README.md`
**Estimated Time**: 1 hour

**New Section**:

```markdown
## Multi-Repo & Monorepo Support

Speck supports features spanning multiple repositories or monorepo packages.

### Quick Start

**Multi-Repo Setup:**
```bash
cd my-product/frontend
/speck.link ..

cd ../backend
/speck.link ..
```

**Monorepo Setup:**
```bash
cd monorepo/packages/ui
/speck.link ../..

cd ../api
/speck.link ../..
```

See [Multi-Repo Guide](docs/multi-repo-guide.md) for details.
```

**Acceptance Criteria**:
- ✓ README mentions multi-repo support
- ✓ Links to detailed guide

---

#### Task 4.2: Create Multi-Repo Guide
**File**: `docs/multi-repo-guide.md` (new file)
**Estimated Time**: 2 hours

**Sections**:
1. **When to Use Multi-Repo Mode**
2. **Directory Structure Examples**
3. **Setup Instructions**
4. **Workflow Examples**
5. **Migration from Single-Repo**
6. **Troubleshooting**

**Acceptance Criteria**:
- ✓ Step-by-step setup instructions
- ✓ Real-world examples
- ✓ Troubleshooting section

---

#### Task 4.3: Create Migration Guide
**File**: `docs/migration-to-multi-repo.md` (new file)
**Estimated Time**: 1 hour

**Content**: Step-by-step instructions for converting existing single-repo to multi-repo.

**Acceptance Criteria**:
- ✓ Clear migration steps
- ✓ Before/after directory structures
- ✓ Validation steps

---

#### Task 4.4: Update Changelog
**File**: `CHANGELOG.md`
**Estimated Time**: 30 minutes

**Entry**:

```markdown
## [2.0.0] - YYYY-MM-DD

### Added
- Multi-repo and monorepo support via symlink-based detection
- `/speck.link` command to enable multi-repo mode
- Enhanced `/speck.env` to show configuration mode

### Changed
- Path resolution now supports speck root separate from repo root
- Specs can be shared across multiple repositories

### Migration
- Single-repo projects: No changes required (100% backward compatible)
- Multi-repo projects: See [Multi-Repo Guide](docs/multi-repo-guide.md)
```

**Acceptance Criteria**:
- ✓ Changelog documents new features
- ✓ Migration notes included

---

**Phase 4 Completion Criteria**:
- ✓ All documentation complete
- ✓ Migration guide tested with real project
- ✓ Changelog accurate

**Phase 4 Risks**:
- Risk: Documentation out of sync with implementation
  - Mitigation: Write docs alongside code, review together

---

## Phase 5: Polish & Release

**Goal**: Prepare feature for production release.

### Tasks

#### Task 5.1: Code Review
**Estimated Time**: 2 hours

**Review Checklist**:
- ✓ Code follows project conventions
- ✓ Error messages are clear and actionable
- ✓ No hardcoded paths
- ✓ Comments explain non-obvious logic

---

#### Task 5.2: Performance Benchmarking
**Estimated Time**: 1 hour

**Benchmarks**:
- Detection overhead in single-repo mode: <5ms
- Detection overhead in multi-repo mode: <10ms
- Command execution (e.g., `/speck.plan`) in both modes: <1% difference

**Tool**: Bun's built-in profiling

---

#### Task 5.3: Manual Testing
**Estimated Time**: 2 hours

**Test Scenarios**:
1. Fresh single-repo project (new user experience)
2. Existing single-repo project (upgrade scenario)
3. Fresh multi-repo setup (frontend + backend)
4. Monorepo with 3+ packages
5. Migration from single-repo to multi-repo

**Acceptance Criteria**:
- ✓ All scenarios work smoothly
- ✓ No confusing errors
- ✓ UX feels natural

---

#### Task 5.4: Release Preparation
**Estimated Time**: 1 hour

**Steps**:
1. Update version in `package.json` (2.0.0)
2. Tag release in git
3. Update plugin marketplace listing (if applicable)
4. Prepare release announcement

**Acceptance Criteria**:
- ✓ Version bumped correctly
- ✓ Release notes complete

---

**Phase 5 Completion Criteria**:
- ✓ Code reviewed and approved
- ✓ Performance benchmarks met
- ✓ Manual testing complete
- ✓ Ready for release

---

## Risk Management

### High-Priority Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking single-repo behavior | High | Low | Comprehensive regression tests |
| Symlinks don't work on Windows | Medium | High | Document WSL, plan copy-mode fallback |
| Performance degradation | Medium | Low | Benchmark detection, cache results |
| User confusion about modes | Medium | Medium | Clear `/speck.env` output, good docs |

### Medium-Priority Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Edge cases not covered | Low | Medium | Extensive integration tests |
| Documentation gaps | Low | Medium | User testing before release |
| Migration complexity | Medium | Low | Step-by-step guide, example scripts |

---

## Success Metrics

### Technical Metrics

- ✓ Test coverage >90%
- ✓ Zero regressions in single-repo mode
- ✓ Detection overhead <10ms
- ✓ All existing Speck commands work in both modes

### User Metrics

- ✓ Multi-repo setup completes in <2 minutes
- ✓ Users can determine mode with one command (`/speck.env`)
- ✓ Documentation answers >95% of common questions

### Adoption Metrics (Post-Release)

- Track: % of users enabling multi-repo mode
- Track: GitHub issues related to multi-repo (target: <5% of total issues)
- Track: Time to set up multi-repo (via user surveys)

---

## Timeline Summary

| Phase | Duration | Key Deliverable |
|-------|----------|----------------|
| Phase 1: Core Infrastructure | 1 day | Detection working |
| Phase 2: Link Command | 1 day | `/speck.link` functional |
| Phase 3: Testing | 1 day | All tests passing |
| Phase 4: Documentation | 1 day | User guides complete |
| Phase 5: Polish & Release | 0.5 days | Feature released |
| **Total** | **4.5 days** | **Multi-repo support live** |

**Contingency**: +1 day buffer for unexpected issues

---

## Post-Release Roadmap

### Future Enhancements (Not in Initial Release)

#### Enhancement 1: Cross-Repo Task Dependencies
**Priority**: Medium
**Effort**: 2-3 days
**Description**: Track "Frontend US1 blocked by Backend US2" in tasks.md

#### Enhancement 2: Spec Versioning
**Priority**: Low
**Effort**: 3-5 days
**Description**: Lock repos to specific version of shared spec (e.g., `spec@v1.2.0`)

#### Enhancement 3: Migration Automation
**Priority**: Medium
**Effort**: 1-2 days
**Description**: `/speck.migrate-to-multirepo` command automates conversion

#### Enhancement 4: Windows Copy-Mode Fallback
**Priority**: Low
**Effort**: 2-3 days
**Description**: For systems without symlink support, copy specs instead (with sync warnings)

#### Enhancement 5: IDE Integration
**Priority**: Low
**Effort**: 5+ days
**Description**: VSCode extension to visualize multi-repo relationships

---

## Conclusion

This roadmap delivers multi-repo and monorepo support in **4.5 days** with:

- **Zero impact** on single-repo users
- **Minimal code changes** (~250 lines total)
- **Low risk** (backward compatible, well-tested)
- **High value** (unlocks microservices, monorepos, frontend/backend splits)

The phased approach ensures quality at each step, with clear completion criteria and risk mitigation strategies.
