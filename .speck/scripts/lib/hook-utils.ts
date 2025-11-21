/**
 * Hook formatting utility for PreToolUse hook output
 * Wraps command output using cat with heredoc for Claude consumption
 */

import type { HookOutput, InterceptedCommand, HookInput } from "./types";

/**
 * Format command output as HookOutput for Claude Code
 * Uses cat with heredoc to safely pass output without any escaping
 *
 * Per research.md decision 1: PreToolUse hook returns updatedInput with cat heredoc
 * Using heredoc with quoted delimiter (<<'EOF') means no variable expansion or escaping needed
 *
 * @param output - Command output to format
 * @param originalInput - Original tool_input to preserve metadata fields
 * @returns HookOutput with cat heredoc command
 *
 * @example
 * ```typescript
 * const output = formatHookOutput("Hello world", originalInput);
 * // Returns:
 * // {
 * //   permissionDecision: "allow",
 * //   hookSpecificOutput: {
 * //     updatedInput: {
 * //       command: "cat << 'OUTPUT_EOF'\nHello world\nOUTPUT_EOF",
 * //       description: "original description",
 * //       ... other preserved fields
 * //     }
 * //   }
 * // }
 * ```
 */
export function formatHookOutput(output: string, originalInput?: HookInput["tool_input"]): InterceptedCommand {
  return {
    permissionDecision: "allow",
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      updatedInput: {
        ...originalInput, // Preserve original fields like description, timeout, etc.
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
