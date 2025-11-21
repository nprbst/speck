/**
 * Mode detection utility for dual-mode CLI operation
 * Determines whether the CLI is running in standalone mode or hook-invoked mode
 */

import type { ExecutionMode, HookInput } from "./types";

/**
 * Detect execution mode based on flags and TTY status
 * Per research.md decision 2: Explicit --hook flag with TTY fallback
 *
 * @returns "hook" if invoked by Claude Code hook, "cli" if standalone
 */
export function detectMode(): ExecutionMode {
  // Check for explicit --hook flag first (highest priority)
  if (process.argv.includes("--hook")) {
    return "hook";
  }

  // Fallback to TTY detection
  // If stdin is not a TTY, likely being piped from hook
  return process.stdin.isTTY ? "cli" : "hook";
}

/**
 * Read and parse hook input from stdin
 * Expects JSON format matching HookInput interface
 *
 * @returns Parsed hook input containing tool_name and command
 * @throws Error if JSON is malformed or stdin read fails
 */
export async function readHookInput(): Promise<HookInput> {
  try {
    const input = await Bun.stdin.text();
    const parsed = JSON.parse(input);

    // Validate basic structure
    if (!parsed.tool_input || typeof parsed.tool_input.command !== "string") {
      throw new Error(
        "Invalid hook input: missing tool_input.command field"
      );
    }

    return parsed as HookInput;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse hook input JSON: ${error.message}`);
    }
    throw error;
  }
}
