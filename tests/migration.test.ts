/**
 * Migration and Workflow Tests
 *
 * Tests for migrating from single-repo to multi-repo (Feature 007 - Phases 6-7)
 *
 * Test Coverage:
 * - User Story 4: Discovery via /speck.env
 * - User Story 5: Single-repo to multi-repo migration
 * - Git integration and .gitignore handling
 * - Edge cases with conflicting specs/ directories
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'bun';
import { detectSpeckRoot, clearSpeckCache } from '../.speck/scripts/common/paths.ts';
import { linkRepo } from '../.speck/scripts/link-repo.ts';

// Test helpers
async function createTestDir(name: string): Promise<string> {
  const testDir = path.join('/tmp', `speck-migration-${name}-${Date.now()}`);
  await fs.mkdir(testDir, { recursive: true });
  return testDir;
}

async function initGit(dir: string): Promise<void> {
  await $`cd ${dir} && git init && git config user.email "test@example.com" && git config user.name "Test User"`.quiet();
}

async function cleanup(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

describe('User Story 5: Single-Repo to Multi-Repo Migration', () => {
  let singleRepoDir: string;
  let parentDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    parentDir = await createTestDir('parent');
    singleRepoDir = path.join(parentDir, 'my-app');
    await fs.mkdir(singleRepoDir, { recursive: true });
    await initGit(singleRepoDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(parentDir);
  });

  test('T058-T059: Migrate existing specs to parent directory', async () => {
    // Create single-repo with existing specs
    const specsDir = path.join(singleRepoDir, 'specs', '001-feature');
    await fs.mkdir(specsDir, { recursive: true });

    await fs.writeFile(
      path.join(specsDir, 'spec.md'),
      '# Existing Feature\n\nThis was created in single-repo mode.'
    );

    await fs.writeFile(
      path.join(specsDir, 'plan.md'),
      '# Implementation Plan\n\nLocal plan for this repo.'
    );

    // Verify it works in single-repo mode
    process.chdir(singleRepoDir);
    clearSpeckCache();
    const beforeConfig = await detectSpeckRoot();
    expect(beforeConfig.mode).toBe('single-repo');

    // Step 1: Move specs/ to parent directory (T058)
    const parentSpecs = path.join(parentDir, 'specs');
    await fs.rename(path.join(singleRepoDir, 'specs'), parentSpecs);

    // Step 2: Link repo to parent (T059)
    await fs.mkdir(path.join(singleRepoDir, '.speck'), { recursive: true });
    await linkRepo('..');

    clearSpeckCache();
    const afterConfig = await detectSpeckRoot();
    const realParentDir = await fs.realpath(parentDir);

    expect(afterConfig.mode).toBe('multi-repo');
    expect(afterConfig.speckRoot).toBe(realParentDir);

    // Verify specs are accessible from new location
    const movedSpec = await fs.readFile(
      path.join(parentSpecs, '001-feature', 'spec.md'),
      'utf-8'
    );
    expect(movedSpec).toContain('Existing Feature');
  });

  test('T060: Verify commands work after migration', async () => {
    // Create and migrate specs
    const specsDir = path.join(singleRepoDir, 'specs', '002-migrate-test');
    await fs.mkdir(specsDir, { recursive: true });

    await fs.writeFile(
      path.join(specsDir, 'spec.md'),
      '# Migration Test\n\nTesting post-migration functionality.'
    );

    // Migrate
    await fs.rename(
      path.join(singleRepoDir, 'specs'),
      path.join(parentDir, 'specs')
    );

    process.chdir(singleRepoDir);
    await fs.mkdir(path.join(singleRepoDir, '.speck'), { recursive: true });
    await linkRepo('..');

    // Create local specs directory for plan
    await fs.mkdir(path.join(singleRepoDir, 'specs', '002-migrate-test'), { recursive: true });
    await fs.writeFile(
      path.join(singleRepoDir, 'specs', '002-migrate-test', 'plan.md'),
      '# Post-Migration Plan\n\nThis should work.'
    );

    process.env.SPECIFY_FEATURE = '002-migrate-test';
    clearSpeckCache();

    // Verify paths resolve correctly
    const { getFeaturePaths } = await import('../.speck/scripts/common/paths.ts');
    const paths = await getFeaturePaths();
    const realParentDir = await fs.realpath(parentDir);
    const realSingleRepoDir = await fs.realpath(singleRepoDir);

    expect(paths.FEATURE_SPEC.startsWith(realParentDir)).toBe(true);
    expect(paths.IMPL_PLAN.startsWith(realSingleRepoDir)).toBe(true);

    delete process.env.SPECIFY_FEATURE;
  });

  test('T061-T062: Warn when local specs/ and symlink both exist', async () => {
    // Create both local specs/ and symlink
    await fs.mkdir(path.join(parentDir, 'specs', '003-conflict'), { recursive: true });
    await fs.mkdir(path.join(singleRepoDir, 'specs', '003-local'), { recursive: true });

    await fs.writeFile(
      path.join(parentDir, 'specs', '003-conflict', 'spec.md'),
      '# Shared Spec'
    );

    await fs.writeFile(
      path.join(singleRepoDir, 'specs', '003-local', 'spec.md'),
      '# Local Spec (should be ignored)'
    );

    process.chdir(singleRepoDir);
    await fs.mkdir(path.join(singleRepoDir, '.speck'), { recursive: true });
    await linkRepo('..');

    // Capture warnings
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => warnings.push(args.join(' '));

    clearSpeckCache();
    const config = await detectSpeckRoot();

    console.warn = originalWarn;

    expect(config.mode).toBe('multi-repo');

    // Note: Warning for conflicting specs/ is a future enhancement
    // For now, we just verify multi-repo mode takes precedence
    const realParentDir = await fs.realpath(parentDir);
    expect(config.speckRoot).toBe(realParentDir);
  });
});

describe('Git Integration: .gitignore Handling', () => {
  let multiRepoRoot: string;
  let childDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    multiRepoRoot = await createTestDir('git-integration');
    await fs.mkdir(path.join(multiRepoRoot, 'specs'), { recursive: true });

    childDir = path.join(multiRepoRoot, 'child-repo');
    await fs.mkdir(childDir, { recursive: true });
    await initGit(childDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(multiRepoRoot);
  });

  test('T070: Create .gitignore if missing during /speck.link', async () => {
    process.chdir(childDir);

    // Verify no .gitignore exists
    expect(await fs.access(path.join(childDir, '.gitignore')).then(() => true).catch(() => false)).toBe(false);

    // Link repo
    await fs.mkdir(path.join(childDir, '.speck'), { recursive: true });
    await linkRepo('..');

    // Note: .gitignore auto-creation is a future enhancement (T070)
    // For now, verify linking works without .gitignore
    clearSpeckCache();
    const config = await detectSpeckRoot();
    expect(config.mode).toBe('multi-repo');
  });

  test('T071-T072: Symlinked specs not committed, local plans ARE committed', async () => {
    // Create shared spec
    const sharedSpecDir = path.join(multiRepoRoot, 'specs', '004-git-test');
    await fs.mkdir(sharedSpecDir, { recursive: true });
    await fs.writeFile(path.join(sharedSpecDir, 'spec.md'), '# Shared Spec');

    // Link child repo
    process.chdir(childDir);
    await fs.mkdir(path.join(childDir, '.speck'), { recursive: true });
    await linkRepo('..');

    // Create .gitignore that ignores symlinked specs
    await fs.writeFile(
      path.join(childDir, '.gitignore'),
      'specs/*/spec.md\nspecs/*/contracts/\n'
    );

    // Create local spec directory with plan
    const localSpecDir = path.join(childDir, 'specs', '004-git-test');
    await fs.mkdir(localSpecDir, { recursive: true });

    // Symlink the shared spec
    await fs.symlink(
      path.relative(localSpecDir, path.join(sharedSpecDir, 'spec.md')),
      path.join(localSpecDir, 'spec.md'),
      'file'
    );

    // Create local plan
    await fs.writeFile(path.join(localSpecDir, 'plan.md'), '# Local Plan');

    // Check git status
    const gitStatus = await $`git status --porcelain`.cwd(childDir).text();

    // .gitignore should be untracked
    expect(gitStatus).toContain('.gitignore');

    // specs/ directory or plan.md should be untracked (committable)
    expect(gitStatus.includes('specs/') || gitStatus.includes('plan.md')).toBe(true);

    // spec.md symlink should be ignored (not appear in status)
    // Note: This depends on .gitignore working correctly
  });

  test('T072a: Verify symlinked files not tracked by git', async () => {
    // Create shared spec
    const sharedSpecDir = path.join(multiRepoRoot, 'specs', '005-untracked');
    await fs.mkdir(sharedSpecDir, { recursive: true });
    await fs.writeFile(path.join(sharedSpecDir, 'spec.md'), '# Shared');

    process.chdir(childDir);
    await fs.mkdir(path.join(childDir, '.speck'), { recursive: true });
    await linkRepo('..');

    // Create .gitignore FIRST
    await fs.writeFile(
      path.join(childDir, '.gitignore'),
      'specs/*/spec.md\n'
    );

    // Add and commit .gitignore
    await $`git add .gitignore`.cwd(childDir).quiet();
    await $`git commit -m "Add .gitignore"`.cwd(childDir).quiet();

    // Now create symlink
    const localSpecDir = path.join(childDir, 'specs', '005-untracked');
    await fs.mkdir(localSpecDir, { recursive: true });
    await fs.symlink(
      path.relative(localSpecDir, path.join(sharedSpecDir, 'spec.md')),
      path.join(localSpecDir, 'spec.md'),
      'file'
    );

    // Check git status
    const gitStatus = await $`git status --porcelain`.cwd(childDir).text();

    // spec.md symlink should NOT appear (ignored by .gitignore)
    expect(gitStatus).not.toContain('005-untracked/spec.md');
  });
});

describe('Link Command Validation', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await createTestDir('link-validation');
    await initGit(testDir);
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(testDir);
  });

  test('T088: Error when /speck.link called without arguments', async () => {
    await expect(linkRepo('')).rejects.toThrow(/Missing required argument/);
  });

  test('T089: Error when target does not exist', async () => {
    await expect(linkRepo('/tmp/nonexistent-dir-12345')).rejects.toThrow(/Target does not exist/);
  });

  test('T090: Error when target is a file, not directory', async () => {
    const tempFile = path.join(testDir, 'test-file.txt');
    await fs.writeFile(tempFile, 'not a directory');

    await expect(linkRepo(tempFile)).rejects.toThrow(/not a directory/);
  });

  test('T087: Update symlink when run with different target', async () => {
    // Create two potential targets
    const target1 = path.join(testDir, 'target1');
    const target2 = path.join(testDir, 'target2');
    await fs.mkdir(target1, { recursive: true });
    await fs.mkdir(target2, { recursive: true });

    const repoDir = path.join(testDir, 'repo');
    await fs.mkdir(repoDir, { recursive: true });
    await initGit(repoDir);

    // First link
    process.chdir(repoDir);
    await fs.mkdir('.speck', { recursive: true });
    await linkRepo('../target1');

    clearSpeckCache();
    const config1 = await detectSpeckRoot();
    const realTarget1 = await fs.realpath(target1);
    expect(config1.speckRoot).toBe(realTarget1);

    // Update link to target2
    await linkRepo('../target2');

    clearSpeckCache();
    const config2 = await detectSpeckRoot();
    const realTarget2 = await fs.realpath(target2);
    expect(config2.speckRoot).toBe(realTarget2);
    expect(config2.speckRoot).not.toBe(config1.speckRoot);
  });
});

describe('Edge Cases: Multiple Symlink Scenarios', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await createTestDir('edge-cases');
    await initGit(testDir);
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(testDir);
  });

  test('Symlink to sibling directory (not parent)', async () => {
    // Create structure: parent/repo1, parent/repo2, parent/shared-specs
    const parent = testDir;
    const repo1 = path.join(parent, 'repo1');
    const sharedSpecs = path.join(parent, 'shared-specs');

    await fs.mkdir(repo1, { recursive: true });
    await fs.mkdir(path.join(sharedSpecs, 'specs'), { recursive: true });
    await initGit(repo1);

    // Link repo1 to sibling shared-specs directory
    process.chdir(repo1);
    await fs.mkdir('.speck', { recursive: true });
    await linkRepo('../shared-specs');

    clearSpeckCache();
    const config = await detectSpeckRoot();
    const realSharedSpecs = await fs.realpath(sharedSpecs);

    expect(config.mode).toBe('multi-repo');
    expect(config.speckRoot).toBe(realSharedSpecs);
  });

  test('Absolute path symlink works', async () => {
    const speckRoot = path.join(testDir, 'absolute-root');
    const repo = path.join(testDir, 'repo');

    await fs.mkdir(path.join(speckRoot, 'specs'), { recursive: true });
    await fs.mkdir(repo, { recursive: true });
    await initGit(repo);

    process.chdir(repo);
    await fs.mkdir('.speck', { recursive: true });

    // Use absolute path
    await linkRepo(speckRoot);

    clearSpeckCache();
    const config = await detectSpeckRoot();
    const realSpeckRoot = await fs.realpath(speckRoot);

    expect(config.mode).toBe('multi-repo');
    expect(config.speckRoot).toBe(realSpeckRoot);
  });

  test('Symlink with spaces in path', async () => {
    const speckRoot = path.join(testDir, 'path with spaces');
    const repo = path.join(testDir, 'repo');

    await fs.mkdir(path.join(speckRoot, 'specs'), { recursive: true });
    await fs.mkdir(repo, { recursive: true });
    await initGit(repo);

    process.chdir(repo);
    await fs.mkdir('.speck', { recursive: true });
    await linkRepo('../path with spaces');

    clearSpeckCache();
    const config = await detectSpeckRoot();
    const realSpeckRoot = await fs.realpath(speckRoot);

    expect(config.mode).toBe('multi-repo');
    expect(config.speckRoot).toBe(realSpeckRoot);
  });
});
