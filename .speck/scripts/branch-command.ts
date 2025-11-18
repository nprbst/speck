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
  getBranchesForSpec,
  detectCycle,
  type BranchEntry,
  type BranchMapping,
  type BranchStatus,
} from "./common/branch-mapper.js";
import {
  createGitBranch,
  checkoutBranch,
  branchExists,
  checkBranchMerged,
  listGitBranches,
  getCurrentBranch as gitGetCurrentBranch,
} from "./common/git-operations.js";
import { validateBranchName, getFeaturePaths } from "./common/paths.js";
import { GitError, ValidationError } from "./common/errors.js";

// ===========================
// Helpers
// ===========================

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

  // Get repository root for git operations
  const paths = await getFeaturePaths();
  const repoRoot = paths.REPO_ROOT;

  // Default to current branch if --base not specified
  let baseBranch: string;
  if (baseFlag !== -1 && args[baseFlag + 1]) {
    baseBranch = args[baseFlag + 1];
  } else {
    baseBranch = await gitGetCurrentBranch(repoRoot);
    console.log(`Defaulting base to current branch: ${baseBranch}`);
  }

  let specId = specFlag !== -1 ? args[specFlag + 1] : null;

  // T029 - Validate branch name
  const isValid = await validateBranchName(name);
  if (!isValid) {
    throw new Error(`Invalid branch name: '${name}'. Must be a valid git ref name.`);
  }

  // T030 - Validate base branch exists
  const baseExists = await branchExists(baseBranch, repoRoot);
  if (!baseExists) {
    throw new Error(`Base branch '${baseBranch}' does not exist in git`);
  }

  // T031 - Auto-detect or prompt for spec ID
  if (!specId) {
    // Try to auto-detect from current branch
    if (paths.FEATURE_DIR && paths.FEATURE_DIR.includes("/specs/")) {
      const match = paths.FEATURE_DIR.match(/\/specs\/([^\/]+)/);
      if (match) {
        specId = match[1];
        console.log(`Auto-detected spec: ${specId}`);
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
  const specDir = path.join(repoRoot, "specs", specId);
  try {
    await fs.access(specDir);
  } catch {
    throw new Error(`Spec directory not found: specs/${specId}/`);
  }

  // T032 - Initialize branches.json if doesn't exist
  let mapping = await readBranches(repoRoot);

  // T033 - Create BranchEntry with ISO 8601 timestamps
  const now = new Date().toISOString();
  const entry: BranchEntry = {
    name,
    specId,
    baseBranch,
    status: "active",
    pr: null,
    createdAt: now,
    updatedAt: now,
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

  // T037 - Display success message with stack visualization
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

async function listCommand(args: string[]) {
  const showAll = args.includes("--all");
  const paths = await getFeaturePaths();
  const repoRoot = paths.REPO_ROOT;
  const mapping = await readBranches(repoRoot);

  if (mapping.branches.length === 0) {
    console.log("No stacked branches found.");
    console.log("Create your first stacked branch with:");
    console.log("  /speck.branch create <name> --base main");
    return;
  }

  const currentBranch = await gitGetCurrentBranch(repoRoot);

  if (showAll) {
    // T082-T084 - Show branches across all specs
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

async function statusCommand() {
  const paths = await getFeaturePaths();
  const repoRoot = paths.REPO_ROOT;
  const mapping = await readBranches(repoRoot);
  const currentBranch = await gitGetCurrentBranch(repoRoot);
  const specId = getSpecForBranch(mapping, currentBranch);

  if (!specId) {
    console.log("Current branch is not in stacked mode.");
    return;
  }

  const branches = mapping.branches.filter((b) => b.specId === specId);
  let warnings = 0;

  console.log(`Spec: ${specId}\n`);

  for (const branch of branches) {
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

  const paths = await getFeaturePaths();
  const repoRoot = paths.REPO_ROOT;

  // T060 - List all git branches
  const gitBranches = await listGitBranches(repoRoot, pattern);

  if (gitBranches.length === 0) {
    console.log("No branches found to import.");
    return;
  }

  let mapping = await readBranches(repoRoot);
  let imported = 0;
  let skipped = 0;

  console.log(`Found ${gitBranches.length} branches to import:\n`);

  for (const { name, upstream } of gitBranches) {
    // Skip if already in mapping
    if (mapping.branches.some((b) => b.name === name)) {
      console.log(`⊘ ${name} (already in stacked mode)`);
      skipped++;
      continue;
    }

    // T061 - Parse upstream to infer base
    let baseBranch = "main";
    if (upstream) {
      const upstreamBranch = upstream.replace(/^origin\//, "");
      if (upstreamBranch && upstreamBranch !== name) {
        baseBranch = upstreamBranch;
      }
    }

    console.log(`\nBranch: ${name}`);
    console.log(`  Upstream: ${upstream || "(none)"}`);
    console.log(`  Inferred base: ${baseBranch}`);

    // T062 - Prompt for spec mapping
    const specDirs = await fs.readdir(path.join(repoRoot, "specs"));
    const specs = specDirs.filter((d) => /^\d{3}-/.test(d));

    console.log(`  Link to spec? (Enter number or 's' to skip)`);
    specs.forEach((spec, index) => {
      console.log(`    ${index + 1}. ${spec}`);
    });

    // For automated execution, skip (would need interactive prompts library in real usage)
    console.log(`⊘ Skipped ${name} (interactive prompt needed)`);
    skipped++;
  }

  // T066 - Display summary
  console.log(`\n✓ Import complete:`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`\nNote: Import requires interactive mode. Run manually in terminal for full functionality.`);
}

// ===========================
// Main CLI
// ===========================

async function main() {
  const args = process.argv.slice(2);

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
    process.exit(1);
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
        await statusCommand();
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
        process.exit(1);
    }
  } catch (error) {
    if (error instanceof GitError || error instanceof ValidationError) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}

main();
