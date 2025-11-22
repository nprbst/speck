/**
 * Check Prerequisites Command Handler
 *
 * Delegates to the existing check-prerequisites.ts script
 * Validates feature directory structure and prerequisites
 *
 * @module commands/check-prerequisites
 */

import { $ } from "bun";
import type { CommandHandler } from "../lib/types";
import path from "node:path";
import { errorToResult } from "../lib/error-handler";

/**
 * Check prerequisites command handler arguments
 */
export interface CheckPrerequisitesArgs {
  args: string[];
}

/**
 * Parses check-prerequisites command arguments
 */
export function parseCheckPrerequisitesArgs(commandString: string): CheckPrerequisitesArgs {
  const parts = commandString.trim().split(/\s+/);

  // Remove "speck-check-prerequisites" or "check-prerequisites" prefix if present
  if (parts[0] === 'speck-check-prerequisites' || parts[0] === 'check-prerequisites') {
    parts.shift();
  }

  return { args: parts };
}

/**
 * Check prerequisites command handler - delegates to existing check-prerequisites script
 */
export const checkPrerequisitesHandler: CommandHandler<CheckPrerequisitesArgs> = async (args, _context) => {
  try {
    // Use relative path from current script location
    const scriptPath = path.resolve(import.meta.dir, "..", "check-prerequisites.ts");

    // Execute the check-prerequisites script
    const result = await $`bun run ${scriptPath} ${args.args}`.nothrow();

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
