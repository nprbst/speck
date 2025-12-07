/**
 * @speck/common/types - Shared type definitions for Speck plugins
 *
 * Common types used across CLI commands and hook integrations.
 */

// Re-export types from logger and errors for convenience
export type { ExecutionMode } from "./logger";
export type { CommandResult } from "./errors";

// =============================================================================
// Hook Types
// =============================================================================

/**
 * JSON structure received via stdin when Claude Code invokes PreToolUse hook
 */
export interface HookInput {
  tool_name: "Bash";
  tool_input: {
    command: string;
    description?: string;
    timeout?: number;
  };
}

/**
 * JSON structure written to stdout by PreToolUse hook to control command execution
 */
export type HookOutput = InterceptedCommand | PassThrough;

/**
 * Hook intercepts and modifies the command
 */
export interface InterceptedCommand {
  hookSpecificOutput: {
    hookEventName: "PreToolUse";
    permissionDecision: "allow";
    updatedInput: {
      command: string;
    };
  };
}

/**
 * Hook does not intercept, lets Claude execute original command
 */
export type PassThrough = Record<string, never>;

/**
 * Hook input payload for UserPromptSubmit and other hooks
 */
export interface HookInputPayload {
  hookType?:
    | "UserPromptSubmit"
    | "PreToolUse"
    | "PostToolUse"
    | "SessionStart"
    | "Stop";
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
export interface HookOutputPayload {
  context?: string;
  allow?: boolean;
  message?: string;
  hookSpecificOutput?: {
    additionalContext?: string;
  };
}

// =============================================================================
// Command Types
// =============================================================================

/**
 * Execution context provided to command handlers
 */
export interface CommandContext {
  mode: "cli" | "hook";
  rawCommand: string;
  workingDirectory: string;
  isInteractive: boolean;
}

/**
 * Function signature for custom command argument parsing
 */
export type ArgumentParser<T = unknown> = (commandString: string) => T;

/**
 * Function signature for command implementation logic
 */
export type CommandHandler<TArgs = unknown> = (
  args: TArgs,
  context: CommandContext
) => Promise<import("./errors").CommandResult>;

/**
 * Main function signature for scripts (returns exit code)
 */
export type MainFunction = (args: string[]) => Promise<number>;

/**
 * Lazy loader for main function (for code splitting)
 */
export type LazyMainLoader = () => Promise<MainFunction>;

/**
 * Registration metadata for a command handler
 */
export interface CommandRegistryEntry<TArgs = unknown> {
  handler?: CommandHandler<TArgs>;
  main?: MainFunction;
  lazyMain?: LazyMainLoader;
  parseArgs?: ArgumentParser<TArgs>;
  description: string;
  version: string;
}

/**
 * Centralized registry mapping command names to handlers
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CommandRegistry = Record<string, CommandRegistryEntry<any>>;

// =============================================================================
// Common Utility Types
// =============================================================================

/**
 * Result type for operations that can succeed or fail
 */
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Options with a JSON output flag
 */
export interface JsonOptions {
  json?: boolean;
}

/**
 * Options with a hook mode flag
 */
export interface HookOptions {
  hook?: boolean;
}

/**
 * Common CLI options
 */
export interface CommonCliOptions extends JsonOptions, HookOptions {
  verbose?: boolean;
  quiet?: boolean;
}
