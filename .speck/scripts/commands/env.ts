/**
 * POC env command: speck-env
 * Shows basic Speck environment information
 */

import type { CommandHandler, CommandContext, CommandResult } from "../lib/types";
import { detectSpeckRoot } from "../common/paths";

/**
 * env command handler
 * Returns basic environment info (plugin path, mode, etc.)
 *
 * @param args - No args expected for env command
 * @param context - Execution context
 * @returns CommandResult with environment info
 */
export const envHandler: CommandHandler = async (args, context) => {
  try {
    // Detect speck configuration
    const config = await detectSpeckRoot();

    // Build output
    const lines = [
      `Speck Environment`,
      `================`,
      `Speck Root: ${config.speckRoot}`,
      `Repo Root: ${config.repoRoot}`,
      `Mode: ${config.mode}`,
      `Execution Mode: ${context.mode}`,
      `Working Directory: ${context.workingDirectory}`,
      `Interactive: ${context.isInteractive}`,
    ];

    const output = lines.join("\n");

    return {
      success: true,
      output,
      errorOutput: null,
      exitCode: 0,
      metadata: {
        speckRoot: config.speckRoot,
        repoRoot: config.repoRoot,
        configMode: config.mode,
        executionMode: context.mode,
        workingDirectory: context.workingDirectory,
        isInteractive: context.isInteractive,
      },
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
