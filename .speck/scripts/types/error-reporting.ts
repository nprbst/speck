/**
 * Type definitions for error reporting
 * Feature: 003-refactor-transform-commands
 */

/**
 * Error severity levels
 */
export type ErrorSeverity = "error" | "warning" | "info";

/**
 * Error category for classification
 */
export type ErrorCategory =
  | "preprocessing"
  | "extraction"
  | "validation"
  | "file_io"
  | "network"
  | "configuration";

/**
 * Structured error report entry
 */
export interface ErrorReportEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Error severity level */
  severity: ErrorSeverity;
  /** Error category */
  category: ErrorCategory;
  /** File related to error (if applicable) */
  filePath?: string;
  /** Error message */
  message: string;
  /** Optional stack trace */
  stackTrace?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Batch transformation error summary
 */
export interface BatchErrorReport {
  /** ISO 8601 timestamp of batch completion */
  timestamp: string;
  /** Total files in batch */
  totalFiles: number;
  /** Successfully processed files */
  successCount: number;
  /** Failed files */
  failureCount: number;
  /** Detailed error entries */
  errors: ErrorReportEntry[];
  /** Summary statistics by category */
  errorsByCategory: Record<ErrorCategory, number>;
  /** Summary statistics by severity */
  errorsBySeverity: Record<ErrorSeverity, number>;
}

/**
 * Formats an error for logging or reporting
 */
export function formatError(error: ErrorReportEntry): string {
  const parts: string[] = [];
  parts.push(`[${error.severity.toUpperCase()}]`);
  parts.push(`[${error.category}]`);
  if (error.filePath) {
    parts.push(`File: ${error.filePath}`);
  }
  parts.push(error.message);
  return parts.join(" ");
}

/**
 * Creates an error report entry
 */
export function createErrorEntry(
  severity: ErrorSeverity,
  category: ErrorCategory,
  message: string,
  options?: {
    filePath?: string;
    stackTrace?: string;
    context?: Record<string, unknown>;
  }
): ErrorReportEntry {
  return {
    timestamp: new Date().toISOString(),
    severity,
    category,
    message,
    ...options,
  };
}
