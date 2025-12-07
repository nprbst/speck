/**
 * Echo command: speck-echo
 * Simple command that echoes back its arguments
 * Replaces test-hello for testing hook flow
 */

import type { CommandHandler, ArgumentParser } from "@speck/common/types";
import { ErrorMessages, errorToResult } from "@speck/common/errors";
import { successResult } from "@speck/common/output";

/**
 * Parse echo command arguments
 * Extracts message from command string
 *
 * @param commandString - Full command string (e.g., "speck-echo hello world")
 * @returns Parsed arguments with message field
 */
export const parseEchoArgs: ArgumentParser<{ message: string }> = (commandString: string) => {
  const parts = commandString.trim().split(/\s+/);

  // Remove "speck-echo" or "echo" prefix if present
  if (parts[0] === 'speck-echo' || parts[0] === 'echo') {
    parts.shift();
  }

  // Join remaining parts as the message
  const message = parts.join(" ");

  return { message };
};

/**
 * echo command handler
 * Returns the provided message as-is
 *
 * @param args - Parsed args with message field
 * @param context - Execution context (mode, working directory, etc.)
 * @returns CommandResult with echoed message
 */
// eslint-disable-next-line @typescript-eslint/require-await
export const echoHandler: CommandHandler<{ message: string }> = async (args) => {
  try {
    // Validate arguments
    if (!args.message) {
      throw ErrorMessages.MISSING_REQUIRED_ARG("message");
    }

    const output = args.message;

    return successResult(output, { message: args.message });
  } catch (error) {
    return errorToResult(error instanceof Error ? error : new Error(String(error)));
  }
};
