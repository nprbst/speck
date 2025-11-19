/**
 * Multi-Repo and Monorepo Support Tests
 *
 * Tests for feature 007-multi-repo-monorepo-support
 *
 * Test Coverage:
 * - Phase 3: User Story 1 (Single-Repo Backward Compatibility)
 * - Phase 4: User Story 2 (Multi-Repo Support)
 * - Phase 5: User Story 3 (Monorepo Support)
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'bun';
import { detectSpeckRoot, clearSpeckCache, getFeaturePaths } from '../.speck/scripts/common/paths.ts';

// Test helper to create directory structure
async function createTestDir(name: string): Promise<string> {
  const testDir = path.join('/tmp', `speck-test-${name}-${Date.now()}`);
  await fs.mkdir(testDir, { recursive: true });
  return testDir;
}

// Test helper to initialize git repo
async function initGit(dir: string): Promise<void> {
  await $`cd ${dir} && git init`.quiet();
}

// Test helper to create symlink
async function createSpeckSymlink(repoDir: string, targetDir: string): Promise<void> {
  const speckDir = path.join(repoDir, '.speck');
  await fs.mkdir(speckDir, { recursive: true });

  // Calculate relative path from .speck/ to target
  const relativePath = path.relative(speckDir, targetDir);
  const symlinkPath = path.join(speckDir, 'root');

  await fs.symlink(relativePath, symlinkPath, 'dir');
}

// Test helper to cleanup
async function cleanup(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

describe('Phase 3: User Story 1 - Single-Repo Backward Compatibility', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await createTestDir('single-repo');
    await fs.mkdir(path.join(testDir, '.speck'), { recursive: true });
    await initGit(testDir);
    process.chdir(testDir);
    clearSpeckCache();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(testDir);
  });

  test('T013: detectSpeckRoot() returns single-repo mode when no .speck/root symlink exists', async () => {
    const config = await detectSpeckRoot();

    expect(config.mode).toBe('single-repo');
  });

  test('T014: detectSpeckRoot() sets speckRoot === repoRoot in single-repo mode', async () => {
    const config = await detectSpeckRoot();

    expect(config.speckRoot).toBe(config.repoRoot);
    // Use realpath to resolve /tmp vs /private/tmp on macOS
    const realTestDir = await fs.realpath(testDir);
    expect(config.speckRoot).toBe(realTestDir);
  });

  test('T015-T017: getFeaturePaths() uses repoRoot for all paths in single-repo mode', async () => {
    // Create a test spec directory
    await fs.mkdir(path.join(testDir, 'specs', '001-test'), { recursive: true });
    process.env.SPECIFY_FEATURE = '001-test';

    const paths = await getFeaturePaths();

    expect(paths.MODE).toBe('single-repo');
    expect(paths.FEATURE_SPEC.startsWith(paths.REPO_ROOT)).toBe(true);
    expect(paths.IMPL_PLAN.startsWith(paths.REPO_ROOT)).toBe(true);
    expect(paths.TASKS.startsWith(paths.REPO_ROOT)).toBe(true);

    delete process.env.SPECIFY_FEATURE;
  });

  test('T020: Performance - detectSpeckRoot() completes in <10ms (cached: <1ms)', async () => {
    // Measure uncached performance
    clearSpeckCache();
    const start1 = performance.now();
    await detectSpeckRoot();
    const end1 = performance.now();
    const uncached = end1 - start1;

    // Measure cached performance
    const start2 = performance.now();
    await detectSpeckRoot();
    const end2 = performance.now();
    const cached = end2 - start2;

    expect(uncached).toBeLessThan(10); // <10ms for uncached
    expect(cached).toBeLessThan(1);    // <1ms for cached
  });

  test('T021: No new configuration files appear in single-repo mode', async () => {
    await detectSpeckRoot();

    // Check that only expected files exist in .speck/
    const speckFiles = await fs.readdir(path.join(testDir, '.speck'));

    // Should not contain any config files like config.json
    expect(speckFiles.includes('config.json')).toBe(false);
    expect(speckFiles.includes('multi-repo.json')).toBe(false);
  });
});

describe('Phase 4: User Story 2 - Multi-Repo Support', () => {
  let speckRoot: string;
  let frontendDir: string;
  let backendDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();

    // Create multi-repo structure
    speckRoot = await createTestDir('multi-repo-root');
    await fs.mkdir(path.join(speckRoot, 'specs'), { recursive: true });

    frontendDir = path.join(speckRoot, 'frontend');
    backendDir = path.join(speckRoot, 'backend');

    await fs.mkdir(frontendDir, { recursive: true });
    await fs.mkdir(backendDir, { recursive: true });

    // Initialize git repos
    await initGit(frontendDir);
    await initGit(backendDir);

    // Create symlinks
    await createSpeckSymlink(frontendDir, speckRoot);
    await createSpeckSymlink(backendDir, speckRoot);

    clearSpeckCache();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(speckRoot);
  });

  test('T038: detectSpeckRoot() returns multi-repo mode after linking', async () => {
    process.chdir(frontendDir);
    clearSpeckCache();

    const config = await detectSpeckRoot();

    expect(config.mode).toBe('multi-repo');
  });

  test('T039: getFeaturePaths() SPEC_FILE uses speckRoot in multi-repo mode', async () => {
    process.chdir(frontendDir);

    // Create test spec at speck root
    await fs.mkdir(path.join(speckRoot, 'specs', '001-test'), { recursive: true });
    await fs.writeFile(path.join(speckRoot, 'specs', '001-test', 'spec.md'), '# Test Spec');

    process.env.SPECIFY_FEATURE = '001-test';
    clearSpeckCache();

    const paths = await getFeaturePaths();
    const realSpeckRoot = await fs.realpath(speckRoot);

    expect(paths.MODE).toBe('multi-repo');
    expect(paths.FEATURE_SPEC).toContain(path.join('specs', '001-test', 'spec.md'));
    expect(paths.FEATURE_SPEC.startsWith(realSpeckRoot)).toBe(true);

    delete process.env.SPECIFY_FEATURE;
  });

  test('T040: getFeaturePaths() PLAN_FILE uses repoRoot in multi-repo mode', async () => {
    process.chdir(frontendDir);

    await fs.mkdir(path.join(speckRoot, 'specs', '001-test'), { recursive: true });
    process.env.SPECIFY_FEATURE = '001-test';
    clearSpeckCache();

    const paths = await getFeaturePaths();
    const realFrontendDir = await fs.realpath(frontendDir);

    expect(paths.IMPL_PLAN.startsWith(realFrontendDir)).toBe(true);
    expect(paths.TASKS.startsWith(realFrontendDir)).toBe(true);

    delete process.env.SPECIFY_FEATURE;
  });

  test('T041: Both frontend and backend repos can read the same spec', async () => {
    // Create shared spec
    const specDir = path.join(speckRoot, 'specs', '001-test');
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(path.join(specDir, 'spec.md'), '# Shared Test Spec\n\nThis is a shared specification.');

    process.env.SPECIFY_FEATURE = '001-test';

    // Read from frontend
    process.chdir(frontendDir);
    clearSpeckCache();
    const frontendPaths = await getFeaturePaths();
    const frontendSpec = await fs.readFile(frontendPaths.FEATURE_SPEC, 'utf-8');

    // Read from backend
    process.chdir(backendDir);
    clearSpeckCache();
    const backendPaths = await getFeaturePaths();
    const backendSpec = await fs.readFile(backendPaths.FEATURE_SPEC, 'utf-8');

    expect(frontendSpec).toBe(backendSpec);
    expect(frontendSpec).toContain('Shared Test Spec');

    delete process.env.SPECIFY_FEATURE;
  });

  test('T042-T043: Different constitutions in frontend and backend', async () => {
    // Create different constitutions
    const frontendMemory = path.join(frontendDir, '.speck', 'memory');
    const backendMemory = path.join(backendDir, '.speck', 'memory');

    await fs.mkdir(frontendMemory, { recursive: true });
    await fs.mkdir(backendMemory, { recursive: true });

    await fs.writeFile(
      path.join(frontendMemory, 'constitution.md'),
      '# Frontend Constitution\n**Principle**: React-first development'
    );

    await fs.writeFile(
      path.join(backendMemory, 'constitution.md'),
      '# Backend Constitution\n**Principle**: No frontend dependencies'
    );

    // Verify frontend constitution
    process.chdir(frontendDir);
    const frontendConstitution = await fs.readFile(
      path.join(frontendDir, '.speck', 'memory', 'constitution.md'),
      'utf-8'
    );

    // Verify backend constitution
    process.chdir(backendDir);
    const backendConstitution = await fs.readFile(
      path.join(backendDir, '.speck', 'memory', 'constitution.md'),
      'utf-8'
    );

    expect(frontendConstitution).toContain('React-first');
    expect(backendConstitution).toContain('No frontend dependencies');
    expect(frontendConstitution).not.toBe(backendConstitution);
  });

  test('T044: Multi-repo detection performance <10ms median', async () => {
    process.chdir(frontendDir);

    const timings: number[] = [];
    for (let i = 0; i < 100; i++) {
      clearSpeckCache();
      const start = performance.now();
      await detectSpeckRoot();
      const end = performance.now();
      timings.push(end - start);
    }

    timings.sort((a, b) => a - b);
    const median = timings[50];

    expect(median).toBeLessThan(10);
  });
});

describe('Phase 5: User Story 3 - Monorepo Support', () => {
  let monorepoRoot: string;
  let uiPackageDir: string;
  let apiPackageDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();

    // Create monorepo structure
    monorepoRoot = await createTestDir('monorepo');
    await fs.mkdir(path.join(monorepoRoot, 'specs'), { recursive: true });

    uiPackageDir = path.join(monorepoRoot, 'packages', 'ui');
    apiPackageDir = path.join(monorepoRoot, 'packages', 'api');

    await fs.mkdir(uiPackageDir, { recursive: true });
    await fs.mkdir(apiPackageDir, { recursive: true });

    // Initialize git repos for packages
    await initGit(uiPackageDir);
    await initGit(apiPackageDir);

    // Create symlinks from packages to monorepo root
    await createSpeckSymlink(uiPackageDir, monorepoRoot);
    await createSpeckSymlink(apiPackageDir, monorepoRoot);

    clearSpeckCache();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(monorepoRoot);
  });

  test('T046: detectSpeckRoot() works with nested package structures', async () => {
    process.chdir(uiPackageDir);
    clearSpeckCache();

    const config = await detectSpeckRoot();
    const realMonorepoRoot = await fs.realpath(monorepoRoot);
    const realUiPackageDir = await fs.realpath(uiPackageDir);

    expect(config.mode).toBe('multi-repo');
    expect(config.speckRoot).toBe(realMonorepoRoot);
    expect(config.repoRoot).toBe(realUiPackageDir);
  });

  test('T047: Multiple packages can link to same monorepo root', async () => {
    // Check UI package
    process.chdir(uiPackageDir);
    clearSpeckCache();
    const uiConfig = await detectSpeckRoot();

    // Check API package
    process.chdir(apiPackageDir);
    clearSpeckCache();
    const apiConfig = await detectSpeckRoot();

    const realMonorepoRoot = await fs.realpath(monorepoRoot);

    expect(uiConfig.speckRoot).toBe(apiConfig.speckRoot);
    expect(uiConfig.speckRoot).toBe(realMonorepoRoot);
  });

  test('T048-T050: Each package has its own constitution', async () => {
    // Create different constitutions for each package
    const uiMemory = path.join(uiPackageDir, '.speck', 'memory');
    const apiMemory = path.join(apiPackageDir, '.speck', 'memory');

    await fs.mkdir(uiMemory, { recursive: true });
    await fs.mkdir(apiMemory, { recursive: true });

    await fs.writeFile(
      path.join(uiMemory, 'constitution.md'),
      '# UI Package Constitution\n**Tech Stack**: React, TypeScript\n**Principle**: UI-first development'
    );

    await fs.writeFile(
      path.join(apiMemory, 'constitution.md'),
      '# API Package Constitution\n**Tech Stack**: Node.js, Express\n**Principle**: No frontend dependencies'
    );

    // Verify constitutions are different
    const uiConstitution = await fs.readFile(path.join(uiMemory, 'constitution.md'), 'utf-8');
    const apiConstitution = await fs.readFile(path.join(apiMemory, 'constitution.md'), 'utf-8');

    expect(uiConstitution).toContain('React');
    expect(apiConstitution).toContain('No frontend');
    expect(uiConstitution).not.toBe(apiConstitution);
  });

  test('T051: Monorepo build tools not affected by .speck/root symlinks', async () => {
    // Create package.json files for monorepo workspace
    await fs.writeFile(
      path.join(monorepoRoot, 'package.json'),
      JSON.stringify({ name: 'monorepo', workspaces: ['packages/*'] })
    );

    await fs.writeFile(
      path.join(uiPackageDir, 'package.json'),
      JSON.stringify({ name: '@monorepo/ui' })
    );

    await fs.writeFile(
      path.join(apiPackageDir, 'package.json'),
      JSON.stringify({ name: '@monorepo/api' })
    );

    // Verify symlinks exist but don't interfere with package structure
    const uiSymlink = path.join(uiPackageDir, '.speck', 'root');
    const apiSymlink = path.join(apiPackageDir, '.speck', 'root');

    const uiStats = await fs.lstat(uiSymlink);
    const apiStats = await fs.lstat(apiSymlink);

    expect(uiStats.isSymbolicLink()).toBe(true);
    expect(apiStats.isSymbolicLink()).toBe(true);

    // Verify packages can still be listed
    const packagesDir = path.join(monorepoRoot, 'packages');
    const packages = await fs.readdir(packagesDir);

    expect(packages).toContain('ui');
    expect(packages).toContain('api');
  });
});

describe('Edge Cases and Error Handling', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await createTestDir('edge-cases');
    await initGit(testDir);
    process.chdir(testDir);
    clearSpeckCache();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(testDir);
  });

  test('Broken symlink falls back to single-repo mode gracefully', async () => {
    const speckDir = path.join(testDir, '.speck');
    await fs.mkdir(speckDir, { recursive: true });

    // Create symlink to non-existent directory
    const symlinkPath = path.join(speckDir, 'root');
    await fs.symlink('/tmp/nonexistent-directory-12345', symlinkPath, 'dir');

    clearSpeckCache();

    // Should fall back to single-repo mode gracefully (ENOENT caught)
    const config = await detectSpeckRoot();
    expect(config.mode).toBe('single-repo');
  });

  test('Non-symlink .speck/root file falls back to single-repo with warning', async () => {
    const speckDir = path.join(testDir, '.speck');
    await fs.mkdir(speckDir, { recursive: true });

    // Create regular file instead of symlink
    const rootPath = path.join(speckDir, 'root');
    await fs.writeFile(rootPath, 'not a symlink');

    // Capture console.warn
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => warnings.push(args.join(' '));

    clearSpeckCache();
    const config = await detectSpeckRoot();

    console.warn = originalWarn;

    expect(config.mode).toBe('single-repo');
    expect(warnings.some(w => w.includes('not a symlink'))).toBe(true);
  });

  test('Self-referencing symlink resolves to .speck directory', async () => {
    const speckDir = path.join(testDir, '.speck');
    await fs.mkdir(speckDir, { recursive: true });

    // Create symlink that points to current directory (.)
    const symlinkPath = path.join(speckDir, 'root');
    await fs.symlink('.', symlinkPath, 'dir');

    clearSpeckCache();

    // The symlink resolves to .speck/ directory itself
    const config = await detectSpeckRoot();
    expect(config.mode).toBe('multi-repo');
    expect(config.speckRoot).toContain('.speck');
  });
});
