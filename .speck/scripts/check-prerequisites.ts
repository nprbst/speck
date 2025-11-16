#!/usr/bin/env bun
/**
 * Bun TypeScript implementation of check-prerequisites.sh
 *
 * Transformation Date: 2025-11-15 (updated from v0.0.85)
 * Source: upstream/v0.0.85/.specify/scripts/bash/check-prerequisites.sh
 * Strategy: Pure TypeScript (file I/O, JSON generation, path operations)
 *
 * CLI Interface:
 * - Flags: --json, --require-tasks, --include-tasks, --paths-only, --help, -h
 * - Exit Codes: 0 (success), 1 (user error - missing files/invalid args)
 * - JSON Output: {"FEATURE_DIR":"...", "AVAILABLE_DOCS":["..."]} or paths-only variant
 *
 * Transformation Rationale:
 * - Replaced bash argument parsing with native TypeScript
 * - Replaced bash file existence checks with Node.js fs.existsSync()
 * - Replaced sourced common.sh functions with TypeScript imports
 * - Replaced bash directory checks with Node.js fs operations
 * - Replaced bash JSON generation with native JSON.stringify()
 *
 * Changes from v0.0.84 to v0.0.85:
 * - Upstream added CDPATH="" before cd commands for security
 * - TypeScript implementation already immune: imports use absolute paths
 * - No code changes needed; documented for transparency
 */

import { existsSync, readdirSync } from "node:fs";
import {
  getFeaturePaths,
  checkFeatureBranch,
  checkFile,
  checkDir,
  type FeaturePaths,
} from "./common";

/**
 * CLI options parsed from command line arguments
 */
interface CliOptions {
  json: boolean;
  requireTasks: boolean;
  includeTasks: boolean;
  pathsOnly: boolean;
  help: boolean;
}

/**
 * JSON output for standard mode
 */
interface CheckPrerequisitesOutput {
  FEATURE_DIR: string;
  AVAILABLE_DOCS: string[];
}

/**
 * JSON output for paths-only mode
 */
interface PathsOnlyOutput {
  REPO_ROOT: string;
  BRANCH: string;
  FEATURE_DIR: string;
  FEATURE_SPEC: string;
  IMPL_PLAN: string;
  TASKS: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    json: false,
    requireTasks: false,
    includeTasks: false,
    pathsOnly: false,
    help: false,
  };

  for (const arg of args) {
    switch (arg) {
      case "--json":
        options.json = true;
        break;
      case "--require-tasks":
        options.requireTasks = true;
        break;
      case "--include-tasks":
        options.includeTasks = true;
        break;
      case "--paths-only":
        options.pathsOnly = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        console.error(`ERROR: Unknown option '${arg}'. Use --help for usage information.`);
        process.exit(1);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`Usage: check-prerequisites.sh [OPTIONS]

Consolidated prerequisite checking for Spec-Driven Development workflow.

OPTIONS:
  --json              Output in JSON format
  --require-tasks     Require tasks.md to exist (for implementation phase)
  --include-tasks     Include tasks.md in AVAILABLE_DOCS list
  --paths-only        Only output path variables (no prerequisite validation)
  --help, -h          Show this help message

EXAMPLES:
  # Check task prerequisites (plan.md required)
  ./check-prerequisites.sh --json

  # Check implementation prerequisites (plan.md + tasks.md required)
  ./check-prerequisites.sh --json --require-tasks --include-tasks

  # Get feature paths only (no validation)
  ./check-prerequisites.sh --paths-only
  `);
}

/**
 * Main function
 */
async function main(args: string[]): Promise<number> {
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    return 0;
  }

  // Get feature paths and validate branch
  const paths = await getFeaturePaths();
  if (!checkFeatureBranch(paths.CURRENT_BRANCH, paths.HAS_GIT)) {
    return 1;
  }

  // If paths-only mode, output paths and exit (support JSON + paths-only combined)
  if (options.pathsOnly) {
    if (options.json) {
      // Minimal JSON paths payload (no validation performed)
      const output: PathsOnlyOutput = {
        REPO_ROOT: paths.REPO_ROOT,
        BRANCH: paths.CURRENT_BRANCH,
        FEATURE_DIR: paths.FEATURE_DIR,
        FEATURE_SPEC: paths.FEATURE_SPEC,
        IMPL_PLAN: paths.IMPL_PLAN,
        TASKS: paths.TASKS,
      };
      console.log(JSON.stringify(output));
    } else {
      console.log(`REPO_ROOT: ${paths.REPO_ROOT}`);
      console.log(`BRANCH: ${paths.CURRENT_BRANCH}`);
      console.log(`FEATURE_DIR: ${paths.FEATURE_DIR}`);
      console.log(`FEATURE_SPEC: ${paths.FEATURE_SPEC}`);
      console.log(`IMPL_PLAN: ${paths.IMPL_PLAN}`);
      console.log(`TASKS: ${paths.TASKS}`);
    }
    return 0;
  }

  // Validate required directories and files
  if (!existsSync(paths.FEATURE_DIR)) {
    console.error(`ERROR: Feature directory not found: ${paths.FEATURE_DIR}`);
    console.error("Run /speckit.specify first to create the feature structure.");
    return 1;
  }

  if (!existsSync(paths.IMPL_PLAN)) {
    console.error(`ERROR: plan.md not found in ${paths.FEATURE_DIR}`);
    console.error("Run /speckit.plan first to create the implementation plan.");
    return 1;
  }

  // Check for tasks.md if required
  if (options.requireTasks && !existsSync(paths.TASKS)) {
    console.error(`ERROR: tasks.md not found in ${paths.FEATURE_DIR}`);
    console.error("Run /speckit.tasks first to create the task list.");
    return 1;
  }

  // Build list of available documents
  const docs: string[] = [];

  // Always check these optional docs
  if (existsSync(paths.RESEARCH)) {
    docs.push("research.md");
  }

  if (existsSync(paths.DATA_MODEL)) {
    docs.push("data-model.md");
  }

  // Check contracts directory (only if it exists and has files)
  if (existsSync(paths.CONTRACTS_DIR)) {
    const files = readdirSync(paths.CONTRACTS_DIR);
    if (files.length > 0) {
      docs.push("contracts/");
    }
  }

  if (existsSync(paths.QUICKSTART)) {
    docs.push("quickstart.md");
  }

  // Include tasks.md if requested and it exists
  if (options.includeTasks && existsSync(paths.TASKS)) {
    docs.push("tasks.md");
  }

  // Output results
  if (options.json) {
    const output: CheckPrerequisitesOutput = {
      FEATURE_DIR: paths.FEATURE_DIR,
      AVAILABLE_DOCS: docs,
    };
    console.log(JSON.stringify(output));
  } else {
    // Text output
    console.log(`FEATURE_DIR:${paths.FEATURE_DIR}`);
    console.log("AVAILABLE_DOCS:");

    // Show status of each potential document
    checkFile(paths.RESEARCH, "research.md");
    checkFile(paths.DATA_MODEL, "data-model.md");
    checkDir(paths.CONTRACTS_DIR, "contracts/");
    checkFile(paths.QUICKSTART, "quickstart.md");

    if (options.includeTasks) {
      checkFile(paths.TASKS, "tasks.md");
    }
  }

  return 0;
}

// Entry point
const exitCode = await main(process.argv.slice(2));
process.exit(exitCode);
