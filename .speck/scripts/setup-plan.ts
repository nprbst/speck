#!/usr/bin/env bun
/**
 * Bun TypeScript implementation of setup-plan.sh
 *
 * Transformation Date: 2025-11-15
 * Source: upstream/v0.0.83/.specify/scripts/bash/setup-plan.sh
 * Strategy: Pure TypeScript (file I/O, path operations) + imported common functions
 *
 * CLI Interface:
 * - Flags: --json, --help, -h
 * - Exit Codes: 0 (success), 1 (user error)
 * - JSON Output: {"FEATURE_SPEC":"...", "IMPL_PLAN":"...", "SPECS_DIR":"...", "BRANCH":"...", "HAS_GIT":"..."}
 *
 * Transformation Rationale:
 * - Replaced bash argument parsing with TypeScript
 * - Replaced sourced common.sh functions with TypeScript imports
 * - Replaced bash file operations with Node.js fs operations
 * - Replaced bash template copying with Node.js fs.copyFileSync()
 */

import { existsSync, copyFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { getFeaturePaths, checkFeatureBranch } from "./common";

/**
 * CLI options
 */
interface CliOptions {
  json: boolean;
  help: boolean;
}

/**
 * JSON output
 */
interface SetupPlanOutput {
  FEATURE_SPEC: string;
  IMPL_PLAN: string;
  SPECS_DIR: string;
  BRANCH: string;
  HAS_GIT: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    json: false,
    help: false,
  };

  for (const arg of args) {
    switch (arg) {
      case "--json":
        options.json = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        // Ignore unknown arguments (stored in ARGS array in bash, but unused)
        break;
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`Usage: setup-plan.ts [--json]
  --json    Output results in JSON format
  --help    Show this help message`);
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

  // Get all paths and variables from common functions
  const paths = await getFeaturePaths();

  // Check if we're on a proper feature branch (only for git repos)
  if (!checkFeatureBranch(paths.CURRENT_BRANCH, paths.HAS_GIT)) {
    return 1;
  }

  // Ensure the feature directory exists
  mkdirSync(paths.FEATURE_DIR, { recursive: true });

  // Copy plan template if it exists
  const template = path.join(paths.REPO_ROOT, ".specify", "templates", "plan-template.md");
  if (existsSync(template)) {
    copyFileSync(template, paths.IMPL_PLAN);
    console.log(`Copied plan template to ${paths.IMPL_PLAN}`);
  } else {
    console.log(`Warning: Plan template not found at ${template}`);
    // Create a basic plan file if template doesn't exist
    writeFileSync(paths.IMPL_PLAN, "");
  }

  // Output results
  if (options.json) {
    const output: SetupPlanOutput = {
      FEATURE_SPEC: paths.FEATURE_SPEC,
      IMPL_PLAN: paths.IMPL_PLAN,
      SPECS_DIR: paths.FEATURE_DIR,
      BRANCH: paths.CURRENT_BRANCH,
      HAS_GIT: paths.HAS_GIT.toString(),
    };
    console.log(JSON.stringify(output));
  } else {
    console.log(`FEATURE_SPEC: ${paths.FEATURE_SPEC}`);
    console.log(`IMPL_PLAN: ${paths.IMPL_PLAN}`);
    console.log(`SPECS_DIR: ${paths.FEATURE_DIR}`);
    console.log(`BRANCH: ${paths.CURRENT_BRANCH}`);
    console.log(`HAS_GIT: ${paths.HAS_GIT}`);
  }

  return 0;
}

// Entry point
const exitCode = await main(process.argv.slice(2));
process.exit(exitCode);
