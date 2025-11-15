/**
 * Bun TypeScript implementation of common.sh
 *
 * Transformation Date: 2025-11-15
 * Source: upstream/v0.0.83/.specify/scripts/bash/common.sh
 * Strategy: Pure TypeScript (file I/O, path operations) + Bun Shell API (git commands)
 *
 * This module provides common functions and variables for all Speck scripts.
 * It replaces the bash sourcing pattern with TypeScript exports.
 *
 * Transformation Rationale:
 * - Replaced bash functions with TypeScript exported functions
 * - Replaced git commands with Bun Shell API for consistency
 * - Replaced directory traversal with Node.js path operations
 * - Replaced environment variable access with process.env
 * - Replaced string matching with native JS regex
 * - Replaced file checks with Node.js fs.existsSync()
 */

import { $ } from "bun";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Feature paths structure returned by getFeaturePaths()
 */
export interface FeaturePaths {
  REPO_ROOT: string;
  CURRENT_BRANCH: string;
  HAS_GIT: boolean;
  FEATURE_DIR: string;
  FEATURE_SPEC: string;
  IMPL_PLAN: string;
  TASKS: string;
  RESEARCH: string;
  DATA_MODEL: string;
  QUICKSTART: string;
  CONTRACTS_DIR: string;
}

/**
 * Get repository root, with fallback for non-git repositories
 */
export async function getRepoRoot(): Promise<string> {
  try {
    const result = await $`git rev-parse --show-toplevel`.quiet();
    return result.text().trim();
  } catch {
    // Fall back to script location for non-git repos
    // Navigate up from .speck/scripts/ to repo root
    const scriptDir = import.meta.dir;
    return path.resolve(scriptDir, "../../");
  }
}

/**
 * Get current branch, with fallback for non-git repositories
 */
export async function getCurrentBranch(repoRoot: string): Promise<string> {
  // First check if SPECIFY_FEATURE environment variable is set
  if (process.env.SPECIFY_FEATURE) {
    return process.env.SPECIFY_FEATURE;
  }

  // Then check git if available
  try {
    const result = await $`git rev-parse --abbrev-ref HEAD`.quiet();
    return result.text().trim();
  } catch {
    // For non-git repos, try to find the latest feature directory
    const specsDir = path.join(repoRoot, "specs");

    if (existsSync(specsDir)) {
      let latestFeature = "";
      let highest = 0;

      const dirs = readdirSync(specsDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const dirname = dir.name;
          const match = dirname.match(/^(\d{3})-/);
          if (match) {
            const number = parseInt(match[1], 10);
            if (number > highest) {
              highest = number;
              latestFeature = dirname;
            }
          }
        }
      }

      if (latestFeature) {
        return latestFeature;
      }
    }

    return "main"; // Final fallback
  }
}

/**
 * Check if we have git available
 */
export async function hasGit(): Promise<boolean> {
  try {
    await $`git rev-parse --show-toplevel`.quiet();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if current branch follows feature naming convention
 */
export function checkFeatureBranch(branch: string, hasGitRepo: boolean): boolean {
  // For non-git repos, we can't enforce branch naming but still provide output
  if (!hasGitRepo) {
    console.error("[specify] Warning: Git repository not detected; skipped branch validation");
    return true;
  }

  if (!/^\d{3}-/.test(branch)) {
    console.error(`ERROR: Not on a feature branch. Current branch: ${branch}`);
    console.error("Feature branches should be named like: 001-feature-name");
    return false;
  }

  return true;
}

/**
 * Get feature directory path
 */
export function getFeatureDir(repoRoot: string, branchName: string): string {
  return path.join(repoRoot, "specs", branchName);
}

/**
 * Find feature directory by numeric prefix instead of exact branch match
 * This allows multiple branches to work on the same spec (e.g., 004-fix-bug, 004-add-feature)
 */
export function findFeatureDirByPrefix(repoRoot: string, branchName: string): string {
  const specsDir = path.join(repoRoot, "specs");

  // Extract numeric prefix from branch (e.g., "004" from "004-whatever")
  const match = branchName.match(/^(\d{3})-/);
  if (!match) {
    // If branch doesn't have numeric prefix, fall back to exact match
    return path.join(specsDir, branchName);
  }

  const prefix = match[1];

  // Search for directories in specs/ that start with this prefix
  const matches: string[] = [];
  if (existsSync(specsDir)) {
    const dirs = readdirSync(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory() && dir.name.startsWith(`${prefix}-`)) {
        matches.push(dir.name);
      }
    }
  }

  // Handle results
  if (matches.length === 0) {
    // No match found - return the branch name path (will fail later with clear error)
    return path.join(specsDir, branchName);
  } else if (matches.length === 1) {
    // Exactly one match - perfect!
    return path.join(specsDir, matches[0]);
  } else {
    // Multiple matches - this shouldn't happen with proper naming convention
    console.error(`ERROR: Multiple spec directories found with prefix '${prefix}': ${matches.join(", ")}`);
    console.error("Please ensure only one spec directory exists per numeric prefix.");
    return path.join(specsDir, branchName); // Return something to avoid breaking the script
  }
}

/**
 * Get all feature-related paths
 */
export async function getFeaturePaths(): Promise<FeaturePaths> {
  const repoRoot = await getRepoRoot();
  const currentBranch = await getCurrentBranch(repoRoot);
  const hasGitRepo = await hasGit();

  // Use prefix-based lookup to support multiple branches per spec
  const featureDir = findFeatureDirByPrefix(repoRoot, currentBranch);

  return {
    REPO_ROOT: repoRoot,
    CURRENT_BRANCH: currentBranch,
    HAS_GIT: hasGitRepo,
    FEATURE_DIR: featureDir,
    FEATURE_SPEC: path.join(featureDir, "spec.md"),
    IMPL_PLAN: path.join(featureDir, "plan.md"),
    TASKS: path.join(featureDir, "tasks.md"),
    RESEARCH: path.join(featureDir, "research.md"),
    DATA_MODEL: path.join(featureDir, "data-model.md"),
    QUICKSTART: path.join(featureDir, "quickstart.md"),
    CONTRACTS_DIR: path.join(featureDir, "contracts"),
  };
}

/**
 * Check if file exists and output status
 */
export function checkFile(filePath: string, displayName: string): void {
  if (existsSync(filePath)) {
    console.log(`  ✓ ${displayName}`);
  } else {
    console.log(`  ✗ ${displayName}`);
  }
}

/**
 * Check if directory exists and is non-empty
 */
export function checkDir(dirPath: string, displayName: string): void {
  if (existsSync(dirPath)) {
    const files = readdirSync(dirPath);
    if (files.length > 0) {
      console.log(`  ✓ ${displayName}`);
      return;
    }
  }
  console.log(`  ✗ ${displayName}`);
}
