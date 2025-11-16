#!/usr/bin/env bun
/**
 * Bun TypeScript implementation of create-new-feature.sh
 *
 * Transformation Date: 2025-11-15 (updated from v0.0.85)
 * Source: upstream/v0.0.85/.specify/scripts/bash/create-new-feature.sh
 * Strategy: Pure TypeScript (file I/O, path operations, string processing) + Bun Shell API (git commands)
 *
 * CLI Interface:
 * - Flags: --json, --short-name <name>, --number N, --help, -h
 * - Arguments: feature_description (required, positional)
 * - Exit Codes: 0 (success), 1 (user error - missing args/invalid input)
 * - JSON Output: {"BRANCH_NAME":"...", "SPEC_FILE":"...", "FEATURE_NUM":"..."}
 *
 * Transformation Rationale:
 * - Replaced bash argument parsing with TypeScript (handles --short-name and --number with values)
 * - Replaced git commands with Bun Shell API
 * - Replaced bash string manipulation with native JS string methods
 * - Replaced directory traversal with Node.js fs operations
 * - Replaced bash regex with native JS regex
 * - Replaced branch number detection logic with TypeScript
 *
 * Changes from v0.0.84 to v0.0.85:
 * - Upstream added CDPATH="" before cd commands for security
 * - TypeScript implementation already immune: uses import.meta.dir
 * - No code changes needed; documented for transparency
 */

import { $ } from "bun";
import { existsSync, readdirSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * CLI options
 */
interface CliOptions {
  json: boolean;
  shortName?: string;
  number?: number;
  help: boolean;
}

/**
 * JSON output
 */
interface CreateFeatureOutput {
  BRANCH_NAME: string;
  SPEC_FILE: string;
  FEATURE_NUM: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): { options: CliOptions; featureDescription: string } {
  const options: CliOptions = {
    json: false,
    help: false,
  };

  const positionalArgs: string[] = [];
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case "--json":
        options.json = true;
        i++;
        break;
      case "--short-name":
        if (i + 1 >= args.length) {
          console.error("Error: --short-name requires a value");
          process.exit(1);
        }
        i++;
        const shortNameValue = args[i];
        if (shortNameValue.startsWith("--")) {
          console.error("Error: --short-name requires a value");
          process.exit(1);
        }
        options.shortName = shortNameValue;
        i++;
        break;
      case "--number":
        if (i + 1 >= args.length) {
          console.error("Error: --number requires a value");
          process.exit(1);
        }
        i++;
        const numberValue = args[i];
        if (numberValue.startsWith("--")) {
          console.error("Error: --number requires a value");
          process.exit(1);
        }
        options.number = parseInt(numberValue, 10);
        if (isNaN(options.number)) {
          console.error("Error: --number requires a numeric value");
          process.exit(1);
        }
        i++;
        break;
      case "--help":
      case "-h":
        options.help = true;
        i++;
        break;
      default:
        positionalArgs.push(arg);
        i++;
        break;
    }
  }

  const featureDescription = positionalArgs.join(" ");
  return { options, featureDescription };
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`Usage: create-new-feature.ts [--json] [--short-name <name>] [--number N] <feature_description>

Options:
  --json              Output in JSON format
  --short-name <name> Provide a custom short name (2-4 words) for the branch
  --number N          Specify branch number manually (overrides auto-detection)
  --help, -h          Show this help message

Examples:
  create-new-feature.ts 'Add user authentication system' --short-name 'user-auth'
  create-new-feature.ts 'Implement OAuth2 integration for API' --number 5`);
}

/**
 * Find repository root by searching for markers
 */
function findRepoRoot(startDir: string): string | null {
  let dir = startDir;
  while (dir !== "/") {
    if (existsSync(path.join(dir, ".git")) || existsSync(path.join(dir, ".specify"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * Get highest number from specs directory
 */
function getHighestFromSpecs(specsDir: string): number {
  let highest = 0;

  if (existsSync(specsDir)) {
    const dirs = readdirSync(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      const match = dir.name.match(/^(\d+)/);
      if (match) {
        const number = parseInt(match[1], 10);
        if (number > highest) {
          highest = number;
        }
      }
    }
  }

  return highest;
}

/**
 * Get highest number from git branches
 */
async function getHighestFromBranches(): Promise<number> {
  let highest = 0;

  try {
    const result = await $`git branch -a`.quiet();
    const branches = result.text().split("\n");

    for (const branch of branches) {
      // Clean branch name: remove leading markers and remote prefixes
      const cleanBranch = branch.replace(/^[* ]*/, "").replace(/^remotes\/[^/]*\//, "");

      // Extract feature number if branch matches pattern ###-*
      const match = cleanBranch.match(/^(\d{3})-/);
      if (match) {
        const number = parseInt(match[1], 10);
        if (number > highest) {
          highest = number;
        }
      }
    }
  } catch {
    // Git command failed, return 0
  }

  return highest;
}

/**
 * Check existing branches and return next available number
 */
async function checkExistingBranches(shortName: string, specsDir: string): Promise<number> {
  // Fetch all remotes to get latest branch info (suppress errors if no remotes)
  try {
    await $`git fetch --all --prune`.quiet();
  } catch {
    // Ignore fetch errors
  }

  let maxNum = 0;

  // Check remote branches
  try {
    const remoteResult = await $`git ls-remote --heads origin`.quiet();
    const remoteOutput = remoteResult.text();
    const remoteMatches = remoteOutput.match(new RegExp(`refs/heads/(\\d+)-${shortName}$`, "gm"));
    if (remoteMatches) {
      for (const match of remoteMatches) {
        const numMatch = match.match(/(\d+)-/);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
  } catch {
    // Ignore remote check errors
  }

  // Check local branches
  try {
    const localResult = await $`git branch`.quiet();
    const localOutput = localResult.text();
    const lines = localOutput.split("\n");
    for (const line of lines) {
      const match = line.match(new RegExp(`^[* ]*(\\d+)-${shortName}$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  } catch {
    // Ignore local check errors
  }

  // Check specs directory
  if (existsSync(specsDir)) {
    const dirs = readdirSync(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const match = dir.name.match(new RegExp(`^(\\d+)-${shortName}$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
  }

  return maxNum + 1;
}

/**
 * Clean and format a branch name
 */
function cleanBranchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");
}

/**
 * Generate branch name with stop word filtering and length filtering
 */
function generateBranchName(description: string): string {
  // Common stop words to filter out
  const stopWords =
    /^(i|a|an|the|to|for|of|in|on|at|by|with|from|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|should|could|can|may|might|must|shall|this|that|these|those|my|your|our|their|want|need|add|get|set)$/i;

  // Convert to lowercase and split into words
  const cleanName = description.toLowerCase().replace(/[^a-z0-9]/g, " ");

  // Filter words: remove stop words and words shorter than 3 chars (unless they're uppercase acronyms in original)
  const meaningfulWords: string[] = [];
  const words = cleanName.split(/\s+/).filter((w) => w);

  for (const word of words) {
    if (!word) continue;

    // Keep words that are NOT stop words AND (length >= 3 OR are potential acronyms)
    if (!stopWords.test(word)) {
      if (word.length >= 3) {
        meaningfulWords.push(word);
      } else {
        // Keep short words if they appear as uppercase in original (likely acronyms)
        const upperWord = word.toUpperCase();
        if (description.includes(upperWord)) {
          meaningfulWords.push(word);
        }
      }
    }
  }

  // If we have meaningful words, use first 3-4 of them
  if (meaningfulWords.length > 0) {
    const maxWords = meaningfulWords.length === 4 ? 4 : 3;
    return meaningfulWords.slice(0, maxWords).join("-");
  } else {
    // Fallback to original logic if no meaningful words found
    const cleaned = cleanBranchName(description);
    return cleaned.split("-").filter((w) => w).slice(0, 3).join("-");
  }
}

/**
 * Main function
 */
async function main(args: string[]): Promise<number> {
  const { options, featureDescription } = parseArgs(args);

  if (options.help) {
    printHelp();
    return 0;
  }

  if (!featureDescription) {
    console.error("Usage: create-new-feature.ts [--json] [--short-name <name>] [--number N] <feature_description>");
    return 1;
  }

  // Resolve repository root
  const scriptDir = import.meta.dir;
  let repoRoot: string;
  let hasGit: boolean;

  try {
    const result = await $`git rev-parse --show-toplevel`.quiet();
    repoRoot = result.text().trim();
    hasGit = true;
  } catch {
    const foundRoot = findRepoRoot(scriptDir);
    if (!foundRoot) {
      console.error("Error: Could not determine repository root. Please run this script from within the repository.");
      return 1;
    }
    repoRoot = foundRoot;
    hasGit = false;
  }

  const specsDir = path.join(repoRoot, "specs");
  mkdirSync(specsDir, { recursive: true });

  // Generate branch name
  let branchSuffix: string;
  if (options.shortName) {
    branchSuffix = cleanBranchName(options.shortName);
  } else {
    branchSuffix = generateBranchName(featureDescription);
  }

  // Determine branch number
  let branchNumber: number;
  if (options.number !== undefined) {
    branchNumber = options.number;
  } else {
    if (hasGit) {
      branchNumber = await checkExistingBranches(branchSuffix, specsDir);
    } else {
      const highest = getHighestFromSpecs(specsDir);
      branchNumber = highest + 1;
    }
  }

  const featureNum = branchNumber.toString().padStart(3, "0");
  let branchName = `${featureNum}-${branchSuffix}`;

  // GitHub enforces a 244-byte limit on branch names
  const maxBranchLength = 244;
  if (branchName.length > maxBranchLength) {
    const maxSuffixLength = maxBranchLength - 4; // Account for: feature number (3) + hyphen (1)
    const truncatedSuffix = branchSuffix.substring(0, maxSuffixLength).replace(/-$/, "");
    const originalBranchName = branchName;
    branchName = `${featureNum}-${truncatedSuffix}`;

    console.error(`[specify] Warning: Branch name exceeded GitHub's 244-byte limit`);
    console.error(`[specify] Original: ${originalBranchName} (${originalBranchName.length} bytes)`);
    console.error(`[specify] Truncated to: ${branchName} (${branchName.length} bytes)`);
  }

  // Create branch if git available
  if (hasGit) {
    try {
      await $`git checkout -b ${branchName}`;
    } catch (error) {
      console.error(`Error creating branch: ${error}`);
      return 1;
    }
  } else {
    console.error(`[specify] Warning: Git repository not detected; skipped branch creation for ${branchName}`);
  }

  // Create feature directory
  const featureDir = path.join(specsDir, branchName);
  mkdirSync(featureDir, { recursive: true });

  // Copy template if exists, otherwise create empty spec file
  const template = path.join(repoRoot, ".specify", "templates", "spec-template.md");
  const specFile = path.join(featureDir, "spec.md");

  if (existsSync(template)) {
    copyFileSync(template, specFile);
  } else {
    writeFileSync(specFile, "");
  }

  // Set the SPECIFY_FEATURE environment variable for the current session
  process.env.SPECIFY_FEATURE = branchName;

  // Output results
  if (options.json) {
    const output: CreateFeatureOutput = {
      BRANCH_NAME: branchName,
      SPEC_FILE: specFile,
      FEATURE_NUM: featureNum,
    };
    console.log(JSON.stringify(output));
  } else {
    console.log(`BRANCH_NAME: ${branchName}`);
    console.log(`SPEC_FILE: ${specFile}`);
    console.log(`FEATURE_NUM: ${featureNum}`);
    console.log(`SPECIFY_FEATURE environment variable set to: ${branchName}`);
  }

  return 0;
}

// Entry point
const exitCode = await main(process.argv.slice(2));
process.exit(exitCode);
