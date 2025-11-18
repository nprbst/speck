/**
 * Git Operations for Stacked PR Support
 *
 * Wrapper functions for git commands with proper error handling
 *
 * Feature: 008-stacked-pr-support
 * Created: 2025-11-18
 */

import { $ } from "bun";
import { GitError } from "./errors.js";

/**
 * Create a git branch (T020)
 *
 * @param name - Branch name to create
 * @param base - Base branch to create from
 * @param repoRoot - Repository root directory
 * @throws GitError if operation fails
 */
export async function createGitBranch(
  name: string,
  base: string,
  repoRoot: string
): Promise<void> {
  // Validate base exists
  const baseCheck = await $`git -C ${repoRoot} rev-parse --verify ${base}`.quiet();
  if (baseCheck.exitCode !== 0) {
    throw new GitError(`Base branch '${base}' does not exist`);
  }

  // Validate branch name format
  const nameCheck = await $`git check-ref-format --branch ${name}`.quiet();
  if (nameCheck.exitCode !== 0) {
    throw new GitError(`Invalid branch name: '${name}'`);
  }

  // Create branch
  const result = await $`git -C ${repoRoot} branch ${name} ${base}`.quiet();
  if (result.exitCode !== 0) {
    const stderr = await result.stderr.text();
    throw new GitError(`Failed to create branch: ${stderr}`);
  }
}

/**
 * Check if branch has been merged into base (T021)
 *
 * @param branchName - Branch to check
 * @param baseBranch - Base branch to check against
 * @param repoRoot - Repository root directory
 * @returns true if branch is merged, false otherwise
 * @throws GitError if operation fails
 */
export async function checkBranchMerged(
  branchName: string,
  baseBranch: string,
  repoRoot: string
): Promise<boolean> {
  try {
    const result = await $`git -C ${repoRoot} branch --merged ${baseBranch}`.quiet();
    if (result.exitCode !== 0) {
      throw new GitError(`Failed to check merged status for '${branchName}'`);
    }

    const output = await result.stdout.text();
    const mergedBranches = output
      .split("\n")
      .map(line => line.trim().replace(/^\*\s*/, ""))
      .filter(Boolean);

    return mergedBranches.includes(branchName);
  } catch (error) {
    if (error instanceof GitError) throw error;
    throw new GitError(`Failed to check merged status: ${error}`);
  }
}

/**
 * List all git branches (T022)
 *
 * @param repoRoot - Repository root directory
 * @param pattern - Optional pattern to filter branches (e.g., "username/*")
 * @returns Array of branch information { name, upstream }
 * @throws GitError if operation fails
 */
export async function listGitBranches(
  repoRoot: string,
  pattern?: string
): Promise<Array<{ name: string; upstream: string | null }>> {
  try {
    const args = pattern
      ? `git -C ${repoRoot} branch --list --format='%(refname:short)|%(upstream:short)' ${pattern}`
      : `git -C ${repoRoot} branch --list --format='%(refname:short)|%(upstream:short)'`;

    const result = await $`sh -c ${args}`.quiet();
    if (result.exitCode !== 0) {
      const stderr = await result.stderr.text();
      throw new GitError(`Failed to list branches: ${stderr}`);
    }

    const output = await result.stdout.text();
    return output
      .split("\n")
      .filter(Boolean)
      .map(line => {
        const [name, upstream] = line.split("|");
        return {
          name: name.trim(),
          upstream: upstream?.trim() || null,
        };
      });
  } catch (error) {
    if (error instanceof GitError) throw error;
    throw new GitError(`Failed to list branches: ${error}`);
  }
}

/**
 * Checkout a git branch
 *
 * @param name - Branch name to checkout
 * @param repoRoot - Repository root directory
 * @throws GitError if operation fails
 */
export async function checkoutBranch(
  name: string,
  repoRoot: string
): Promise<void> {
  const result = await $`git -C ${repoRoot} checkout ${name}`.quiet();
  if (result.exitCode !== 0) {
    const stderr = await result.stderr.text();
    throw new GitError(`Failed to checkout branch '${name}': ${stderr}`);
  }
}

/**
 * Get current branch name
 *
 * @param repoRoot - Repository root directory
 * @returns Current branch name
 * @throws GitError if operation fails or in detached HEAD state
 */
export async function getCurrentBranch(repoRoot: string): Promise<string> {
  const result = await $`git -C ${repoRoot} rev-parse --abbrev-ref HEAD`.quiet();
  if (result.exitCode !== 0) {
    throw new GitError("Failed to get current branch");
  }

  const branch = (await result.stdout.text()).trim();
  if (branch === "HEAD") {
    throw new GitError("Currently in detached HEAD state");
  }

  return branch;
}

/**
 * Check if branch exists in git
 *
 * @param name - Branch name to check
 * @param repoRoot - Repository root directory
 * @returns true if branch exists, false otherwise
 */
export async function branchExists(
  name: string,
  repoRoot: string
): Promise<boolean> {
  const result = await $`git -C ${repoRoot} rev-parse --verify ${name}`.quiet();
  return result.exitCode === 0;
}
