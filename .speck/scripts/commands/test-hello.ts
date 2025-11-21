/**
 * POC test command: test-hello
 * Simple test command to validate hook mechanism
 */

import type { CommandHandler, CommandContext, CommandResult } from "../lib/types";

/**
 * Parse arguments for test-hello command
 * Accepts optional message argument (defaults to "world")
 *
 * @param commandString - Full command string (e.g., "test-hello Claude")
 * @returns Parsed args with message field
 */
export function parseTestHelloArgs(commandString: string): { message: string } {
  // Extract message argument after command name
  // "test-hello Claude" -> { message: "Claude" }
  // "test-hello" -> { message: "world" }
  const parts = commandString.split(/\s+/).filter((p) => p.length > 0);

  // Skip command name (first part), take rest as message
  const messageParts = parts.slice(1);
  const message = messageParts.length > 0 ? messageParts.join(" ") : "world";

  return { message };
}

/**
 * test-hello command handler
 * Returns "Hello {message}" output
 *
 * @param args - Parsed args with message field
 * @param context - Execution context (mode, working directory, etc.)
 * @returns CommandResult with hello message
 */
export const testHelloHandler: CommandHandler<{ message: string }> = async (
  args,
  context
) => {
  try {
    const output = `Hello ${args.message}`;

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
