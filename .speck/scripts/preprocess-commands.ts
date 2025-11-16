/**
 * Preprocessing infrastructure for upstream command files
 * Feature: 003-refactor-transform-commands
 *
 * Handles deterministic text replacements before agent analysis
 */

import type {
  PreprocessingRule,
  UpstreamCommandFile,
  PreprocessedCommandFile,
  PreprocessingValidationResult,
  PreprocessingBatchResult,
} from "./types/preprocessing.ts";

/**
 * Standard preprocessing rules applied to all upstream commands
 * Execution order: Lower order values run first
 */
export const STANDARD_PREPROCESSING_RULES: PreprocessingRule[] = [
  {
    ruleName: "add-speck-prefix",
    pattern: /\/speckit\./g,
    replacement: "/speck.",
    scope: "content",
    order: 1,
  },
  {
    ruleName: "normalize-paths",
    pattern: /\.specify\//g,
    replacement: ".speck/",
    scope: "content",
    order: 2,
  },
  {
    ruleName: "update-command-refs",
    pattern: /speckit\.(\w+)/g,
    replacement: "speck.$1",
    scope: "content",
    order: 3,
  },
  {
    ruleName: "update-filename",
    pattern: /^speckit\./,
    replacement: "speck.",
    scope: "filename",
    order: 4,
  },
];

/**
 * Applies a single preprocessing rule to content or filename
 */
function applyRule(
  rule: PreprocessingRule,
  content: string,
  fileName: string
): { content: string; fileName: string } {
  let updatedContent = content;
  let updatedFileName = fileName;

  if (rule.scope === "content" || rule.scope === "all") {
    updatedContent = content.replace(rule.pattern, rule.replacement);
  }

  if (rule.scope === "filename" || rule.scope === "all") {
    updatedFileName = fileName.replace(rule.pattern, rule.replacement);
  }

  return { content: updatedContent, fileName: updatedFileName };
}

/**
 * Preprocesses a single command file by applying all rules sequentially
 */
export function preprocessCommandFile(
  file: UpstreamCommandFile,
  rules: PreprocessingRule[] = STANDARD_PREPROCESSING_RULES
): PreprocessedCommandFile {
  // Sort rules by order
  const sortedRules = [...rules].sort((a, b) => a.order - b.order);

  let currentContent = file.content;
  let currentFileName = file.fileName;

  // Apply each rule sequentially
  for (const rule of sortedRules) {
    const result = applyRule(rule, currentContent, currentFileName);
    currentContent = result.content;
    currentFileName = result.fileName;
  }

  // Determine output path
  const outputPath = `.claude/commands/${currentFileName}`;

  // Check which transformations were applied
  const prefixesApplied = currentContent.includes("/speck.") || currentFileName.startsWith("speck.");
  const pathsNormalized = currentContent.includes(".speck/");
  const referencesUpdated = /speck\.\w+/.test(currentContent);

  return {
    originalPath: file.filePath,
    outputPath,
    content: currentContent,
    prefixesApplied,
    pathsNormalized,
    referencesUpdated,
  };
}

/**
 * Validates a preprocessed file for correctness
 */
export function validatePreprocessedFile(
  file: PreprocessedCommandFile
): PreprocessingValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check that speck. prefix exists in filename
  const fileName = file.outputPath.split("/").pop() || "";
  if (!fileName.startsWith("speck.")) {
    errors.push("Filename must start with 'speck.' prefix");
  }

  // Check that .specify/ paths are replaced
  if (file.content.includes(".specify/")) {
    errors.push("Content still contains '.specify/' paths - should be '.speck/'");
  }

  // Check that speckit. command references are replaced
  if (file.content.includes("speckit.")) {
    warnings.push("Content contains 'speckit.' references - may need manual review");
  }

  // Check that file is valid markdown (basic check for balanced code blocks)
  const codeBlockCount = (file.content.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    errors.push("Unbalanced code blocks detected");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    filePath: file.outputPath,
  };
}

/**
 * Preprocesses multiple files in batch
 */
export function preprocessBatch(
  files: UpstreamCommandFile[],
  rules: PreprocessingRule[] = STANDARD_PREPROCESSING_RULES
): PreprocessingBatchResult {
  const preprocessed: PreprocessedCommandFile[] = [];
  const failures: Array<{ filePath: string; errorMessage: string; stackTrace?: string }> = [];

  for (const file of files) {
    try {
      const result = preprocessCommandFile(file, rules);
      preprocessed.push(result);
    } catch (error) {
      failures.push({
        filePath: file.filePath,
        errorMessage: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  return {
    totalFiles: files.length,
    successfulFiles: preprocessed.length,
    failedFiles: failures.length,
    failures,
    preprocessed,
  };
}
