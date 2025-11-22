/**
 * Link Repo Command Handler
 *
 * Delegates to the existing link-repo.ts script
 * Links repository to multi-repo speck root
 *
 * @module commands/link-repo
 */

import { $ } from "bun";
import type { CommandHandler } from "../lib/types";
import path from "node:path";
import { errorToResult } from "../lib/error-handler";

/**
 * Link repo command handler arguments
 */
export interface LinkRepoArgs {
  args: string[];
}

/**
 * Parses link-repo command arguments
 */
export function parseLinkRepoArgs(commandString: string): LinkRepoArgs {
  const parts = commandString.trim().split(/\s+/);

  if (parts[0] === 'speck-link-repo' || parts[0] === 'link-repo') {
    parts.shift();
  }

  return { args: parts };
}

/**
 * Link repo command handler - delegates to existing link-repo script
 */
export const linkRepoHandler: CommandHandler<LinkRepoArgs> = async (args) => {
  try {
    const scriptPath = path.resolve(import.meta.dir, "..", "link-repo.ts");
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
