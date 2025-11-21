/**
 * Echo command: speck-echo
 * Simple command that echoes back its arguments
 * Replaces test-hello for testing hook flow
 */

import type { CommandHandler } from "../lib/types";

/**
 * echo command handler
 * Returns the provided message as-is
 *
 * @param args - Parsed args with message field
 * @param context - Execution context (mode, working directory, etc.)
 * @returns CommandResult with echoed message
 */
export const echoHandler: CommandHandler<{ message: string }> = async (args) => {
  try {
    const output = args.message || "";

    return {
      success: true,
      output,
      errorOutput: null,
      exitCode: 0,
      metadata: { message: args.message },
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      errorOutput: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      metadata: null,
    };
  }
};
