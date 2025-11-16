# Extraction API Contract

**Feature**: 003-refactor-transform-commands
**Date**: 2025-11-15
**Type**: Agent Interface Specification

## Overview

The extraction API defines how the transform-commands agent analyzes preprocessed command files to extract skills and agents, recording all decisions in transformation history.

## Agent: `speck.transform-commands`

### Input Contract

**Invocation**: Called from `/speck.transform-upstream` command or programmatically via Task tool.

**Required Inputs**:
- `preprocessedFile` (string): Absolute path to preprocessed command file
- `originalFile` (string): Absolute path to original upstream command file (for reference)
- `bestPracticesRef` (string): Path or URL to Claude Code best practices documentation

**Optional Inputs**:
- `extractionThresholds` (object): Custom thresholds for extraction decisions
  - `minComplexity` (number, default: 50): Minimum lines or functions to extract
  - `minReusability` (number, default: 2): Minimum number of commands that would use this
  - `minTriggers` (number, default: 3): Minimum auto-invoke triggers for skills
- `outputDirs` (object): Custom output directories
  - `skills` (string, default: `.claude/skills/`): Where to write extracted skills
  - `agents` (string, default: `.claude/agents/`): Where to write extracted agents
  - `commands` (string, default: `.claude/commands/`): Where to write transformed command
- `dryRun` (boolean, default: false): If true, perform analysis but don't write files

**Example Invocation**:
```markdown
Analyze the preprocessed command file at `.claude/commands/speck.specify.md` (original: `upstream/spec-kit/current/commands/speckit.specify.md`).

Extract skills and agents following Claude Code best practices from https://docs.claude.com/en/docs/claude-code/claude_code_docs_map.md.

Use extraction thresholds: minComplexity=50, minReusability=2, minTriggers=3.

Record all extraction decisions (positive and negative) in transformation history.
```

---

### Output Contract

**Primary Output**: `ExtractionResult` object

```typescript
interface ExtractionResult {
  success: boolean;
  preprocessedFile: string;
  originalFile: string;

  // Extraction outcomes
  skillsExtracted: ExtractedSkillMetadata[];
  agentsExtracted: ExtractedAgentMetadata[];
  transformedCommand: TransformedCommandMetadata;

  // Decision tracking
  extractionDecisions: ExtractionDecision[];

  // Validation
  validationErrors: string[];
  validationWarnings: string[];

  // Performance
  durationMs: number;
  tokensUsed?: number;
}
```

**Extracted Skill Metadata**:
```typescript
interface ExtractedSkillMetadata {
  name: string; // e.g., "speck.validation"
  filePath: string; // e.g., ".claude/skills/speck.validation.md"
  description: string; // Third-person, with triggers, <1024 chars
  triggers: string[]; // Array of 3+ trigger terms
  complexity: number; // Lines or functions extracted
  reusability: number; // Estimated usage by N commands
  rationale: string; // Explanation citing best practices
  bestPracticesCited: string[]; // URLs or section references
  content: string; // Full markdown content
}
```

**Extracted Agent Metadata**:
```typescript
interface ExtractedAgentMetadata {
  name: string; // e.g., "speck.validator"
  filePath: string; // e.g., ".claude/agents/speck.validator.md"
  objective: string; // Single clear purpose
  toolPermissions: string[]; // Based on fragility level
  fragilityLevel: 'high' | 'medium' | 'low';
  phaseCount: number; // Should be 3-5
  complexity: number; // Logical steps or file operations
  reusability: number; // Estimated usage by N commands
  rationale: string; // Explanation citing best practices
  bestPracticesCited: string[]; // URLs or section references
  content: string; // Full markdown content
}
```

**Transformed Command Metadata**:
```typescript
interface TransformedCommandMetadata {
  originalPath: string;
  outputPath: string;
  content: string;
  skillReferences: string[]; // Paths to referenced skills
  agentReferences: string[]; // Paths to referenced agents
  referencesAdded: number; // How many references were added
}
```

**Extraction Decision**:
```typescript
interface ExtractionDecision {
  sourceSection: string; // Which section of command was analyzed
  extracted: boolean; // True if extraction occurred
  extractedType?: 'skill' | 'agent'; // Type if extracted
  extractedName?: string; // Name if extracted
  rationale: string; // Why extracted OR why not extracted
  criteriaApplied: {
    size?: number; // Line count or function count
    complexity?: number; // Logical steps or operations
    reusability?: number; // Estimated usage
    triggers?: string[]; // For skills
  };
  bestPracticesCited: string[]; // Relevant documentation
}
```

---

### Behavioral Requirements

**The agent MUST**:
1. Analyze the entire preprocessed command file holistically (not just line-by-line)
2. Apply extraction thresholds from research.md (or custom thresholds if provided)
3. Record ALL extraction decisions (both "extracted X because Y" and "did not extract Z because W")
4. Generate valid skill files with:
   - Third-person descriptions under 1024 chars
   - 3+ trigger terms for auto-invoke
   - Rationale citing specific Claude Code best practices
5. Generate valid agent files with:
   - Single clear objective
   - Tool permissions matching fragility level
   - 3-5 execution phases
   - Rationale citing specific Claude Code best practices
6. Update the transformed command file to reference all extracted skills/agents
7. Pass all generated files to validation API before marking success
8. Update transformation-history.json with extraction decisions

**The agent MUST NOT**:
1. Perform any text replacements (preprocessing is already complete)
2. Calculate complexity scores mechanically (use holistic semantic understanding)
3. Write files directly (must use validation API as intermediary)
4. Extract recursively from already-extracted agents/skills
5. Assume extraction is always desirable (must justify decisions)

---

### Validation Integration

Before writing any extracted files, the agent must call the validation API:

**Validation Flow**:
```
1. Agent generates skill/agent content
2. Agent calls validateExtractedFile(content, type, metadata)
3. If validation PASSES → proceed to write
4. If validation FAILS → agent receives errors and must regenerate content
5. Retry up to 3 times; if still failing, mark as extraction failure
```

**Validation API Signature**:
```typescript
async function validateExtractedFile(
  content: string,
  fileType: 'skill' | 'agent',
  metadata: ExtractedSkillMetadata | ExtractedAgentMetadata
): Promise<ValidationResult>
```

See [validation-api.md](validation-api.md) for full contract.

---

### Error Handling

**Agent Errors**:
- `PREPROCESSING_NOT_COMPLETE`: Preprocessed file has validation errors
- `BEST_PRACTICES_UNAVAILABLE`: Cannot access Claude Code documentation
- `VALIDATION_FAILED_REPEATEDLY`: Extracted file failed validation 3+ times
- `TRANSFORMATION_HISTORY_WRITE_FAILED`: Cannot update transformation-history.json

**Agent Warnings** (non-fatal):
- `NO_EXTRACTION_OPPORTUNITIES`: No skills/agents identified (valid if command is simple)
- `PARTIAL_EXTRACTION`: Some sections analyzed, others skipped due to complexity
- `LOW_CONFIDENCE`: Extraction decisions have low confidence scores

---

### Performance Requirements

- Total extraction time: <30 seconds per command file (including validation)
- Token efficiency: Prefer concise analysis over verbose explanations
- Memory usage: <200MB for single command file analysis

---

### Example Agent Output

**Scenario**: Analyzing `speck.specify.md` command

**Agent Report**:
```markdown
## Extraction Analysis Complete

**File**: .claude/commands/speck.specify.md
**Original**: upstream/spec-kit/current/commands/speckit.specify.md
**Duration**: 18.4s

### Skills Extracted: 2

1. **speck.spec-validation** (.claude/skills/speck.spec-validation.md)
   - **Description**: "Validates feature specifications for completeness, checking required sections, testability, and technology-agnostic language. Auto-invokes when users create or review spec.md files."
   - **Triggers**: ["spec.md", "feature specification", "validate requirements"]
   - **Complexity**: 75 lines, 4 functions
   - **Reusability**: Used by 3+ commands (specify, clarify, analyze)
   - **Rationale**: Reusable validation logic appears in multiple commands. Extracted per "Skills for Reusable Patterns" best practice (https://docs.claude.com/skills-guide#reusable-patterns). Auto-invoke pattern matches "when users create or review spec.md" trigger.

2. **speck.constitution-check** (.claude/skills/speck.constitution-check.md)
   - **Description**: "Evaluates feature plans against project constitution principles, flagging violations and requiring justification. Auto-invokes during plan and analyze phases."
   - **Triggers**: ["constitution", "quality gate", "plan validation"]
   - **Complexity**: 60 lines, 3 functions
   - **Reusability**: Used by 2+ commands (plan, analyze)
   - **Rationale**: Constitution checking is a cross-cutting concern. Extracted per "Auto-Invoke Patterns" best practice (https://docs.claude.com/skills-guide#auto-invoke). Triggers align with usage context.

### Agents Extracted: 0

**No agents extracted** - command workflow is linear without parallelizable subtasks or fragile operations requiring isolation.

### Extraction Decisions (Non-Extracted)

1. **Section: "Generate spec from user input"**
   - **Extracted**: No
   - **Rationale**: Single-use template rendering specific to specify command. Does not meet reusability threshold (used by only 1 command). Complexity (30 lines) below extraction threshold (50 lines).
   - **Criteria**: size=30, reusability=1, complexity=2 functions

2. **Section: "Save spec to file"**
   - **Extracted**: No
   - **Rationale**: Tight coupling with command's main flow. No auto-invoke triggers. Does not benefit from agent isolation (no fragile operations).
   - **Criteria**: size=15, complexity=1 file operation

### Transformed Command

**File**: .claude/commands/speck.specify.md
**References Added**: 2
- Uses `speck.spec-validation` for validation (line 45)
- Uses `speck.constitution-check` for quality gates (line 78)

### Validation Status

✅ All extracted files passed validation
- speck.spec-validation.md: PASS (description=287 chars, triggers=3, valid markdown)
- speck.constitution-check.md: PASS (description=312 chars, triggers=3, valid markdown)
- speck.specify.md: PASS (references valid, structure correct)

### Transformation History Updated

Added 4 extraction decisions (2 positive, 2 negative) to transformation-history.json
```

---

## Testing Contract

Agent behavior must be tested for:

1. **Extraction scenarios**: Commands with clear skill/agent patterns
2. **No-extraction scenarios**: Simple commands with no extractable logic
3. **Mixed scenarios**: Commands with both extractable and non-extractable sections
4. **Edge cases**: Very complex commands, very simple commands, malformed commands
5. **Validation integration**: Files passing/failing validation
6. **Error handling**: Missing best practices docs, validation failures, write failures
7. **Decision tracking**: All decisions recorded in transformation history

Test files: `tests/extraction.test.ts`
