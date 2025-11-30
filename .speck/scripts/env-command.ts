/**
 * Speck Environment Check Command
 *
 * Comprehensive environment and configuration checker for Speck plugin.
 * Displays multi-repo context, branch mapping status, and diagnostic information.
 *
 * Feature: 015-scope-simplification (refactored from 008/009)
 *
 * Usage:
 *   bun run .speck/scripts/env-command.ts [options]
 *
 * Options:
 *   --help     Show this help message
 *   --json     Output as JSON (for programmatic use)
 */

import { readBranches, getAggregatedBranchStatus, type RepoBranchSummary } from "./common/branch-mapper.ts";
import { getCurrentBranch } from "./common/git-operations.ts";
import { detectSpeckRoot, getMultiRepoContext, findChildReposWithNames, type SpeckConfig, type MultiRepoContextMetadata } from "./common/paths.ts";
import {
  formatJsonOutput,
  formatHookOutput,
  detectOutputMode,
  type OutputMode,
} from "./lib/output-formatter";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

// ===========================
// Main Entry Point
// ===========================

export async function main(args: string[] = process.argv.slice(2)): Promise<number> {
  const startTime = Date.now();
  const options = {
    json: args.includes("--json"),
    hook: args.includes("--hook"),
    help: args.includes("--help"),
  };
  const outputMode = detectOutputMode(options);

  if (options.help) {
    showHelp();
    return 0;
  }

  try {
    await displayEnvironmentStatus(outputMode, startTime);
    return 0;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputError("ENV_ERROR", errorMessage, outputMode, startTime);
    return 1;
  }
}

/**
 * Output error in the appropriate format
 */
function outputError(
  code: string,
  message: string,
  outputMode: OutputMode,
  startTime: number
): void {
  if (outputMode === "json") {
    const output = formatJsonOutput({
      success: false,
      error: { code, message },
      command: "env",
      startTime,
    });
    console.log(JSON.stringify(output));
  } else if (outputMode === "hook") {
    console.error(`ERROR: ${message}`);
  } else {
    console.error(`Error: ${message}`);
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
  --json     Output as JSON (structured JSON envelope)
  --hook     Output hook-formatted response for Claude Code hooks

Description:
  Displays comprehensive environment information including:
  - Multi-repo configuration
  - Branch mapping status
  - Feature detection
  - System diagnostics
  `.trim());
}

// ===========================
// Conflict Detection
// ===========================

/**
 * Check for conflicting spec.md files in multi-repo child context
 *
 * In multi-repo mode, a child repo can have:
 * - Child-only specs (local specs that don't exist in shared root) - OK
 * - Shared specs (specs that exist in shared root) - OK
 *
 * But if the SAME feature-id has spec.md in BOTH locations, that creates
 * ambiguity about which spec is authoritative.
 *
 * @returns Warning message if conflict detected, null otherwise
 */
async function checkLocalSpecsConflict(context: MultiRepoContextMetadata): Promise<string | null> {
  // Only check in multi-repo child context
  if (context.mode !== "multi-repo" || context.context !== "child") {
    return null;
  }

  // Check if child repo has a local specs/ directory
  const localSpecsDir = path.join(context.repoRoot, "specs");
  if (!existsSync(localSpecsDir)) {
    return null;
  }

  // Find features that have spec.md in BOTH local and shared locations
  const conflicts: string[] = [];

  try {
    const localFeatures = await fs.readdir(localSpecsDir, { withFileTypes: true });

    for (const entry of localFeatures) {
      if (!entry.isDirectory()) continue;

      const featureId = entry.name;
      const localSpecPath = path.join(localSpecsDir, featureId, "spec.md");
      const sharedSpecPath = path.join(context.specsDir, featureId, "spec.md");

      // Check if spec.md exists in BOTH locations
      if (existsSync(localSpecPath) && existsSync(sharedSpecPath)) {
        conflicts.push(featureId);
      }
    }
  } catch {
    return null;
  }

  if (conflicts.length === 0) {
    return null;
  }

  // Build warning message for conflicting specs
  const conflictList = conflicts.map(f => `     - ${f}`).join("\n");
  return (
    "⚠️  WARNING: Conflicting spec.md files found in both local and shared locations\n" +
    "\n" +
    "   Features with conflicts:\n" +
    conflictList + "\n" +
    "\n" +
    "   Each feature should have spec.md in only ONE location:\n" +
    `   - Shared (for cross-repo features): ${context.specsDir}/<feature>/spec.md\n` +
    `   - Local (for child-only features): ${localSpecsDir}/<feature>/spec.md\n` +
    "\n" +
    "   To resolve, remove the duplicate spec.md from one location."
  );
}

// ===========================
// Main Display Logic
// ===========================

async function displayEnvironmentStatus(outputMode: OutputMode, startTime: number): Promise<void> {
  const config = await detectSpeckRoot();
  const context = await getMultiRepoContext();

  if (outputMode === "json") {
    await displayJsonOutput(config, context, startTime);
  } else if (outputMode === "hook") {
    await displayHookOutput(config, context);
  } else {
    await displayTextOutput(config, context);
  }
}

// ===========================
// Text Output (Human-Readable)
// ===========================

async function displayTextOutput(config: SpeckConfig, context: MultiRepoContextMetadata): Promise<void> {
  console.log("=== Speck Environment Status ===\n");

  // Display multi-repo context indicator
  await displayMultiRepoContext(context);

  // Display branch mapping status
  await displayBranchMappingStatus(config, context);
}

/**
 * Display multi-repo context indicator
 */
async function displayMultiRepoContext(context: MultiRepoContextMetadata): Promise<void> {
  // Get current branch
  let currentBranch = "";
  try {
    currentBranch = await getCurrentBranch(context.repoRoot);
  } catch {
    // Ignore - repo might have no commits
  }

  // Check for conflicting local specs/ directory in child repo context
  const localSpecsWarning = await checkLocalSpecsConflict(context);
  if (localSpecsWarning) {
    console.log(localSpecsWarning);
    console.log("");
  }

  if (context.mode === "single-repo") {
    console.log("Mode: Single-repo");
    console.log(`  Repo Root: ${context.repoRoot}`);
    console.log(`  Specs Directory: ${context.specsDir}`);
    if (currentBranch) {
      console.log(`  Current Branch: ${currentBranch}`);
    }
    console.log("");
  } else if (context.context === "root") {
    console.log("Mode: Multi-repo (Root)");
    console.log(`  Speck Root: ${context.speckRoot}`);
    console.log(`  Specs Directory: ${context.specsDir}`);
    if (currentBranch) {
      console.log(`  Current Branch: ${currentBranch}`);
    }
    console.log("");
  } else if (context.context === "child") {
    console.log("Mode: Multi-repo (Child Repository)");
    console.log(`  Context: Child repo (${context.childRepoName})`);
    console.log(`  Parent Spec: ${context.parentSpecId || "Unknown"}`);
    console.log(`  Repo Root: ${context.repoRoot}`);
    console.log(`  Speck Root: ${context.speckRoot}`);
    if (currentBranch) {
      console.log(`  Current Branch: ${currentBranch}`);
    }
    console.log("");
  }
}

/**
 * Display branch mapping status (simplified - no stacked PR visualization)
 */
async function displayBranchMappingStatus(config: SpeckConfig, context: MultiRepoContextMetadata): Promise<void> {
  // Check if there are child repos
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

  // If no branches and no child repos, show minimal message
  if (!hasBranches && !hasChildRepos) {
    console.log("Branch Mappings: None");
    console.log("  (Use non-standard branch names to auto-create mappings)");
    console.log("");
    return;
  }

  // Display aggregate status if multi-repo root or single-repo with children
  if ((context.mode === "multi-repo" && context.context === "root") ||
      (context.mode === "single-repo" && hasChildRepos)) {
    await displayAggregateStatus(config.speckRoot, config.repoRoot);
  } else {
    // Single-repo without children, or child context: display local status only
    await displayLocalStatus(config.repoRoot);
  }
}

/**
 * Display aggregate branch mapping status for multi-repo root
 */
async function displayAggregateStatus(speckRoot: string, repoRoot: string): Promise<void> {
  console.log("=== Branch Mappings (Multi-Repo) ===\n");

  const aggregated = await getAggregatedBranchStatus(speckRoot, repoRoot);

  // Display root repository
  if (aggregated.rootRepo) {
    displayRepoSummary("Root", aggregated.rootRepo);
  } else {
    console.log("Root Repository: (no branch mappings)");
    console.log("");
  }

  // Display child repositories (sorted alphabetically)
  const childNames = Array.from(aggregated.childRepos.keys()).sort();
  for (const childName of childNames) {
    const summary = aggregated.childRepos.get(childName)!;
    displayRepoSummary(`Child: ${childName}`, summary);
  }

  if (childNames.length === 0 && !aggregated.rootRepo) {
    console.log("No branch mappings found in any repository.");
    console.log("");
  }
}

/**
 * Display repository summary (simplified - no stacked PR fields)
 */
function displayRepoSummary(header: string, summary: RepoBranchSummary): void {
  console.log(`${header}${summary.specId ? ` (${summary.specId})` : ""}:`);
  console.log(`  ${summary.branchCount} branch mapping(s)`);

  // List branches
  for (const branch of summary.branches) {
    console.log(`    - ${branch.name} → ${branch.specId}`);
  }

  console.log("");
}

/**
 * Display local branch mapping status (single-repo or child context)
 */
async function displayLocalStatus(repoRoot: string): Promise<void> {
  console.log("=== Branch Mappings ===\n");

  const mapping = await readBranches(repoRoot);

  if (mapping.branches.length === 0) {
    console.log("No branch mappings yet.");
    console.log("  (Non-standard branch names are auto-tracked when created)");
    console.log("");
    return;
  }

  let currentBranch = "";
  try {
    currentBranch = await getCurrentBranch(repoRoot);
  } catch {
    // Ignore error - repo might have no commits yet
  }

  // Group by spec
  const specIds = Object.keys(mapping.specIndex);

  for (const specId of specIds) {
    console.log(`Spec: ${specId}`);

    const branchNames = mapping.specIndex[specId] || [];
    for (const branchName of branchNames) {
      const isCurrent = branchName === currentBranch;
      console.log(`  - ${branchName}${isCurrent ? " (current)" : ""}`);
    }

    console.log("");
  }
}

// ===========================
// JSON Output (Programmatic)
// ===========================

interface EnvOutputData {
  mode: string;
  context: string;
  speckRoot: string;
  repoRoot: string;
  specsDir: string;
  currentBranch?: string;
  childRepoName?: string | null;
  parentSpecId?: string | null;
  branchStatus?: {
    type: string;
    rootRepo?: unknown;
    childRepos?: Record<string, unknown>;
    branches?: unknown[];
    specIndex?: Record<string, unknown>;
  };
}

async function buildEnvOutputData(_config: SpeckConfig, context: MultiRepoContextMetadata): Promise<EnvOutputData> {
  // Get current branch
  let currentBranch = "";
  try {
    currentBranch = await getCurrentBranch(context.repoRoot);
  } catch {
    // Ignore - repo might have no commits
  }

  const output: EnvOutputData = {
    mode: context.mode,
    context: context.context,
    speckRoot: context.speckRoot,
    repoRoot: context.repoRoot,
    specsDir: context.specsDir,
    currentBranch: currentBranch || undefined
  };

  if (context.context === "child") {
    output.childRepoName = context.childRepoName;
    output.parentSpecId = context.parentSpecId;
  }

  // Add branch mapping status
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

  return output;
}

async function displayJsonOutput(config: SpeckConfig, context: MultiRepoContextMetadata, startTime: number): Promise<void> {
  const data = await buildEnvOutputData(config, context);
  const output = formatJsonOutput({
    success: true,
    data,
    command: "env",
    startTime,
  });
  console.log(JSON.stringify(output));
}

async function displayHookOutput(config: SpeckConfig, context: MultiRepoContextMetadata): Promise<void> {
  const data = await buildEnvOutputData(config, context);
  const hookOutput = formatHookOutput({
    hookType: "UserPromptSubmit",
    context: `<!-- SPECK_ENV_CONTEXT\n${JSON.stringify(data)}\n-->`,
  });
  console.log(JSON.stringify(hookOutput));
}

// ===========================
// Execute
// ===========================

if (import.meta.main) {
  const exitCode = await main();
  process.exit(exitCode);
}
