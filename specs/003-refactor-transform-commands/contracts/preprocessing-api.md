# Preprocessing API Contract

**Feature**: 003-refactor-transform-commands
**Date**: 2025-11-15
**Type**: TypeScript Module API

## Overview

The preprocessing API provides deterministic text transformations for upstream command files. It handles mechanical string replacements (prefixes, paths, references) before passing preprocessed content to the transform-commands agent.

## Module: `preprocess-commands.ts`

### Function: `preprocessCommandFile`

**Purpose**: Apply all preprocessing rules to a single upstream command file.

**Signature**:
```typescript
async function preprocessCommandFile(
  inputPath: string,
  outputPath: string,
  options?: PreprocessOptions
): Promise<PreprocessResult>
```

**Parameters**:
- `inputPath` (string, required): Absolute path to upstream command file
- `outputPath` (string, required): Absolute path where preprocessed file should be written
- `options` (PreprocessOptions, optional): Configuration options
  - `dryRun` (boolean, default: false): If true, return result without writing file
  - `verbose` (boolean, default: false): If true, include detailed transformation log
  - `rules` (PreprocessingRule[], optional): Custom rules to apply (defaults to standard rules)

**Returns**: `Promise<PreprocessResult>`
```typescript
interface PreprocessResult {
  success: boolean;
  inputPath: string;
  outputPath: string;
  originalContent: string;
  transformedContent: string;
  rulesApplied: number;
  transformationLog: TransformationLogEntry[];
  errors: string[];
}

interface TransformationLogEntry {
  ruleName: string;
  replacements: number;
  examples: string[]; // Up to 3 examples of replacements made
}
```

**Errors**:
- Throws `PreprocessError` if input file doesn't exist
- Throws `PreprocessError` if input file is not UTF-8 encoded
- Throws `PreprocessError` if input file exceeds 50KB
- Throws `PreprocessError` if output path is not writable

**Example**:
```typescript
const result = await preprocessCommandFile(
  '/path/to/upstream/speckit.specify.md',
  '/path/to/output/speck.specify.md',
  { verbose: true }
);

console.log(`Applied ${result.rulesApplied} rules`);
console.log(`Made ${result.transformationLog.reduce((sum, t) => sum + t.replacements, 0)} replacements`);
```

---

### Function: `preprocessBatch`

**Purpose**: Apply preprocessing to multiple upstream command files in batch.

**Signature**:
```typescript
async function preprocessBatch(
  inputFiles: string[],
  outputDir: string,
  options?: BatchPreprocessOptions
): Promise<BatchPreprocessResult>
```

**Parameters**:
- `inputFiles` (string[], required): Array of absolute paths to upstream command files
- `outputDir` (string, required): Directory where preprocessed files should be written
- `options` (BatchPreprocessOptions, optional): Configuration options
  - `continueOnError` (boolean, default: true): Continue processing remaining files if one fails
  - `parallel` (boolean, default: true): Process files in parallel
  - `maxConcurrency` (number, default: 5): Maximum parallel file operations
  - `verbose` (boolean, default: false): Include detailed logs for each file

**Returns**: `Promise<BatchPreprocessResult>`
```typescript
interface BatchPreprocessResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  results: PreprocessResult[];
  failures: PreprocessFailure[];
  durationMs: number;
}

interface PreprocessFailure {
  inputPath: string;
  stage: 'read' | 'transform' | 'write';
  errorMessage: string;
  stackTrace?: string;
}
```

**Errors**:
- Does not throw; collects failures in `failures` array
- If `continueOnError` is false and a failure occurs, stops processing and returns partial results

**Example**:
```typescript
const result = await preprocessBatch(
  ['/upstream/speckit.specify.md', '/upstream/speckit.clarify.md'],
  '/output/commands/',
  { continueOnError: true, parallel: true }
);

console.log(`${result.successfulFiles}/${result.totalFiles} files processed successfully`);
if (result.failedFiles > 0) {
  console.error('Failures:', result.failures);
}
```

---

### Type: `PreprocessingRule`

**Purpose**: Define a text transformation rule.

**Structure**:
```typescript
interface PreprocessingRule {
  name: string;
  pattern: string | RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  scope: 'filename' | 'content' | 'frontmatter' | 'all';
  order: number;
}
```

**Fields**:
- `name`: Descriptive name for logging (e.g., "add-speck-prefix")
- `pattern`: Regex or literal string to match
- `replacement`: Replacement string or function
- `scope`: Where to apply the rule
- `order`: Execution order (lower runs first)

**Standard Rules** (exported as `STANDARD_PREPROCESSING_RULES`):
1. `add-speck-prefix` (order: 1): Replace `/speckit.` with `/speck.` in content
2. `normalize-paths` (order: 2): Replace `.specify/` with `.speck/` in content
3. `update-command-refs` (order: 3): Replace `speckit.taskname` with `speck.taskname` in references
4. `update-filename` (order: 10): Rename file from `speckit.*` to `speck.*`

---

### Function: `validatePreprocessedFile`

**Purpose**: Validate that preprocessing was applied correctly.

**Signature**:
```typescript
function validatePreprocessedFile(
  content: string,
  filename: string
): ValidationResult
```

**Parameters**:
- `content` (string, required): Preprocessed file content
- `filename` (string, required): Preprocessed filename

**Returns**: `ValidationResult`
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    hasSpeckPrefix: boolean;
    pathsNormalized: boolean;
    referencesUpdated: boolean;
    validMarkdown: boolean;
  };
}
```

**Validation Checks**:
- File has `speck.` prefix in name
- Content uses `.speck/` paths (no `.specify/` remaining)
- Command references use `speck.*` format (no `speckit.*` remaining)
- Content is valid markdown syntax

**Example**:
```typescript
const validation = validatePreprocessedFile(
  result.transformedContent,
  'speck.specify.md'
);

if (!validation.valid) {
  console.error('Validation failed:', validation.errors);
}
```

---

## Error Handling

All preprocessing functions follow consistent error handling:

1. **Input validation errors**: Throw `PreprocessError` immediately
2. **Transformation errors**: Collect in `errors` array, continue if `continueOnError` is true
3. **Write errors**: Throw `PreprocessError` for single files, collect in `failures` for batch

**Custom Error Class**:
```typescript
class PreprocessError extends Error {
  constructor(
    message: string,
    public code: string,
    public filePath?: string,
    public stage?: string
  ) {
    super(message);
    this.name = 'PreprocessError';
  }
}
```

**Error Codes**:
- `FILE_NOT_FOUND`: Input file doesn't exist
- `INVALID_ENCODING`: File is not UTF-8
- `FILE_TOO_LARGE`: File exceeds 50KB
- `INVALID_PATH`: Output path is not writable
- `TRANSFORMATION_FAILED`: Rule application failed
- `VALIDATION_FAILED`: Post-processing validation failed

---

## Usage Example

```typescript
import {
  preprocessCommandFile,
  preprocessBatch,
  STANDARD_PREPROCESSING_RULES,
  validatePreprocessedFile
} from '.speck/scripts/preprocess-commands';

// Single file preprocessing
const result = await preprocessCommandFile(
  '/upstream/spec-kit/current/commands/speckit.specify.md',
  '.claude/commands/speck.specify.md',
  { verbose: true }
);

// Validate
const validation = validatePreprocessedFile(
  result.transformedContent,
  'speck.specify.md'
);

if (!validation.valid) {
  throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
}

// Batch preprocessing
const upstreamFiles = await Bun.glob('/upstream/spec-kit/current/commands/*.md').toArray();
const batchResult = await preprocessBatch(
  upstreamFiles,
  '.claude/commands/',
  { continueOnError: true, parallel: true }
);

console.log(`Processed ${batchResult.successfulFiles}/${batchResult.totalFiles} files in ${batchResult.durationMs}ms`);
```

---

## Performance Requirements

- Single file preprocessing: <500ms for typical command files (<10KB)
- Batch preprocessing: <30 seconds for 50 files with `parallel: true`
- Memory usage: <100MB for batch processing 50 files

---

## Testing Contract

All preprocessing functions must have test coverage for:

1. **Happy path**: Standard upstream command file preprocessed successfully
2. **Error handling**: File not found, invalid encoding, file too large
3. **Validation**: All preprocessing rules applied correctly
4. **Edge cases**: Empty files, files with no matches, files with special characters
5. **Batch processing**: Mixed success/failure scenarios, parallel execution
6. **Custom rules**: User-provided rules applied in correct order

Test files: `tests/preprocessing.test.ts`
