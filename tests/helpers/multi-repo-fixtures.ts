/**
 * Multi-Repo Test Fixtures Helper
 *
 * Provides utilities for setting up multi-repo test environments with:
 * - Root repository with specs
 * - Multiple child repositories with symlinks
 * - Git initialization and branch setup
 * - Branch metadata (.speck/branches.json) population
 *
 * Feature: 009-multi-repo-stacked
 * Created: 2025-11-19
 */

import { mkdtemp, mkdir, writeFile, symlink, rm, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { $ } from "bun";
import type { BranchMapping, BranchEntry } from "../../.speck/scripts/common/branch-mapper.ts";

/**
 * Copy Speck scripts into test fixture for isolation
 *
 * @param targetDir - Directory to copy scripts into (test root)
 */
async function copySpeckScripts(targetDir: string): Promise<void> {
  const sourceScriptsDir = path.join(process.cwd(), ".speck/scripts");
  const targetScriptsDir = path.join(targetDir, ".speck/scripts");

  // Copy entire scripts directory recursively
  await cp(sourceScriptsDir, targetScriptsDir, { recursive: true });
}

/**
 * Multi-repo test environment structure
 */
export interface MultiRepoTestFixture {
  rootDir: string;           // Root repository path
  specsDir: string;          // Root specs directory
  scriptsDir: string;        // Root scripts directory (isolated copy)
  childRepos: Map<string, string>;  // Child repo name → repo path
  cleanup: () => Promise<void>;     // Cleanup function
}

/**
 * Child repository configuration
 */
export interface ChildRepoConfig {
  name: string;              // Child repo name (e.g., "backend-service")
  branches?: BranchEntry[];  // Pre-populated branches (optional)
  remoteUrl?: string;        // Git remote URL (optional)
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
 * await fixture.cleanup();
 * ```
 */
export async function createMultiRepoTestFixture(
  childConfigs: ChildRepoConfig[],
  parentSpecId: string = "009-multi-repo-stacked"
): Promise<MultiRepoTestFixture> {
  // Create temporary root directory
  const rootDir = await mkdtemp(path.join(tmpdir(), "speck-test-root-"));

  // Initialize root as git repository
  await $`git -C ${rootDir} init -q`.quiet();
  await $`git -C ${rootDir} config user.name "Test User"`.quiet();
  await $`git -C ${rootDir} config user.email "test@example.com"`.quiet();

  // Create specs directory in root
  const specsDir = path.join(rootDir, "specs");
  await mkdir(specsDir, { recursive: true });

  // Create parent spec directory structure
  const parentSpecDir = path.join(specsDir, parentSpecId);
  await mkdir(parentSpecDir, { recursive: true });
  await writeFile(
    path.join(parentSpecDir, "spec.md"),
    `# Spec: ${parentSpecId}\n\nTest specification for multi-repo testing.\n`
  );

  // Also create the 009-multi-repo-stacked spec directory (for child branches to reference)
  const childSpecDir = path.join(specsDir, "009-multi-repo-stacked");
  await mkdir(childSpecDir, { recursive: true });
  await writeFile(
    path.join(childSpecDir, "spec.md"),
    `# Spec: 009-multi-repo-stacked\n\nChild spec for multi-repo testing.\n`
  );

  // Create .speck directory in root
  await mkdir(path.join(rootDir, ".speck"), { recursive: true });

  // Copy Speck scripts into test root for isolation
  await copySpeckScripts(rootDir);
  const scriptsDir = path.join(rootDir, ".speck/scripts");

  // Create initial commit in root
  await $`git -C ${rootDir} add .`.quiet();
  await $`git -C ${rootDir} commit -m "Initial commit" --allow-empty`.quiet();

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
    const speckDir = path.join(childDir, ".speck");
    await mkdir(speckDir, { recursive: true });

    // Create symlink from child to root (.speck/root)
    const symlinkPath = path.join(speckDir, "root");
    await symlink(rootDir, symlinkPath, "dir");

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
        version: "1.1.0",
        branches: config.branches,
        specIndex: {}
      };

      // Build specIndex from branches
      for (const branch of config.branches) {
        if (!branchMapping.specIndex[branch.specId]) {
          branchMapping.specIndex[branch.specId] = [];
        }
        branchMapping.specIndex[branch.specId].push(branch.name);
      }

      // Write branches.json
      const branchesPath = path.join(speckDir, "branches.json");
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
    cleanup
  };
}

/**
 * Create a branch entry for testing
 *
 * @param name - Branch name
 * @param specId - Spec ID
 * @param baseBranch - Base branch (default: "main")
 * @param status - Branch status (default: "active")
 * @param parentSpecId - Parent spec ID (optional, for multi-repo child contexts)
 * @param pr - PR number (optional)
 * @returns BranchEntry object
 *
 * @example
 * ```typescript
 * const entry = createBranchEntry(
 *   "nprbst/auth-db",
 *   "009-multi-repo-stacked",
 *   "main",
 *   "active",
 *   "007-multi-repo-monorepo-support"
 * );
 * ```
 */
export function createBranchEntry(
  name: string,
  specId: string,
  baseBranch: string = "main",
  status: "active" | "submitted" | "merged" | "abandoned" = "active",
  parentSpecId?: string,
  pr?: number
): BranchEntry {
  const now = new Date().toISOString();
  return {
    name,
    specId,
    baseBranch,
    status,
    pr: pr ?? null,
    createdAt: now,
    updatedAt: now,
    ...(parentSpecId && { parentSpecId })
  };
}

/**
 * Create a stacked branch chain for testing
 *
 * @param branchNames - Array of branch names in dependency order
 * @param specId - Spec ID for all branches
 * @param baseBranch - Base branch for the first branch (default: "main")
 * @param parentSpecId - Parent spec ID (optional, for multi-repo child contexts)
 * @returns Array of BranchEntry objects forming a dependency chain
 *
 * @example
 * ```typescript
 * const chain = createBranchChain(
 *   ["nprbst/db-layer", "nprbst/api-layer", "nprbst/ui-layer"],
 *   "009-multi-repo-stacked",
 *   "main",
 *   "007-multi-repo-monorepo-support"
 * );
 * // Returns 3 branches:
 * // - nprbst/db-layer (base: main)
 * // - nprbst/api-layer (base: nprbst/db-layer)
 * // - nprbst/ui-layer (base: nprbst/api-layer)
 * ```
 */
export function createBranchChain(
  branchNames: string[],
  specId: string,
  baseBranch: string = "main",
  parentSpecId?: string
): BranchEntry[] {
  const entries: BranchEntry[] = [];
  let currentBase = baseBranch;

  for (const name of branchNames) {
    const entry = createBranchEntry(name, specId, currentBase, "active", parentSpecId);
    entries.push(entry);
    currentBase = name;  // Next branch stacks on this one
  }

  return entries;
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
    const { readlink } = await import("node:fs/promises");
    const actualTarget = await readlink(symlinkPath);
    if (actualTarget !== expectedTarget) {
      throw new Error(
        `Symlink target mismatch:\n` +
        `  Expected: ${expectedTarget}\n` +
        `  Actual: ${actualTarget}`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("target mismatch")) {
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
