#!/usr/bin/env bun

/**
 * Next Feature Script
 *
 * Computes the next available feature number and detects multi-repo mode.
 * This consolidates git branch checking logic that was previously done
 * via bash commands in the speck.specify Claude Code command.
 *
 * CLI Interface:
 * - Flags: --json, --short-name <name>, --help
 * - Exit Codes: 0 (success), 1 (user error)
 * - JSON Output: { NEXT_NUMBER, BRANCH_NAME, MODE, SPECS_DIR }
 */

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { $ } from "bun";
import { ExitCode } from "./contracts/cli-interface";
import { detectSpeckRoot } from "./common/paths";
import {
  formatJsonOutput,
  detectOutputMode,
  type OutputMode,
} from "./lib/output-formatter";

/**
 * CLI options for next-feature
 */
interface NextFeatureOptions {
  json: boolean;
  shortName?: string;
  help: boolean;
}

/**
 * JSON output for next-feature
 */
interface NextFeatureOutput {
  NEXT_NUMBER: number;
  BRANCH_NAME: string;
  MODE: "single-repo" | "multi-repo";
  SPECS_DIR: string;
}

/**
 * Parse result type for command line arguments
 */
type ParseResult =
  | { success: true; options: NextFeatureOptions }
  | { success: false; error: string };

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): ParseResult {
  const options: NextFeatureOptions = {
    json: false,
    shortName: undefined,
    help: false,
  };

  let i = 0;

  while (i < args.length) {
    const arg = args[i]!;

    if (arg === "--json") {
      options.json = true;
      i++;
    } else if (arg === "--short-name") {
      if (i + 1 >= args.length || args[i + 1]?.startsWith("--")) {
        return { success: false, error: "--short-name requires a value" };
      }
      options.shortName = args[i + 1]!;
      i += 2;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
      i++;
    } else {
      return { success: false, error: `Unknown argument: ${arg}` };
    }
  }

  return { success: true, options };
}

/**
 * Show help message
 */
function showHelp(): void {
  const scriptName = path.basename(process.argv[1]!);
  console.log(`Usage: ${scriptName} [--json] [--short-name <name>]

Computes the next available feature number and detects multi-repo mode.
This command should be called before create-new-feature to determine
the next feature number without verbose git output.

Options:
  --json              Output in JSON format (structured JSON envelope)
  --short-name <name> Short name to check for existing branches (optional)
  --help, -h          Show this help message

Output (JSON mode):
  NEXT_NUMBER   Next available feature number
  BRANCH_NAME   Suggested branch name (NNN-short-name format)
  MODE          "single-repo" or "multi-repo"
  SPECS_DIR     Path to the specs directory

Examples:
  ${scriptName} --json --short-name "user-auth"
  ${scriptName} --json`);
}

/**
 * Output error in the appropriate format
 */
function outputError(
  code: string,
  message: string,
  outputMode: OutputMode,
  startTime: number,
  recovery?: string[]
): void {
  if (outputMode === "json") {
    const output = formatJsonOutput({
      success: false,
      error: { code, message, recovery },
      command: "next-feature",
      startTime,
    });
    console.log(JSON.stringify(output));
  } else {
    console.error(`Error: ${message}`);
  }
}

/**
 * Get highest number from specs directory (any feature)
 */
function getHighestFromSpecs(specsDir: string): number {
  let highest = 0;

  if (existsSync(specsDir)) {
    const dirs = readdirSync(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const match = dir.name.match(/^(\d+)/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > highest) {
            highest = num;
          }
        }
      }
    }
  }

  return highest;
}

/**
 * Get highest feature number from all remote branches
 */
async function getHighestFromRemotes(): Promise<number> {
  let highest = 0;

  try {
    const result = await $`git ls-remote --heads origin`.quiet();
    const lines = result.text().split("\n");
    for (const line of lines) {
      // Match any branch starting with digits followed by dash
      const match = line.match(/refs\/heads\/(\d+)-/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > highest) {
          highest = num;
        }
      }
    }
  } catch {
    // No remote or ls-remote failed - ignore
  }

  return highest;
}

/**
 * Get highest feature number from all local branches
 */
async function getHighestFromLocalBranches(): Promise<number> {
  let highest = 0;

  try {
    const result = await $`git branch`.quiet();
    const branches = result.text().split("\n");
    for (const branch of branches) {
      // Match any branch starting with digits followed by dash
      const match = branch.match(/^[* ]*(\d+)-/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > highest) {
          highest = num;
        }
      }
    }
  } catch {
    // Git not available - ignore
  }

  return highest;
}

/**
 * Check if a specific short-name already exists and return its highest number
 */
async function checkShortNameExists(shortName: string, specsDir: string): Promise<number> {
  let maxNum = 0;

  // Check remote branches for this short-name
  try {
    const result = await $`git ls-remote --heads origin`.quiet();
    const lines = result.text().split("\n");
    for (const line of lines) {
      const match = line.match(new RegExp(`refs/heads/(\\d+)-${shortName}$`));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  } catch {
    // No remote or ls-remote failed
  }

  // Check local branches for this short-name
  try {
    const result = await $`git branch`.quiet();
    const branches = result.text().split("\n");
    for (const branch of branches) {
      const match = branch.match(new RegExp(`^[* ]*?(\\d+)-${shortName}$`));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  } catch {
    // Git not available
  }

  // Check specs directory for this short-name
  if (existsSync(specsDir)) {
    const dirs = readdirSync(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const match = dir.name.match(new RegExp(`^(\\d+)-${shortName}$`));
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
  }

  return maxNum;
}

/**
 * Clean short name for use in branch names
 */
function cleanShortName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");
}

/**
 * Main function
 */
export async function main(args: string[]): Promise<number> {
  const startTime = Date.now();
  const parseResult = parseArgs(args);

  // Handle parse errors
  if (!parseResult.success) {
    const hasJsonFlag = args.includes("--json");
    const outputMode = detectOutputMode({ json: hasJsonFlag, hook: false });
    outputError(
      "INVALID_ARGS",
      parseResult.error,
      outputMode,
      startTime
    );
    return ExitCode.USER_ERROR;
  }

  const options = parseResult.options;
  const outputMode = detectOutputMode({ json: options.json, hook: false });

  if (options.help) {
    showHelp();
    return ExitCode.SUCCESS;
  }

  // Detect multi-repo mode and get specs directory
  const config = await detectSpeckRoot();
  const specsDir = config.specsDir;
  const mode = config.mode;

  // Fetch all remotes to get latest branch info (quiet, single call)
  try {
    await $`git fetch --all --prune`.quiet();
  } catch {
    // Ignore fetch errors - may not have remote
  }

  // Find highest number across ALL sources
  const [highestRemote, highestLocal, highestSpecs] = await Promise.all([
    getHighestFromRemotes(),
    getHighestFromLocalBranches(),
    Promise.resolve(getHighestFromSpecs(specsDir)),
  ]);

  const highestOverall = Math.max(highestRemote, highestLocal, highestSpecs);

  // Determine next number
  let nextNumber: number;

  if (options.shortName) {
    // Clean the short name
    const cleanedShortName = cleanShortName(options.shortName);

    // Check if this specific short-name exists
    const existingShortNameNum = await checkShortNameExists(cleanedShortName, specsDir);

    if (existingShortNameNum > 0) {
      // Short-name exists: use its highest number + 1
      nextNumber = existingShortNameNum + 1;
    } else {
      // Short-name doesn't exist: use overall highest + 1
      nextNumber = highestOverall + 1;
    }
  } else {
    // No short-name provided: just return overall highest + 1
    nextNumber = highestOverall + 1;
  }

  // Ensure minimum of 1
  if (nextNumber < 1) {
    nextNumber = 1;
  }

  // Format feature number with padding
  const featureNum = nextNumber.toString().padStart(3, "0");
  const branchName = options.shortName
    ? `${featureNum}-${cleanShortName(options.shortName)}`
    : featureNum;

  // Build output
  const outputData: NextFeatureOutput = {
    NEXT_NUMBER: nextNumber,
    BRANCH_NAME: branchName,
    MODE: mode,
    SPECS_DIR: specsDir,
  };

  // Output results based on mode
  if (outputMode === "json") {
    const output = formatJsonOutput({
      success: true,
      data: outputData,
      command: "next-feature",
      startTime,
    });
    console.log(JSON.stringify(output));
  } else {
    console.log(`NEXT_NUMBER: ${nextNumber}`);
    console.log(`BRANCH_NAME: ${branchName}`);
    console.log(`MODE: ${mode}`);
    console.log(`SPECS_DIR: ${specsDir}`);
  }

  return ExitCode.SUCCESS;
}

/**
 * Entry point
 */
if (import.meta.main) {
  const exitCode = await main(process.argv.slice(2));
  process.exit(exitCode);
}
