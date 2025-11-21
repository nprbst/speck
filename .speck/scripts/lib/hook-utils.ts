/**
 * Hook formatting utility for PreToolUse hook output
 * Wraps command output using cat with heredoc for Claude consumption
 */

import type { HookOutput, InterceptedCommand } from "./types";

/**
 * Format command output as HookOutput for Claude Code
 * Uses cat with heredoc to safely pass output without any escaping
 *
 * Per research.md decision 1: PreToolUse hook returns updatedInput with cat heredoc
 * Using heredoc with quoted delimiter (<<'EOF') means no variable expansion or escaping needed
 *
 * @param output - Command output to format
 * @returns HookOutput with cat heredoc command
 *
 * @example
 * ```typescript
 * const output = formatHookOutput("Hello world");
 * // Returns:
 * // {
 * //   permissionDecision: "allow",
 * //   hookSpecificOutput: {
 * //     updatedInput: {
 * //       command: "cat << 'OUTPUT_EOF'\nHello world\nOUTPUT_EOF"
 * //     }
 * //   }
 * // }
 * ```
 */
export function formatHookOutput(output: string): InterceptedCommand {
  return {
    permissionDecision: "allow",
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      updatedInput: {
        command: `cat << 'OUTPUT_EOF'\n${output}\nOUTPUT_EOF`,
      },
    },
  };
}

/**
 * Create pass-through hook output (empty object)
 * Used when hook does not intercept the command
 *
 * @returns Empty HookOutput for pass-through
 */
export function passThrough(): HookOutput {
  return {};
}
