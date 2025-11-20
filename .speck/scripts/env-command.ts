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
import { detectSpeckRoot, getMultiRepoContext, findChildRepos } from "./common/paths.ts";
import fs from "node:fs/promises";
import path from "node:path";

// ===========================
// Main Entry Point
// ===========================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    showHelp();
    process.exit(0);
  }

  const jsonOutput = args.includes("--json");

  try {
    await displayEnvironmentStatus(jsonOutput);
    process.exit(0);
  } catch (error) {
    if (jsonOutput) {
      console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    } else {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exit(1);
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
  const branchesPath = path.join(config.repoRoot, ".speck", "branches.json");

  // Check if stacked PR mode is enabled
  try {
    await fs.access(branchesPath);
  } catch {
    console.log("Branch Stack Status: Not enabled");
    console.log("");
    console.log("To enable stacked PRs:");
    console.log("  /speck.branch create <branch-name> --base <base-branch>");
    console.log("");
    return;
  }

  // T033: Multi-repo root displays aggregate status
  if (context.mode === "multi-repo" && context.context === "root") {
    await displayAggregateStatus(config.speckRoot, config.repoRoot);
  } else {
    // Single-repo or child context: display local status only
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
      displayBranchChain(chain.branches);
    }
  }

  console.log("");
}

/**
 * T034 - Display branch chain with tree visualization
 */
function displayBranchChain(branches: string[]): void {
  if (branches.length === 0) return;

  // Display as a stacked chain: branch1 → branch2 → branch3
  branches.forEach((branch, idx) => {
    const marker = idx === 0 ? "└─" : "   └─";
    console.log(`  ${marker} ${branch}`);
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

  const currentBranch = await getCurrentBranch(repoRoot);

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

main();
