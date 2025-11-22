/**
 * Branch Command Handler
 *
 * Delegates to the existing branch-command.ts script
 * Supports subcommands: create, list, status, update, delete, import
 *
 * @module commands/branch
 */

import { $ } from "bun";
import type { CommandHandler } from "../lib/types";
import path from "node:path";
import { errorToResult } from "../lib/error-handler";

/**
 * Branch command handler arguments
 */
export interface BranchArgs {
  subcommand?: string;
  args: string[];
}

/**
 * Parses branch command arguments
 *
 * Examples:
 *   "speck-branch list" -> { subcommand: "list", args: [] }
 *   "speck-branch create my-feature --base main" -> { subcommand: "create", args: ["my-feature", "--base", "main"] }
 */
export function parseBranchArgs(commandString: string): BranchArgs {
  const parts = commandString.trim().split(/\s+/);

  // Remove "speck-branch" or "branch" prefix if present
  if (parts[0] === 'speck-branch' || parts[0] === 'branch') {
    parts.shift();
  }

  const subcommand = parts.length > 0 ? parts[0] : undefined;
  const args = parts.slice(1);

  return { subcommand, args };
}

/**
 * Branch command handler - delegates to existing branch-command.ts
 */
export const branchHandler: CommandHandler<BranchArgs> = async (args) => {
  try {
    // Use relative path from current script location
    // This works in both development and installed plugin locations
    const scriptPath = path.resolve(import.meta.dir, "..", "branch-command.ts");

    // Build argv for the branch command
    const cmdArgs = args.subcommand ? [args.subcommand, ...args.args] : args.args;

    // Execute the branch command script
    const result = await $`bun run ${scriptPath} ${cmdArgs}`.nothrow();

    return {
      success: result.exitCode === 0,
      output: result.stdout.toString(),
      errorOutput: result.stderr.toString() || null,
      exitCode: result.exitCode || 0,
      metadata: null,
    };
  } catch (error) {
    return errorToResult(error instanceof Error ? error : new Error(String(error)));
  }
};
