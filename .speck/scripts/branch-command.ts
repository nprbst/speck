#!/usr/bin/env bun
/**
 * Stacked Branch Management CLI
 *
 * Implementation for /speck.branch command
 * Feature: 008-stacked-pr-support
 */

import path from "node:path";
import fs from "node:fs/promises";
import {
  readBranches,
  writeBranches,
  addBranch,
  removeBranch,
  updateBranchStatus,
  findBranchEntry,
  getSpecForBranch,
  detectCycle,
  getAggregatedBranchStatus,
  type BranchEntry,
  type BranchMapping,
  type BranchStatus,
  type RepoBranchSummary,
} from "./common/branch-mapper.js";
import {
  createGitBranch,
  checkoutBranch,
  branchExists,
  checkBranchMerged,
  listGitBranches,
  getCurrentBranch as gitGetCurrentBranch,
  validateBaseBranch,
  detectDefaultBranch,
  detectRemoteUrl,
} from "./common/git-operations.js";
import {
  validateBranchName,
  getFeaturePaths,
  detectSpeckRoot,
  isMultiRepoChild,
  getChildRepoName,
  getMultiRepoContext,
  type MultiRepoContextMetadata,
} from "./common/paths.js";
import { GitError, ValidationError } from "./common/errors.js";
import { $ } from "bun";

// ===========================
// Helpers
// ===========================

/**
 * [Feature 009] Detect parent spec ID from speck root
 *
 * Determines the parent spec ID by checking the current git branch at the speck root.
 * This identifies which spec "owns" the multi-repo setup.
 *
 * Logic:
 * 1. Get current git branch at speck root
 * 2. If branch matches spec pattern (NNN-feature-name), use that
 * 3. Otherwise, find the most recent spec directory
 *
 * @param speckRoot - Path to the speck root directory
 * @returns Parent spec ID or null if cannot be determined
 */
async function detectParentSpecId(speckRoot: string): Promise<string | null> {
  try {
    // First, try to get the current git branch at the speck root
    const result = await $`git -C ${speckRoot} symbolic-ref --short HEAD 2>/dev/null || git -C ${speckRoot} rev-parse --short HEAD 2>/dev/null`.quiet();
    const currentBranch = result.text().trim();

    // Check if the branch name matches the spec pattern (NNN-feature-name)
    if (currentBranch && /^\d{3}-.+$/.test(currentBranch)) {
      // Verify that this spec directory actually exists
      const specDir = path.join(speckRoot, "specs", currentBranch);
      try {
        await fs.access(specDir);
        return currentBranch;
      } catch {
        // Branch name looks like a spec but directory doesn't exist
        // Fall through to alternative detection
      }
    }

    // Fallback: Find the most recent spec directory
    const specsDir = path.join(speckRoot, "specs");
    const specs = await fs.readdir(specsDir);

    // Find specs matching pattern NNN-feature-name
    const validSpecs = specs.filter(spec => /^\d{3}-.+$/.test(spec));

    if (validSpecs.length === 0) {
      return null;
    }

    // Return the most recent spec (highest number)
    validSpecs.sort();
    return validSpecs[validSpecs.length - 1];
  } catch {
    return null;
  }
}

/**
 * T031b - Check if gh CLI is available
 */
async function isGhCliAvailable(): Promise<boolean> {
  try {
    const result = await $`which gh`.quiet();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * T031c - Get commits on current branch not in base
 */
async function getCommits(baseBranch: string, currentBranch: string, repoRoot: string): Promise<string[]> {
  try {
    const result = await $`git -C ${repoRoot} log ${baseBranch}..${currentBranch} --format=%s%n%b`.quiet();
    if (result.exitCode !== 0) {
      return [];
    }
    return result.stdout.toString().trim().split('\n').filter(line => line.trim());
  } catch {
    return [];
  }
}

/**
 * T031d - Analyze commit messages to determine if substantive
 */
function isCommitSubstantive(message: string): boolean {
  const uninformativePatterns = [
    /^wip/i,
    /^fix$/i,
    /^tmp/i,
    /^temp/i,
    /^test/i,
    /^update$/i,
    /^merge/i,
    /^rebase/i,
    /^\./,  // Starting with dot
  ];

  const normalized = message.trim().toLowerCase();
  return !uninformativePatterns.some(pattern => pattern.test(normalized)) && normalized.length > 5;
}

/**
 * T031e & T031f - Generate PR title and body from commits
 */
function generatePRFromCommits(commits: string[]): { title: string; body: string } | null {
  if (commits.length === 0) {
    return null;
  }

  // Filter out empty lines and uninformative commits
  const substantiveCommits = commits.filter(c => c.trim() && isCommitSubstantive(c));

  if (substantiveCommits.length === 0) {
    return null;
  }

  // Title from first commit subject
  const title = substantiveCommits[0].split('\n')[0];

  // Body as bulleted list of all commits
  const body = substantiveCommits.map(c => `- ${c.split('\n')[0]}`).join('\n');

  return { title, body };
}

/**
 * T031g - Generate title/body from git diff summary
 */
async function generatePRFromDiff(baseBranch: string, currentBranch: string, repoRoot: string): Promise<{ title: string; body: string }> {
  try {
    const statsResult = await $`git -C ${repoRoot} diff ${baseBranch}...${currentBranch} --stat`.quiet();
    const stats = statsResult.stdout.toString().trim();

    const diffResult = await $`git -C ${repoRoot} diff ${baseBranch}...${currentBranch} --name-status`.quiet();
    const files = diffResult.stdout.toString().trim().split('\n').filter(l => l.trim());

    const title = `Update ${currentBranch} (${files.length} files changed)`;
    const body = `## Changes\n\n${stats}\n\n## Files Modified\n${files.map(f => `- ${f}`).join('\n')}`;

    return { title, body };
  } catch {
    return {
      title: `Update ${currentBranch}`,
      body: 'Changes made on this branch'
    };
  }
}

/**
 * T031j - Determine PR base branch
 */
function determinePRBase(currentBranch: string, baseBranchFromMetadata: string | null, repoRoot: string): string {
  // If current branch is tracked in branches.json, use its baseBranch
  if (baseBranchFromMetadata) {
    return baseBranchFromMetadata;
  }

  // Otherwise, assume main/master
  return 'main';  // Could enhance to check if main or master exists
}

/**
 * T031a-T031n - Generate PR metadata suggestion (non-interactive)
 * Returns PR metadata that can be displayed to the user for manual creation
 */
async function generatePRSuggestion(
  currentBranch: string,
  baseBranch: string,
  mapping: BranchMapping,
  repoRoot: string,
  multiRepoContext?: MultiRepoContextMetadata | null
): Promise<{ title: string; body: string; prBase: string } | null> {
  // T108 - Check for remote URL (Feature 009 FR-020)
  if (multiRepoContext?.context === 'child') {
    const remoteUrl = await detectRemoteUrl(repoRoot);
    if (!remoteUrl) {
      // T108 - Warn about missing remote but don't block branch creation
      console.warn('\n⚠️  WARNING: No remote configured for this repository.');
      console.warn('Branch created locally. PR creation unavailable.');
      console.warn('\nTo configure remote:');
      console.warn('  git remote add origin <url>');
      console.warn('  git push -u origin <branch-name>\n');
      return null;
    }
  }

  // T031b - Check gh CLI availability
  const ghAvailable = await isGhCliAvailable();
  if (!ghAvailable) {
    return null;
  }

  // T031j - Determine PR base (do this FIRST to get commits against correct base)
  // T021 - For multi-repo child, use detected default branch (main/master/develop)
  const currentBranchEntry = findBranchEntry(mapping, currentBranch);
  let prBase: string;

  if (multiRepoContext?.context === 'child') {
    // Multi-repo child: use child's default branch
    const defaultBranch = await detectDefaultBranch(repoRoot);
    prBase = defaultBranch || 'main';
  } else {
    // Single-repo or root: use existing logic
    prBase = determinePRBase(currentBranch, currentBranchEntry?.baseBranch || null, repoRoot);
  }

  // T031c - Get commits (use PR base, not the --base flag which might equal current branch)
  const commits = await getCommits(prBase, currentBranch, repoRoot);

  // Check if there are any commits to make a PR from
  if (commits.length === 0) {
    return null;
  }

  // T031e, T031f, T031g - Generate PR metadata
  let prMetadata = generatePRFromCommits(commits);

  if (!prMetadata) {
    // Fallback to diff analysis
    prMetadata = await generatePRFromDiff(prBase, currentBranch, repoRoot);
  }

  // T021 - Add [repo-name] prefix for multi-repo child
  let title = prMetadata.title;
  if (multiRepoContext?.childRepoName) {
    title = `[${multiRepoContext.childRepoName}] ${prMetadata.title}`;
  }

  return {
    title,
    body: prMetadata.body,
    prBase
  };
}

function displayBranchTree(mapping: BranchMapping, specId: string, currentBranch: string) {
  const branches = mapping.branches.filter((b) => b.specId === specId);
  const roots = branches.filter(
    (b) => !branches.some((parent) => parent.name === b.baseBranch)
  );

  function printBranch(branchName: string, depth: number, isLast: boolean) {
    const branch = branches.find((b) => b.name === branchName);
    if (!branch) return;

    const indent = "  ".repeat(depth);
    const marker = depth === 0 ? "" : isLast ? "└─ " : "├─ ";
    const current = branchName === currentBranch ? " (current)" : "";
    const status =
      branch.status !== "active"
        ? ` (${branch.status}${branch.pr ? `, PR #${branch.pr}` : ""})`
        : "";

    console.log(`${indent}${marker}${branchName}${current}${status}`);

    // Find children
    const children = branches.filter((b) => b.baseBranch === branchName);
    children.forEach((child, index) => {
      printBranch(child.name, depth + 1, index === children.length - 1);
    });
  }

  // Print from base branch
  roots.forEach((root) => {
    console.log(`  ${root.baseBranch}`);
    printBranch(root.name, 1, true);
  });
}

function getMainBranch(mapping: BranchMapping, branch: BranchEntry): string {
  // Traverse up to find the original base
  let current: BranchEntry | null = branch;
  while (current) {
    const parent = mapping.branches.find((b) => b.name === current!.baseBranch);
    if (!parent) return current.baseBranch; // This is the main branch
    current = parent;
  }
  return "main";
}

// ===========================
// Command Implementations
// ===========================

async function createCommand(args: string[]) {
  // T028 - Parse arguments
  const nameIndex = args.findIndex((arg) => !arg.startsWith("--"));
  if (nameIndex === -1) {
    throw new Error("Branch name required: /speck.branch create <name> [--base <base>]");
  }

  const name = args[nameIndex];
  const baseFlag = args.indexOf("--base");
  const specFlag = args.indexOf("--spec");
  const skipPrPromptFlag = args.includes("--skip-pr-prompt");
  const createPrFlag = args.includes("--create-pr");
  const prTitleFlag = args.indexOf("--title");
  const prDescFlag = args.indexOf("--description");
  const prBaseFlag = args.indexOf("--pr-base");
  const jsonOutputFlag = args.includes("--json");

  // Get repository root for git operations
  const paths = await getFeaturePaths();
  const repoRoot = paths.REPO_ROOT;

  // [Feature 009] T018 - Detect multi-repo child context
  const speckConfig = await detectSpeckRoot();
  const isChild = await isMultiRepoChild();

  // Determine multi-repo context metadata
  let multiRepoContext: MultiRepoContextMetadata | null = null;
  if (speckConfig.mode === 'multi-repo') {
    const context = isChild ? 'child' : 'root';
    const parentSpecId = isChild ? await detectParentSpecId(speckConfig.speckRoot) : null;
    const childRepoName = isChild ? await getChildRepoName(speckConfig.repoRoot, speckConfig.speckRoot) : null;

    multiRepoContext = {
      ...speckConfig,
      context,
      parentSpecId,
      childRepoName,
    };
  }

  // Get current branch (for PR suggestion later)
  let currentBranch = "";
  try {
    currentBranch = await gitGetCurrentBranch(repoRoot);
  } catch (error) {
    // Ignore error - repo might have no commits yet
    currentBranch = "";
  }

  // Default to current branch if --base not specified
  let baseBranch: string;
  if (baseFlag !== -1 && args[baseFlag + 1]) {
    baseBranch = args[baseFlag + 1];
  } else {
    if (!currentBranch) {
      console.error("Error: No commits in repository. Cannot determine current branch.");
      console.error("Please create an initial commit first, or specify --base explicitly.");
      return 1;
    }
    baseBranch = currentBranch;
    console.log(`Defaulting base to current branch: ${baseBranch}`);
  }

  let specId = specFlag !== -1 ? args[specFlag + 1] : null;

  // T029 - Validate branch name
  const isValid = await validateBranchName(name);
  if (!isValid) {
    throw new Error(`Invalid branch name: '${name}'. Must be a valid git ref name.`);
  }

  // T020 - Validate base branch exists (with cross-repo validation for Feature 009)
  try {
    await validateBaseBranch(baseBranch, repoRoot);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }

  // T031 - Auto-detect or prompt for spec ID
  if (!specId) {
    // Try to auto-detect from current branch
    if (paths.FEATURE_DIR && paths.FEATURE_DIR.includes("/specs/")) {
      const match = paths.FEATURE_DIR.match(/\/specs\/([^\/]+)/);
      if (match) {
        specId = match[1];
        if (!jsonOutputFlag) {
          console.log(`Auto-detected spec: ${specId}`);
        }
      }
    }

    if (!specId) {
      throw new Error(
        "Could not auto-detect spec ID. Please specify with --spec flag:\n" +
          "  /speck.branch create <name> [--base <base>] --spec <spec-id>"
      );
    }
  }

  // Validate spec exists
  // T022 - Use correct specs directory based on multi-repo context
  const specsBaseDir = multiRepoContext ? speckConfig.specsDir : path.join(repoRoot, "specs");
  const specDir = path.join(specsBaseDir, specId);
  try {
    await fs.access(specDir);
  } catch {
    throw new Error(`Spec directory not found: specs/${specId}/`);
  }

  // Check for uncommitted changes before switching branches
  // Exclude .speck/branches.json from check as it's metadata managed by branch commands
  const statusResult = await $`git -C ${repoRoot} status --porcelain`.quiet();
  const statusLines = statusResult.stdout.toString()
    .split('\n')
    .filter(line => line.trim().length > 0)
    .filter(line => !line.includes('.speck/branches.json'));
  const hasUncommittedChanges = statusLines.length > 0;

  if (hasUncommittedChanges) {
    console.log(`\n${'⚠'.repeat(30)}`);
    console.log(`⚠ Warning: Current branch '${currentBranch}' has uncommitted changes`);
    console.log(`${'⚠'.repeat(30)}\n`);

    const diffStat = await $`git -C ${repoRoot} diff --stat`.quiet();
    console.log('Changed files:');
    console.log(diffStat.stdout.toString());

    console.log('\nOptions:');
    console.log('  1. Commit changes now (recommended)');
    console.log('  2. Stash changes (saves for later)');
    console.log('  3. Carry changes to new branch (creates new branch with changes)');
    console.log('  4. Abort branch creation');
    console.log('\nChoose an option or run one of these commands first:');
    console.log('  git add . && git commit -m "message"  # Commit changes');
    console.log('  git stash                              # Stash changes');
    console.log('\nThen re-run: /speck.branch create ' + args.join(' '));

    throw new Error('Uncommitted changes detected. Please commit or stash changes before creating a new branch.');
  }

  // T032 - Initialize branches.json if doesn't exist
  let mapping = await readBranches(repoRoot);

  // T031a-T031j - Check for PR opportunity and handle based on flags
  // Skip PR prompt if explicitly requested
  if (!skipPrPromptFlag && !createPrFlag) {
    const prSuggestion = await generatePRSuggestion(currentBranch, baseBranch, mapping, repoRoot, multiRepoContext);

    if (prSuggestion) {
      if (jsonOutputFlag) {
        // JSON-only output mode: output to stdout with contract-compliant property names
        const suggestionData = {
          branch: currentBranch,
          title: prSuggestion.title,
          body: prSuggestion.body,
          base: prSuggestion.prBase,
        };
        console.log(JSON.stringify(suggestionData));
      } else {
        // T031h - Output structured JSON to stderr for agent to parse
        const suggestionData = {
          type: "pr-suggestion",
          branch: currentBranch,
          suggestedTitle: prSuggestion.title,
          suggestedDescription: prSuggestion.body,
          suggestedBase: prSuggestion.prBase,
          newBranch: name,
        };
        console.error(JSON.stringify(suggestionData));

        // T031i - Display human-readable suggestion to stdout
        console.log(`\n${'='.repeat(60)}`);
        console.log(`💡 PR Opportunity: Create PR for '${currentBranch}' before switching`);
        console.log(`${'='.repeat(60)}`);
        console.log(`\nSuggested PR details:`);
        console.log(`  Title: ${prSuggestion.title}`);
        console.log(`  Base: ${prSuggestion.prBase}`);
        console.log(`\nDescription:`);
        console.log(prSuggestion.body.split('\n').map((line: string) => `  ${line}`).join('\n'));
        console.log(`\n${'-'.repeat(60)}`);
        console.log(`Option 1: Create PR with gh CLI:`);
        console.log(`  gh pr create --base ${prSuggestion.prBase} --title "${prSuggestion.title}" --body "${prSuggestion.body.replace(/"/g, '\\"')}"`);
        console.log(`\nOption 2: Create PR via GitHub URL:`);
        console.log(`  https://github.com/OWNER/REPO/compare/${prSuggestion.prBase}...${currentBranch}?expand=1&title=${encodeURIComponent(prSuggestion.title)}`);
        console.log(`\nOption 3: Skip and create branch without PR`);
        console.log(`${'='.repeat(60)}\n`);
      }

      // T031j - Exit with code 2 (suggestion pending) to trigger agent interaction
      return 2;
    }
  }

  // T031n - Handle --create-pr flag: execute gh pr create
  if (createPrFlag) {
    const prTitle = prTitleFlag !== -1 ? args[prTitleFlag + 1] : null;
    const prDescription = prDescFlag !== -1 ? args[prDescFlag + 1] : null;
    const prBase = prBaseFlag !== -1 ? args[prBaseFlag + 1] : null;

    if (!prTitle || !prDescription || !prBase) {
      throw new Error("--create-pr requires --title, --description, and --pr-base flags");
    }

    console.log(`Creating PR for '${currentBranch}'...`);

    try {
      // T031n - Execute gh pr create
      const ghResult = await $`gh pr create --base ${prBase} --title ${prTitle} --body ${prDescription}`.quiet();

      if (ghResult.exitCode !== 0) {
        // T031p - gh CLI failed
        throw new Error(`gh pr create failed: ${ghResult.stderr.toString()}`);
      }

      // T031o - Parse PR number from gh CLI output
      const output = ghResult.stdout.toString();
      const prNumberMatch = output.match(/\/pull\/(\d+)/);
      const prNumber = prNumberMatch ? parseInt(prNumberMatch[1], 10) : null;

      if (prNumber) {
        console.log(`✓ Created PR #${prNumber} for '${currentBranch}'`);

        // T035 - Update branch entry with PR number and status="submitted"
        const currentEntry = findBranchEntry(mapping, currentBranch);
        if (currentEntry) {
          mapping = updateBranchStatus(mapping, currentBranch, "submitted", prNumber);
          await writeBranches(repoRoot, mapping);
        }
      } else {
        console.log(`✓ PR created for '${currentBranch}' (could not parse PR number from output)`);
      }
    } catch (error) {
      // T031p - Handle gh CLI errors with clear guidance
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg.includes("gh: command not found") || errorMsg.includes("not found")) {
        console.error("\n❌ Error: GitHub CLI (gh) is not installed");
        console.error("\nTo install gh:");
        console.error("  brew install gh           # macOS");
        console.error("  sudo apt install gh       # Ubuntu/Debian");
        console.error("  winget install GitHub.cli # Windows");
        console.error("\nOr use --skip-pr-prompt to create branch without PR:");
        console.error(`  /speck.branch create ${name} --skip-pr-prompt`);
        return 1;
      }

      if (errorMsg.includes("authentication") || errorMsg.includes("401")) {
        console.error("\n❌ Error: GitHub CLI is not authenticated");
        console.error("\nTo authenticate:");
        console.error("  gh auth login");
        console.error("\nOr use --skip-pr-prompt to create branch without PR:");
        console.error(`  /speck.branch create ${name} --skip-pr-prompt`);
        return 1;
      }

      // Network or other errors
      console.error(`\n❌ Error creating PR: ${errorMsg}`);
      console.error("\nYou can:");
      console.error("  1. Check your network connection and try again");
      console.error("  2. Create the PR manually via GitHub web UI");
      console.error("  3. Use --skip-pr-prompt to create branch without PR");
      return 1;
    }
  }

  // T033 - Create BranchEntry with ISO 8601 timestamps
  // T019 - Add parentSpecId when in multi-repo child context
  const now = new Date().toISOString();
  const entry: BranchEntry = {
    name,
    specId,
    baseBranch,
    status: "active",
    pr: null,
    createdAt: now,
    updatedAt: now,
    ...(multiRepoContext?.parentSpecId && { parentSpecId: multiRepoContext.parentSpecId }),
  };

  // T040 - Cycle detection (from US3, but needed here)
  const cycle = detectCycle(name, {
    ...mapping,
    branches: [...mapping.branches, entry],
  });

  if (cycle) {
    throw new Error(`Circular dependency detected: ${cycle.join(" → ")}`);
  }

  // T034 - Add to branches array and update specIndex
  mapping = addBranch(mapping, entry);

  // T035 & T036 - Create and checkout git branch
  await createGitBranch(name, baseBranch, repoRoot);
  await checkoutBranch(name, repoRoot);

  // Write branches.json
  await writeBranches(repoRoot, mapping);

  // T037 - Display success message with stack visualization (skip if JSON output mode)
  if (!jsonOutputFlag) {
    console.log(`✓ Created stacked branch '${name}'`);
    console.log(`✓ Based on: ${baseBranch}`);
    console.log(`✓ Linked to spec: ${specId}`);
    console.log();
    console.log("Branch stack:");

    displayBranchTree(mapping, specId, name);

    console.log();
    console.log("Next steps:");
    console.log(`  - Implement feature on this branch`);
    console.log(`  - Run /speck.tasks --branch ${name} to generate tasks`);
    console.log(`  - When ready: /speck.branch create <next-branch> --base ${name}`);
  }
}

async function listCommand(args: string[]) {
  const showAll = args.includes("--all");
  const paths = await getFeaturePaths();
  const config = await detectSpeckRoot();
  const repoRoot = paths.REPO_ROOT;

  // T035 - Check if --all flag should show multi-repo aggregate
  if (showAll && config.mode === "multi-repo") {
    // T035 - Multi-repo (root or child with --all): show aggregate across all repos
    await displayAggregateListAll(config.speckRoot, repoRoot);
    return;
  }

  // Single-repo or child context without --all: show local branches only
  const mapping = await readBranches(repoRoot);

  if (mapping.branches.length === 0) {
    console.log("No stacked branches found.");
    console.log("Create your first stacked branch with:");
    console.log("  /speck.branch create <name> --base main");
    return;
  }

  let currentBranch = "";
  try {
    currentBranch = await gitGetCurrentBranch(repoRoot);
  } catch (error) {
    // Ignore error - repo might have no commits yet
    currentBranch = "";
  }

  if (showAll) {
    // T082-T084 - Show branches across all specs (in current repo)
    const specIds = Object.keys(mapping.specIndex);

    for (const specId of specIds) {
      console.log(`\nSpec: ${specId}`);
      console.log("Branch Stack:");
      displayBranchTree(mapping, specId, currentBranch);
    }

    console.log(`\nTotal: ${mapping.branches.length} branches across ${specIds.length} specs`);
  } else {
    // Show branches for current spec only
    const specId = getSpecForBranch(mapping, currentBranch);

    if (!specId) {
      console.log("Current branch is not in stacked mode.");
      console.log("Use --all to see all stacked branches.");
      return;
    }

    console.log(`Spec: ${specId}\n`);
    console.log("Branch Stack:");
    displayBranchTree(mapping, specId, currentBranch);

    console.log("\nLegend:");
    console.log("  (current) = checked out branch");
    console.log("  (active) = development in progress");
    console.log("  (submitted) = PR open for review");
  }
}

/**
 * T035 [US2] - Display aggregate list across all repositories
 * T037 [US2] - Handle branch name disambiguation by repo
 */
async function displayAggregateListAll(speckRoot: string, repoRoot: string) {
  const aggregated = await getAggregatedBranchStatus(speckRoot, repoRoot);

  console.log("Branch List (All Repositories)\n");

  // Display root repository
  if (aggregated.rootRepo && aggregated.rootRepo.branchCount > 0) {
    console.log("Root Repository:");
    console.log("Branch             Base           Spec                    PR#   Status");
    console.log("─".repeat(80));

    const rootMapping = await readBranches(speckRoot);
    for (const branch of rootMapping.branches) {
      const prDisplay = branch.pr ? String(branch.pr).padEnd(5) : "-".padEnd(5);
      console.log(
        `${branch.name.padEnd(18)} ${branch.baseBranch.padEnd(14)} ${branch.specId.padEnd(23)} ${prDisplay} ${branch.status}`
      );
    }
    console.log("");
  }

  // Display child repositories (sorted alphabetically)
  const childNames = Array.from(aggregated.childRepos.keys()).sort();

  for (const childName of childNames) {
    const summary = aggregated.childRepos.get(childName)!;
    console.log(`Child: ${childName}`);
    console.log("Branch             Base           Spec                    PR#   Status");
    console.log("─".repeat(80));

    const childMapping = await readBranches(summary.repoPath);
    for (const branch of childMapping.branches) {
      const prDisplay = branch.pr ? String(branch.pr).padEnd(5) : "-".padEnd(5);
      console.log(
        `${branch.name.padEnd(18)} ${branch.baseBranch.padEnd(14)} ${branch.specId.padEnd(23)} ${prDisplay} ${branch.status}`
      );
    }
    console.log("");
  }

  if (childNames.length === 0 && !aggregated.rootRepo) {
    console.log("No branches found in any repository.");
  }
}

async function statusCommand(args: string[] = []) {
  const showAll = args.includes("--all");
  const paths = await getFeaturePaths();
  const config = await detectSpeckRoot();
  const repoRoot = paths.REPO_ROOT;

  // T036 - Check if --all flag should show multi-repo aggregate
  if (showAll && config.mode === "multi-repo") {
    // T036 - Multi-repo (root or child with --all): show aggregate status across all repos
    await displayAggregateStatusAll(config.speckRoot, repoRoot);
    return;
  }

  // Single-repo or child context without --all: show local status only
  const mapping = await readBranches(repoRoot);

  let currentBranch = "";
  try {
    currentBranch = await gitGetCurrentBranch(repoRoot);
  } catch (error) {
    // Ignore error - repo might have no commits yet
    currentBranch = "";
  }

  const specId = getSpecForBranch(mapping, currentBranch);

  if (!specId) {
    console.log("Current branch is not in stacked mode.");
    return;
  }

  const branches = mapping.branches.filter((b) => b.specId === specId);
  let warnings = 0;

  console.log(`Spec: ${specId}\n`);

  for (const branch of branches) {
    // T113 - Check if branch still exists in git
    const exists = await branchExists(branch.name, repoRoot);

    if (!exists) {
      console.log(`${branch.name} (${branch.status}${branch.pr ? `, PR #${branch.pr}` : ""})`);
      console.log(`  ⚠ ORPHANED: Branch no longer exists in git`);
      console.log(`  → Run: /speck.branch delete ${branch.name} (cleanup metadata)`);
      warnings++;
      continue; // Skip other checks for non-existent branch
    }

    // T046 - Detect merged branches
    const isMerged = await checkBranchMerged(branch.name, branch.baseBranch, repoRoot);

    if (isMerged && branch.status !== "merged") {
      console.log(`${branch.name} (${branch.status}${branch.pr ? `, PR #${branch.pr}` : ""})`);
      console.log(`  ⚠ MERGED: Branch merged into base but status is '${branch.status}'`);
      console.log(`  → Run: /speck.branch update ${branch.name} --status merged`);
      warnings++;
    }

    // T047 - Detect rebase warnings
    if (isMerged && branch.status === "merged") {
      // Check if any child branches need rebasing
      const children = branches.filter(
        (b) => b.baseBranch === branch.name && b.status !== "merged"
      );
      if (children.length > 0) {
        for (const child of children) {
          console.log(`\n${child.name} (${child.status})`);
          console.log(`  ⚠ REBASE NEEDED: Base branch '${branch.name}' has been merged`);
          console.log(`  → Run: git rebase ${getMainBranch(mapping, branch)}`);
          console.log(
            `  → Update base: /speck.branch update ${child.name} --base ${getMainBranch(mapping, branch)}`
          );
          warnings++;
        }
      }
    }
  }

  // T048 - Display recommendations
  if (warnings === 0) {
    console.log("✓ Branch stack is healthy - no warnings");
  } else {
    console.log(`\n⚠ ${warnings} warning(s) found`);
  }

  // T110 - Check for orphaned branch tracking (child repo unlinked from parent)
  const context = await getMultiRepoContext();
  if (context.mode === "child" && mapping.branches.length > 0) {
    try {
      const { findChildRepos } = await import("./common/paths.js");
      const speckRoot = context.speckRoot || "";
      const childRepos = await findChildRepos(speckRoot);

      if (!childRepos.includes(repoRoot)) {
        console.log("\n⚠ Orphaned tracking detected:");
        console.log(`  ${mapping.branches.length} branch(es) tracked but repo unlinked from parent spec`);
        console.log(`  Parent: ${speckRoot}`);
        console.log("  Fix: Re-link with /speck.link or archive .speck/branches.json");
      }
    } catch {
      // Skip if unable to check parent
    }
  }
}

/**
 * T036 [US2] - Display aggregate status across all repositories
 */
async function displayAggregateStatusAll(speckRoot: string, repoRoot: string) {
  const aggregated = await getAggregatedBranchStatus(speckRoot, repoRoot);

  console.log("Branch Status (All Repositories)\n");

  // Display root repository
  if (aggregated.rootRepo && aggregated.rootRepo.branchCount > 0) {
    console.log("Root Repository:");
    await displayRepoStatus(speckRoot, aggregated.rootRepo);
    console.log("");
  }

  // Display child repositories (sorted alphabetically)
  const childNames = Array.from(aggregated.childRepos.keys()).sort();

  for (const childName of childNames) {
    const summary = aggregated.childRepos.get(childName)!;
    console.log(`Child: ${childName}`);
    await displayRepoStatus(summary.repoPath, summary);
    console.log("");
  }

  if (childNames.length === 0 && !aggregated.rootRepo) {
    console.log("No branches found in any repository.");
  }
}

/**
 * Display status for a single repository
 */
async function displayRepoStatus(repoPath: string, summary: RepoBranchSummary) {
  const mapping = await readBranches(repoPath);

  // Display summary
  const counts: string[] = [];
  if (summary.statusCounts.active > 0) counts.push(`${summary.statusCounts.active} active`);
  if (summary.statusCounts.submitted > 0) counts.push(`${summary.statusCounts.submitted} submitted`);
  if (summary.statusCounts.merged > 0) counts.push(`${summary.statusCounts.merged} merged`);
  if (summary.statusCounts.abandoned > 0) counts.push(`${summary.statusCounts.abandoned} abandoned`);

  if (counts.length > 0) {
    console.log(`  Total: ${summary.branchCount} branches (${counts.join(", ")})`);
  }

  // Display dependency tree
  console.log("  Dependency Tree:");
  for (const chain of summary.chains) {
    if (chain.branches.length > 0) {
      displayBranchChain(chain.branches, mapping);
    }
  }
}

/**
 * Display branch chain with status indicators
 */
function displayBranchChain(branchNames: string[], mapping: BranchMapping) {
  branchNames.forEach((branchName, idx) => {
    const branch = mapping.branches.find(b => b.name === branchName);
    if (!branch) return;

    const marker = idx === 0 ? "    └─" : "       └─";
    let display = `${marker} ${branchName}`;

    if (branch.pr) {
      display += ` (${branch.status}, PR #${branch.pr})`;
    } else if (branch.status !== "active") {
      display += ` (${branch.status})`;
    }

    console.log(display);
  });
}

async function updateCommand(args: string[]) {
  const name = args[0];
  if (!name) {
    throw new Error("Branch name required: /speck.branch update <name> [options]");
  }

  const statusFlag = args.indexOf("--status");
  const prFlag = args.indexOf("--pr");
  const baseFlag = args.indexOf("--base");

  const paths = await getFeaturePaths();
  const repoRoot = paths.REPO_ROOT;
  let mapping = await readBranches(repoRoot);

  const branch = findBranchEntry(mapping, name);
  if (!branch) {
    throw new Error(`Branch '${name}' not found in mapping`);
  }

  // T068 - Support --status, --pr, --base flags
  if (statusFlag !== -1) {
    const status = args[statusFlag + 1] as BranchStatus;
    if (!["active", "submitted", "merged", "abandoned"].includes(status)) {
      throw new Error(
        `Invalid status: '${status}'. Must be: active, submitted, merged, or abandoned`
      );
    }

    const pr = prFlag !== -1 ? parseInt(args[prFlag + 1], 10) : undefined;

    // T069 - Validate status transitions (done in updateBranchStatus)
    mapping = updateBranchStatus(mapping, name, status, pr);
  }

  if (baseFlag !== -1) {
    const newBase = args[baseFlag + 1];

    // Validate new base exists
    const baseExists = await branchExists(newBase, repoRoot);
    if (!baseExists) {
      throw new Error(`Base branch '${newBase}' does not exist`);
    }

    // Update base and check for cycles
    const updatedBranches = mapping.branches.map((b) =>
      b.name === name ? { ...b, baseBranch: newBase, updatedAt: new Date().toISOString() } : b
    );

    const cycle = detectCycle(name, { ...mapping, branches: updatedBranches });
    if (cycle) {
      throw new Error(`Cannot update base: circular dependency detected: ${cycle.join(" → ")}`);
    }

    mapping = { ...mapping, branches: updatedBranches };
  }

  // T070 - Update updatedAt timestamp (done in updateBranchStatus)
  await writeBranches(repoRoot, mapping);

  console.log(`✓ Updated branch '${name}'`);
}

async function deleteCommand(args: string[]) {
  const name = args[0];
  if (!name) {
    throw new Error("Branch name required: /speck.branch delete <name>");
  }

  const force = args.includes("--force");
  const paths = await getFeaturePaths();
  const repoRoot = paths.REPO_ROOT;
  const mapping = await readBranches(repoRoot);

  // T108 - Check for child branches
  const children = mapping.branches.filter((b) => b.baseBranch === name);
  if (children.length > 0 && !force) {
    console.error(`Error: Branch '${name}' has child branches:`);
    children.forEach((child) => console.error(`  - ${child.name}`));
    console.error("\nUse --force to delete anyway (will orphan children)");
    throw new Error("Branch has children");
  }

  // Remove branch
  const updated = removeBranch(mapping, name);
  await writeBranches(repoRoot, updated);

  // T109 - Display warning about git branch
  console.log(`✓ Removed branch '${name}' from metadata`);
  console.log();
  console.log("Note: Git branch still exists. To delete it, run:");
  console.log(`  git branch -D ${name}`);
}

async function importCommand(args: string[]) {
  const patternFlag = args.indexOf("--pattern");
  const pattern = patternFlag !== -1 ? args[patternFlag + 1] : undefined;

  // Check for batch import with spec mappings (from agent)
  const batchFlag = args.indexOf("--batch");
  const isBatchMode = batchFlag !== -1;

  const paths = await getFeaturePaths();
  const repoRoot = paths.REPO_ROOT;

  // T058 - Detect multi-repo context for parentSpecId
  const multiRepoContext = await getMultiRepoContext();
  const parentSpecId = multiRepoContext.context === 'child'
    ? await detectParentSpecId(multiRepoContext.speckRoot)
    : null;

  // T060-T061 - List all git branches and infer base branches
  const gitBranches = await listGitBranches(repoRoot, pattern);

  if (gitBranches.length === 0) {
    console.log("No branches found to import.");
    return;
  }

  let mapping = await readBranches(repoRoot);

  // Get default branch to exclude from import
  const defaultBranch = await detectDefaultBranch(repoRoot);

  // Filter out branches already in mapping and default branch
  const newBranches = gitBranches.filter(
    ({ name }) => !mapping.branches.some((b) => b.name === name) && name !== defaultBranch
  );

  if (newBranches.length === 0) {
    console.log("All branches are already in stacked mode.");
    return;
  }

  // T062 - Get available specs for mapping (use multiRepoContext.specsDir for child repos)
  const specsDir = multiRepoContext.specsDir;
  const specDirs = await fs.readdir(specsDir);
  const availableSpecs = specDirs.filter((d) => /^\d{3}-/.test(d));

  if (!isBatchMode) {
    // T063 - Output branch information as JSON for agent to parse
    const branchData = newBranches.map(({ name, upstream }) => {
      // T061-T062 - Parse upstream to infer base
      let baseBranch = "main";
      if (upstream) {
        const upstreamBranch = upstream.replace(/^origin\//, "");
        if (upstreamBranch && upstreamBranch !== name) {
          baseBranch = upstreamBranch;
        }
      }

      return {
        name,
        upstream: upstream || null,
        inferredBase: baseBranch,
      };
    });

    const importData = {
      type: "import-prompt",
      branches: branchData,
      availableSpecs,
    };

    // Output JSON to stderr for agent parsing
    console.error(JSON.stringify(importData));

    // Display human-readable summary
    console.log(`Found ${newBranches.length} branches to import:\n`);
    branchData.forEach((branch) => {
      console.log(`• ${branch.name}`);
      console.log(`  Upstream: ${branch.upstream || "(none)"}`);
      console.log(`  Inferred base: ${branch.inferredBase}`);
      console.log();
    });

    console.log(`Available specs: ${availableSpecs.join(", ")}\n`);
    console.log("Agent interaction required: Map each branch to a spec.");

    // Exit with code 3 to signal import prompt needed
    return 3;
  }

  // Batch mode: Parse spec mappings from arguments
  // Format: --batch branch1:spec1 branch2:spec2 branch3:skip
  const mappings = args.slice(batchFlag + 1);
  let imported = 0;
  let skipped = 0;

  for (const mappingStr of mappings) {
    const [branchName, specId] = mappingStr.split(":");

    if (!branchName || !specId) {
      console.log(`⚠ Invalid mapping format: ${mappingStr}`);
      continue;
    }

    if (specId === "skip") {
      console.log(`⊘ Skipped ${branchName}`);
      skipped++;
      continue;
    }

    // Find branch info
    const branchInfo = newBranches.find((b) => b.name === branchName);
    if (!branchInfo) {
      console.log(`⚠ Branch not found: ${branchName}`);
      continue;
    }

    // T061 - Infer base branch
    let baseBranch = "main";
    if (branchInfo.upstream) {
      const upstreamBranch = branchInfo.upstream.replace(/^origin\//, "");
      if (upstreamBranch && upstreamBranch !== branchInfo.name) {
        baseBranch = upstreamBranch;
      }
    }

    // T066 - Create branch entry
    // T060 - Add parentSpecId for multi-repo child context
    const now = new Date().toISOString();
    const entry: BranchEntry = {
      name: branchName,
      specId,
      baseBranch,
      status: "active",
      pr: null,
      createdAt: now,
      updatedAt: now,
      ...(parentSpecId && { parentSpecId }),
    };

    // T065 - Validate no cycles
    const cycle = detectCycle(branchName, {
      ...mapping,
      branches: [...mapping.branches, entry],
    });

    if (cycle) {
      console.log(`⚠ Skipped ${branchName} (would create cycle: ${cycle.join(" → ")})`);
      skipped++;
      continue;
    }

    // T066 - Add to mapping
    mapping = addBranch(mapping, entry);
    console.log(`✓ Imported ${branchName} → ${specId}`);
    imported++;
  }

  // Save mapping
  await writeBranches(repoRoot, mapping);

  // T067 - Display summary
  console.log(`\n✓ Import complete:`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped: ${skipped}`);
}

// ===========================
// Main CLI
// ===========================

export async function main(args: string[] = process.argv.slice(2)): Promise<number> {
  // DEPRECATION WARNING: This individual script is deprecated
  // Use the unified CLI instead: bun .speck/scripts/speck.ts branch
  // Or use the virtual command: speck-branch
  if (process.stdout.isTTY) {
    console.warn("\x1b[33m⚠️  DEPRECATION WARNING: This script is deprecated. Use 'speck-branch' virtual command or 'bun .speck/scripts/speck.ts branch' instead.\x1b[0m\n");
  }

  if (args.length === 0) {
    console.log("Usage: /speck.branch <command> [args]");
    console.log();
    console.log("Commands:");
    console.log("  create <name> [--base <base>] [--spec <spec-id>]");
    console.log("  list [--all]");
    console.log("  status");
    console.log("  update <name> [--status <status>] [--pr <number>] [--base <branch>]");
    console.log("  delete <name> [--force]");
    console.log("  import [--pattern <pattern>]");
    return 1;
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    switch (command) {
      case "create":
        await createCommand(commandArgs);
        break;
      case "list":
        await listCommand(commandArgs);
        break;
      case "status":
        await statusCommand(commandArgs);
        break;
      case "update":
        await updateCommand(commandArgs);
        break;
      case "delete":
        await deleteCommand(commandArgs);
        break;
      case "import":
        await importCommand(commandArgs);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run '/speck.branch' for usage");
        return 1;
    }
  } catch (error) {
    if (error instanceof GitError || error instanceof ValidationError) {
      console.error(`Error: ${error.message}`);
      return 1;
    }
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error(`Stack trace: ${error.stack}`);
      }
      return 1;
    }
    console.error(`Unknown error: ${String(error)}`);
    return 1;
  }
  return 0;
}

if (import.meta.main) {
  const exitCode = await main();
  process.exit(exitCode);
}
