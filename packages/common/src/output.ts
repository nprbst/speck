/**
 * @speck/common/output - Output formatting utilities for Speck plugins
 *
 * Provides consistent output formatting across CLI and hook modes.
 */

import type { ExecutionMode } from './logger';
import type { CommandResult } from './errors';

// =============================================================================
// Output Mode Types
// =============================================================================

/**
 * Output mode for CLI commands
 * - "human": Human-readable terminal output (default)
 * - "json": Structured JSON for LLM parsing
 * - "hook": Hook-formatted output for Claude Code hooks
 */
export type OutputMode = 'human' | 'json' | 'hook';

/**
 * Input mode for CLI commands
 * - "default": Standard CLI invocation (args from command line only)
 * - "hook": Hook invocation (JSON payload from stdin + command line args)
 */
export type InputMode = 'default' | 'hook';

/**
 * Standard JSON output envelope
 */
export interface JsonOutput<T = unknown> {
  ok: boolean;
  result?: T;
  error?: {
    code: string;
    message: string;
    recovery?: string[];
  };
  meta: {
    command: string;
    timestamp: string;
    duration_ms: number;
  };
}

// =============================================================================
// Mode Detection
// =============================================================================

/**
 * Detect input mode from CLI options
 */
export function detectInputMode(options: { hook?: boolean }): InputMode {
  return options.hook ? 'hook' : 'default';
}

/**
 * Detect output mode from CLI options
 * --hook takes precedence over --json
 */
export function detectOutputMode(options: { json?: boolean; hook?: boolean }): OutputMode {
  if (options.hook) return 'hook';
  if (options.json) return 'json';
  return 'human';
}

// =============================================================================
// JSON Output Formatting
// =============================================================================

/**
 * Format input for formatJsonOutput function
 */
export interface FormatJsonInput<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    recovery?: string[];
  };
  command: string;
  startTime?: number;
}

/**
 * Format command result as standard JSON output
 */
export function formatJsonOutput<T = unknown>(input: FormatJsonInput<T>): JsonOutput<T> {
  const now = Date.now();
  const duration = input.startTime ? now - input.startTime : 0;

  const output: JsonOutput<T> = {
    ok: input.success,
    meta: {
      command: input.command,
      timestamp: new Date(now).toISOString(),
      duration_ms: duration,
    },
  };

  if (input.success && input.data !== undefined) {
    output.result = input.data;
  }

  if (!input.success && input.error) {
    output.error = {
      code: input.error.code,
      message: input.error.message,
    };
    if (input.error.recovery) {
      output.error.recovery = input.error.recovery;
    }
  }

  return output;
}

// =============================================================================
// CLI Output Formatting
// =============================================================================

/**
 * Format CommandResult for CLI mode output
 * Writes output to stdout and errorOutput to stderr
 */
export function formatCliOutput(result: CommandResult): void {
  if (result.output) {
    process.stdout.write(result.output);
    if (!result.output.endsWith('\n')) {
      process.stdout.write('\n');
    }
  }

  if (result.errorOutput) {
    process.stderr.write(result.errorOutput);
    if (!result.errorOutput.endsWith('\n')) {
      process.stderr.write('\n');
    }
  }
}

/**
 * Format output based on execution mode
 */
export function formatOutput(result: CommandResult, mode: ExecutionMode): CommandResult | void {
  if (mode === 'hook') {
    return result;
  }
  formatCliOutput(result);
}

// =============================================================================
// Result Constructors
// =============================================================================

/**
 * Create a success CommandResult
 */
export function successResult(output: string, metadata?: Record<string, unknown>): CommandResult {
  return {
    success: true,
    output,
    errorOutput: null,
    exitCode: 0,
    metadata: metadata ?? null,
  };
}

/**
 * Create a failure CommandResult
 */
export function failureResult(
  errorOutput: string,
  exitCode: number = 1,
  metadata?: Record<string, unknown>
): CommandResult {
  return {
    success: false,
    output: '',
    errorOutput,
    exitCode,
    metadata: metadata ?? null,
  };
}

// =============================================================================
// Text Formatting Utilities
// =============================================================================

/**
 * Format data as JSON string with optional pretty-printing
 */
export function formatJson(data: unknown, pretty: boolean = false): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

/**
 * Format a list of items as a bulleted list
 */
export function formatList(items: string[], bullet: string = '-'): string {
  return items.map((item) => `${bullet} ${item}`).join('\n');
}

/**
 * Format a table from data
 */
export function formatTable(headers: string[], rows: string[][]): string {
  // Calculate column widths
  const widths = headers.map((header, i) => {
    const maxRowWidth = Math.max(...rows.map((row) => (row[i] || '').length));
    return Math.max(header.length, maxRowWidth);
  });

  // Format header row
  const headerRow = headers.map((header, i) => header.padEnd(widths[i] ?? 0)).join(' | ');

  // Format separator row
  const separator = widths.map((width) => '-'.repeat(width ?? 0)).join('-|-');

  // Format data rows
  const dataRows = rows.map((row) =>
    row.map((cell, i) => (cell || '').padEnd(widths[i] ?? 0)).join(' | ')
  );

  return [headerRow, separator, ...dataRows].join('\n');
}

/**
 * Colorize output for CLI mode (if TTY supports it)
 */
export function colorize(
  text: string,
  color: 'red' | 'green' | 'yellow' | 'blue' | 'gray',
  mode: ExecutionMode
): string {
  // Don't colorize in hook mode or if not a TTY
  if (mode === 'hook' || !process.stdout.isTTY) {
    return text;
  }

  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m',
  };

  const reset = '\x1b[0m';
  return `${colors[color]}${text}${reset}`;
}

/**
 * Format progress indicator
 */
export function formatProgress(current: number, total: number, label?: string): string {
  const percentage = Math.round((current / total) * 100);
  const progressBar = '='.repeat(Math.floor(percentage / 5));
  const emptyBar = ' '.repeat(20 - Math.floor(percentage / 5));

  const labelText = label ? `${label}: ` : '';
  return `${labelText}[${progressBar}${emptyBar}] ${percentage}% (${current}/${total})`;
}

// =============================================================================
// Link Formatting (from speck-reviewer)
// =============================================================================

/**
 * Create a file path with optional line number
 */
export function fileLink(file: string, line?: number, endLine?: number): string {
  if (line && endLine) return `${file}:${line}-${endLine}`;
  if (line) return `${file}:${line}`;
  return file;
}

/**
 * Create a diff link (alias for fileLink for compatibility)
 */
export function diffLink(file: string, line?: number): string {
  return fileLink(file, line);
}

// =============================================================================
// Action Menu System (from speck-reviewer)
// =============================================================================

/**
 * Action definition for menus
 */
export interface Action {
  label: string;
  command: string;
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Format a lettered action menu
 */
export function formatActionMenu(actions: Action[]): string {
  const lines = actions.map((a, i) => `  ${LETTERS[i]}) ${a.label}`);
  return lines.join('\n');
}

/**
 * Get the command for a given letter selection
 */
export function getActionCommand(actions: Action[], letter: string): string | undefined {
  const index = letter.toLowerCase().charCodeAt(0) - 97; // 'a' = 0
  if (index >= 0 && index < actions.length) {
    return actions[index]?.command;
  }
  return undefined;
}
