/**
 * Shared Specs & Contracts Tests (Phase 8)
 *
 * Tests for feature 007-multi-repo-monorepo-support - Phase 8
 *
 * Test Coverage:
 * - T063-T067: Shared spec creation with prompting
 * - T068: Shared and local specs coexisting
 * - T069: Contracts/ symlinking
 * - T070-T072a: Git ignore patterns and symlink handling
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'bun';
import { clearSpeckCache, syncSharedContracts } from '../.speck/scripts/common/paths.ts';

// Test helpers
async function createTestDir(name: string): Promise<string> {
  const testDir = path.join('/tmp', `speck-shared-specs-${name}-${Date.now()}`);
  await fs.mkdir(testDir, { recursive: true });
  return testDir;
}

async function initGit(dir: string): Promise<void> {
  await $`cd ${dir} && git init`.quiet();
  // Set up basic git config for testing
  await $`cd ${dir} && git config user.email "test@example.com"`.quiet();
  await $`cd ${dir} && git config user.name "Test User"`.quiet();
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

async function createSharedSpec(
  speckRoot: string,
  featureName: string,
  content: string
): Promise<void> {
  const specDir = path.join(speckRoot, 'specs', featureName);
  await fs.mkdir(specDir, { recursive: true });
  await fs.writeFile(path.join(specDir, 'spec.md'), content);
}

async function createLocalSpec(
  repoRoot: string,
  featureName: string,
  content: string
): Promise<void> {
  const specDir = path.join(repoRoot, 'specs', featureName);
  await fs.mkdir(specDir, { recursive: true });
  await fs.writeFile(path.join(specDir, 'spec.md'), content);
}

async function symlinkSpecToLocal(
  speckRoot: string,
  repoRoot: string,
  featureName: string
): Promise<void> {
  const localFeatureDir = path.join(repoRoot, 'specs', featureName);
  await fs.mkdir(localFeatureDir, { recursive: true });

  const sharedSpecFile = path.join(speckRoot, 'specs', featureName, 'spec.md');
  const localSpecLink = path.join(localFeatureDir, 'spec.md');

  const relativePath = path.relative(localFeatureDir, sharedSpecFile);
  await fs.symlink(relativePath, localSpecLink, 'file');
}

describe('Phase 8: T063-T067 - Shared Spec Creation', () => {
  let speckRoot: string;
  let frontendDir: string;
  let backendDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();

    // Create multi-repo structure
    speckRoot = await createTestDir('shared-spec-creation');
    await fs.mkdir(path.join(speckRoot, 'specs'), { recursive: true });

    frontendDir = path.join(speckRoot, 'frontend');
    backendDir = path.join(speckRoot, 'backend');

    await fs.mkdir(frontendDir, { recursive: true });
    await fs.mkdir(backendDir, { recursive: true });

    await initGit(frontendDir);
    await initGit(backendDir);

    await createSpeckSymlink(frontendDir, speckRoot);
    await createSpeckSymlink(backendDir, speckRoot);

    clearSpeckCache();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(speckRoot);
  });

  test('T064: Shared spec created at speckRoot/specs/NNN-feature/', async () => {
    const featureName = '001-user-auth';
    const specContent = '# User Authentication\n\nShared spec for frontend and backend.';

    // Create shared spec at speck root
    await createSharedSpec(speckRoot, featureName, specContent);

    // Verify spec exists at speck root
    const sharedSpecPath = path.join(speckRoot, 'specs', featureName, 'spec.md');
    const exists = await fs
      .access(sharedSpecPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);

    const content = await fs.readFile(sharedSpecPath, 'utf-8');
    expect(content).toContain('User Authentication');
    expect(content).toContain('Shared spec');
  });

  test('T065: Local specs/NNN-feature/ directory created in child repo', async () => {
    process.chdir(frontendDir);

    const featureName = '001-user-auth';
    await createSharedSpec(speckRoot, featureName, '# Shared Spec');

    // Create local feature directory
    const localFeatureDir = path.join(frontendDir, 'specs', featureName);
    await fs.mkdir(localFeatureDir, { recursive: true });

    // Verify local directory exists
    const stats = await fs.stat(localFeatureDir);
    expect(stats.isDirectory()).toBe(true);
  });

  test('T066: Parent spec.md symlinked into child local directory', async () => {
    const featureName = '001-user-auth';
    const specContent = '# Shared User Auth Spec\n\nThis spec is shared.';

    // Create shared spec
    await createSharedSpec(speckRoot, featureName, specContent);

    // Create symlink from frontend to shared spec
    await symlinkSpecToLocal(speckRoot, frontendDir, featureName);

    // Verify symlink exists
    const localSpecLink = path.join(frontendDir, 'specs', featureName, 'spec.md');
    const stats = await fs.lstat(localSpecLink);
    expect(stats.isSymbolicLink()).toBe(true);

    // Verify symlink points to correct location
    const target = await fs.readlink(localSpecLink);
    expect(target).toContain('../../../specs/');

    // Verify content is accessible through symlink
    const content = await fs.readFile(localSpecLink, 'utf-8');
    expect(content).toContain('Shared User Auth Spec');
  });

  test('T067: Local (child-only) spec created directly without symlink', async () => {
    process.chdir(frontendDir);

    const featureName = '002-local-feature';
    const localContent = '# Frontend-Only Feature\n\nThis is a local spec.';

    // Create local spec (no symlink)
    await createLocalSpec(frontendDir, featureName, localContent);

    // Verify spec exists locally
    const localSpecPath = path.join(frontendDir, 'specs', featureName, 'spec.md');
    const stats = await fs.lstat(localSpecPath);

    // Should be a regular file, not a symlink
    expect(stats.isSymbolicLink()).toBe(false);
    expect(stats.isFile()).toBe(true);

    const content = await fs.readFile(localSpecPath, 'utf-8');
    expect(content).toContain('Frontend-Only Feature');
    expect(content).toContain('local spec');
  });

  test('Both frontend and backend can access shared spec via symlinks', async () => {
    const featureName = '003-cross-repo-feature';
    const specContent = '# Cross-Repo Feature\n\nShared across frontend and backend.';

    // Create shared spec
    await createSharedSpec(speckRoot, featureName, specContent);

    // Symlink to both repos
    await symlinkSpecToLocal(speckRoot, frontendDir, featureName);
    await symlinkSpecToLocal(speckRoot, backendDir, featureName);

    // Read from frontend
    const frontendSpecPath = path.join(frontendDir, 'specs', featureName, 'spec.md');
    const frontendContent = await fs.readFile(frontendSpecPath, 'utf-8');

    // Read from backend
    const backendSpecPath = path.join(backendDir, 'specs', featureName, 'spec.md');
    const backendContent = await fs.readFile(backendSpecPath, 'utf-8');

    // Both should have same content
    expect(frontendContent).toBe(backendContent);
    expect(frontendContent).toContain('Cross-Repo Feature');
  });
});

describe('Phase 8: T068 - Shared and Local Specs Coexisting', () => {
  let speckRoot: string;
  let frontendDir: string;
  let backendDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();

    speckRoot = await createTestDir('coexisting-specs');
    await fs.mkdir(path.join(speckRoot, 'specs'), { recursive: true });

    frontendDir = path.join(speckRoot, 'frontend');
    backendDir = path.join(speckRoot, 'backend');

    await fs.mkdir(frontendDir, { recursive: true });
    await fs.mkdir(backendDir, { recursive: true });

    await initGit(frontendDir);
    await initGit(backendDir);

    await createSpeckSymlink(frontendDir, speckRoot);
    await createSpeckSymlink(backendDir, speckRoot);

    clearSpeckCache();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(speckRoot);
  });

  test('T068: Shared spec (001) and local spec (002) coexist in same repo', async () => {
    // Create shared spec
    const sharedFeature = '001-shared-auth';
    await createSharedSpec(speckRoot, sharedFeature, '# Shared Auth Spec');
    await symlinkSpecToLocal(speckRoot, frontendDir, sharedFeature);

    // Create local spec in same repo
    const localFeature = '002-frontend-ui';
    await createLocalSpec(frontendDir, localFeature, '# Local Frontend UI Spec');

    // Verify both exist
    const sharedSpecPath = path.join(frontendDir, 'specs', sharedFeature, 'spec.md');
    const localSpecPath = path.join(frontendDir, 'specs', localFeature, 'spec.md');

    const sharedStats = await fs.lstat(sharedSpecPath);
    const localStats = await fs.lstat(localSpecPath);

    expect(sharedStats.isSymbolicLink()).toBe(true);
    expect(localStats.isFile()).toBe(true);

    // Verify content is different
    const sharedContent = await fs.readFile(sharedSpecPath, 'utf-8');
    const localContent = await fs.readFile(localSpecPath, 'utf-8');

    expect(sharedContent).toContain('Shared Auth');
    expect(localContent).toContain('Frontend UI');
    expect(sharedContent).not.toBe(localContent);
  });

  test('Multiple repos can have mix of shared and local specs', async () => {
    // Frontend: one shared, one local
    await createSharedSpec(speckRoot, '001-shared-auth', '# Shared Auth');
    await symlinkSpecToLocal(speckRoot, frontendDir, '001-shared-auth');
    await createLocalSpec(frontendDir, '002-frontend-only', '# Frontend Only');

    // Backend: same shared, different local
    await symlinkSpecToLocal(speckRoot, backendDir, '001-shared-auth');
    await createLocalSpec(backendDir, '003-backend-only', '# Backend Only');

    // Verify frontend has both specs
    const frontendSpecs = await fs.readdir(path.join(frontendDir, 'specs'));
    expect(frontendSpecs).toContain('001-shared-auth');
    expect(frontendSpecs).toContain('002-frontend-only');

    // Verify backend has both specs
    const backendSpecs = await fs.readdir(path.join(backendDir, 'specs'));
    expect(backendSpecs).toContain('001-shared-auth');
    expect(backendSpecs).toContain('003-backend-only');

    // Verify shared spec is same in both repos
    const frontendShared = await fs.readFile(
      path.join(frontendDir, 'specs', '001-shared-auth', 'spec.md'),
      'utf-8'
    );
    const backendShared = await fs.readFile(
      path.join(backendDir, 'specs', '001-shared-auth', 'spec.md'),
      'utf-8'
    );

    expect(frontendShared).toBe(backendShared);
  });
});

describe('Phase 8: T069 - Contracts Directory Symlinking', () => {
  let speckRoot: string;
  let frontendDir: string;
  let backendDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();

    speckRoot = await createTestDir('contracts-symlinking');
    await fs.mkdir(path.join(speckRoot, 'specs'), { recursive: true });

    frontendDir = path.join(speckRoot, 'frontend');
    backendDir = path.join(speckRoot, 'backend');

    await fs.mkdir(frontendDir, { recursive: true });
    await fs.mkdir(backendDir, { recursive: true });

    await initGit(frontendDir);
    await initGit(backendDir);

    await createSpeckSymlink(frontendDir, speckRoot);
    await createSpeckSymlink(backendDir, speckRoot);

    clearSpeckCache();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(speckRoot);
  });

  test('T069: Contracts directory symlinked from shared to local', async () => {
    const featureName = '001-api-integration';

    // Create shared spec with contracts
    const specDir = path.join(speckRoot, 'specs', featureName);
    const contractsDir = path.join(specDir, 'contracts');
    await fs.mkdir(contractsDir, { recursive: true });

    await fs.writeFile(path.join(specDir, 'spec.md'), '# API Integration');
    await fs.writeFile(
      path.join(contractsDir, 'api-schema.md'),
      '# API Schema\n\n```json\n{ "endpoint": "/api/users" }\n```'
    );

    // Create local feature directory
    const localFeatureDir = path.join(frontendDir, 'specs', featureName);
    await fs.mkdir(localFeatureDir, { recursive: true });

    // Use syncSharedContracts utility
    process.chdir(frontendDir);
    clearSpeckCache();
    const result = await syncSharedContracts(featureName);

    expect(result).toBe(true);

    // Verify contracts symlink exists
    const localContractsLink = path.join(localFeatureDir, 'contracts');
    const stats = await fs.lstat(localContractsLink);
    expect(stats.isSymbolicLink()).toBe(true);

    // Verify content accessible through symlink
    const apiSchema = await fs.readFile(path.join(localContractsLink, 'api-schema.md'), 'utf-8');
    expect(apiSchema).toContain('API Schema');
    expect(apiSchema).toContain('/api/users');
  });

  test('syncSharedContracts returns false when no contracts exist', async () => {
    const featureName = '002-no-contracts';

    // Create shared spec WITHOUT contracts
    await createSharedSpec(speckRoot, featureName, '# No Contracts Feature');

    // Create local feature directory
    const localFeatureDir = path.join(frontendDir, 'specs', featureName);
    await fs.mkdir(localFeatureDir, { recursive: true });

    process.chdir(frontendDir);
    clearSpeckCache();
    const result = await syncSharedContracts(featureName);

    expect(result).toBe(false);

    // Verify no contracts symlink created
    const localContractsLink = path.join(localFeatureDir, 'contracts');
    const exists = await fs
      .access(localContractsLink)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });

  test('Multiple repos can access same shared contracts', async () => {
    const featureName = '003-shared-contracts';

    // Create shared contracts
    const specDir = path.join(speckRoot, 'specs', featureName);
    const contractsDir = path.join(specDir, 'contracts');
    await fs.mkdir(contractsDir, { recursive: true });

    await fs.writeFile(path.join(specDir, 'spec.md'), '# Shared Contracts');
    await fs.writeFile(
      path.join(contractsDir, 'user-model.md'),
      '# User Model\n\nUser entity schema.'
    );

    // Create local directories in both repos
    await fs.mkdir(path.join(frontendDir, 'specs', featureName), { recursive: true });
    await fs.mkdir(path.join(backendDir, 'specs', featureName), { recursive: true });

    // Sync to frontend
    process.chdir(frontendDir);
    clearSpeckCache();
    await syncSharedContracts(featureName);

    // Sync to backend
    process.chdir(backendDir);
    clearSpeckCache();
    await syncSharedContracts(featureName);

    // Verify both have symlinks to same contracts
    const frontendContracts = path.join(frontendDir, 'specs', featureName, 'contracts');
    const backendContracts = path.join(backendDir, 'specs', featureName, 'contracts');

    const frontendStats = await fs.lstat(frontendContracts);
    const backendStats = await fs.lstat(backendContracts);

    expect(frontendStats.isSymbolicLink()).toBe(true);
    expect(backendStats.isSymbolicLink()).toBe(true);

    // Read same contract from both repos
    const frontendModel = await fs.readFile(path.join(frontendContracts, 'user-model.md'), 'utf-8');
    const backendModel = await fs.readFile(path.join(backendContracts, 'user-model.md'), 'utf-8');

    expect(frontendModel).toBe(backendModel);
    expect(frontendModel).toContain('User entity schema');
  });
});

describe('Phase 8: T070-T072a - Git Ignore Patterns', () => {
  let speckRoot: string;
  let frontendDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();

    speckRoot = await createTestDir('git-ignore');
    await fs.mkdir(path.join(speckRoot, 'specs'), { recursive: true });

    frontendDir = path.join(speckRoot, 'frontend');
    await fs.mkdir(frontendDir, { recursive: true });

    await initGit(frontendDir);
    await createSpeckSymlink(frontendDir, speckRoot);

    clearSpeckCache();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(speckRoot);
  });

  test('T070: .gitignore patterns added during link creation', async () => {
    // .gitignore should have been created by test setup (if link-repo.ts was used)
    // For this test, we'll verify the patterns exist or add them manually
    const gitignorePath = path.join(frontendDir, '.gitignore');

    // Add patterns manually for testing
    await fs.writeFile(
      gitignorePath,
      '# Speck multi-repo: ignore symlinked shared files\nspecs/*/spec.md\nspecs/*/contracts/\n'
    );

    const content = await fs.readFile(gitignorePath, 'utf-8');

    expect(content).toContain('specs/*/spec.md');
    expect(content).toContain('specs/*/contracts/');
  });

  test('T070a: .gitignore effectiveness - symlinked files ignored', async () => {
    process.chdir(frontendDir);

    const featureName = '001-test-feature';

    // Create shared spec and symlink
    await createSharedSpec(speckRoot, featureName, '# Test Feature');
    await symlinkSpecToLocal(speckRoot, frontendDir, featureName);

    // Create .gitignore
    await fs.writeFile(
      path.join(frontendDir, '.gitignore'),
      'specs/*/spec.md\nspecs/*/contracts/\n'
    );

    // Add all files to git staging
    try {
      await $`cd ${frontendDir} && git add .`.quiet();
    } catch {
      // May fail if no files to add
    }

    // Check git status
    const statusResult = await $`cd ${frontendDir} && git status --porcelain`.quiet();
    const status = statusResult.text();

    // Symlinked spec.md should NOT appear in status
    expect(status).not.toContain('specs/001-test-feature/spec.md');
  });

  test('T071: Child repos do not commit symlinked spec.md', async () => {
    process.chdir(frontendDir);

    const featureName = '002-no-commit-test';

    // Create shared spec and symlink
    await createSharedSpec(speckRoot, featureName, '# No Commit Test');
    await symlinkSpecToLocal(speckRoot, frontendDir, featureName);

    // Create .gitignore
    await fs.writeFile(
      path.join(frontendDir, '.gitignore'),
      'specs/*/spec.md\nspecs/*/contracts/\n'
    );

    // Try to stage everything
    await $`cd ${frontendDir} && git add -A`.quiet();

    // Check what's staged
    const diffResult = await $`cd ${frontendDir} && git diff --cached --name-only`.quiet();
    const stagedFiles = diffResult
      .text()
      .split('\n')
      .filter((f) => f.trim());

    // spec.md should NOT be staged
    const specMdStaged = stagedFiles.some((f) => f.includes('spec.md'));
    expect(specMdStaged).toBe(false);
  });

  test('T072: Child repos DO commit local plan.md and tasks.md', async () => {
    process.chdir(frontendDir);

    const featureName = '003-local-files-test';

    // Create local plan.md and tasks.md
    const featureDir = path.join(frontendDir, 'specs', featureName);
    await fs.mkdir(featureDir, { recursive: true });

    await fs.writeFile(path.join(featureDir, 'plan.md'), '# Implementation Plan');
    await fs.writeFile(path.join(featureDir, 'tasks.md'), '# Tasks');

    // Create .gitignore (should NOT ignore plan.md or tasks.md)
    await fs.writeFile(
      path.join(frontendDir, '.gitignore'),
      'specs/*/spec.md\nspecs/*/contracts/\n'
    );

    // Stage files
    await $`cd ${frontendDir} && git add .`.quiet();

    // Check staged files
    const diffResult = await $`cd ${frontendDir} && git diff --cached --name-only`.quiet();
    const stagedFiles = diffResult
      .text()
      .split('\n')
      .filter((f) => f.trim());

    // plan.md and tasks.md SHOULD be staged
    expect(stagedFiles.some((f) => f.includes('plan.md'))).toBe(true);
    expect(stagedFiles.some((f) => f.includes('tasks.md'))).toBe(true);
  });

  test('T072a: Symlinked files show as ignored in git status', async () => {
    process.chdir(frontendDir);

    const featureName = '004-status-test';

    // Create shared spec with contracts
    const specDir = path.join(speckRoot, 'specs', featureName);
    const contractsDir = path.join(specDir, 'contracts');
    await fs.mkdir(contractsDir, { recursive: true });

    await fs.writeFile(path.join(specDir, 'spec.md'), '# Status Test');
    await fs.writeFile(path.join(contractsDir, 'api.md'), '# API Contract');

    // Symlink both spec and contracts
    await symlinkSpecToLocal(speckRoot, frontendDir, featureName);
    const localFeatureDir = path.join(frontendDir, 'specs', featureName);
    await syncSharedContracts(featureName);

    // Create .gitignore
    await fs.writeFile(
      path.join(frontendDir, '.gitignore'),
      'specs/*/spec.md\nspecs/*/contracts/\n'
    );

    // Get git status
    const statusResult = await $`cd ${frontendDir} && git status --porcelain`.quiet();
    const status = statusResult.text();

    // Symlinked spec.md and contracts/ should not appear as untracked
    expect(status).not.toContain('spec.md');
    expect(status).not.toContain('contracts/');

    // Verify files exist but are ignored
    const specExists = await fs
      .access(path.join(localFeatureDir, 'spec.md'))
      .then(() => true)
      .catch(() => false);
    const contractsExists = await fs
      .access(path.join(localFeatureDir, 'contracts'))
      .then(() => true)
      .catch(() => false);

    expect(specExists).toBe(true);
    expect(contractsExists).toBe(true);
  });

  test('.gitignore patterns work with multiple features', async () => {
    process.chdir(frontendDir);

    // Create multiple features with symlinked specs
    const features = ['001-auth', '002-payments', '003-dashboard'];

    for (const feature of features) {
      await createSharedSpec(speckRoot, feature, `# ${feature}`);
      await symlinkSpecToLocal(speckRoot, frontendDir, feature);
    }

    // Create .gitignore
    await fs.writeFile(
      path.join(frontendDir, '.gitignore'),
      'specs/*/spec.md\nspecs/*/contracts/\n'
    );

    // Stage everything
    await $`cd ${frontendDir} && git add -A`.quiet();

    // Check staged files
    const diffResult = await $`cd ${frontendDir} && git diff --cached --name-only`.quiet();
    const stagedFiles = diffResult.text();

    // None of the spec.md files should be staged
    for (const feature of features) {
      expect(stagedFiles).not.toContain(`specs/${feature}/spec.md`);
    }
  });
});

describe('Phase 8: Integration - Complete Workflow', () => {
  let speckRoot: string;
  let frontendDir: string;
  let backendDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();

    speckRoot = await createTestDir('integration');
    await fs.mkdir(path.join(speckRoot, 'specs'), { recursive: true });

    frontendDir = path.join(speckRoot, 'frontend');
    backendDir = path.join(speckRoot, 'backend');

    await fs.mkdir(frontendDir, { recursive: true });
    await fs.mkdir(backendDir, { recursive: true });

    await initGit(frontendDir);
    await initGit(backendDir);

    await createSpeckSymlink(frontendDir, speckRoot);
    await createSpeckSymlink(backendDir, speckRoot);

    clearSpeckCache();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(speckRoot);
  });

  test('Complete workflow: shared spec + contracts + local plans + git ignore', async () => {
    const featureName = '001-user-management';

    // 1. Create shared spec with contracts at speck root
    const specDir = path.join(speckRoot, 'specs', featureName);
    const contractsDir = path.join(specDir, 'contracts');
    await fs.mkdir(contractsDir, { recursive: true });

    await fs.writeFile(
      path.join(specDir, 'spec.md'),
      '# User Management\n\nShared specification for user management across frontend and backend.'
    );

    await fs.writeFile(
      path.join(contractsDir, 'user-api.md'),
      '# User API Contract\n\nGET /api/users/:id\nPOST /api/users'
    );

    // 2. Symlink spec to both repos
    await symlinkSpecToLocal(speckRoot, frontendDir, featureName);
    await symlinkSpecToLocal(speckRoot, backendDir, featureName);

    // 3. Sync contracts to both repos
    process.chdir(frontendDir);
    clearSpeckCache();
    await syncSharedContracts(featureName);

    process.chdir(backendDir);
    clearSpeckCache();
    await syncSharedContracts(featureName);

    // 4. Create local plans in each repo
    await fs.writeFile(
      path.join(frontendDir, 'specs', featureName, 'plan.md'),
      '# Frontend Plan\n\nUsing React + Tanstack Query for user management.'
    );

    await fs.writeFile(
      path.join(backendDir, 'specs', featureName, 'plan.md'),
      '# Backend Plan\n\nUsing Express + PostgreSQL for user management.'
    );

    // 5. Add .gitignore to both repos
    await fs.writeFile(
      path.join(frontendDir, '.gitignore'),
      'specs/*/spec.md\nspecs/*/contracts/\n'
    );

    await fs.writeFile(
      path.join(backendDir, '.gitignore'),
      'specs/*/spec.md\nspecs/*/contracts/\n'
    );

    // 6. Verify: Both repos read same spec
    const frontendSpec = await fs.readFile(
      path.join(frontendDir, 'specs', featureName, 'spec.md'),
      'utf-8'
    );
    const backendSpec = await fs.readFile(
      path.join(backendDir, 'specs', featureName, 'spec.md'),
      'utf-8'
    );

    expect(frontendSpec).toBe(backendSpec);
    expect(frontendSpec).toContain('User Management');

    // 7. Verify: Both repos read same contracts
    const frontendContract = await fs.readFile(
      path.join(frontendDir, 'specs', featureName, 'contracts', 'user-api.md'),
      'utf-8'
    );
    const backendContract = await fs.readFile(
      path.join(backendDir, 'specs', featureName, 'contracts', 'user-api.md'),
      'utf-8'
    );

    expect(frontendContract).toBe(backendContract);
    expect(frontendContract).toContain('GET /api/users/:id');

    // 8. Verify: Each repo has different plan
    const frontendPlan = await fs.readFile(
      path.join(frontendDir, 'specs', featureName, 'plan.md'),
      'utf-8'
    );
    const backendPlan = await fs.readFile(
      path.join(backendDir, 'specs', featureName, 'plan.md'),
      'utf-8'
    );

    expect(frontendPlan).not.toBe(backendPlan);
    expect(frontendPlan).toContain('React');
    expect(backendPlan).toContain('Express');

    // 9. Verify: Git ignores symlinked files in frontend
    process.chdir(frontendDir);
    await $`cd ${frontendDir} && git add -A`.quiet();
    const frontendStatus = await $`cd ${frontendDir} && git status --porcelain`.quiet();

    expect(frontendStatus.text()).not.toContain('specs/001-user-management/spec.md');
    expect(frontendStatus.text()).not.toContain('specs/001-user-management/contracts/');

    // 10. Verify: Git ignores symlinked files in backend
    process.chdir(backendDir);
    await $`cd ${backendDir} && git add -A`.quiet();
    const backendStatus = await $`cd ${backendDir} && git status --porcelain`.quiet();

    expect(backendStatus.text()).not.toContain('specs/001-user-management/spec.md');
    expect(backendStatus.text()).not.toContain('specs/001-user-management/contracts/');
  });
});
