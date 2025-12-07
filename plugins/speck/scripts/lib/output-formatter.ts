/**
 * Output formatting utilities for dual-mode CLI operation
 *
 * Provides consistent output formatting across CLI and hook modes.
 * Implements the contracts defined in:
 *   specs/015-scope-simplification/contracts/cli-interface.ts
 *
 * Feature: 015-scope-simplification
 * Tasks: T033, T033a, T033b, T034, T035
 *
 * NOTE: This file contains speck-specific output formatting.
 * Common utilities are imported from @speck/common/output.
 */

import type { CommandResult } from "@speck/common/types";

// Re-export common output utilities for backward compatibility
export {
  formatJsonOutput,
  formatCliOutput,
  formatOutput,
  successResult,
  failureResult,
  formatJson,
  formatList,
  formatTable,
  colorize,
  formatProgress,
  detectInputMode,
  detectOutputMode,
  type OutputMode,
  type InputMode,
  type JsonOutput,
  type FormatJsonInput,
} from "@speck/common/output";

// =============================================================================
// Speck-specific Hook Types
// =============================================================================

/**
 * Hook input payload structure (read from stdin when --hook flag present)
 */
export interface HookInputPayload {
  hookType?: "UserPromptSubmit" | "PreToolUse" | "PostToolUse" | "SessionStart";
  toolName?: string;
  toolInput?: Record<string, unknown>;
  userPrompt?: string;
  sessionContext?: {
    workingDirectory: string;
    conversationId?: string;
    isInteractive?: boolean;
  };
}

/**
 * Hook output format for Claude Code integration
 */
export interface HookOutput {
  context?: string;
  allow?: boolean;
  message?: string;
  hookSpecificOutput?: {
    additionalContext?: string;
  };
}

/**
 * Format input for formatHookOutput function
 */
export interface FormatHookInput {
  hookType?: "UserPromptSubmit" | "PreToolUse" | "PostToolUse" | "SessionStart";
  context?: string;
  additionalContext?: string;
  allow?: boolean;
  message?: string;
  passthrough?: boolean;
}

// =============================================================================
// Speck-specific Hook Functions
// =============================================================================

/**
 * Read and parse hook input from stdin
 *
 * When --hook flag is present, CLI reads JSON payload from stdin containing
 * hook context (tool name, tool input, user prompt, session context).
 *
 * @param stdinContent - Raw stdin content (or string for testing)
 * @returns Parsed HookInputPayload or undefined if invalid/empty
 */
export async function readHookInput(stdinContent?: string): Promise<HookInputPayload | undefined> {
  try {
    let content = stdinContent;

    // If no content provided, read from stdin (for production use)
    if (content === undefined) {
      // Check if stdin has data available (non-blocking)
      const stdin = Bun.stdin.stream();
      const reader = stdin.getReader();

      // Try to read with a short timeout
      const readPromise = reader.read();
      const timeoutPromise = new Promise<{ done: true; value: undefined }>((resolve) =>
        setTimeout(() => resolve({ done: true, value: undefined }), 100)
      );

      const result = await Promise.race([readPromise, timeoutPromise]);
      reader.releaseLock();

      if (result.done || !result.value) {
        return undefined;
      }

      content = new TextDecoder().decode(result.value);
    }

    // Empty content
    if (!content || content.trim() === "") {
      return undefined;
    }

    // Parse JSON
    const parsed = JSON.parse(content) as HookInputPayload;
    return parsed;
  } catch {
    // Invalid JSON or read error
    return undefined;
  }
}

/**
 * Format command result as hook output for Claude Code
 *
 * Implements the HookOutput contract from cli-interface.ts
 *
 * @param input - Format input with hook-specific fields
 * @returns HookOutput structure
 */
export function formatHookOutput(input: FormatHookInput): HookOutput {
  // Passthrough: return empty object (no hook intervention)
  if (input.passthrough) {
    return {};
  }

  const output: HookOutput = {};

  // UserPromptSubmit: inject context into prompt
  if (input.hookType === "UserPromptSubmit" && input.context) {
    output.context = input.context;
  }

  // SessionStart: use hookSpecificOutput.additionalContext
  if (input.hookType === "SessionStart" && input.additionalContext) {
    output.hookSpecificOutput = {
      additionalContext: input.additionalContext,
    };
  }

  // PreToolUse: allow/deny with optional message
  if (input.hookType === "PreToolUse") {
    if (input.allow !== undefined) {
      output.allow = input.allow;
    }
    if (input.message) {
      output.message = input.message;
    }
  }

  // Generic message (can be used with any hook type)
  if (input.message && !output.message) {
    output.message = input.message;
  }

  return output;
}

/**
 * Format CommandResult for hook mode output (legacy)
 * Returns the result as-is for JSON serialization
 */
export function formatLegacyHookOutput(result: CommandResult): CommandResult {
  return result;
}
