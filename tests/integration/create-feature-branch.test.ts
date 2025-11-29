/**
 * Integration tests for create-new-feature with --branch flag
 *
 * Tests the non-standard branch name support (T081)
 *
 * Feature: 015-scope-simplification
 * Tasks: T081, T083
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { $ } from 'bun';

describe('create-new-feature --branch flag (T081)', () => {
  let testDir: string;
  let repoPath: string;
  const scriptPath = join(import.meta.dir, '../../.speck/scripts/create-new-feature.ts');

  beforeEach(async () => {
    // Create temporary directory for test
    testDir = mkdtempSync(join(tmpdir(), 'create-feature-branch-test-'));
    repoPath = join(testDir, 'test-repo');

    // Initialize a Git repository
    await $`mkdir -p ${repoPath}`.quiet();
    await $`git -C ${repoPath} init`.quiet();
    await $`git -C ${repoPath} config user.email "test@example.com"`.quiet();
    await $`git -C ${repoPath} config user.name "Test User"`.quiet();

    // Create initial commit
    await $`touch ${repoPath}/README.md`.quiet();
    await $`git -C ${repoPath} add .`.quiet();
    await $`git -C ${repoPath} commit -m "Initial commit"`.quiet();

    // Create specs directory
    await $`mkdir -p ${repoPath}/specs`.quiet();

    // Create .speck directory
    await $`mkdir -p ${repoPath}/.speck`.quiet();
  });

  afterEach(() => {
    // Cleanup test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('should create feature with standard branch name (no --branch flag)', async () => {
    const result = await $`bun run ${scriptPath} --json --no-worktree "Test Feature"`.cwd(repoPath);

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout.toString());
    expect(output.ok).toBe(true);
    expect(output.result.BRANCH_NAME).toMatch(/^\d{3}-test-feature$/);
    expect(output.result.FEATURE_NUM).toMatch(/^\d{3}$/);

    // Verify spec directory was created with standard name
    const specDir = join(repoPath, 'specs', output.result.BRANCH_NAME);
    expect(existsSync(specDir)).toBe(true);

    // Verify no branches.json was created (standard names don't need it)
    // Note: branches.json may or may not exist depending on implementation
  });

  test('should create feature with non-standard branch name using --branch flag', async () => {
    const customBranch = 'nprbst/custom-feature';

    const result =
      await $`bun run ${scriptPath} --json --no-worktree --branch ${customBranch} "My Custom Feature"`.cwd(
        repoPath
      );

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout.toString());
    expect(output.ok).toBe(true);
    expect(output.result.BRANCH_NAME).toBe(customBranch);

    // Verify spec directory was created with NNN-short-name format
    const specId = `${output.result.FEATURE_NUM}-custom-feature`;
    const specDir = join(repoPath, 'specs', specId);
    expect(existsSync(specDir)).toBe(true);

    // Verify branches.json was created with mapping
    const branchesFile = join(repoPath, '.speck', 'branches.json');
    expect(existsSync(branchesFile)).toBe(true);

    const branchesContent = JSON.parse(readFileSync(branchesFile, 'utf-8'));
    expect(branchesContent.version).toBe('2.0.0');
    expect(branchesContent.branches).toHaveLength(1);
    expect(branchesContent.branches[0].name).toBe(customBranch);
    expect(branchesContent.branches[0].specId).toBe(specId);
  });

  test('should use --short-name for spec directory when combined with --branch', async () => {
    const customBranch = 'feature/auth-v2';
    const shortName = 'user-auth';

    const result =
      await $`bun run ${scriptPath} --json --no-worktree --branch ${customBranch} --short-name ${shortName} "User Authentication System"`.cwd(
        repoPath
      );

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout.toString());
    expect(output.ok).toBe(true);
    expect(output.result.BRANCH_NAME).toBe(customBranch);

    // Verify spec directory uses the short-name
    const specId = `${output.result.FEATURE_NUM}-${shortName}`;
    const specDir = join(repoPath, 'specs', specId);
    expect(existsSync(specDir)).toBe(true);

    // Verify branches.json mapping
    const branchesFile = join(repoPath, '.speck', 'branches.json');
    const branchesContent = JSON.parse(readFileSync(branchesFile, 'utf-8'));
    expect(branchesContent.branches[0].name).toBe(customBranch);
    expect(branchesContent.branches[0].specId).toBe(specId);
  });

  test('should use --number for spec ID when combined with --branch', async () => {
    const customBranch = 'hotfix/urgent-fix';
    const number = 42;

    const result =
      await $`bun run ${scriptPath} --json --no-worktree --branch ${customBranch} --number ${number} "Urgent Fix"`.cwd(
        repoPath
      );

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout.toString());
    expect(output.ok).toBe(true);
    expect(output.result.BRANCH_NAME).toBe(customBranch);
    expect(output.result.FEATURE_NUM).toBe('042');

    // Verify spec directory uses the specified number
    const specDir = join(repoPath, 'specs', '042-urgent-fix');
    expect(existsSync(specDir)).toBe(true);
  });

  test('should NOT record mapping for standard-looking --branch names', async () => {
    // If user passes a branch name that already follows NNN- pattern,
    // it should still be treated as standard (no branches.json entry needed)
    const standardBranch = '007-standard-branch';

    const result =
      await $`bun run ${scriptPath} --json --no-worktree --branch ${standardBranch} "Standard Feature"`.cwd(
        repoPath
      );

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout.toString());
    expect(output.ok).toBe(true);
    expect(output.result.BRANCH_NAME).toBe(standardBranch);

    // Since branch follows NNN- pattern, it should NOT be recorded in branches.json
    const branchesFile = join(repoPath, '.speck', 'branches.json');
    if (existsSync(branchesFile)) {
      const branchesContent = JSON.parse(readFileSync(branchesFile, 'utf-8'));
      // If file exists, it should either be empty or not contain this branch
      const hasBranch = branchesContent.branches?.some(
        (b: { name: string }) => b.name === standardBranch
      );
      expect(hasBranch).toBe(false);
    }
  });

  test('should reject --branch flag with empty value', async () => {
    const result = await $`bun run ${scriptPath} --json --no-worktree --branch "Test Feature"`
      .cwd(repoPath)
      .nothrow();

    // Should fail because --branch requires a value and "Test Feature" looks like description
    expect(result.exitCode).not.toBe(0);
  });

  test('should create multiple features with different non-standard branches', async () => {
    // Create first feature
    const branch1 = 'user/alice/feature-a';
    const result1 =
      await $`bun run ${scriptPath} --json --no-worktree --branch ${branch1} "Feature A"`.cwd(
        repoPath
      );
    expect(result1.exitCode).toBe(0);

    // Create second feature
    const branch2 = 'user/bob/feature-b';
    const result2 =
      await $`bun run ${scriptPath} --json --no-worktree --branch ${branch2} "Feature B"`.cwd(
        repoPath
      );
    expect(result2.exitCode).toBe(0);

    // Verify branches.json has both mappings
    const branchesFile = join(repoPath, '.speck', 'branches.json');
    const branchesContent = JSON.parse(readFileSync(branchesFile, 'utf-8'));
    expect(branchesContent.branches).toHaveLength(2);

    const branchNames = branchesContent.branches.map((b: { name: string }) => b.name);
    expect(branchNames).toContain(branch1);
    expect(branchNames).toContain(branch2);
  });
});

describe('Non-standard branch lookup in check-prerequisites (T082, T083)', () => {
  let testDir: string;
  let repoPath: string;
  const createScriptPath = join(import.meta.dir, '../../.speck/scripts/create-new-feature.ts');
  const checkScriptPath = join(import.meta.dir, '../../.speck/scripts/check-prerequisites.ts');

  beforeEach(async () => {
    // Create temporary directory for test
    testDir = mkdtempSync(join(tmpdir(), 'check-prereq-branch-test-'));
    repoPath = join(testDir, 'test-repo');

    // Initialize a Git repository
    await $`mkdir -p ${repoPath}`.quiet();
    await $`git -C ${repoPath} init`.quiet();
    await $`git -C ${repoPath} config user.email "test@example.com"`.quiet();
    await $`git -C ${repoPath} config user.name "Test User"`.quiet();

    // Create initial commit
    await $`touch ${repoPath}/README.md`.quiet();
    await $`git -C ${repoPath} add .`.quiet();
    await $`git -C ${repoPath} commit -m "Initial commit"`.quiet();

    // Create specs and .speck directories
    await $`mkdir -p ${repoPath}/specs`.quiet();
    await $`mkdir -p ${repoPath}/.speck`.quiet();
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('should resolve spec for non-standard branch via branches.json', async () => {
    const customBranch = 'nprbst/my-feature';

    // Create feature with custom branch and explicit short-name for predictable spec ID
    const createResult =
      await $`bun run ${createScriptPath} --json --no-worktree --branch ${customBranch} --short-name my-feature "My Feature"`.cwd(
        repoPath
      );
    expect(createResult.exitCode).toBe(0);

    const createOutput = JSON.parse(createResult.stdout.toString());
    const specId = `${createOutput.result.FEATURE_NUM}-my-feature`;

    // Create plan.md to satisfy check-prerequisites
    const specDir = join(repoPath, 'specs', specId);
    await Bun.write(join(specDir, 'plan.md'), '# Plan\n');

    // Switch to the custom branch (already created by create-new-feature)
    await $`git -C ${repoPath} checkout ${customBranch}`.quiet();

    // Run check-prerequisites - should find spec via branches.json
    const checkResult = await $`bun run ${checkScriptPath} --json --skip-plan-check`.cwd(repoPath);

    expect(checkResult.exitCode).toBe(0);

    const checkOutput = JSON.parse(checkResult.stdout.toString());
    expect(checkOutput.ok).toBe(true);
    expect(checkOutput.result.FEATURE_DIR).toContain(specId);
  });
});
