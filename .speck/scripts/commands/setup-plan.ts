/**
 * Setup Plan Command Handler
 *
 * Delegates to the existing setup-plan.ts script
 * Initializes planning workflow
 *
 * @module commands/setup-plan
 */

import { $ } from "bun";
import type { CommandHandler, CommandContext, CommandResult } from "../lib/types";
import path from "node:path";

/**
 * Setup plan command handler arguments
 */
export interface SetupPlanArgs {
  args: string[];
}

/**
 * Parses setup-plan command arguments
 */
export function parseSetupPlanArgs(commandString: string): SetupPlanArgs {
  const parts = commandString.trim().split(/\s+/);

  if (parts[0] === 'speck-setup-plan' || parts[0] === 'setup-plan') {
    parts.shift();
  }

  return { args: parts };
}

/**
 * Setup plan command handler - delegates to existing setup-plan script
 */
export const setupPlanHandler: CommandHandler<SetupPlanArgs> = async (args, context) => {
  try {
    const scriptPath = path.resolve(import.meta.dir, "..", "setup-plan.ts");
    const result = await $`bun run ${scriptPath} ${args.args}`.nothrow();

    return {
      success: result.exitCode === 0,
      output: result.stdout.toString(),
      errorOutput: result.stderr.toString() || null,
      exitCode: result.exitCode || 0,
      metadata: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      output: "",
      errorOutput: `Failed to execute setup-plan command: ${errorMessage}`,
      exitCode: 1,
      metadata: null,
    };
  }
};
