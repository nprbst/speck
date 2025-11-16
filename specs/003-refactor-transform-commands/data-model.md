# Data Model: Refactor Transform Commands Agent

**Feature**: 003-refactor-transform-commands
**Date**: 2025-11-15
**Status**: Phase 1 Design

## Overview

This feature introduces or enhances several key entities to support the separation of preprocessing (TypeScript) from extraction (agent), along with validation and error reporting.

## Entities

### 1. Upstream Command File

**Description**: A spec-kit command markdown file from the upstream repository.

**Fields**:
- `filePath` (string): Absolute path to the upstream command file
- `fileName` (string): Base name of the file (e.g., `specify.md`)
- `content` (string): Raw markdown content of the command
- `encoding` (string): File encoding (default: UTF-8)
- `size` (number): File size in bytes

**Relationships**:
- Transformed into exactly one `Transformed Command File`
- May produce zero or more `Extracted Skill File` entities
- May produce zero or more `Extracted Agent File` entities

**Validation Rules**:
- Must be a `.md` file
- Must be UTF-8 encoded
- Must be under 50KB in size
- Must contain frontmatter or standard section headings

**State Transitions**:
- `Pending` → `Preprocessing` → `Agent Analysis` → `Validated` → `Written`
- `Pending` → `Preprocessing` → `Failed` (if preprocessing errors occur)

---

### 2. Transformed Command File

**Description**: The speck-native version of the upstream command with updated prefixes, paths, and references.

**Fields**:
- `originalPath` (string): Path to the source upstream file
- `outputPath` (string): Destination path with `speck.` prefix (e.g., `.claude/commands/speck.specify.md`)
- `content` (string): Preprocessed and transformed markdown content
- `prefixesApplied` (boolean): Whether `speck.` prefix was applied
- `pathsNormalized` (boolean): Whether `.specify/` → `.speck/` replacements completed
- `referencesUpdated` (boolean): Whether command references were updated
- `skillReferences` (string[]): Array of extracted skill file paths referenced in this command
- `agentReferences` (string[]): Array of extracted agent file paths referenced in this command

**Relationships**:
- Derived from exactly one `Upstream Command File`
- References zero or more `Extracted Skill File` entities
- References zero or more `Extracted Agent File` entities

**Validation Rules**:
- Must have `speck.` prefix in filename
- Must use `.speck/` paths (not `.specify/`)
- All skill/agent references must point to valid extracted files
- Must be valid markdown syntax

**State Transitions**:
- Created after preprocessing completes
- Updated with references after extraction completes
- Written to disk after validation passes

---

### 3. Extracted Skill File

**Description**: A standalone skill markdown file containing reusable, auto-invoked logic.

**Fields**:
- `filePath` (string): Output path in `.claude/skills/` directory
- `name` (string): Skill name with `speck.` prefix (e.g., `speck.validation`)
- `description` (string): Third-person description with triggers (max 1024 chars)
- `content` (string): Full markdown content including implementation
- `triggers` (string[]): Array of auto-invoke trigger terms (minimum 3)
- `reusabilityScore` (number): Calculated score based on extraction criteria
- `extractionRationale` (string): Explanation citing Claude Code best practices

**Relationships**:
- Extracted from exactly one `Upstream Command File`
- Referenced by one or more `Transformed Command File` entities
- May reference other `Extracted Skill File` entities (progressive disclosure)

**Validation Rules**:
- Description must be third person
- Description must be under 1024 characters
- Description must contain 3+ trigger terms
- Must have valid markdown structure
- File must be in `.claude/skills/` directory
- Name must have `speck.` prefix
- Extraction rationale must cite specific Claude Code best practices

**State Transitions**:
- `Identified` → `Generated` → `Validated` → `Written`
- `Identified` → `Rejected` (if validation fails, agent must correct)

---

### 4. Extracted Agent File

**Description**: A standalone agent markdown file containing delegated work with tool permissions.

**Fields**:
- `filePath` (string): Output path in `.claude/agents/` directory
- `name` (string): Agent name with `speck.` prefix (e.g., `speck.validator`)
- `objective` (string): Single clear purpose statement
- `toolPermissions` (string[]): Array of allowed tools based on fragility level
- `fragilityLevel` (string): One of `high` (read-only), `medium` (controlled write), `low` (full access)
- `content` (string): Full markdown content including phases and workflows
- `phaseCount` (number): Number of execution phases (target: 3-5)
- `extractionRationale` (string): Explanation citing Claude Code best practices

**Relationships**:
- Extracted from exactly one `Upstream Command File`
- Referenced by one or more `Transformed Command File` entities
- May invoke other `Extracted Agent File` or `Extracted Skill File` entities (composition)

**Validation Rules**:
- Must have single clear objective
- Phase count must be 3-5
- Tool permissions must match fragility level:
  - High: `[Read, Grep, Glob]`
  - Medium: `[Read, Write, Edit, Grep, Glob]`
  - Low: `*` (all tools)
- File must be in `.claude/agents/` directory
- Name must have `speck.` prefix
- Extraction rationale must cite specific Claude Code best practices

**State Transitions**:
- `Identified` → `Generated` → `Validated` → `Written`
- `Identified` → `Rejected` (if validation fails, agent must correct)

---

### 5. Transformation History Entry

**Description**: Enhanced entry in the existing `transformation-history.json` file.

**Fields** (existing):
- `timestamp` (string): ISO 8601 timestamp
- `upstreamVersion` (string): Spec-kit version transformed
- `filesTransformed` (string[]): List of command files processed

**Fields** (new/enhanced):
- `extractionDecisions` (object[]): Array of extraction decision records
  - `sourceFile` (string): Upstream command file path
  - `extracted` (boolean): Whether extraction occurred
  - `extractedType` (string): One of `skill`, `agent`, `both`, `none`
  - `extractedFiles` (string[]): Paths to created skill/agent files
  - `rationale` (string): Explanation for extraction decision (positive or negative)
  - `criteriaApplied` (object): Heuristic scores
    - `size` (number): Line count or function count
    - `reusability` (number): Used by N commands score
    - `complexity` (number): Logical steps or file operations count
  - `bestPracticesCited` (string[]): URLs or section references to Claude Code docs

**Relationships**:
- Tracks transformations from `Upstream Command File` entities
- References created `Extracted Skill File` and `Extracted Agent File` entities

**Validation Rules**:
- Must record ALL extraction decisions (both positive and negative)
- Rationale must be non-empty
- Criteria applied must include at least one heuristic metric
- Best practices cited must include at least one reference

---

### 6. Error Report

**Description**: Summary document produced after batch transformations listing failures.

**Fields**:
- `timestamp` (string): ISO 8601 timestamp of batch completion
- `totalFiles` (number): Total upstream files processed
- `successfulFiles` (number): Files transformed without errors
- `failedFiles` (number): Files that encountered errors
- `failures` (object[]): Array of failure records
  - `filePath` (string): Upstream command file that failed
  - `stage` (string): Where failure occurred (`preprocessing`, `extraction`, `validation`, `write`)
  - `errorMessage` (string): Specific error details
  - `stackTrace` (string): Optional stack trace for debugging

**Relationships**:
- Aggregates failures across multiple `Upstream Command File` processing attempts

**Validation Rules**:
- Must be generated at end of batch transformation (even if zero failures)
- Each failure must specify stage and error message
- totalFiles = successfulFiles + failedFiles

**State Transitions**:
- Created at batch completion
- Appended to as failures occur during batch processing

---

### 7. Preprocessing Rules

**Description**: Deterministic text transformation patterns applied to all upstream commands.

**Fields**:
- `ruleName` (string): Descriptive name (e.g., `add-speck-prefix`)
- `pattern` (string): Regular expression or literal string to match
- `replacement` (string): Replacement string or pattern
- `scope` (string): Where to apply (`filename`, `content`, `frontmatter`, `all`)
- `order` (number): Execution order (lower runs first)

**Relationships**:
- Applied to all `Upstream Command File` entities
- Produces `Transformed Command File` entities

**Validation Rules**:
- Pattern must be valid regex or literal string
- Replacement must be non-null
- Scope must be one of predefined values
- Order must be unique among rules

**State Transitions**:
- Loaded at preprocessing initialization
- Applied sequentially by order

**Example Rules**:
1. `add-speck-prefix`: `/speckit.` → `/speck.` in content
2. `normalize-paths`: `.specify/` → `.speck/` in content
3. `update-command-refs`: `speckit.taskname` → `speck.taskname` in references

---

### 8. Best Practices Reference

**Description**: Corpus of Claude Code authoring guidelines for commands, skills, agents.

**Fields**:
- `source` (string): URL or file path to documentation
- `cacheDate` (string): When documentation was cached
- `version` (string): Documentation version if available
- `sections` (object[]): Indexed sections for quick lookup
  - `sectionName` (string): Topic (e.g., `skill-descriptions`, `tool-permissions`)
  - `content` (string): Markdown content
  - `url` (string): Direct link to section

**Relationships**:
- Referenced by transform-commands agent during extraction
- Cited in `Extracted Skill File` and `Extracted Agent File` rationales

**Validation Rules**:
- Must be accessible (online or cached locally)
- Cache must refresh if older than 30 days
- Sections must be indexed for efficient lookup

**State Transitions**:
- `Uncached` → `Fetching` → `Cached` → `Stale` → `Fetching` (refresh cycle)

---

## Entity Relationships Diagram

```text
┌─────────────────────┐
│ Upstream Command    │
│ File                │
└──────┬──────────────┘
       │ 1
       │ transforms to
       ▼ 1
┌─────────────────────┐        ┌─────────────────────┐
│ Transformed         │────────│ Preprocessing       │
│ Command File        │ applies│ Rules               │
└──────┬──────────────┘        └─────────────────────┘
       │ 0..*
       │ references
       ▼ 0..*
┌──────────────────────┬─────────────────────┐
│ Extracted Skill File │ Extracted Agent File│
└──────────────────────┴─────────────────────┘
       │                         │
       │ cites                   │ cites
       ▼ 1..*                    ▼ 1..*
┌─────────────────────────────────────────┐
│ Best Practices Reference                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Transformation History Entry            │
│ (records extraction decisions)          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Error Report                            │
│ (aggregates batch failures)             │
└─────────────────────────────────────────┘
```

## Notes

- All file paths are absolute paths
- Validation occurs after generation but before writes to disk
- Extraction decisions (both positive and negative) are recorded in transformation history
- Progressive disclosure patterns allow skills to reference other skills
- Composition patterns allow agents to invoke other agents or skills
