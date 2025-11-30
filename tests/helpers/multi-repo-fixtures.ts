/**
 * Multi-Repo Test Fixtures Helper
 *
 * Provides utilities for setting up multi-repo test environments with:
 * - Root repository with specs
 * - Multiple child repositories with symlinks
 * - Git initialization and branch setup
 * - Branch metadata (.speck/branches.json) population
 *
 * Feature: 015-scope-simplification (refactored from 009-multi-repo-stacked)
 * Schema: v2.0.0 (simplified - no stacked PR fields)
 * Created: 2025-11-19
 * Updated: 2025-11-29
 */

import { mkdtemp, mkdir, writeFile, symlink, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { $ } from 'bun';
import type { BranchMapping, BranchEntry } from '../../.speck/scripts/common/branch-mapper.ts';

/**
 * Copy Speck scripts into test fixture for isolation
 *
 * @param targetDir - Directory to copy scripts into (test root)
 */
async function copySpeckScripts(targetDir: string): Promise<void> {
  const sourceScriptsDir = path.join(process.cwd(), '.speck/scripts');
  const targetScriptsDir = path.join(targetDir, '.speck/scripts');

  // Copy entire scripts directory recursively
  await cp(sourceScriptsDir, targetScriptsDir, { recursive: true });
}

/**
 * Multi-repo test environment structure
 */
export interface MultiRepoTestFixture {
  rootDir: string; // Root repository path
  specsDir: string; // Root specs directory
  scriptsDir: string; // Root scripts directory (isolated copy)
  childRepos: Map<string, string>; // Child repo name → repo path
  cleanup: () => Promise<void>; // Cleanup function
}

/**
 * Child repository configuration
 */
export interface ChildRepoConfig {
  name: string; // Child repo name (e.g., "backend-service")
  branches?: BranchEntry[]; // Pre-populated branches (optional)
  remoteUrl?: string; // Git remote URL (optional)
}

/**
 * Create a multi-repo test fixture with root and child repositories
 *
 * @param childConfigs - Array of child repository configurations
 * @param parentSpecId - Parent spec ID for child repos (default: "009-multi-repo-stacked")
 * @returns MultiRepoTestFixture with paths and cleanup function
 *
 * @example
 * ```typescript
 * const fixture = await createMultiRepoTestFixture([
 *   { name: "backend-service" },
 *   { name: "frontend-app", branches: [...] }
 * ]);
 *
 * // Run tests...
 *
 * await fixture?.cleanup();
 * ```
 */
export async function createMultiRepoTestFixture(
  childConfigs: ChildRepoConfig[],
  parentSpecId: string = '009-multi-repo-stacked'
): Promise<MultiRepoTestFixture> {
  // Create temporary root directory
  const rootDir = await mkdtemp(path.join(tmpdir(), 'speck-test-root-'));

  // Initialize root as git repository
  await $`git -C ${rootDir} init -q`.quiet();
  await $`git -C ${rootDir} config user.name "Test User"`.quiet();
  await $`git -C ${rootDir} config user.email "test@example.com"`.quiet();

  // Create specs directory in root
  const specsDir = path.join(rootDir, 'specs');
  await mkdir(specsDir, { recursive: true });

  // Create parent spec directory structure
  const parentSpecDir = path.join(specsDir, parentSpecId);
  await mkdir(parentSpecDir, { recursive: true });
  await writeFile(
    path.join(parentSpecDir, 'spec.md'),
    `# Spec: ${parentSpecId}\n\nTest specification for multi-repo testing.\n`
  );

  // Also create common spec directories used by tests
  const spec009Dir = path.join(specsDir, '009-multi-repo-stacked');
  await mkdir(spec009Dir, { recursive: true });
  await writeFile(
    path.join(spec009Dir, 'spec.md'),
    `# Spec: 009-multi-repo-stacked\n\nChild spec for multi-repo testing.\n`
  );

  const spec008Dir = path.join(specsDir, '008-stacked-pr-support');
  await mkdir(spec008Dir, { recursive: true });
  await writeFile(
    path.join(spec008Dir, 'spec.md'),
    `# Spec: 008-stacked-pr-support\n\nStacked PR spec for multi-repo testing.\n`
  );

  // Create .speck directory in root
  await mkdir(path.join(rootDir, '.speck'), { recursive: true });

  // Copy Speck scripts into test root for isolation
  await copySpeckScripts(rootDir);
  const scriptsDir = path.join(rootDir, '.speck/scripts');

  // Create initial commit in root
  await $`git -C ${rootDir} add .`.quiet();
  await $`git -C ${rootDir} commit -m "Initial commit" --allow-empty`.quiet();

  // [Feature 009] Checkout the parent spec branch in root
  // This allows detectParentSpecId() to correctly identify the parent spec
  await $`git -C ${rootDir} checkout -b ${parentSpecId}`.quiet();

  // Ensure no uncommitted changes after branch creation
  await $`git -C ${rootDir} add .`.quiet();
  await $`git -C ${rootDir} commit -m "Setup parent spec branch" --allow-empty`.quiet();

  // Map of child repo name → repo path
  const childRepos = new Map<string, string>();

  // Create child repositories
  for (const config of childConfigs) {
    const childDir = await mkdtemp(path.join(tmpdir(), `speck-test-child-${config.name}-`));
    childRepos.set(config.name, childDir);

    // Initialize child as git repository
    await $`git -C ${childDir} init -q`.quiet();
    await $`git -C ${childDir} config user.name "Test User"`.quiet();
    await $`git -C ${childDir} config user.email "test@example.com"`.quiet();

    // Create .speck directory in child
    const speckDir = path.join(childDir, '.speck');
    await mkdir(speckDir, { recursive: true });

    // Create symlink from child to root (.speck/root)
    const symlinkPath = path.join(speckDir, 'root');
    await symlink(rootDir, symlinkPath, 'dir');

    // [Feature 009] Create reverse symlink from root to child (.speck-link-{name})
    // This allows detectSpeckRoot() to identify the root as multi-repo mode
    const rootLinkPath = path.join(rootDir, `.speck-link-${config.name}`);
    try {
      await symlink(childDir, rootLinkPath, 'dir');
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
      // Symlink already exists, skip (can happen if test fixture is reused)
    }

    // Add git remote if provided
    if (config.remoteUrl) {
      await $`git -C ${childDir} remote add origin ${config.remoteUrl}`.quiet();
    }

    // Create main branch with initial commit
    await $`git -C ${childDir} add .`.quiet();
    await $`git -C ${childDir} commit -m "Initial commit" --allow-empty`.quiet();

    // Populate branches.json if provided
    if (config.branches && config.branches.length > 0) {
      const branchMapping: BranchMapping = {
        version: '2.0.0',
        branches: config.branches,
        specIndex: {},
      };

      // Build specIndex from branches
      for (const branch of config.branches) {
        if (!branchMapping.specIndex[branch.specId]) {
          branchMapping.specIndex[branch.specId] = [];
        }
        branchMapping.specIndex[branch.specId]!.push(branch.name);
      }

      // Write branches.json
      const branchesPath = path.join(speckDir, 'branches.json');
      await writeFile(branchesPath, JSON.stringify(branchMapping, null, 2));

      // Create git branches for each entry
      for (const branch of config.branches) {
        try {
          await $`git -C ${childDir} branch ${branch.name}`.quiet();
        } catch (error) {
          // Ignore if branch already exists
        }
      }
    }
  }

  // Commit all symlinks to avoid "uncommitted changes" errors in tests
  await $`git -C ${rootDir} add .`.quiet();
  await $`git -C ${rootDir} commit -m "Add child repo symlinks" --allow-empty`.quiet();

  // [Feature 009] Cherry-pick the symlink commit to main branch (only if there are child repos)
  // This ensures symlinks are available on main branch for tests that create branches from main
  if (childConfigs.length > 0) {
    const symlinkCommit = await $`git -C ${rootDir} rev-parse HEAD`.quiet();
    const symlinkCommitHash = symlinkCommit.stdout.toString().trim();

    await $`git -C ${rootDir} checkout main`.quiet();
    await $`git -C ${rootDir} cherry-pick ${symlinkCommitHash}`.quiet();

    // Checkout back to parent spec branch for tests that expect to be on that branch
    await $`git -C ${rootDir} checkout ${parentSpecId}`.quiet();
  }

  // Cleanup function
  const cleanup = async () => {
    await rm(rootDir, { recursive: true, force: true });
    for (const childDir of childRepos.values()) {
      await rm(childDir, { recursive: true, force: true });
    }
  };

  return {
    rootDir,
    specsDir,
    scriptsDir,
    childRepos,
    cleanup,
  };
}

/**
 * Create a branch entry for testing (simplified schema v2.0.0)
 *
 * @param name - Branch name
 * @param specId - Spec ID
 * @param parentSpecId - Parent spec ID (optional, for multi-repo child contexts)
 * @returns BranchEntry object
 *
 * @example
 * ```typescript
 * const entry = createTestBranchEntry(
 *   "nprbst/auth-db",
 *   "009-multi-repo-stacked",
 *   "007-multi-repo-monorepo-support"
 * );
 * ```
 */
export function createTestBranchEntry(
  name: string,
  specId: string,
  parentSpecId?: string
): BranchEntry {
  const now = new Date().toISOString();
  return {
    name,
    specId,
    createdAt: now,
    updatedAt: now,
    ...(parentSpecId && { parentSpecId }),
  };
}

/**
 * Create multiple branch entries for testing (simplified - no longer stacked)
 *
 * @param branchNames - Array of branch names
 * @param specId - Spec ID for all branches
 * @param parentSpecId - Parent spec ID (optional, for multi-repo child contexts)
 * @returns Array of BranchEntry objects
 *
 * @example
 * ```typescript
 * const entries = createBranchEntries(
 *   ["nprbst/db-layer", "nprbst/api-layer", "nprbst/ui-layer"],
 *   "009-multi-repo-stacked",
 *   "007-multi-repo-monorepo-support"
 * );
 * ```
 */
export function createBranchEntries(
  branchNames: string[],
  specId: string,
  parentSpecId?: string
): BranchEntry[] {
  return branchNames.map((name) => createTestBranchEntry(name, specId, parentSpecId));
}

/**
 * Assert that a directory is a git repository
 *
 * @param dirPath - Directory path to check
 * @throws Error if directory is not a git repository
 */
export async function assertIsGitRepo(dirPath: string): Promise<void> {
  try {
    await $`git -C ${dirPath} rev-parse --git-dir`.quiet();
  } catch (error) {
    throw new Error(`Directory is not a git repository: ${dirPath}`);
  }
}

/**
 * Assert that a symlink exists and points to expected target
 *
 * @param symlinkPath - Symlink path
 * @param expectedTarget - Expected symlink target path
 * @throws Error if symlink does not exist or points to wrong target
 */
export async function assertSymlinkTarget(
  symlinkPath: string,
  expectedTarget: string
): Promise<void> {
  try {
    const { readlink } = await import('node:fs/promises');
    const actualTarget = await readlink(symlinkPath);
    if (actualTarget !== expectedTarget) {
      throw new Error(
        `Symlink target mismatch:\n` +
          `  Expected: ${expectedTarget}\n` +
          `  Actual: ${actualTarget}`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('target mismatch')) {
      throw error;
    }
    throw new Error(`Symlink does not exist: ${symlinkPath}`);
  }
}

/**
 * Get current git branch name
 *
 * @param repoPath - Repository path
 * @returns Current branch name
 */
export async function getCurrentBranch(repoPath: string): Promise<string> {
  const result = await $`git -C ${repoPath} rev-parse --abbrev-ref HEAD`.quiet();
  return result.text().trim();
}

/**
 * Create and checkout a git branch
 *
 * @param repoPath - Repository path
 * @param branchName - Branch name to create
 * @param baseBranch - Base branch (default: current branch)
 */
export async function createGitBranch(
  repoPath: string,
  branchName: string,
  baseBranch?: string
): Promise<void> {
  if (baseBranch) {
    await $`git -C ${repoPath} checkout -b ${branchName} ${baseBranch}`.quiet();
  } else {
    await $`git -C ${repoPath} checkout -b ${branchName}`.quiet();
  }
}

/**
 * Commit all changes in a repository
 *
 * @param repoPath - Repository path
 * @param message - Commit message
 */
export async function commitChanges(repoPath: string, message: string): Promise<void> {
  await $`git -C ${repoPath} add .`.quiet();
  await $`git -C ${repoPath} commit -m ${message} --allow-empty`.quiet();
}

/**
 * Execute a TypeScript script with Bun runtime
 *
 * @param scriptPath - Path to script to execute
 * @param args - Command-line arguments
 * @param options - Execution options (cwd, env, etc.)
 * @returns Script output with exitCode, stdout, stderr
 */
export async function executeScript(
  scriptPath: string,
  args: string[] = [],
  options: { cwd?: string; env?: Record<string, string> } = {}
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const proc = Bun.spawn({
      cmd: ['bun', 'run', scriptPath, ...args],
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return { exitCode, stdout, stderr };
  } catch (error) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}
