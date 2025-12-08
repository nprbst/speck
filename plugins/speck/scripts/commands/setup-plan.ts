/**
 * Setup Plan Command Handler
 *
 * Delegates to the existing setup-plan.ts script
 * Initializes planning workflow
 *
 * @module commands/setup-plan
 */

import { $ } from 'bun';
import type { CommandHandler } from '@speck/common/types';
import path from 'node:path';
import { errorToResult } from '@speck/common/errors';

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
export const setupPlanHandler: CommandHandler<SetupPlanArgs> = async (args) => {
  try {
    const scriptPath = path.resolve(import.meta.dir, '..', 'setup-plan.ts');
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
