#!/usr/bin/env bun

/**
 * Remove Git Worktree - Bun TypeScript Implementation
 *
 * Non-interactive worktree removal optimized for Claude-driven workflows.
 * Supports both interactive and programmatic usage via JSON output.
 *
 * Transformation Date: 2025-11-15
 * Source: remove-worktree.sh (bash)
 * Strategy: Bun Shell API with non-interactive defaults
 *
 * Key differences from bash version:
 * - No readline prompts (uses --auto-confirm flag for Claude)
 * - JSON output mode for programmatic usage
 * - Simplified safety checks with clear warnings
 * - Configurable behavior via options instead of interactive prompts
 */

import { $ } from "bun";
import path from "node:path";
import { existsSync } from "node:fs";
import type {
  RemoveWorktreeOptions,
  RemoveWorktreeOutput,
} from "./contracts/cli-interface";
import { ExitCode } from "./contracts/cli-interface";

interface WorktreeInfo {
  path: string;
  branchName: string;
  isDetached: boolean;
  isMainWorktree: boolean;
}

interface GitStatus {
  stagedChanges: number;
  unstagedChanges: number;
  untrackedFiles: number;
  unpushedCommits: number;
  hasUpstream: boolean;
  stashCount: number;
}

/**
 * Parse command line arguments
 */
function parseArgs(): RemoveWorktreeOptions {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    printUsage();
    process.exit(ExitCode.SUCCESS);
  }

  const options: RemoveWorktreeOptions = {
    worktreePath: "",
    force: false,
    deleteBranch: false,
    autoConfirm: false,
    skipPush: false,
    json: false,
  };

  // Parse positional and flag arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--force":
      case "-f":
        options.force = true;
        break;
      case "--delete-branch":
        options.deleteBranch = true;
        break;
      case "--auto-confirm":
      case "-y":
        options.autoConfirm = true;
        break;
      case "--skip-push":
        options.skipPush = true;
        break;
      case "--json":
        options.json = true;
        break;
      default:
        if (!options.worktreePath && !arg.startsWith("-")) {
          options.worktreePath = arg;
        } else if (!arg.startsWith("-")) {
          console.error(`Error: Unknown argument '${arg}'`);
          process.exit(ExitCode.USER_ERROR);
        }
        break;
    }
  }

  if (!options.worktreePath) {
    console.error("Error: Worktree path is required");
    printUsage();
    process.exit(ExitCode.USER_ERROR);
  }

  return options;
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`Usage: remove-worktree <worktree-path> [options]

Safely removes a git worktree after checking for uncommitted changes.

Arguments:
  <worktree-path>       Path to the worktree to remove (use "." for current)

Options:
  --force, -f          Force removal even with uncommitted changes
  --delete-branch      Delete the branch after removing the worktree
  --auto-confirm, -y   Auto-confirm all prompts (non-interactive mode)
  --skip-push          Skip push prompt for unpushed commits
  --json               Output results in JSON format
  -h, --help           Show this help message

Examples:
  remove-worktree ../feature-branch                # Remove with safety checks
  remove-worktree . --delete-branch -y             # Remove current + branch
  remove-worktree /path/to/worktree --force --json # Force remove, JSON output

Safety features:
  - Checks for uncommitted changes (staged, unstaged, untracked)
  - Shows unpushed commits (with preview)
  - Prevents removal of the main worktree
  - Warns when removing main/master branches
  - Auto-confirm mode for Claude-driven workflows
`);
}

/**
 * Resolve worktree path (handle "." for current directory)
 */
function resolveWorktreePath(inputPath: string): string {
  if (inputPath === ".") {
    return process.cwd();
  }

  // Resolve relative paths
  if (!path.isAbsolute(inputPath)) {
    return path.resolve(process.cwd(), inputPath);
  }

  return inputPath;
}

/**
 * Get worktree information
 */
async function getWorktreeInfo(
  worktreePath: string
): Promise<WorktreeInfo> {
  // Check if directory exists
  if (!existsSync(worktreePath)) {
    throw new Error(`Directory '${worktreePath}' does not exist`);
  }

  // Check if it's a git worktree
  if (!existsSync(path.join(worktreePath, ".git"))) {
    throw new Error(`'${worktreePath}' is not a git worktree`);
  }

  // Get branch name
  let branchName: string;
  let isDetached = false;

  try {
    const branchResult =
      await $`git -C ${worktreePath} rev-parse --abbrev-ref HEAD`.quiet();
    branchName = branchResult.text().trim();

    if (branchName === "HEAD") {
      isDetached = true;
      const shortHash =
        await $`git -C ${worktreePath} rev-parse --short HEAD`.quiet();
      branchName = shortHash.text().trim();
    }
  } catch {
    throw new Error(
      `'${worktreePath}' is not a valid git worktree`
    );
  }

  // Check if this is the main worktree
  try {
    const commonDir =
      await $`git -C ${worktreePath} rev-parse --path-format=absolute --git-common-dir`.quiet();
    const mainWorktree = path.dirname(commonDir.text().trim());
    const isMainWorktree = worktreePath === mainWorktree;

    if (isMainWorktree) {
      throw new Error(
        "Cannot remove the main worktree\n" +
        "This is the primary worktree of the repository.\n" +
        "You can only remove secondary worktrees created with 'git worktree add'."
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cannot remove")) {
      throw error;
    }
  }

  // Additional safety check: prevent removal of main/master directory names
  const worktreeDirName = path.basename(worktreePath);
  if (worktreeDirName === "main" || worktreeDirName === "master") {
    throw new Error(
      `Cannot remove worktree with directory name '${worktreeDirName}'\n` +
      "This appears to be your primary worktree directory.\n" +
      "Only remove secondary worktrees (e.g., ../feature-branch)."
    );
  }

  return {
    path: worktreePath,
    branchName,
    isDetached,
    isMainWorktree: false,
  };
}

/**
 * Check git status for uncommitted changes
 */
async function checkGitStatus(
  worktreePath: string,
  branchName: string,
  isDetached: boolean
): Promise<GitStatus> {
  // Check for staged changes
  const stagedResult =
    await $`git -C ${worktreePath} diff --cached --name-only`.quiet();
  const stagedChanges = stagedResult
    .text()
    .trim()
    .split("\n")
    .filter((line) => line.length > 0).length;

  // Check for unstaged changes
  const unstagedResult =
    await $`git -C ${worktreePath} diff --name-only`.quiet();
  const unstagedChanges = unstagedResult
    .text()
    .trim()
    .split("\n")
    .filter((line) => line.length > 0).length;

  // Check for untracked files
  const untrackedResult =
    await $`git -C ${worktreePath} ls-files --others --exclude-standard`.quiet();
  const untrackedFiles = untrackedResult
    .text()
    .trim()
    .split("\n")
    .filter((line) => line.length > 0).length;

  // Check for unpushed commits
  let unpushedCommits = 0;
  let hasUpstream = false;

  if (!isDetached) {
    try {
      const upstreamResult =
        await $`git -C ${worktreePath} rev-parse --abbrev-ref --symbolic-full-name @{u}`.quiet();
      hasUpstream = upstreamResult.text().trim().length > 0;

      if (hasUpstream) {
        const unpushedResult =
          await $`git -C ${worktreePath} rev-list --count @{u}..HEAD`.quiet();
        unpushedCommits = parseInt(unpushedResult.text().trim(), 10);
      }
    } catch {
      // No upstream or error checking
      hasUpstream = false;
    }
  }

  // Check for stashes
  const stashResult = await $`git -C ${worktreePath} stash list`.quiet();
  const stashCount = stashResult
    .text()
    .trim()
    .split("\n")
    .filter((line) => line.length > 0).length;

  return {
    stagedChanges,
    unstagedChanges,
    untrackedFiles,
    unpushedCommits,
    hasUpstream,
    stashCount,
  };
}

/**
 * Display status information
 */
function displayStatus(
  info: WorktreeInfo,
  status: GitStatus,
  jsonFormat: boolean
): { hasIssues: boolean; warnings: string[] } {
  if (jsonFormat) {
    return { hasIssues: false, warnings: [] };
  }

  const warnings: string[] = [];

  console.log("\n=== Worktree Information ===");
  console.log(`Path: ${info.path}`);
  console.log(`Branch: ${info.branchName}`);
  console.log("");

  console.log("=== Checking Git Status ===");

  let hasIssues = false;

  if (status.stagedChanges > 0) {
    const msg = `Error: ${status.stagedChanges} staged file(s)`;
    console.log(msg);
    warnings.push(msg);
    hasIssues = true;
  }

  if (status.unstagedChanges > 0) {
    const msg = `Error: ${status.unstagedChanges} unstaged change(s)`;
    console.log(msg);
    warnings.push(msg);
    hasIssues = true;
  }

  if (status.untrackedFiles > 0) {
    const msg = `Error: ${status.untrackedFiles} untracked file(s)`;
    console.log(msg);
    warnings.push(msg);
    hasIssues = true;
  }

  if (status.unpushedCommits > 0) {
    const msg = `Info: ${status.unpushedCommits} unpushed commit(s)`;
    console.log(msg);
    warnings.push(msg);
    console.log("  Note: These commits exist on the branch and won't be lost");
  }

  if (!status.hasUpstream && !info.isDetached) {
    const msg = "Info: Branch has no upstream (never pushed)";
    console.log(msg);
    warnings.push(msg);
    console.log("  Note: Branch still exists; commits won't be lost");
  }

  if (status.stashCount > 0) {
    const msg = `Info: ${status.stashCount} stash(es) exist in this worktree`;
    console.log(msg);
    console.log("  Note: Stashes are shared across all worktrees and won't be lost");
  }

  if (!hasIssues) {
    console.log("Clean: No uncommitted changes");
  }

  console.log("");

  return { hasIssues, warnings };
}

/**
 * Push unpushed commits if requested
 */
async function handleUnpushedCommits(
  worktreePath: string,
  branchName: string,
  status: GitStatus,
  skipPush: boolean,
  autoConfirm: boolean
): Promise<boolean> {
  if (status.unpushedCommits === 0 || skipPush) {
    return false;
  }

  if (!autoConfirm) {
    console.log(
      "You have unpushed commits. Use --auto-confirm to push automatically or --skip-push to skip."
    );
    return false;
  }

  console.log("Pushing commits...");

  try {
    if (status.hasUpstream) {
      await $`git -C ${worktreePath} push`;
      console.log("Pushed successfully!");
    } else {
      await $`git -C ${worktreePath} push -u origin ${branchName}`;
      console.log("Pushed successfully!");
    }
    return true;
  } catch {
    console.log("Push failed!");
    console.log(
      "Note: Commits still exist on the branch. You can push them later."
    );
    return false;
  }
}

/**
 * Remove the worktree and optionally delete the branch
 */
async function removeWorktree(
  worktreePath: string,
  branchName: string,
  deleteBranch: boolean,
  isDetached: boolean
): Promise<{ branchDeleted: boolean }> {
  console.log("\n=== Removal Plan ===");
  console.log("The following will be removed:");
  console.log(`  - Worktree directory: ${worktreePath}`);
  console.log("  - Git worktree registration");

  let branchDeleted = false;

  if (deleteBranch && !isDetached) {
    console.log(`  - Branch: ${branchName} (--delete-branch specified)`);
  } else if (deleteBranch && isDetached) {
    console.log("  Note: Cannot delete branch (detached HEAD)");
  }

  console.log("");

  // Find main worktree
  const commonDirResult = await $`git rev-parse --path-format=absolute --git-common-dir`.quiet();
  const mainWorktree = path.dirname(commonDirResult.text().trim());

  // Delete branch first if requested
  if (deleteBranch && !isDetached) {
    console.log(`Deleting branch '${branchName}'...`);

    try {
      // Check if branch is checked out in other worktrees
      const worktreeList = await $`git -C ${mainWorktree} worktree list`.quiet();
      const otherWorktrees = worktreeList
        .text()
        .split("\n")
        .filter(
          (line) =>
            line.includes(`[${branchName}]`) && !line.includes(worktreePath)
        );

      if (otherWorktrees.length > 0) {
        console.log("  Error: Branch is checked out in another worktree");
        console.log("  Skipping branch deletion, but continuing with worktree removal...");
      } else {
        await $`git -C ${mainWorktree} branch -D ${branchName}`;
        console.log("  Branch deleted successfully");
        branchDeleted = true;
      }
    } catch {
      console.log("  Warning: Could not delete branch");
      console.log("  Continuing with worktree removal...");
    }
  }

  // Remove the worktree
  console.log("Removing worktree directory and git registration...");

  try {
    await $`git -C ${mainWorktree} worktree remove ${worktreePath} --force`;
    console.log("  Worktree removed successfully");
  } catch {
    console.log("Error: Git worktree remove failed");
    console.log("\nAttempting manual cleanup...");

    await $`git -C ${mainWorktree} worktree prune`;
    if (existsSync(worktreePath)) {
      await $`rm -rf ${worktreePath}`;
      console.log("  Directory removed manually");
    }
    console.log("Manual cleanup completed");
  }

  return { branchDeleted };
}

/**
 * Output results based on format
 */
function outputResults(
  output: RemoveWorktreeOutput,
  jsonFormat: boolean
): void {
  if (jsonFormat) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log("\nWorktree removed successfully!");

    // List remaining worktrees
    console.log("");
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();

    const worktreePath = resolveWorktreePath(options.worktreePath);
    const info = await getWorktreeInfo(worktreePath);

    // Warn about main/master branches
    if (
      (info.branchName === "main" || info.branchName === "master") &&
      !options.autoConfirm
    ) {
      console.log(`Warning: This worktree is on branch '${info.branchName}'`);
      console.log("This is a critical branch.");
      console.log("Use --auto-confirm to proceed anyway.");
      process.exit(ExitCode.USER_ERROR);
    }

    const status = await checkGitStatus(
      worktreePath,
      info.branchName,
      info.isDetached
    );

    const { hasIssues, warnings } = displayStatus(
      info,
      status,
      options.json || false
    );

    // Check if force removal is needed
    if (hasIssues && !options.force) {
      console.log("Cannot remove worktree: uncommitted changes found");
      console.log("");
      console.log("To preserve your work, you can:");
      console.log("  1. Commit your changes:  git add . && git commit -m 'message'");
      console.log("  2. Stash your changes:   git stash");
      console.log("");
      console.log("Or use --force to remove anyway (uncommitted changes will be LOST):");
      console.log(`  remove-worktree ${options.worktreePath} --force`);
      process.exit(ExitCode.USER_ERROR);
    }

    // Handle unpushed commits
    await handleUnpushedCommits(
      worktreePath,
      info.branchName,
      status,
      options.skipPush || false,
      options.autoConfirm || false
    );

    // Confirm removal (unless auto-confirm)
    if (!options.autoConfirm && !options.json) {
      console.log(
        "Use --auto-confirm to skip this prompt in non-interactive mode"
      );
      console.log("");

      // Interactive confirmation prompt
      const readline = await import("node:readline/promises");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await rl.question("Do you want to proceed? (yes/no): ");
      rl.close();

      if (answer.toLowerCase() !== "yes" && answer.toLowerCase() !== "y") {
        console.log("Removal cancelled.");
        process.exit(ExitCode.USER_ERROR);
      }
      console.log("");
    }

    if (hasIssues && options.force && !options.json) {
      console.log("WARNING: Uncommitted changes will be LOST!");
    }

    // Perform removal
    const { branchDeleted } = await removeWorktree(
      worktreePath,
      info.branchName,
      options.deleteBranch || false,
      info.isDetached
    );

    // Output results
    const output: RemoveWorktreeOutput = {
      worktreePath,
      branchName: info.branchName,
      hadUncommittedChanges: hasIssues,
      hadUnpushedCommits: status.unpushedCommits > 0,
      branchDeleted,
      warnings,
    };

    outputResults(output, options.json || false);

    process.exit(ExitCode.SUCCESS);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error: ${error}`);
    }
    process.exit(ExitCode.USER_ERROR);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { removeWorktree, getWorktreeInfo, checkGitStatus };
