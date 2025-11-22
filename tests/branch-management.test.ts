/**
 * Branch Management Tests (Phase 9)
 *
 * Tests for feature 007-multi-repo-monorepo-support - Phase 9
 *
 * Test Coverage:
 * - T073: Create spec-named branch in parent repo when creating shared spec
 * - T074: Prompt user to initialize parent as git repo if not initialized
 * - T075: Skip parent branch creation for local specs
 * - T076: Create spec-named branch in child repo
 * - T077: Validate parent branch matching when using shared spec
 * - T078: Skip parent validation for local specs
 * - T079: Skip branch validation if parent is not a git repo
 * - T080: Test branch creation in parent repo
 * - T081: Test branch validation warnings
 * - T082: Test branch skipping for local specs
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'bun';
import { clearSpeckCache } from '../.speck/scripts/common/paths.ts';

// Test helpers
async function createTestDir(name: string): Promise<string> {
  const testDir = path.join('/tmp', `speck-branch-mgmt-${name}-${Date.now()}`);
  await fs.mkdir(testDir, { recursive: true });
  return testDir;
}

async function initGit(dir: string): Promise<void> {
  await $`cd ${dir} && git init`.quiet();
  await $`cd ${dir} && git config user.email "test@example.com"`.quiet();
  await $`cd ${dir} && git config user.name "Test User"`.quiet();
  await $`cd ${dir} && git commit --allow-empty -m "Initial commit"`.quiet();
}

async function createSpeckSymlink(repoDir: string, targetDir: string): Promise<void> {
  const speckDir = path.join(repoDir, '.speck');
  await fs.mkdir(speckDir, { recursive: true });
  const relativePath = path.relative(speckDir, targetDir);
  const symlinkPath = path.join(speckDir, 'root');
  await fs.symlink(relativePath, symlinkPath, 'dir');
}

async function cleanup(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

async function getCurrentBranch(dir: string): Promise<string> {
  const result = await $`cd ${dir} && git rev-parse --abbrev-ref HEAD`.quiet();
  return result.text().trim();
}

async function branchExists(dir: string, branchName: string): Promise<boolean> {
  try {
    const result = await $`cd ${dir} && git rev-parse --verify ${branchName}`.quiet();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

describe('Phase 9: T080 - Branch Creation in Parent Repo', () => {
  let speckRoot: string;
  let childRepo: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();

    // Create multi-repo structure with git repos
    speckRoot = await createTestDir('parent-branch');
    await initGit(speckRoot);

    childRepo = path.join(speckRoot, 'child');
    await fs.mkdir(childRepo, { recursive: true });
    await initGit(childRepo);

    await createSpeckSymlink(childRepo, speckRoot);

    clearSpeckCache();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(speckRoot);
  });

  test('T080: create-new-feature creates branch in parent repo for shared spec', async () => {
    process.chdir(childRepo);

    // Run create-new-feature with --shared-spec flag
    const result = await $`bun run ${path.join(originalCwd, '.speck/scripts/create-new-feature.ts')} --json --short-name "test-feature" --number 1 --shared-spec "Test feature description"`.quiet();

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.text());
    expect(output.BRANCH_NAME).toBe('001-test-feature');

    // Verify branch was created in parent repo
    const parentBranch = await getCurrentBranch(speckRoot);
    expect(parentBranch).toBe('001-test-feature');

    // Verify branch was created in child repo
    const childBranch = await getCurrentBranch(childRepo);
    expect(childBranch).toBe('001-test-feature');

    // Verify spec was created at parent location
    const parentSpecExists = await fs.access(path.join(speckRoot, 'specs', '001-test-feature', 'spec.md')).then(() => true).catch(() => false);
    expect(parentSpecExists).toBe(true);
  });

  test('T073: branch already exists in parent, should checkout existing branch', async () => {
    process.chdir(childRepo);

    // Create branch in parent first
    await $`cd ${speckRoot} && git checkout -b 001-existing-feature`.quiet();
    await $`cd ${speckRoot} && git checkout main`.quiet(); // Switch back to main

    // Run create-new-feature
    const result = await $`bun run ${path.join(originalCwd, '.speck/scripts/create-new-feature.ts')} --json --short-name "existing-feature" --number 1 --shared-spec "Existing feature"`.quiet();

    expect(result.exitCode).toBe(0);

    // Verify parent checked out the existing branch
    const parentBranch = await getCurrentBranch(speckRoot);
    expect(parentBranch).toBe('001-existing-feature');
  });

  test('T075: local spec does not create branch in parent', async () => {
    process.chdir(childRepo);

    const parentBranchBefore = await getCurrentBranch(speckRoot);

    // Run create-new-feature with --local-spec flag
    const result = await $`bun run ${path.join(originalCwd, '.speck/scripts/create-new-feature.ts')} --json --short-name "local-only" --number 2 --local-spec "Local feature"`.quiet();

    expect(result.exitCode).toBe(0);

    // Verify parent branch unchanged
    const parentBranchAfter = await getCurrentBranch(speckRoot);
    expect(parentBranchAfter).toBe(parentBranchBefore);

    // Verify child has new branch
    const childBranch = await getCurrentBranch(childRepo);
    expect(childBranch).toBe('002-local-only');

    // Verify spec created locally in child
    const localSpecExists = await fs.access(path.join(childRepo, 'specs', '002-local-only', 'spec.md')).then(() => true).catch(() => false);
    expect(localSpecExists).toBe(true);
  });
});

describe('Phase 9: T074, T079 - Parent Git Repo Detection', () => {
  let speckRoot: string;
  let childRepo: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();

    // Create multi-repo structure WITHOUT git in parent
    speckRoot = await createTestDir('non-git-parent');
    await fs.mkdir(path.join(speckRoot, 'specs'), { recursive: true });

    childRepo = path.join(speckRoot, 'child');
    await fs.mkdir(childRepo, { recursive: true });
    await initGit(childRepo);

    await createSpeckSymlink(childRepo, speckRoot);

    clearSpeckCache();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(speckRoot);
  });

  test('T074: warns when parent is not a git repo for shared spec', async () => {
    process.chdir(childRepo);

    // Run create-new-feature with --shared-spec
    const result = await $`bun run ${path.join(originalCwd, '.speck/scripts/create-new-feature.ts')} --short-name "test-feature" --number 3 --shared-spec "Test feature"`;

    // Should succeed but warn about parent not being a git repo
    expect(result.exitCode).toBe(0);
    expect(result.stderr.toString()).toContain('Parent directory is not a git repository');
    expect(result.stderr.toString()).toContain('git init');
  });

  test('T079: setup-plan skips parent validation when parent is not git repo', async () => {
    process.chdir(childRepo);

    // Create a shared spec manually (simulate existing shared spec)
    await fs.mkdir(path.join(speckRoot, 'specs', '003-test-feature'), { recursive: true });
    await fs.writeFile(path.join(speckRoot, 'specs', '003-test-feature', 'spec.md'), '# Test Spec');

    // Create symlink to shared spec
    await fs.mkdir(path.join(childRepo, 'specs', '003-test-feature'), { recursive: true });
    const sharedSpecPath = path.join(speckRoot, 'specs', '003-test-feature', 'spec.md');
    const localSpecLink = path.join(childRepo, 'specs', '003-test-feature', 'spec.md');
    const relativePath = path.relative(path.dirname(localSpecLink), sharedSpecPath);
    await fs.symlink(relativePath, localSpecLink, 'file');

    // Create branch in child
    await $`cd ${childRepo} && git checkout -b 003-test-feature`.quiet();

    // Run setup-plan
    const result = await $`cd ${childRepo} && bun run ${path.join(originalCwd, '.speck/scripts/setup-plan.ts')} --json`;

    // Should succeed without parent branch validation errors
    expect(result.exitCode).toBe(0);
    const stderr = result.stderr.toString();
    expect(stderr).not.toContain('Parent repo branch mismatch');
  });
});

describe('Phase 9: T081 - Branch Validation Warnings', () => {
  let speckRoot: string;
  let childRepo: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();

    // Create multi-repo structure with git repos
    speckRoot = await createTestDir('branch-validation');
    await initGit(speckRoot);

    childRepo = path.join(speckRoot, 'child');
    await fs.mkdir(childRepo, { recursive: true });
    await initGit(childRepo);

    await createSpeckSymlink(childRepo, speckRoot);

    clearSpeckCache();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(speckRoot);
  });

  test('T081: setup-plan warns when parent is on different branch', async () => {
    process.chdir(childRepo);

    // Create shared spec
    await fs.mkdir(path.join(speckRoot, 'specs', '004-test-feature'), { recursive: true });
    await fs.writeFile(path.join(speckRoot, 'specs', '004-test-feature', 'spec.md'), '# Test Spec');

    // Create symlink to shared spec
    await fs.mkdir(path.join(childRepo, 'specs', '004-test-feature'), { recursive: true });
    const sharedSpecPath = path.join(speckRoot, 'specs', '004-test-feature', 'spec.md');
    const localSpecLink = path.join(childRepo, 'specs', '004-test-feature', 'spec.md');
    const relativePath = path.relative(path.dirname(localSpecLink), sharedSpecPath);
    await fs.symlink(relativePath, localSpecLink, 'file');

    // Create feature branch in child
    await $`cd ${childRepo} && git checkout -b 004-test-feature`.quiet();

    // Parent stays on main branch (mismatch!)
    const parentBranch = await getCurrentBranch(speckRoot);
    expect(parentBranch).not.toBe('004-test-feature');

    // Run setup-plan
    const result = await $`cd ${childRepo} && bun run ${path.join(originalCwd, '.speck/scripts/setup-plan.ts')}`;

    // Should succeed but warn about branch mismatch
    expect(result.exitCode).toBe(0);
    expect(result.stderr.toString()).toContain('Parent repo branch mismatch');
    expect(result.stderr.toString()).toContain('Child repo (current): 004-test-feature');
    expect(result.stderr.toString()).toContain(`Parent repo: ${parentBranch}`);
  });

  test('T077: setup-plan does not warn when branches match', async () => {
    process.chdir(childRepo);

    // Create shared spec
    await fs.mkdir(path.join(speckRoot, 'specs', '005-matching'), { recursive: true });
    await fs.writeFile(path.join(speckRoot, 'specs', '005-matching', 'spec.md'), '# Test Spec');

    // Create symlink to shared spec
    await fs.mkdir(path.join(childRepo, 'specs', '005-matching'), { recursive: true });
    const sharedSpecPath = path.join(speckRoot, 'specs', '005-matching', 'spec.md');
    const localSpecLink = path.join(childRepo, 'specs', '005-matching', 'spec.md');
    const relativePath = path.relative(path.dirname(localSpecLink), sharedSpecPath);
    await fs.symlink(relativePath, localSpecLink, 'file');

    // Create matching branch in both repos
    await $`cd ${speckRoot} && git checkout -b 005-matching`.quiet();
    await $`cd ${childRepo} && git checkout -b 005-matching`.quiet();

    // Run setup-plan
    const result = await $`cd ${childRepo} && bun run ${path.join(originalCwd, '.speck/scripts/setup-plan.ts')}`;

    // Should succeed without warnings
    expect(result.exitCode).toBe(0);
    expect(result.stderr.toString()).not.toContain('Parent repo branch mismatch');
  });
});

describe('Phase 9: T082 - Skip Validation for Local Specs', () => {
  let speckRoot: string;
  let childRepo: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();

    // Create multi-repo structure
    speckRoot = await createTestDir('local-spec-validation');
    await initGit(speckRoot);

    childRepo = path.join(speckRoot, 'child');
    await fs.mkdir(childRepo, { recursive: true });
    await initGit(childRepo);

    await createSpeckSymlink(childRepo, speckRoot);

    clearSpeckCache();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(speckRoot);
  });

  test('T082: setup-plan does not validate parent branch for local specs', async () => {
    process.chdir(childRepo);

    // Create local spec (not shared)
    await fs.mkdir(path.join(childRepo, 'specs', '006-local-spec'), { recursive: true });
    await fs.writeFile(path.join(childRepo, 'specs', '006-local-spec', 'spec.md'), '# Local Spec');

    // Create feature branch in child only
    await $`cd ${childRepo} && git checkout -b 006-local-spec`.quiet();

    // Parent stays on main (different branch)
    const parentBranch = await getCurrentBranch(speckRoot);
    expect(parentBranch).not.toBe('006-local-spec');

    // Run setup-plan
    const result = await $`cd ${childRepo} && bun run ${path.join(originalCwd, '.speck/scripts/setup-plan.ts')}`;

    // Should succeed without parent branch validation (because spec is local, not symlinked)
    expect(result.exitCode).toBe(0);
    expect(result.stderr.toString()).not.toContain('Parent repo branch mismatch');
  });

  test('T078: local spec allows independent child branch workflow', async () => {
    process.chdir(childRepo);

    // Create multiple local specs with different branches
    const specs = ['007-local-a', '008-local-b', '009-local-c'];

    for (const spec of specs) {
      await fs.mkdir(path.join(childRepo, 'specs', spec), { recursive: true });
      await fs.writeFile(path.join(childRepo, 'specs', spec, 'spec.md'), `# ${spec}`);
      await $`cd ${childRepo} && git checkout -b ${spec}`.quiet();
    }

    // Parent remains on main throughout
    const parentBranch = await getCurrentBranch(speckRoot);
    expect(parentBranch).toBe('main');

    // All child branches should work independently
    for (const spec of specs) {
      await $`cd ${childRepo} && git checkout ${spec}`.quiet();
      const result = await $`cd ${childRepo} && bun run ${path.join(originalCwd, '.speck/scripts/setup-plan.ts')}`;
      expect(result.exitCode).toBe(0);
      expect(result.stderr.toString()).not.toContain('Parent repo branch mismatch');
    }
  });
});
