/**
 * Create New Feature Command Handler
 *
 * Delegates to the existing create-new-feature.ts script
 * Creates new feature specification directories
 *
 * @module commands/create-new-feature
 */

import { $ } from "bun";
import type { CommandHandler } from "../lib/types";
import path from "node:path";
import { errorToResult } from "../lib/error-handler";

/**
 * Create new feature command handler arguments
 */
export interface CreateNewFeatureArgs {
  args: string[];
}

/**
 * Parses create-new-feature command arguments
 */
export function parseCreateNewFeatureArgs(commandString: string): CreateNewFeatureArgs {
  const parts = commandString.trim().split(/\s+/);

  // Remove "speck-create-new-feature" or "create-new-feature" prefix if present
  if (parts[0] === 'speck-create-new-feature' || parts[0] === 'create-new-feature') {
    parts.shift();
  }

  return { args: parts };
}

/**
 * Create new feature command handler - delegates to existing create-new-feature script
 */
export const createNewFeatureHandler: CommandHandler<CreateNewFeatureArgs> = async (args) => {
  try {
    // Use relative path from current script location
    const scriptPath = path.resolve(import.meta.dir, "..", "create-new-feature.ts");

    // Execute the create-new-feature script
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
