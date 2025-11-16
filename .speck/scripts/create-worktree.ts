#!/usr/bin/env bun

/**
 * Create Git Worktree - Bun TypeScript Implementation
 *
 * Non-interactive worktree creation optimized for Claude-driven workflows.
 * Supports both interactive and programmatic usage via JSON output.
 *
 * Transformation Date: 2025-11-15
 * Source: augusthealth/frontend/master/bin/create-worktree (bash)
 * Strategy: Bun Shell API with non-interactive defaults
 *
 * Key differences from bash version:
 * - No readline prompts (uses --auto-confirm flag for Claude)
 * - JSON output mode for programmatic usage
 * - Simplified error handling with clear exit codes
 * - Configurable behavior via options instead of interactive prompts
 */

import { $ } from "bun";
import path from "node:path";
import { existsSync, cpSync, mkdirSync } from "node:fs";
import type {
  CreateWorktreeOptions,
  CreateWorktreeOutput,
} from "./contracts/cli-interface";
import { ExitCode } from "./contracts/cli-interface";

interface WorktreeConfig {
  currentDir: string;
  currentDirName: string;
  parentDir: string;
  currentBranch: string;
  worktreeDirName: string;
  worktreePath: string;
}

/**
 * Items to copy (independent per worktree)
 * These files are gitignored and should be independent per worktree
 */
const ITEMS_TO_COPY = [
  ".env",
  ".envrc",
];

/**
 * Items to symlink (shared across worktrees)
 * These are gitignored directories that should be shared
 * Note: .claude/ is checked into git, so it's copied by git worktree automatically
 */
const ITEMS_TO_LINK = [
  ".vscode",
];

/**
 * Parse command line arguments
 */
function parseArgs(): CreateWorktreeOptions {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    printUsage();
    process.exit(ExitCode.SUCCESS);
  }

  const options: CreateWorktreeOptions = {
    branchName: "",
    createNew: false,
    skipInstall: false,
    skipVscode: false,
    autoConfirm: false,
    json: false,
  };

  // Parse positional and flag arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--new":
      case "-n":
        options.createNew = true;
        break;
      case "--skip-install":
        options.skipInstall = true;
        break;
      case "--skip-vscode":
        options.skipVscode = true;
        break;
      case "--auto-confirm":
      case "-y":
        options.autoConfirm = true;
        break;
      case "--json":
        options.json = true;
        break;
      default:
        if (!options.branchName && !arg.startsWith("-")) {
          options.branchName = arg;
        } else if (!arg.startsWith("-")) {
          console.error(`Error: Unknown argument '${arg}'`);
          process.exit(ExitCode.USER_ERROR);
        }
        break;
    }
  }

  if (!options.branchName) {
    console.error("Error: Branch name is required");
    printUsage();
    process.exit(ExitCode.USER_ERROR);
  }

  return options;
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`Usage: create-worktree <branch-name> [options]

Creates a new git worktree as a peer directory and copies/symlinks git-ignored files.

Arguments:
  <branch-name>         Name of the branch for the worktree

Options:
  --new, -n            Create a new branch (default: checkout existing branch)
  --skip-install       Skip dependency installation
  --skip-vscode        Skip opening in VS Code
  --auto-confirm, -y   Auto-confirm all prompts (non-interactive mode)
  --json               Output results in JSON format
  -h, --help           Show this help message

Examples:
  create-worktree feature/new-feature --new    # Creates new branch
  create-worktree existing-branch              # Checks out existing branch
  create-worktree my-branch -y --json          # Non-interactive with JSON output

Notes:
  - Slashes in branch names are converted to dashes in directory names
  - The worktree will be created as a peer directory
  - Copies: .env, .envrc (if found, independent per worktree)
  - Symlinks: .vscode (shared, gitignored)
  - .claude/ is checked into git and copied automatically by git worktree
`);
}

/**
 * Validate branch name is not empty and sanitize for directory use
 */
function sanitizeBranchName(branchName: string): string {
  if (!branchName || branchName.trim() === "") {
    throw new Error("Branch name cannot be empty");
  }

  // Replace problematic characters
  return branchName
    .replace(/\//g, "-")
    .replace(/:/g, "-")
    .replace(/\\/g, "-")
    .replace(/\*/g, "-")
    .replace(/\?/g, "-");
}

/**
 * Check if we're in a git repository
 */
async function checkGitRepo(): Promise<void> {
  try {
    await $`git rev-parse --git-dir`.quiet();
  } catch {
    throw new Error("Not in a git repository");
  }
}

/**
 * Check if we're in the repository root
 * Looks for package.json or .git as indicators
 */
function checkRepoRoot(): void {
  const hasPackageJson = existsSync("package.json");
  const hasGitDir = existsSync(".git");

  if (!hasPackageJson && !hasGitDir) {
    throw new Error(
      `Must be run from repository root\nCurrent directory: ${process.cwd()}\nLooking for package.json or .git directory`
    );
  }
}

/**
 * Get current git configuration
 */
async function getGitConfig(): Promise<{
  currentDir: string;
  currentDirName: string;
  parentDir: string;
  currentBranch: string;
}> {
  const currentDir = process.cwd();
  const currentDirName = path.basename(currentDir);
  const parentDir = path.dirname(currentDir);

  const branchResult = await $`git rev-parse --abbrev-ref HEAD`.quiet();
  const currentBranch = branchResult.text().trim();

  // Check if directory name matches branch (for main/master worktrees)
  if (
    (currentDirName === "main" || currentDirName === "master") &&
    currentBranch !== "main" &&
    currentBranch !== "master"
  ) {
    throw new Error(
      `Directory is named '${currentDirName}' but current branch is '${currentBranch}'\n` +
        `This script expects to be run from your main worktree on the main/master branch.`
    );
  }

  return { currentDir, currentDirName, parentDir, currentBranch };
}

/**
 * Calculate worktree path based on current directory and branch name
 */
function calculateWorktreePath(
  currentDirName: string,
  parentDir: string,
  safeBranchName: string
): { worktreeDirName: string; worktreePath: string } {
  let worktreeDirName: string;

  if (currentDirName === "main" || currentDirName === "master") {
    worktreeDirName = safeBranchName;
  } else {
    worktreeDirName = `${currentDirName}-${safeBranchName}`;
  }

  const worktreePath = path.join(parentDir, worktreeDirName);

  if (existsSync(worktreePath)) {
    throw new Error(`Directory '${worktreePath}' already exists`);
  }

  return { worktreeDirName, worktreePath };
}

/**
 * Check if branch exists and handle remote fetching
 */
async function ensureBranchExists(
  branchName: string,
  createNew: boolean,
  autoConfirm: boolean
): Promise<void> {
  if (createNew) {
    return; // Will create new branch during worktree add
  }

  // Check if branch is already checked out in another worktree
  try {
    const worktreeList = await $`git worktree list`.quiet();
    if (worktreeList.text().includes(`[${branchName}]`)) {
      throw new Error(
        `Branch '${branchName}' is already checked out in another worktree`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("already checked out")) {
      throw error;
    }
  }

  // Check if branch exists locally
  try {
    await $`git rev-parse --verify ${branchName}`.quiet();
    return; // Branch exists locally
  } catch {
    // Branch doesn't exist locally, check remote
  }

  // Check if it exists on remote
  try {
    const remoteBranches = await $`git branch -r`.quiet();
    const remoteMatch = remoteBranches
      .text()
      .split("\n")
      .find(
        (line) =>
          line.trim().startsWith("origin/") && line.includes(branchName)
      );

    if (remoteMatch) {
      if (!autoConfirm) {
        console.log(`Found remote branch: ${remoteMatch.trim()}`);
        console.log(
          "Use --auto-confirm to automatically fetch and create tracking branch"
        );
        throw new Error(
          "Branch exists on remote but not locally. Use --auto-confirm to fetch automatically."
        );
      }

      console.log("Fetching from remote...");
      await $`git fetch origin ${branchName}:${branchName}`;
      console.log("Branch fetched successfully");
      return;
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("auto-confirm")) {
      throw error;
    }
  }

  // Try general fetch
  if (autoConfirm) {
    console.log("Fetching from remote...");
    await $`git fetch`;

    // Check again after fetch
    try {
      await $`git rev-parse --verify ${branchName}`.quiet();
      return;
    } catch {
      // Still doesn't exist
    }

    const remoteBranches = await $`git branch -r`.quiet();
    const remoteMatch = remoteBranches
      .text()
      .split("\n")
      .find(
        (line) =>
          line.trim().startsWith("origin/") && line.includes(branchName)
      );

    if (remoteMatch) {
      await $`git fetch origin ${branchName}:${branchName}`;
      console.log("Branch fetched successfully");
      return;
    }
  }

  throw new Error(
    `Branch '${branchName}' does not exist\nUse --new to create a new branch, or check the branch name.`
  );
}

/**
 * Create the git worktree
 */
async function createWorktree(
  worktreePath: string,
  branchName: string,
  createNew: boolean
): Promise<void> {
  try {
    if (createNew) {
      console.log(`Creating new branch '${branchName}'...`);
      await $`git worktree add ${worktreePath} -b ${branchName}`;
    } else {
      console.log(`Checking out existing branch '${branchName}'...`);
      await $`git worktree add ${worktreePath} ${branchName}`;
    }
  } catch (error) {
    // Clean up if partially created
    if (existsSync(worktreePath)) {
      await $`rm -rf ${worktreePath}`;
    }
    throw new Error(`Failed to create worktree: ${error}`);
  }
}

/**
 * Copy git-ignored files to new worktree
 */
function copyFiles(
  currentDir: string,
  worktreePath: string
): { copied: string[] } {
  const copied: string[] = [];

  console.log("\nCopying git-ignored files...");

  for (const item of ITEMS_TO_COPY) {
    const sourcePath = path.join(currentDir, item);
    const destPath = path.join(worktreePath, item);

    if (existsSync(sourcePath)) {
      // Create parent directory if needed
      const destDir = path.dirname(destPath);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      cpSync(sourcePath, destPath, { recursive: true });
      console.log(`  Copied: ${item}`);
      copied.push(item);
    } else {
      console.log(`  Skipped: ${item} (not found)`);
    }
  }

  return { copied };
}

/**
 * Create symlinks for shared directories
 */
async function createSymlinks(
  currentDir: string,
  currentDirName: string,
  worktreePath: string
): Promise<{ symlinked: string[] }> {
  const symlinked: string[] = [];

  console.log("\nCreating symlinks for shared directories...");

  for (const item of ITEMS_TO_LINK) {
    const sourcePath = path.join(currentDir, item);
    const destPath = path.join(worktreePath, item);

    if (!existsSync(sourcePath)) {
      console.log(`  Skipped: ${item} (not found in source)`);
      continue;
    }

    if (existsSync(destPath)) {
      console.log(`  Skipped: ${item} (already exists in worktree)`);
      continue;
    }

    // Calculate relative path depth
    const itemDepth = (item.match(/\//g) || []).length;
    const upLevels = itemDepth + 1;

    let relativePrefix = "";
    for (let i = 0; i < upLevels; i++) {
      relativePrefix += "../";
    }

    const relativePath = `${relativePrefix}${currentDirName}/${item}`;

    // Create parent directory if needed
    const destDir = path.dirname(destPath);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    await $`ln -s ${relativePath} ${destPath}`;
    console.log(`  Symlinked: ${item} -> ${relativePath}`);
    symlinked.push(item);
  }

  return { symlinked };
}

/**
 * Install dependencies in the new worktree
 */
async function installDependencies(
  worktreePath: string,
  skipInstall: boolean
): Promise<boolean> {
  if (skipInstall) {
    console.log("\nSkipping dependency installation (--skip-install)");
    return false;
  }

  console.log("\nInstalling dependencies...");
  console.log("Running: bun install --frozen-lockfile");

  try {
    await $`cd ${worktreePath} && bun install --frozen-lockfile`;
    console.log("Dependencies installed successfully");
    return true;
  } catch {
    console.log("Warning: bun install failed");
    console.log("You may need to run 'bun install' manually in the new worktree.");
    return false;
  }
}

/**
 * Open worktree in VS Code
 */
async function openInVSCode(
  worktreePath: string,
  skipVscode: boolean
): Promise<boolean> {
  if (skipVscode) {
    return false;
  }

  try {
    // Check if code command exists
    await $`which code`.quiet();

    console.log("Opening worktree in VS Code...");
    await $`code ${worktreePath}`;
    console.log("VS Code opened successfully");
    return true;
  } catch {
    // VS Code not available or failed to open
    return false;
  }
}

/**
 * Output results based on format
 */
function outputResults(
  config: WorktreeConfig,
  output: CreateWorktreeOutput,
  jsonFormat: boolean
): void {
  if (jsonFormat) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log("\nWorktree created successfully!");
    console.log("");
    console.log("To switch to the new worktree, run:");
    console.log(`  cd ../${config.worktreeDirName}`);
    console.log("");
    console.log("To remove the worktree when done, run:");
    console.log(`  bun .speck/scripts/remove-worktree.ts ../${config.worktreeDirName}`);
    console.log(`  # or: git worktree remove ../${config.worktreeDirName}`);
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();

    // Validation checks
    await checkGitRepo();
    checkRepoRoot();

    const safeBranchName = sanitizeBranchName(options.branchName);
    const gitConfig = await getGitConfig();
    const { worktreeDirName, worktreePath } = calculateWorktreePath(
      gitConfig.currentDirName,
      gitConfig.parentDir,
      safeBranchName
    );

    const config: WorktreeConfig = {
      ...gitConfig,
      worktreeDirName,
      worktreePath,
    };

    // Ensure branch exists (or will be created)
    await ensureBranchExists(
      options.branchName,
      options.createNew || false,
      options.autoConfirm || false
    );

    console.log(`Creating worktree at: ${worktreePath}`);

    // Create worktree
    await createWorktree(
      worktreePath,
      options.branchName,
      options.createNew || false
    );

    // Copy files and create symlinks
    const { copied } = copyFiles(gitConfig.currentDir, worktreePath);
    const { symlinked } = await createSymlinks(
      gitConfig.currentDir,
      gitConfig.currentDirName,
      worktreePath
    );

    // Install dependencies
    const dependenciesInstalled = await installDependencies(
      worktreePath,
      options.skipInstall || false
    );

    // Open in VS Code
    const vscodeOpened = await openInVSCode(
      worktreePath,
      options.skipVscode || false
    );

    // Output results
    const output: CreateWorktreeOutput = {
      worktreePath,
      branchName: options.branchName,
      isNewBranch: options.createNew || false,
      itemsCopied: copied,
      itemsSymlinked: symlinked,
      dependenciesInstalled,
      vscodeOpened,
    };

    outputResults(config, output, options.json || false);

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

export { createWorktree, ensureBranchExists, sanitizeBranchName };
