/**
 * Speck Environment Check Command
 *
 * Comprehensive environment and configuration checker for Speck plugin.
 * Displays multi-repo context, branch stack status, and diagnostic information.
 *
 * Feature: 008-stacked-pr-support (T072-T082)
 * Feature: 009-multi-repo-stacked (T032-T034)
 *
 * Usage:
 *   bun run .speck/scripts/env-command.ts [options]
 *
 * Options:
 *   --help     Show this help message
 *   --json     Output as JSON (for programmatic use)
 */

import { readBranches, getAggregatedBranchStatus, type BranchMapping, type RepoBranchSummary } from "./common/branch-mapper.ts";
import { getCurrentBranch } from "./common/git-operations.ts";
import { detectSpeckRoot, getMultiRepoContext, findChildReposWithNames } from "./common/paths.ts";
import fs from "node:fs/promises";
import path from "node:path";

// ===========================
// Main Entry Point
// ===========================

export async function main(args: string[] = process.argv.slice(2)): Promise<number> {
  // DEPRECATION WARNING: This individual script is deprecated
  // Use the unified CLI instead: bun .speck/scripts/speck.ts env
  // Or use the virtual command: speck-env
  if (!args.includes("--json") && process.stdout.isTTY) {
    console.warn("\x1b[33m⚠️  DEPRECATION WARNING: This script is deprecated. Use 'speck-env' virtual command or 'bun .speck/scripts/speck.ts env' instead.\x1b[0m\n");
  }

  if (args.includes("--help")) {
    showHelp();
    return 0;
  }

  const jsonOutput = args.includes("--json");

  try {
    await displayEnvironmentStatus(jsonOutput);
    return 0;
  } catch (error) {
    if (jsonOutput) {
      console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    } else {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    return 1;
  }
}

// ===========================
// Help Display
// ===========================

function showHelp(): void {
  console.log(`
Speck Environment Check

Usage:
  bun run .speck/scripts/env-command.ts [options]

Options:
  --help     Show this help message
  --json     Output as JSON (for programmatic use)

Description:
  Displays comprehensive environment information including:
  - Multi-repo configuration
  - Branch stack status (single-repo or aggregate)
  - Feature detection
  - System diagnostics
  `.trim());
}

// ===========================
// Main Display Logic
// ===========================

async function displayEnvironmentStatus(jsonOutput: boolean): Promise<void> {
  const config = await detectSpeckRoot();
  const context = await getMultiRepoContext();

  if (jsonOutput) {
    await displayJsonOutput(config, context);
  } else {
    await displayTextOutput(config, context);
  }
}

// ===========================
// Text Output (Human-Readable)
// ===========================

async function displayTextOutput(config: any, context: any): Promise<void> {
  console.log("=== Speck Environment Status ===\n");

  // T032: Display multi-repo context indicator when in child
  displayMultiRepoContext(context);

  // T033-T034: Display branch stack status
  await displayBranchStackStatus(config, context);
}

/**
 * T032 - Display multi-repo context indicator when in child
 */
function displayMultiRepoContext(context: any): void {
  if (context.mode === "single-repo") {
    console.log("Mode: Single-repo");
    console.log(`  Repo Root: ${context.repoRoot}`);
    console.log(`  Specs Directory: ${context.specsDir}`);
    console.log("");
  } else if (context.context === "root") {
    console.log("Mode: Multi-repo (Root)");
    console.log(`  Speck Root: ${context.speckRoot}`);
    console.log(`  Specs Directory: ${context.specsDir}`);
    console.log("");
  } else if (context.context === "child") {
    console.log("Mode: Multi-repo (Child Repository)");
    console.log(`  Context: Child repo (${context.childRepoName})`);
    console.log(`  Parent Spec: ${context.parentSpecId || "Unknown"}`);
    console.log(`  Repo Root: ${context.repoRoot}`);
    console.log(`  Speck Root: ${context.speckRoot}`);
    console.log("");
  }
}

/**
 * T033-T034 - Display branch stack status with multi-repo awareness
 */
async function displayBranchStackStatus(config: any, context: any): Promise<void> {
  // T033: Check if there are child repos (even in single-repo mode for the root)
  // This handles the case where root doesn't have .speck/root but has children
  const childReposMap = await findChildReposWithNames(config.speckRoot);
  const hasChildRepos = childReposMap.size > 0;

  // Check if root has branches.json
  const branchesPath = path.join(config.repoRoot, ".speck", "branches.json");
  let hasBranches = false;
  try {
    await fs.access(branchesPath);
    hasBranches = true;
  } catch {
    // No branches.json in root
  }

  // If no branches and no child repos, show "not enabled" message
  if (!hasBranches && !hasChildRepos) {
    console.log("Branch Stack Status: Not enabled");
    console.log("");
    console.log("To enable stacked PRs:");
    console.log("  /speck.branch create <branch-name> --base <base-branch>");
    console.log("");
    return;
  }

  // T033: Display aggregate status if:
  // 1. Multi-repo root context, OR
  // 2. Single-repo mode BUT has child repos (root with children)
  if ((context.mode === "multi-repo" && context.context === "root") ||
      (context.mode === "single-repo" && hasChildRepos)) {
    await displayAggregateStatus(config.speckRoot, config.repoRoot);
  } else {
    // Single-repo without children, or child context: display local status only
    await displayLocalStatus(config.repoRoot);
  }
}

/**
 * T033 - Display aggregate branch status for multi-repo root
 */
async function displayAggregateStatus(speckRoot: string, repoRoot: string): Promise<void> {
  console.log("=== Branch Stack Status (Multi-Repo) ===\n");

  const aggregated = await getAggregatedBranchStatus(speckRoot, repoRoot);

  // Display root repository
  if (aggregated.rootRepo) {
    displayRepoSummary("Root", aggregated.rootRepo);
  } else {
    console.log("Root Repository: (no branches)");
    console.log("");
  }

  // Display child repositories (sorted alphabetically)
  const childNames = Array.from(aggregated.childRepos.keys()).sort();
  for (const childName of childNames) {
    const summary = aggregated.childRepos.get(childName)!;
    displayRepoSummary(`Child: ${childName}`, summary);
  }

  if (childNames.length === 0 && !aggregated.rootRepo) {
    console.log("No branches found in any repository.");
    console.log("");
  }
}

/**
 * T034 - Display repository summary with tree visualization
 */
function displayRepoSummary(header: string, summary: RepoBranchSummary): void {
  console.log(`${header}${summary.specId ? ` (${summary.specId})` : ""}:`);

  // Display status counts
  const counts: string[] = [];
  if (summary.statusCounts.active > 0) counts.push(`${summary.statusCounts.active} active`);
  if (summary.statusCounts.submitted > 0) counts.push(`${summary.statusCounts.submitted} submitted`);
  if (summary.statusCounts.merged > 0) counts.push(`${summary.statusCounts.merged} merged`);
  if (summary.statusCounts.abandoned > 0) counts.push(`${summary.statusCounts.abandoned} abandoned`);

  if (counts.length > 0) {
    console.log(`  ${counts.join(", ")}`);
  }

  // Display dependency trees
  for (const chain of summary.chains) {
    if (chain.branches.length > 0) {
      displayBranchChain(chain.branches, summary.branches);
    }
  }

  console.log("");
}

/**
 * T034 - Display branch chain with tree visualization
 */
function displayBranchChain(branchNames: string[], branchEntries: any[]): void {
  if (branchNames.length === 0) return;

  // Display as a stacked chain with PR numbers and status
  branchNames.forEach((branchName, idx) => {
    const marker = idx === 0 ? "└─" : "   └─";
    const branch = branchEntries.find(b => b.name === branchName);

    let display = `  ${marker} ${branchName}`;

    if (branch) {
      if (branch.pr) {
        display += ` (${branch.status}, PR #${branch.pr})`;
      } else if (branch.status !== "active") {
        display += ` (${branch.status})`;
      }
    }

    console.log(display);
  });
}

/**
 * Display local branch stack status (single-repo or child context)
 */
async function displayLocalStatus(repoRoot: string): Promise<void> {
  console.log("=== Branch Stack Status ===\n");

  const mapping = await readBranches(repoRoot);

  if (mapping.branches.length === 0) {
    console.log("No branches tracked yet.");
    console.log("");
    return;
  }

  let currentBranch = "";
  try {
    currentBranch = await getCurrentBranch(repoRoot);
  } catch (error) {
    // Ignore error - repo might have no commits yet
    currentBranch = "";
  }

  // Group by spec
  const specIds = Object.keys(mapping.specIndex);

  for (const specId of specIds) {
    console.log(`Spec: ${specId}`);
    console.log("Branch Stack:");

    const branchNames = mapping.specIndex[specId] || [];
    const branches = branchNames.map(name =>
      mapping.branches.find(b => b.name === name)
    ).filter(Boolean);

    // Find root branches
    const rootBranches = branches.filter(b =>
      !branchNames.includes(b.baseBranch)
    );

    // Display tree
    rootBranches.forEach((root) => {
      console.log(`  ${root.baseBranch}`);
      displayTree(root.name, "  ", true, branches, currentBranch);
    });

    console.log("");
  }

  // Show warnings
  const needsAttention = mapping.branches.filter(b => b.status === "active" && b.pr === null).length;
  if (needsAttention > 0) {
    console.log(`⚠ ${needsAttention} branch(es) may need attention`);
    console.log("Run /speck.branch status for details");
    console.log("");
  }

  // T110 - Check for orphaned branch tracking (child repo unlinked from parent)
  if (context.mode === "child" && mapping.branches.length > 0) {
    // Child repo has branches tracked, verify symlink still exists in parent
    try {
      const { findChildRepos } = await import("./common/paths.js");
      const speckRoot = context.speckRoot || "";
      const childRepos = await findChildRepos(speckRoot);

      if (!childRepos.includes(repoRoot)) {
        console.log("⚠ Orphaned tracking detected:");
        console.log(`  ${mapping.branches.length} branch(es) tracked but repo unlinked from parent spec`);
        console.log(`  Parent: ${speckRoot}`);
        console.log("  Fix: Re-link with /speck.link or archive .speck/branches.json");
        console.log("");
      }
    } catch {
      // Skip if unable to check parent
    }
  }
}

/**
 * Recursively display branch tree
 */
function displayTree(
  branchName: string,
  indent: string,
  isLast: boolean,
  branches: any[],
  currentBranch: string
): void {
  const branch = branches.find(b => b.name === branchName);
  if (!branch) return;

  const marker = isLast ? "└─" : "├─";
  const isCurrent = branchName === currentBranch;

  let display = `${indent}${marker} ${branchName}`;

  if (branch.pr) {
    display += ` (${branch.status}, PR #${branch.pr})`;
  } else if (branch.status !== "active") {
    display += ` (${branch.status})`;
  }

  if (isCurrent) {
    display += " (current)";
  }

  console.log(display);

  // Find children
  const children = branches.filter(b => b.baseBranch === branchName);
  children.forEach((child, idx) => {
    const childIndent = indent + (isLast ? "  " : "│ ");
    displayTree(child.name, childIndent, idx === children.length - 1, branches, currentBranch);
  });
}

// ===========================
// JSON Output (Programmatic)
// ===========================

async function displayJsonOutput(config: any, context: any): Promise<void> {
  const output: any = {
    mode: context.mode,
    context: context.context,
    speckRoot: context.speckRoot,
    repoRoot: context.repoRoot,
    specsDir: context.specsDir
  };

  if (context.context === "child") {
    output.childRepoName = context.childRepoName;
    output.parentSpecId = context.parentSpecId;
  }

  // Add branch stack status
  if (context.mode === "multi-repo" && context.context === "root") {
    const aggregated = await getAggregatedBranchStatus(context.speckRoot, context.repoRoot);
    output.branchStatus = {
      type: "aggregate",
      rootRepo: aggregated.rootRepo,
      childRepos: Object.fromEntries(aggregated.childRepos)
    };
  } else {
    try {
      const mapping = await readBranches(context.repoRoot);
      output.branchStatus = {
        type: "local",
        branches: mapping.branches,
        specIndex: mapping.specIndex
      };
    } catch {
      output.branchStatus = { type: "none" };
    }
  }

  console.log(JSON.stringify(output, null, 2));
}

// ===========================
// Execute
// ===========================

if (import.meta.main) {
  const exitCode = await main();
  process.exit(exitCode);
}
