/**
 * CLI Interface Contracts for Scope Simplification
 *
 * This file defines the contracts for the Speck CLI interface,
 * including command structure, output formats, and error handling.
 *
 * @feature 015-scope-simplification
 * @date 2025-11-28
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Output mode for CLI commands
 * - "human": Human-readable terminal output (default)
 * - "json": Structured JSON for LLM parsing
 * - "hook": Hook-formatted output for Claude Code hooks
 */
export type OutputMode = "human" | "json" | "hook";

/**
 * Input mode for CLI commands
 * - "default": Standard CLI invocation (args from command line only)
 * - "hook": Hook invocation (JSON payload from stdin + command line args)
 *
 * When --hook flag is present, the CLI reads JSON from stdin containing
 * hook context (tool name, tool input, user prompt, session context).
 * This is used by check-prerequisites when invoked via Claude Code hooks.
 *
 * @see FR-009: CLI MUST accept --hook flag for hook IO mode
 */
export type InputMode = "default" | "hook";

/**
 * Hook input payload structure (read from stdin when --hook flag present)
 *
 * This payload is provided by Claude Code when invoking commands via hooks.
 * The structure varies by hook type (UserPromptSubmit, PreToolUse, etc.).
 */
export interface HookInputPayload {
  /** Hook type that triggered the invocation */
  hookType?: "UserPromptSubmit" | "PreToolUse" | "PostToolUse" | "SessionStart";

  /** The tool name being intercepted (for PreToolUse/PostToolUse) */
  toolName?: string;

  /** The tool input parameters (for PreToolUse/PostToolUse) */
  toolInput?: Record<string, unknown>;

  /** The user prompt text (for UserPromptSubmit) */
  userPrompt?: string;

  /** Session context from Claude Code */
  sessionContext?: {
    /** Current working directory */
    workingDirectory: string;
    /** Conversation/session ID */
    conversationId?: string;
    /** Whether this is an interactive session */
    isInteractive?: boolean;
  };
}

/**
 * Exit codes for CLI commands
 */
export const ExitCode = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
  NOT_FOUND: 3,
  PERMISSION_DENIED: 4,
  ALREADY_EXISTS: 5,
  PREREQUISITE_FAILED: 6,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

// =============================================================================
// Command Definitions
// =============================================================================

/**
 * Available CLI subcommands
 *
 * @see FR-007: CLI MUST support subcommands: init, link, create-new-feature, next-feature,
 *             check-prerequisites, env, launch-ide, setup-plan, update-agent-context, help
 */
export const Commands = {
  INIT: "init",
  LINK: "link",
  CREATE_NEW_FEATURE: "create-new-feature",
  NEXT_FEATURE: "next-feature",
  CHECK_PREREQUISITES: "check-prerequisites",
  ENV: "env",
  LAUNCH_IDE: "launch-ide",
  SETUP_PLAN: "setup-plan",
  UPDATE_AGENT_CONTEXT: "update-agent-context",
  HELP: "help",
} as const;

export type Command = (typeof Commands)[keyof typeof Commands];

// =============================================================================
// Global Options
// =============================================================================

/**
 * Global options available on all commands
 *
 * @see FR-008: CLI MUST accept --json flag
 * @see FR-009: CLI MUST accept --hook flag
 * @see FR-010: CLI MUST accept --help flag
 */
export interface GlobalOptions {
  /** Output structured JSON for LLM parsing */
  json?: boolean;

  /** Output hook-formatted response for Claude Code hooks */
  hook?: boolean;

  /** Show help for command */
  help?: boolean;

  /** Enable verbose output */
  verbose?: boolean;
}

// =============================================================================
// Command-Specific Options
// =============================================================================

/**
 * Options for `speck init`
 *
 * @see FR-017 through FR-020f
 */
export interface InitOptions extends GlobalOptions {
  /** Force reinstall even if symlink exists */
  force?: boolean;

  /** Enable/disable worktree mode (default: true) */
  worktreeEnabled?: boolean;

  /** Enable/disable IDE auto-launch (default: false) */
  ideAutolaunch?: boolean;

  /** IDE editor choice: vscode, cursor, webstorm, idea, pycharm */
  ideEditor?: string;
}

/**
 * Options for `speck link`
 *
 * @see FR-007a
 */
export interface LinkOptions extends GlobalOptions {
  /** Path to speck root directory */
  path: string;
}

/**
 * Options for `speck launch-ide`
 *
 * @see FR-007b
 */
export interface LaunchIDEOptions extends GlobalOptions {
  /** Path to worktree directory */
  worktreePath: string;

  /** Path to repository root for config (default: .) */
  repoPath?: string;
}

/**
 * Options for `speck setup-plan`
 *
 * @see FR-007c
 */
export interface SetupPlanOptions extends GlobalOptions {
  // Uses global options only
}

/**
 * Options for `speck update-agent-context`
 *
 * @see FR-007d
 */
export interface UpdateAgentContextOptions extends GlobalOptions {
  // Uses global options only
}

/**
 * Options for `speck create-new-feature`
 *
 * @see FR-021 through FR-026
 */
export interface CreateNewFeatureOptions extends GlobalOptions {
  /** Feature number (auto-assigned if not provided) */
  number?: number;

  /** Short name for the feature (slugified from description if not provided) */
  shortName?: string;

  /** Skip worktree creation */
  noWorktree?: boolean;

  /** Skip IDE auto-launch */
  noIde?: boolean;

  /** Skip dependency installation */
  noDeps?: boolean;

  /** Reuse existing worktree if present */
  reuseWorktree?: boolean;
}

/**
 * Options for `speck check-prerequisites`
 */
export interface CheckPrerequisitesOptions extends GlobalOptions {
  /** Path to check (defaults to current directory) */
  path?: string;
}

/**
 * Options for `speck env`
 */
export interface EnvOptions extends GlobalOptions {
  /** Show all environment details */
  all?: boolean;
}

// =============================================================================
// Output Contracts
// =============================================================================

/**
 * Base result type for all commands
 */
export interface CommandResult<T = unknown> {
  /** Whether the command succeeded */
  success: boolean;

  /** Result data (if success) */
  data?: T;

  /** Error details (if failure) */
  error?: CommandError;

  /** Human-readable message */
  message: string;
}

/**
 * Error structure for failed commands
 *
 * @see FR-011: CLI MUST return non-zero exit codes on errors with descriptive error messages
 */
export interface CommandError {
  /** Error code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Cause of the error (if known) */
  cause?: string;

  /** Recovery steps the user can take */
  recovery?: string[];

  /** Stack trace (only in verbose mode) */
  stack?: string;
}

// =============================================================================
// Command-Specific Results
// =============================================================================

/**
 * Result for `speck init`
 */
export interface InitResult {
  /** Path to created symlink */
  symlinkPath: string;

  /** Path to CLI entry point */
  targetPath: string;

  /** Whether ~/.local/bin is in PATH */
  inPath: boolean;

  /** Instructions if not in PATH */
  pathInstructions?: string;

  /** Whether symlink already existed (idempotent case) */
  alreadyInstalled?: boolean;

  /** Whether .speck/ directory was created */
  speckDirCreated?: boolean;

  /** Path to .speck/ directory */
  speckDirPath?: string;

  /** Whether config.json was created */
  configCreated?: boolean;

  /** Number of permissions added to .claude/settings.local.json */
  permissionsConfigured?: number;

  /** Next step suggestion (e.g., run constitution command) */
  nextStep?: string;
}

/**
 * Result for `speck link`
 */
export interface LinkResult {
  /** Path to symlink created */
  symlinkPath: string;

  /** Path to speck root */
  rootPath: string;

  /** Whether link already existed */
  alreadyLinked?: boolean;
}

/**
 * Result for `speck launch-ide`
 */
export interface LaunchIDEResult {
  /** Whether IDE was launched */
  launched: boolean;

  /** IDE that was launched */
  ide?: string;

  /** Path that was opened */
  path?: string;
}

/**
 * Result for `speck create-new-feature`
 *
 * @see US1-AC3, US2-AC1
 */
export interface CreateNewFeatureResult {
  /** Feature number (NNN format) */
  featureNumber: string;

  /** Full branch name (NNN-short-name) */
  branchName: string;

  /** Path to spec directory */
  specDir: string;

  /** Path to spec.md file */
  specFile: string;

  /** Worktree info (if created) */
  worktree?: WorktreeInfo;
}

export interface WorktreeInfo {
  /** Path to worktree directory */
  path: string;

  /** Whether IDE was launched */
  ideLaunched: boolean;

  /** Whether dependencies were installed */
  depsInstalled: boolean;

  /** Path to handoff document */
  handoffPath: string;
}

/**
 * Result for `speck check-prerequisites`
 *
 * @see US2-AC1, US2-AC2
 */
export interface CheckPrerequisitesResult {
  /** Detected mode */
  mode: "single-repo" | "multi-repo";

  /** Current feature (if detected from branch or path) */
  feature?: FeatureInfo;

  /** Available docs for context loading */
  availableDocs: string[];

  /** Repository root path */
  repoRoot: string;

  /** Multi-repo context (if applicable) */
  multiRepo?: MultiRepoInfo;

  /** Validation warnings */
  warnings: string[];
}

export interface FeatureInfo {
  /** Feature directory path */
  dir: string;

  /** Feature number */
  number: string;

  /** Feature short name */
  shortName: string;

  /** Whether spec.md exists */
  hasSpec: boolean;

  /** Whether plan.md exists */
  hasPlan: boolean;

  /** Whether tasks.md exists */
  hasTasks: boolean;
}

export interface MultiRepoInfo {
  /** Path to root repo */
  rootPath: string;

  /** Current repo's child name */
  childName: string;

  /** Whether this is the root or a child */
  isRoot: boolean;
}

/**
 * Result for `speck env`
 */
export interface EnvResult {
  /** Speck version */
  version: string;

  /** Bun version */
  bunVersion: string;

  /** Git version */
  gitVersion: string;

  /** Repository info */
  repo: {
    name: string;
    branch: string;
    isClean: boolean;
  };

  /** Speck config (if exists) */
  config?: SpeckConfigSummary;
}

export interface SpeckConfigSummary {
  /** Worktree enabled */
  worktreeEnabled: boolean;

  /** IDE for worktrees */
  worktreeIde?: string;

  /** Multi-repo mode */
  multiRepoEnabled: boolean;
}

// =============================================================================
// Hook Integration
// =============================================================================

/**
 * Hook output format for Claude Code integration
 *
 * @see FR-009: CLI MUST accept --hook flag for hook-formatted response
 */
export interface HookOutput {
  /** Context to inject into prompt (UserPromptSubmit) */
  context?: string;

  /** Whether to allow the action (PreToolUse) */
  allow?: boolean;

  /** Message to display */
  message?: string;

  /** Additional context for hookSpecificOutput (SessionStart) */
  hookSpecificOutput?: {
    additionalContext?: string;
  };
}

/**
 * Utility function signature for reading hook input from stdin
 *
 * When --hook flag is present, commands should call this to read
 * the JSON payload from stdin before processing.
 *
 * @example
 * ```typescript
 * const inputMode: InputMode = options.hook ? "hook" : "default";
 * let hookPayload: HookInputPayload | undefined;
 *
 * if (inputMode === "hook") {
 *   hookPayload = await readHookInput();
 *   // Use hookPayload.sessionContext, hookPayload.userPrompt, etc.
 * }
 * ```
 */
export type ReadHookInputFn = () => Promise<HookInputPayload | undefined>;

// =============================================================================
// JSON Output Contracts
// =============================================================================

/**
 * Standard JSON output envelope
 *
 * @see FR-008: CLI MUST accept --json flag for structured JSON output
 */
export interface JsonOutput<T = unknown> {
  /** Success indicator */
  ok: boolean;

  /** Result data */
  result?: T;

  /** Error info */
  error?: {
    code: string;
    message: string;
    recovery?: string[];
  };

  /** Command metadata */
  meta: {
    command: string;
    timestamp: string;
    duration_ms: number;
  };
}
