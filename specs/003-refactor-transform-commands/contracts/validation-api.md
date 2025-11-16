# Validation API Contract

**Feature**: 003-refactor-transform-commands
**Date**: 2025-11-15
**Type**: TypeScript Module API

## Overview

The validation API provides quality gates for extracted skill and agent files before they are written to disk. It enforces Claude Code best practices and ensures structural correctness.

## Module: `validate-extracted-files.ts`

### Function: `validateExtractedFile`

**Purpose**: Validate an extracted skill or agent file before writing to disk.

**Signature**:
```typescript
async function validateExtractedFile(
  content: string,
  fileType: 'skill' | 'agent',
  metadata: ExtractedFileMetadata,
  options?: ValidationOptions
): Promise<ValidationResult>
```

**Parameters**:
- `content` (string, required): Full markdown content of the extracted file
- `fileType` ('skill' | 'agent', required): Type of file being validated
- `metadata` (ExtractedFileMetadata, required): Metadata about the extraction
  ```typescript
  interface ExtractedFileMetadata {
    name: string; // e.g., "speck.validation"
    filePath: string; // e.g., ".claude/skills/speck.validation.md"
    description?: string; // For skills, should match content frontmatter
    triggers?: string[]; // For skills
    toolPermissions?: string[]; // For agents
    fragilityLevel?: 'high' | 'medium' | 'low'; // For agents
    rationale: string; // Why this was extracted
    bestPracticesCited: string[]; // References to docs
  }
  ```
- `options` (ValidationOptions, optional): Configuration
  - `strict` (boolean, default: true): Fail on warnings
  - `checkBestPractices` (boolean, default: true): Verify best practices citations are valid
  - `maxDescriptionLength` (number, default: 1024): Description character limit

**Returns**: `Promise<ValidationResult>`
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[]; // Fatal issues blocking file write
  warnings: string[]; // Non-fatal issues (fail if strict=true)
  checks: ValidationChecks;
  suggestions: string[]; // Optional improvements
}

interface ValidationChecks {
  // Common checks
  hasSpeckPrefix: boolean;
  validMarkdownSyntax: boolean;
  rationaleProvided: boolean;
  bestPracticesCited: boolean;

  // Skill-specific checks (if fileType='skill')
  descriptionThirdPerson?: boolean;
  descriptionUnderLimit?: boolean;
  hasMinimumTriggers?: boolean; // >= 3
  triggersConcrete?: boolean;
  validSkillStructure?: boolean;

  // Agent-specific checks (if fileType='agent')
  hasObjective?: boolean;
  objectiveSinglePurpose?: boolean;
  toolPermissionsMatch?: boolean; // Match fragility level
  phaseCountValid?: boolean; // 3-5 phases
  validAgentStructure?: boolean;
}
```

**Validation Rules - Skills**:
1. **Name**: Must have `speck.` prefix
2. **Description**: Must be third person, under 1024 chars (strict), include triggers
3. **Triggers**: Minimum 3 concrete terms (not vague words like "help", "assist")
4. **Structure**: Valid markdown with frontmatter or clear sections
5. **Rationale**: Non-empty explanation
6. **Best Practices**: At least one citation to Claude Code docs

**Validation Rules - Agents**:
1. **Name**: Must have `speck.` prefix
2. **Objective**: Must be stated clearly and describe single purpose
3. **Tool Permissions**: Must match fragility level:
   - High fragility → `[Read, Grep, Glob]` only
   - Medium fragility → `[Read, Write, Edit, Grep, Glob]`
   - Low fragility → `*` or broader set
4. **Phase Count**: Must have 3-5 execution phases
5. **Structure**: Valid markdown with clear workflow sections
6. **Rationale**: Non-empty explanation
7. **Best Practices**: At least one citation to Claude Code docs

**Errors**:
- Throws `ValidationError` if file content is malformed or unparseable
- Returns validation failures in `errors` array for correctable issues

**Example**:
```typescript
const skillContent = `# Skill: speck.validation
Validates feature specifications...
`;

const validation = await validateExtractedFile(
  skillContent,
  'skill',
  {
    name: 'speck.validation',
    filePath: '.claude/skills/speck.validation.md',
    description: 'Validates feature specifications for completeness...',
    triggers: ['spec.md', 'validate', 'requirements'],
    rationale: 'Reusable validation logic per Skills Best Practices',
    bestPracticesCited: ['https://docs.claude.com/skills-guide#reusable']
  },
  { strict: true }
);

if (!validation.valid) {
  console.error('Validation failed:', validation.errors);
  // Agent must regenerate content
}
```

---

### Function: `validateSkillDescription`

**Purpose**: Specifically validate skill description field.

**Signature**:
```typescript
function validateSkillDescription(
  description: string,
  triggers: string[],
  options?: { maxLength?: number; minTriggers?: number }
): DescriptionValidationResult
```

**Parameters**:
- `description` (string, required): The skill description text
- `triggers` (string[], required): Array of trigger terms
- `options` (optional):
  - `maxLength` (number, default: 1024): Character limit
  - `minTriggers` (number, default: 3): Minimum trigger count

**Returns**: `DescriptionValidationResult`
```typescript
interface DescriptionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    length: number;
    isThirdPerson: boolean;
    triggerCount: number;
    concreteTriggers: number;
    estimatedTokens: number;
  };
  suggestions: string[];
}
```

**Validation Checks**:
1. **Length**: Must be ≤ maxLength chars (hard limit)
2. **Quality threshold**: Warn if > 300 tokens (~1200 chars)
3. **Third person**: Must not use "I", "we", "you" (except in examples)
4. **Triggers**: Must have ≥ minTriggers concrete terms
5. **Concreteness**: Triggers should be specific (not "help", "assist", "do")

**Example**:
```typescript
const result = validateSkillDescription(
  "Validates feature specifications for completeness, checking required sections...",
  ["spec.md", "feature specification", "validate requirements"],
  { maxLength: 1024, minTriggers: 3 }
);

if (result.warnings.length > 0) {
  console.warn('Description warnings:', result.warnings);
}
```

---

### Function: `validateAgentToolPermissions`

**Purpose**: Validate agent tool permissions match fragility level.

**Signature**:
```typescript
function validateAgentToolPermissions(
  toolPermissions: string[],
  fragilityLevel: 'high' | 'medium' | 'low',
  objective: string
): ToolPermissionValidationResult
```

**Parameters**:
- `toolPermissions` (string[], required): Declared tool permissions
- `fragilityLevel` ('high' | 'medium' | 'low', required): Task fragility assessment
- `objective` (string, required): Agent objective (for context analysis)

**Returns**: `ToolPermissionValidationResult`
```typescript
interface ToolPermissionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  analysis: {
    expectedTools: string[];
    actualTools: string[];
    missingTools: string[];
    extraTools: string[];
    fragilityMatch: boolean;
  };
  suggestions: string[];
}
```

**Fragility Mapping**:
- **High fragility** (read-only): `[Read, Grep, Glob]` exactly
  - Analysis tasks, information gathering, reporting
- **Medium fragility** (controlled write): `[Read, Write, Edit, Grep, Glob]` exactly
  - Targeted file modifications, structured updates
- **Low fragility** (full access): `*` or broader tool set
  - Complex workflows, orchestration, multi-phase operations

**Validation Logic**:
1. Determine expected tools based on fragility level
2. Compare with declared tools
3. Flag missing required tools (error)
4. Flag extra tools that increase risk (warning if strict mode)
5. Analyze objective for fragility mismatch (e.g., "analyze code" with low fragility → warning)

**Example**:
```typescript
const result = validateAgentToolPermissions(
  ['Read', 'Write', 'Edit', 'Grep', 'Glob'],
  'medium',
  'Update configuration files with new settings'
);

if (!result.valid) {
  console.error('Tool permission errors:', result.errors);
}
```

---

### Function: `validateMarkdownStructure`

**Purpose**: Validate markdown syntax and structure.

**Signature**:
```typescript
function validateMarkdownStructure(
  content: string,
  expectedSections?: string[]
): MarkdownValidationResult
```

**Parameters**:
- `content` (string, required): Markdown content
- `expectedSections` (string[], optional): Required section headings

**Returns**: `MarkdownValidationResult`
```typescript
interface MarkdownValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  structure: {
    hasFrontmatter: boolean;
    sections: string[]; // Extracted section headings
    missingSections: string[]; // If expectedSections provided
    codeBlocksBalanced: boolean;
    linksValid: boolean;
  };
}
```

**Validation Checks**:
1. Balanced code blocks (matching backticks)
2. Valid heading hierarchy (H1 → H2 → H3, no skips)
3. Valid link syntax `[text](url)`
4. Required sections present (if specified)
5. Frontmatter format (if present)

**Example**:
```typescript
const result = validateMarkdownStructure(
  skillContent,
  ['Purpose', 'Usage', 'Examples'] // Expected sections for skills
);

if (!result.structure.codeBlocksBalanced) {
  console.error('Unbalanced code blocks in markdown');
}
```

---

### Function: `validateAndWrite`

**Purpose**: Validate extracted file and write to disk if valid.

**Signature**:
```typescript
async function validateAndWrite(
  content: string,
  fileType: 'skill' | 'agent',
  metadata: ExtractedFileMetadata,
  options?: ValidationOptions & WriteOptions
): Promise<ValidateAndWriteResult>
```

**Parameters**:
- All parameters from `validateExtractedFile`
- Additional `WriteOptions`:
  - `overwrite` (boolean, default: false): Overwrite if file exists
  - `createDirs` (boolean, default: true): Create parent directories if needed
  - `dryRun` (boolean, default: false): Validate but don't write

**Returns**: `Promise<ValidateAndWriteResult>`
```typescript
interface ValidateAndWriteResult extends ValidationResult {
  written: boolean;
  filePath?: string;
  writeError?: string;
}
```

**Behavior**:
1. Run full validation
2. If validation fails → return errors, don't write
3. If validation passes → write file to metadata.filePath
4. Return combined validation + write result

**Example**:
```typescript
const result = await validateAndWrite(
  skillContent,
  'skill',
  skillMetadata,
  { strict: true, overwrite: false }
);

if (result.written) {
  console.log(`Successfully wrote ${result.filePath}`);
} else if (result.writeError) {
  console.error(`Write failed: ${result.writeError}`);
} else {
  console.error(`Validation failed: ${result.errors.join(', ')}`);
}
```

---

### Type: `ValidationError`

**Custom Error Class**:
```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public fileType?: 'skill' | 'agent',
    public failedChecks?: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

**Error Codes**:
- `INVALID_MARKDOWN`: Malformed markdown syntax
- `DESCRIPTION_TOO_LONG`: Skill description exceeds limit
- `INSUFFICIENT_TRIGGERS`: Skill has <3 triggers
- `TOOL_PERMISSION_MISMATCH`: Agent tools don't match fragility
- `MISSING_RATIONALE`: Extraction rationale not provided
- `NO_BEST_PRACTICES`: No Claude Code docs cited
- `INVALID_PREFIX`: Missing `speck.` prefix
- `PHASE_COUNT_INVALID`: Agent has <3 or >5 phases

---

## Integration with Agent

The transform-commands agent uses this validation API as follows:

```markdown
1. Agent analyzes command and identifies extraction opportunity
2. Agent generates skill/agent content
3. Agent constructs metadata (name, triggers, rationale, etc.)
4. Agent calls validateExtractedFile(content, type, metadata)
5a. If validation.valid === true → agent proceeds to write file
5b. If validation.valid === false → agent reviews errors and regenerates
6. Agent retries up to 3 times
7. If still failing after 3 retries → mark extraction as failed
```

**Agent's Validation Workflow**:
```typescript
// Pseudocode for agent integration
let attempts = 0;
let validation: ValidationResult;

do {
  const content = generateExtractedFile(analysis);
  validation = await validateExtractedFile(content, 'skill', metadata);

  if (!validation.valid) {
    console.error(`Validation attempt ${attempts + 1} failed:`, validation.errors);
    // Agent reviews errors and adjusts generation strategy
  }

  attempts++;
} while (!validation.valid && attempts < 3);

if (validation.valid) {
  await writeFile(metadata.filePath, content);
  recordExtractionDecision({ extracted: true, ... });
} else {
  recordExtractionDecision({ extracted: false, reason: 'validation-failed', errors: validation.errors });
}
```

---

## Performance Requirements

- Validation time: <100ms per file
- Memory usage: <10MB per validation
- Concurrent validations: Support up to 10 parallel validations

---

## Testing Contract

Validation API must have test coverage for:

1. **Skill validation**: Valid skills pass, invalid skills fail with specific errors
2. **Agent validation**: Valid agents pass, invalid agents fail with specific errors
3. **Description validation**: Length limits, third person, trigger requirements
4. **Tool permissions**: Fragility level matching for all three levels
5. **Markdown structure**: Balanced blocks, valid links, section requirements
6. **Error messages**: Clear, actionable error messages for each failure type
7. **Suggestions**: Helpful improvement suggestions for warnings
8. **Edge cases**: Empty content, very long content, special characters

Test files: `tests/validation.test.ts`
