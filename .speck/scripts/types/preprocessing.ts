/**
 * Type definitions for preprocessing pipeline
 * Feature: 003-refactor-transform-commands
 */

/**
 * Represents a single preprocessing rule to apply to upstream command files
 */
export interface PreprocessingRule {
  /** Unique name for the rule (e.g., "add-speck-prefix") */
  ruleName: string;
  /** Regular expression or literal string to match */
  pattern: string | RegExp;
  /** Replacement string or pattern */
  replacement: string;
  /** Where to apply the rule */
  scope: "filename" | "content" | "frontmatter" | "all";
  /** Execution order (lower runs first) */
  order: number;
}

/**
 * Represents an upstream command file to be preprocessed
 */
export interface UpstreamCommandFile {
  /** Absolute path to the upstream command file */
  filePath: string;
  /** Base name of the file (e.g., "specify.md") */
  fileName: string;
  /** Raw markdown content of the command */
  content: string;
  /** File encoding (default: UTF-8) */
  encoding: string;
  /** File size in bytes */
  size: number;
}

/**
 * Represents a preprocessed command file
 */
export interface PreprocessedCommandFile {
  /** Path to the source upstream file */
  originalPath: string;
  /** Destination path with speck. prefix */
  outputPath: string;
  /** Preprocessed markdown content */
  content: string;
  /** Whether speck. prefix was applied */
  prefixesApplied: boolean;
  /** Whether .specify/ → .speck/ replacements completed */
  pathsNormalized: boolean;
  /** Whether command references were updated */
  referencesUpdated: boolean;
}

/**
 * Result of preprocessing validation
 */
export interface PreprocessingValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of validation errors (if any) */
  errors: string[];
  /** List of validation warnings (if any) */
  warnings: string[];
  /** File that was validated */
  filePath: string;
}

/**
 * Result of batch preprocessing operation
 */
export interface PreprocessingBatchResult {
  /** Total files processed */
  totalFiles: number;
  /** Successfully preprocessed files */
  successfulFiles: number;
  /** Failed files */
  failedFiles: number;
  /** Array of error records */
  failures: Array<{
    filePath: string;
    errorMessage: string;
    stackTrace?: string;
  }>;
  /** Array of successfully preprocessed files */
  preprocessed: PreprocessedCommandFile[];
}
