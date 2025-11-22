/**
 * Output formatting utilities for dual-mode CLI operation
 * Provides consistent output formatting across CLI and hook modes
 */

import type { CommandResult, ExecutionMode } from "./types";

/**
 * Format CommandResult for CLI mode output
 * Writes output to stdout and errorOutput to stderr
 */
export function formatCliOutput(result: CommandResult): void {
  if (result.output) {
    process.stdout.write(result.output);
    // Add newline if output doesn't end with one
    if (!result.output.endsWith("\n")) {
      process.stdout.write("\n");
    }
  }

  if (result.errorOutput) {
    process.stderr.write(result.errorOutput);
    // Add newline if error output doesn't end with one
    if (!result.errorOutput.endsWith("\n")) {
      process.stderr.write("\n");
    }
  }
}

/**
 * Format CommandResult for hook mode output
 * Returns the result as-is for JSON serialization
 */
export function formatHookOutput(result: CommandResult): CommandResult {
  return result;
}

/**
 * Format output based on execution mode
 * Either writes to stdout/stderr (CLI) or returns result (hook)
 */
export function formatOutput(
  result: CommandResult,
  mode: ExecutionMode
): CommandResult | void {
  if (mode === "hook") {
    return formatHookOutput(result);
  }
  formatCliOutput(result);
}

/**
 * Create a success CommandResult
 */
export function successResult(
  output: string,
  metadata?: Record<string, unknown>
): CommandResult {
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
    output: "",
    errorOutput,
    exitCode,
    metadata: metadata ?? null,
  };
}

/**
 * Format data as JSON string with optional pretty-printing
 */
export function formatJson(
  data: unknown,
  pretty: boolean = false
): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

/**
 * Format a list of items as a bulleted list
 */
export function formatList(items: string[], bullet: string = "-"): string {
  return items.map((item) => `${bullet} ${item}`).join("\n");
}

/**
 * Format a table from data
 * Simple text-based table formatter
 */
export function formatTable(
  headers: string[],
  rows: string[][]
): string {
  // Calculate column widths
  const widths = headers.map((header, i) => {
    const maxRowWidth = Math.max(...rows.map((row) => (row[i] || "").length));
    return Math.max(header.length, maxRowWidth);
  });

  // Format header row
  const headerRow = headers
    .map((header, i) => header.padEnd(widths[i] ?? 0))
    .join(" | ");

  // Format separator row
  const separator = widths.map((width) => "-".repeat(width ?? 0)).join("-|-");

  // Format data rows
  const dataRows = rows.map((row) =>
    row.map((cell, i) => (cell || "").padEnd(widths[i] ?? 0)).join(" | ")
  );

  return [headerRow, separator, ...dataRows].join("\n");
}

/**
 * Colorize output for CLI mode (if TTY supports it)
 * No-op in hook mode
 */
export function colorize(
  text: string,
  color: "red" | "green" | "yellow" | "blue" | "gray",
  mode: ExecutionMode
): string {
  // Don't colorize in hook mode
  if (mode === "hook") {
    return text;
  }

  // Don't colorize if not a TTY
  if (!process.stdout.isTTY) {
    return text;
  }

  const colors = {
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    gray: "\x1b[90m",
  };

  const reset = "\x1b[0m";
  return `${colors[color]}${text}${reset}`;
}

/**
 * Format progress indicator
 */
export function formatProgress(
  current: number,
  total: number,
  label?: string
): string {
  const percentage = Math.round((current / total) * 100);
  const progressBar = "=".repeat(Math.floor(percentage / 5));
  const emptyBar = " ".repeat(20 - Math.floor(percentage / 5));

  const labelText = label ? `${label}: ` : "";
  return `${labelText}[${progressBar}${emptyBar}] ${percentage}% (${current}/${total})`;
}
