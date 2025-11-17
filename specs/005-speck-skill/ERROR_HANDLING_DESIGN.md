# Speck Artifact Error Handling & Graceful Degradation Design

**Created**: 2025-11-17
**Context**: Designing error handling for reading Speck specification artifacts (spec.md, plan.md, tasks.md files)
**Scope**: File reading, parsing, error recovery, and user guidance for the Speck Workflow Skill and related artifact readers

---

## Executive Summary

Speck artifact files are critical to the specification-first development workflow. Users interact with these files via skill queries, slash commands, and CI/CD pipelines. This document outlines comprehensive error handling patterns that:

1. **Distinguish** between missing, empty, and malformed files
2. **Extract** partial information from incomplete files while warning users
3. **Provide** helpful recovery guidance (e.g., "Run `/speck.specify` to create spec")
4. **Maintain** usability when files are in degraded states

The strategy prioritizes **helpful guidance** over hard failures, enabling users to understand what's wrong and how to fix it.

---

## Part 1: Common Malformation Patterns

### A. File State Classification

Based on analysis of real Speck artifact files, these are the distinct states we must handle:

#### State 1: File Doesn't Exist
- **Pattern**: `File not found at /path/to/specs/003-feature/spec.md`
- **Indicators**:
  - System returns ENOENT (file not found error)
  - Feature directory exists but artifact file is missing
  - Feature directory itself doesn't exist
- **Context**: Common in early feature development before `/speck.specify` is run
- **Recovery**: Point user to the missing file and suggest command to create it

#### State 2: File Exists but Empty
- **Pattern**: `specs/003-feature/spec.md` exists with 0 bytes or only whitespace
- **Indicators**:
  - File can be read but contains no content or only newlines/comments
  - No parseable sections present
  - `wc -l` returns 0 or file.trim() === ""
- **Context**: Result of accidental creation or incomplete save
- **Recovery**: Treat as "needs content" - same as file doesn't exist

#### State 3: File Exists but Malformed (Structural Issues)
- **Pattern**: File has partial/corrupted markdown structure
- **Common Cases**:
  - **Missing mandatory headers**: No `# Feature Specification:` or `## Requirements` section
  - **Corrupted markdown**: Unclosed code blocks ` ``` `, broken links, invalid YAML frontmatter
  - **Incomplete sections**: Headers present but no content beneath them
  - **Inconsistent formatting**: Mixed heading levels (## suddenly becoming #### without intermediate #####)
  - **Invalid sub-section nesting**: `### Acceptance Scenarios` appears before `## User Scenarios & Testing`
- **Context**: Manual editing, merge conflicts, or incomplete command output
- **Recovery**: Parse what's available, warn about missing sections

#### State 4: File Exists with Content (Partial Malformation)
- **Pattern**: File has valid structure but some sections are malformed
- **Common Cases**:
  - **Missing mandatory subsections**: Spec has Requirements section but no functional requirements (FR-XXX items)
  - **Invalid list syntax**: `- Item 1` mixed with `* Item 2` mixed with `✓ Item 3`
  - **Broken acceptance scenarios**: Missing Given/When/Then structure
  - **Placeholder text**: Section headers with "[NEEDS CLARIFICATION]" or "[TODO]" markers
  - **Inconsistent numbering**: FR-001, FR-003, FR-002 (out of order)
  - **Missing links/references**: Mentions `plan.md` but file not found, references `FR-XXX` that don't exist
- **Context**: In-progress specifications during development
- **Recovery**: Extract valid content, flag problematic sections, continue processing

#### State 5: File Exists with Valid Structure (Complete)
- **Pattern**: File has all mandatory sections with proper markdown and content
- **Indicators**:
  - All required headers present
  - Proper heading hierarchy
  - All subsections have content
  - No [NEEDS CLARIFICATION] or [TODO] markers
  - Lists use consistent syntax
  - Links resolve to files that exist
- **Context**: Completed, reviewed specification
- **Recovery**: No recovery needed - process normally

### B. Specific Malformation Examples from Real Speck Files

#### Example 1: Missing Section (Incomplete spec.md)
```markdown
# Feature Specification: User Authentication

**Feature Branch**: `003-user-auth`
**Created**: 2025-11-10

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login Flow (Priority: P1)
...

## Requirements *(mandatory)*

### Functional Requirements
- FR-001: System MUST support email/password login
- FR-002: System MUST hash passwords using bcrypt

### Key Entities
... [MISSING: Success Criteria section entirely]
```

**Problem**: File missing mandatory "Success Criteria" section
**Detection**: Regex search for `## Success Criteria` returns nothing
**Recovery**: Extract what's available (scenarios, requirements) and warn: "spec.md is missing the mandatory Success Criteria section. Run `/speck.clarify` to add acceptance criteria."

#### Example 2: Incomplete Plan File (partial content)
```markdown
# Implementation Plan: Payment Gateway

## Summary
System processes credit card payments through Stripe API.

## Technical Context

Language/Version: Python 3.11
Primary Dependencies: [NEEDS CLARIFICATION]
Storage: PostgreSQL
Testing: pytest

[MISSING: Constitution Check, Project Structure, Phase sections]
```

**Problem**: File abruptly ends mid-section, missing entire phases
**Detection**: File ends before expected sections (Constitution Check, Project Structure at minimum)
**Recovery**: Extract available sections (Summary, partial Technical Context) and advise: "plan.md is incomplete. Fields marked [NEEDS CLARIFICATION] need answers. Run `/speck.clarify` to complete the plan."

#### Example 3: Invalid Acceptance Scenario Format
```markdown
### Acceptance Scenarios:

1. Given user has valid credentials When they click login Then system creates session ✓
2. User cannot login with wrong password (FAILED - what causes this?)
3. **Given** credentials expired, **When** user attempts login, **Then** system shows "Session expired" error
4. | Given | When | Then |
   | User is authenticated | System receives logout | Terminates session |
```

**Problem**: Inconsistent Given/When/Then formatting across scenarios
**Detection**:
- Scenario 1: No bold markers, all on one line
- Scenario 2: No structure keywords at all
- Scenario 3: Proper format but surrounded by invalid formats
- Scenario 4: Table format instead of sentence format

**Recovery**: Extract parseable scenarios (3), warn about others, suggest: "Acceptance Scenarios use inconsistent formatting. Some may not parse correctly. Reformat to: **Given** [state], **When** [action], **Then** [outcome]"

#### Example 4: Reference Issues (broken links)
```markdown
### User Story 1 - Complete User Profile

[See implementation plan for technical details](plan.md)  # ✓ file exists
[Check the contract in](contracts/user-model.ts)          # ✗ file doesn't exist
[Follow success criteria below](#success-criteria)        # ✗ anchor wrong (it's ## Success Criteria)

## Requirements *(mandatory)*

### Functional Requirements

- FR-001: System MUST implement authentication per [FR-100](FR-100)  # ✗ FR-100 doesn't exist in this file
- FR-002: See also [002-legacy-auth spec](specs/002-auth/spec.md)   # ✗ wrong path
```

**Problem**: Broken internal and external references
**Detection**:
- File reference doesn't exist: Check if path resolves
- Anchor reference invalid: Check if header exists with that text
- Referenced requirement not found: Validate FR-XXX exists in same file
- Cross-feature reference has wrong path: Validate specs/NUM-name pattern

**Recovery**: Extract what's valid, report broken links: "spec.md references 3 missing items: contracts/user-model.ts, FR-100, specs/002-auth/spec.md. Update these references or remove them."

---

## Part 2: Partial Information Extraction Strategy

### Design Principle: "Parse Defensively"

Extract maximum useful information even from malformed files, then warn about degradation.

### A. Extraction Algorithm

```
FOR each section header (## Level 2):
  IF section exists:
    Extract section name
    Extract content until next level-2 header
    FOR each subsection (### Level 3):
      IF subsection syntax valid:
        Extract subsection name & content
        Validate against template for this section
        Report completeness % (e.g., "75% complete")
      ELSE IF subsection partially parseable:
        Extract what's valid
        Flag problematic parts
      ELSE:
        Skip, report as unparseable
  ELSE:
    Report as missing (check if mandatory)

Return: {
  sections_found: [...],
  sections_missing: [...],
  warnings: [...],
  completeness_score: percent,
  extracted_content: {...}
}
```

### B. Specific Extraction Patterns by File Type

#### spec.md Extraction
```typescript
interface SpecExtraction {
  // Core metadata
  title: string;                    // From "# Feature Specification: ..."
  branch?: string;                  // From "Feature Branch: ..."

  // User Scenarios section
  user_stories?: {
    number: number;                 // Implicit order (User Story 1 → 1)
    title: string;                  // "User Story 1 - Brief Title"
    priority?: "P1" | "P2" | "P3";  // Optional priority
    description?: string;           // Main story text
    independent_test?: string;      // Independent Test subsection
    acceptance_scenarios?: [        // Given/When/Then statements
      {
        given: string;
        when: string;
        then: string;
        raw_text?: string;          // Store original for debugging
      }
    ];
    parsing_notes?: string[];       // Warnings about format issues
  }[];

  // Requirements section
  requirements?: {
    functional?: {
      id: string;                   // "FR-001"
      description: string;
      raw_text: string;             // Full text for reference
    }[];
    non_functional?: {
      id: string;                   // "NFR-001"
      description: string;
    }[];
    parsing_notes?: string[];
  };

  // Success Criteria section
  success_criteria?: {
    id: string;                     // "SC-001"
    description: string;
    measurable: boolean;            // Heuristic: contains numbers/percentages
    raw_text: string;
  }[];

  // Structural assessment
  completeness: {
    mandatory_sections_found: string[];    // ["User Scenarios", "Requirements"]
    mandatory_sections_missing: string[];  // ["Success Criteria"]
    optional_sections_found: string[];
    warnings: string[];
    score: number;                         // 0-100%
  };
}
```

#### plan.md Extraction
```typescript
interface PlanExtraction {
  // Core metadata
  title: string;
  branch?: string;
  spec_link?: string;

  // Technical Context section
  technical_context?: {
    language?: string;
    dependencies?: string[];
    storage?: string;
    testing_framework?: string;
    target_platform?: string;
    performance_goals?: string[];
    constraints?: string[];
    parsing_notes?: string[];
  };

  // Project Structure
  project_structure?: {
    documentation_tree?: string;    // ASCII tree
    source_tree?: string;
    parsing_notes?: string[];
  };

  // Phases (extracted in order)
  phases?: {
    name: string;                   // "Phase 1: Setup"
    description?: string;
    tasks?: string[];
    dependencies?: string[];
    estimated_effort?: string;
  }[];

  // Scope
  in_scope?: string[];
  out_of_scope?: string[];

  completeness: {
    mandatory_sections_found: string[];
    mandatory_sections_missing: string[];
    warnings: string[];
    score: number;
  };
}
```

#### tasks.md Extraction
```typescript
interface TasksExtraction {
  title: string;
  prerequisites?: string[];

  // Tasks grouped by phase
  phases?: {
    name: string;
    purpose?: string;
    tasks?: {
      id: string;                   // "T001", "T025"
      status: "pending" | "in_progress" | "completed" | "unknown";
      description: string;
      priority?: "P1" | "P2" | "P3";
      parallel?: boolean;           // "[P]" marker
      dependencies?: string[];
      estimates?: {
        time?: string;              // "2h", "1d"
        complexity?: "low" | "medium" | "high";
      };
      acceptance_criteria?: string[];
      parsing_notes?: string[];
    }[];
  }[];

  completeness: {
    total_tasks: number;
    completed_count: number;
    in_progress_count: number;
    pending_count: number;
    warnings: string[];
    score: number;
  };
}
```

### C. Graceful Degradation Rules

| State | Action | Warning Level | Message |
|-------|--------|---------------|---------|
| File missing | Return empty extraction + guidance | ERROR | "spec.md not found at `specs/003-feature/spec.md`. Create it with: `/speck.specify 'Feature description'`" |
| File empty | Return empty extraction + guidance | ERROR | "spec.md exists but is empty. Run `/speck.specify` to populate it." |
| Missing mandatory section | Return other sections + warning | WARN | "spec.md missing mandatory 'Success Criteria' section. Answers incomplete. Run `/speck.clarify` to add it." |
| Malformed subsection | Extract valid parts, skip invalid | WARN | "Acceptance Scenarios 2-4 don't follow Given/When/Then format. Extracted scenario 1 and 5 only." |
| Invalid reference | Include in content but mark | INFO | "spec.md references `contracts/user-model.ts` which doesn't exist. Link may be broken." |
| [NEEDS CLARIFICATION] marker | Extract content as-is, flag | WARN | "This spec has [NEEDS CLARIFICATION] markers. Address them with `/speck.clarify` before proceeding." |

---

## Part 3: Helpful Recovery Guidance by Scenario

### A. Guidance Rules

The principle: **Tell users exactly what's wrong and which command to run.**

#### Scenario 1: File Doesn't Exist
```
ERROR: spec.md not found
┌─────────────────────────────────────────────────────┐
│ Speck artifact not found                             │
├─────────────────────────────────────────────────────┤
│ Feature:    specs/003-user-auth/                     │
│ Missing:    spec.md                                  │
│ File type:  Feature Specification (mandatory)        │
├─────────────────────────────────────────────────────┤
│ Recovery:   Run this command:                        │
│ /speck.specify "Feature description here"           │
│                                                      │
│ Or create the file manually with a basic template.   │
└─────────────────────────────────────────────────────┘
```

**Code pattern**:
```typescript
if (!fileExists(path)) {
  if (isDirectoryPath(path)) {
    // Feature directory missing
    return {
      error: 'MISSING_FEATURE_DIR',
      message: `Feature directory '${dirname}' does not exist`,
      guidance: {
        level: 'ERROR',
        commands: [
          `/speck.specify "${featureName}" to create the entire feature`
        ],
        manual_steps: [
          `Create directory: mkdir -p ${dirname}`,
          `Create spec.md with template content`
        ]
      }
    };
  } else {
    // Artifact file missing (spec/plan/tasks)
    return {
      error: 'MISSING_ARTIFACT',
      message: `${filename} not found at ${path}`,
      guidance: {
        level: 'ERROR',
        commands: [
          getRecoveryCommand(fileType), // Returns appropriate slash command
        ],
        info: `This is a mandatory ${fileType} file. Run the command above to create it.`
      }
    };
  }
}
```

#### Scenario 2: File Empty
```
WARN: spec.md exists but is empty
┌─────────────────────────────────────────────────────┐
│ Speck artifact is empty                              │
├─────────────────────────────────────────────────────┤
│ Feature:    specs/003-user-auth/                     │
│ File:       spec.md (135 bytes, all whitespace)      │
├─────────────────────────────────────────────────────┤
│ Recovery:   Run this command:                        │
│ /speck.specify "User authentication for web app"     │
│                                                      │
│ This will populate spec.md with initial content.     │
└─────────────────────────────────────────────────────┘
```

**Code pattern**:
```typescript
if (fileContent.trim() === '') {
  return {
    error: 'EMPTY_ARTIFACT',
    message: `${filename} exists but contains no content`,
    guidance: {
      level: 'ERROR',
      commands: [getRecoveryCommand(fileType)],
      info: 'The file exists but is empty. Use the command above to populate it.'
    }
  };
}
```

#### Scenario 3: Missing Mandatory Section
```
WARN: spec.md is missing mandatory sections
┌─────────────────────────────────────────────────────┐
│ Speck specification incomplete                       │
├─────────────────────────────────────────────────────┤
│ Feature:    specs/003-user-auth/                     │
│ File:       spec.md                                  │
│ Found:      ✓ User Scenarios (2 stories)             │
│             ✓ Requirements (12 items)                │
│             ✗ Success Criteria (MISSING)             │
│             ✗ Key Entities (MISSING)                 │
├─────────────────────────────────────────────────────┤
│ Recovery:   Run this command:                        │
│ /speck.clarify                                       │
│                                                      │
│ This will help you complete the missing sections.    │
└─────────────────────────────────────────────────────┘

Extracted Content (75% complete):
- User Scenarios: 2 stories with 8 acceptance scenarios
- Requirements: 12 functional requirements
- (Awaiting: success criteria, key entities)
```

**Code pattern**:
```typescript
const extraction = parseSpec(fileContent);
const mandatory = ['User Scenarios', 'Requirements', 'Success Criteria'];
const missing = mandatory.filter(s => !extraction.completeness.mandatory_sections_found.includes(s));

if (missing.length > 0) {
  return {
    error: 'INCOMPLETE_SPEC',
    completeness_score: extraction.completeness.score,
    sections_found: extraction.completeness.mandatory_sections_found,
    sections_missing: missing,
    extracted_content: extraction,  // Return what we have
    guidance: {
      level: 'WARN',
      commands: ['/speck.clarify'],
      info: `spec.md is missing: ${missing.join(', ')}. Complete with /speck.clarify.`
    }
  };
}
```

#### Scenario 4: Malformed Subsection
```
WARN: Some acceptance scenarios have format issues
┌─────────────────────────────────────────────────────┐
│ Parsing issue in spec.md                             │
├─────────────────────────────────────────────────────┤
│ Section:    User Story 1 - Login                     │
│ Subsec:     Acceptance Scenarios                     │
│ Issue:      4 of 6 scenarios use invalid format      │
├─────────────────────────────────────────────────────┤
│ Valid:      Scenario 1, 3, 5                         │
│ Invalid:    Scenario 2, 4, 6                         │
│                                                      │
│ Expected format:                                     │
│ **Given** [state], **When** [action],                │
│ **Then** [outcome]                                   │
├─────────────────────────────────────────────────────┤
│ Recovery:   Edit spec.md to fix the format.          │
│ Or run:     /speck.clarify                           │
└─────────────────────────────────────────────────────┘
```

**Code pattern**:
```typescript
const invalidScenarios = scenarios.filter(s => !isValidGivenWhenThen(s));

if (invalidScenarios.length > 0) {
  return {
    error: 'MALFORMED_SUBSECTION',
    subsection: 'Acceptance Scenarios',
    valid_count: scenarios.length - invalidScenarios.length,
    invalid_count: invalidScenarios.length,
    extracted: scenarios.filter(s => isValidGivenWhenThen(s)),
    guidance: {
      level: 'WARN',
      manual_fix: `Edit the following in spec.md: ${invalidScenarios.map(s => s.raw_text).join('\n')}`,
      format_help: `Use: **Given** [condition], **When** [action], **Then** [result]`
    }
  };
}
```

#### Scenario 5: [NEEDS CLARIFICATION] Markers Present
```
WARN: spec.md contains unresolved clarification markers
┌─────────────────────────────────────────────────────┐
│ Specification has open questions                     │
├─────────────────────────────────────────────────────┤
│ File:       spec.md                                  │
│ Found:      3 [NEEDS CLARIFICATION] markers          │
│ Locations:  - Requirements section (FR-005)          │
│             - Success Criteria (SC-002)              │
│             - Dependencies section                   │
├─────────────────────────────────────────────────────┤
│ Recovery:   Address these clarifications:            │
│ /speck.clarify                                       │
│                                                      │
│ The tool will help you resolve open questions.       │
└─────────────────────────────────────────────────────┘
```

**Code pattern**:
```typescript
const clarifications = extraction.raw_content.match(/\[NEEDS CLARIFICATION\]/g);

if (clarifications && clarifications.length > 0) {
  return {
    error: 'UNRESOLVED_CLARIFICATIONS',
    count: clarifications.length,
    guidance: {
      level: 'WARN',
      commands: ['/speck.clarify'],
      info: `spec.md has ${clarifications.length} unresolved clarification markers. Use /speck.clarify to address them.`
    }
  };
}
```

#### Scenario 6: Broken Internal References
```
WARN: spec.md references files that don't exist
┌─────────────────────────────────────────────────────┐
│ File reference issues found                          │
├─────────────────────────────────────────────────────┤
│ File:       spec.md                                  │
│ Broken:     3 references                             │
│             ✗ plan.md (file doesn't exist)           │
│             ✗ contracts/user-model.ts (not found)    │
│             ✗ specs/002-auth/spec.md (wrong path)    │
├─────────────────────────────────────────────────────┤
│ Recovery:   Create the missing files or update refs: │
│ 1. Run /speck.plan to create plan.md                 │
│ 2. Check if contracts are in a different location    │
│ 3. Verify feature 002 path and update reference      │
└─────────────────────────────────────────────────────┘
```

**Code pattern**:
```typescript
const brokenRefs = findBrokenReferences(extraction);

if (brokenRefs.length > 0) {
  return {
    error: 'BROKEN_REFERENCES',
    references: brokenRefs.map(r => ({
      original: r.text,
      target: r.path,
      exists: false,
      suggestion: suggestFix(r)
    })),
    guidance: {
      level: 'INFO',
      manual_steps: brokenRefs.map(r => r.suggestion)
    }
  };
}
```

---

## Part 4: File State Distinction Logic

### A. Decision Tree Algorithm

```
ReadArtifactFile(path, fileType):

  // Level 0: Check if file can be read
  TRY read file contents
    content := read(path)
  CATCH FileNotFound:
    RETURN missing_file_error(path, fileType)
  CATCH PermissionDenied:
    RETURN permission_error(path)
  CATCH IOError as e:
    RETURN io_error(e, path)

  // Level 1: Check if file has content
  IF content.trim().isEmpty():
    RETURN empty_file_error(path, fileType)

  // Level 2: Parse file structure
  TRY parsed := parse_markdown_with_frontmatter(content)
  CATCH ParseError as e:
    RETURN malformed_file_error(path, e)

  // Level 3: Extract and validate sections
  extraction := extract_sections_by_type(parsed, fileType)

  // Level 4: Check for mandatory sections
  mandatory := get_mandatory_sections(fileType)
  missing := mandatory.filter(s => !extraction.has_section(s))

  IF missing.length > 0:
    extraction.warnings.push("Missing sections: " + missing.join(", "))
    // Continue - return extraction with warnings

  // Level 5: Validate subsections
  FOR each section in extraction.sections:
    IF is_malformed(section):
      extraction.warnings.push("Malformed: " + section.name)
      extraction.partially_valid = true
      continue  // Skip this section but keep others

  // Level 6: Check for common markers
  IF extraction.raw_content.includes("[NEEDS CLARIFICATION]"):
    extraction.warnings.push("Unresolved clarifications present")

  // Level 7: Validate cross-references
  broken_refs := find_broken_references(extraction)
  IF broken_refs.length > 0:
    extraction.warnings.push("Broken references: " + broken_refs.join(", "))

  // Return result with extraction + guidance
  RETURN {
    status: determine_status(missing, malformed, broken_refs),
    extraction: extraction,
    completeness: calculate_completeness(extraction, fileType),
    guidance: generate_guidance(missing, malformed, broken_refs, fileType)
  }
```

### B. Status Classification

```typescript
type ArtifactStatus =
  | 'MISSING'              // File doesn't exist
  | 'EMPTY'                // File exists but empty
  | 'MALFORMED'            // File unparseable
  | 'INCOMPLETE'           // Missing mandatory sections
  | 'DEGRADED'             // Has content but issues (malformed subsections, broken refs)
  | 'WARNING'              // Complete but has warnings (unresolved clarifications)
  | 'VALID';               // Complete and valid

function determineStatus(extraction): ArtifactStatus {
  if (!extraction) return 'MISSING';
  if (extraction.isEmpty) return 'EMPTY';
  if (extraction.isMalformed) return 'MALFORMED';
  if (extraction.missingMandatorySections.length > 0) return 'INCOMPLETE';
  if (extraction.malformedSubsections.length > 0) return 'DEGRADED';
  if (extraction.hasUnresolvedClarifications) return 'WARNING';
  return 'VALID';
}
```

---

## Part 5: Implementation Examples

### Example 1: Skill Reading spec.md

```typescript
// In .claude/skills/speck-workflow.md or similar

async function readSpecification(featureRef: string): Promise<SpecificationData> {
  // Resolve feature reference to path
  const featurePath = resolveFeaturePath(featureRef);
  const specPath = `${featurePath}/spec.md`;

  // Attempt to read and parse
  const result = await readArtifact(specPath, 'spec');

  // Handle errors gracefully
  if (result.status === 'MISSING') {
    console.error(`
Feature specification not found for: ${featureRef}
Location: ${specPath}

To create a specification, run:
  /speck.specify "Brief description of the feature"

This will create ${specPath} with the proper structure.
    `);
    return null;
  }

  if (result.status === 'EMPTY') {
    console.error(`
Specification file exists but is empty: ${specPath}

To populate it, run:
  /speck.specify "Brief description of the feature"
    `);
    return null;
  }

  if (result.status === 'INCOMPLETE') {
    console.warn(`
⚠️  Specification is incomplete (${result.completeness}% complete)

Missing sections: ${result.extraction.missingMandatorySections.join(', ')}

To complete it, run:
  /speck.clarify

Available content:
${summarizeExtraction(result.extraction)}
    `);
    return result.extraction;  // Return what we have + warnings
  }

  if (result.status === 'DEGRADED') {
    console.warn(`
⚠️  Specification has parsing issues but is partially readable

Issues found:
${result.extraction.warnings.join('\n')}

Available content:
${summarizeExtraction(result.extraction)}
    `);
    return result.extraction;  // Return what we have + warnings
  }

  // Valid or warning status - proceed
  return result.extraction;
}
```

### Example 2: Slash Command Using readArtifact

```typescript
// In /speck.analyze command

async function analyzeSpec(featureRef: string) {
  const result = await readArtifact(
    `specs/${featureRef}/spec.md`,
    'spec'
  );

  switch(result.status) {
    case 'MISSING':
      return `
Specification not found. Create it with:
  /speck.specify "${featureRef}"
      `;

    case 'EMPTY':
      return `
Specification exists but is empty. Populate it with:
  /speck.specify "${featureRef}"
      `;

    case 'INCOMPLETE':
    case 'DEGRADED':
      return `
Specification is ${result.completeness}% complete.

${result.extraction.user_stories ?
  `User Stories: ${result.extraction.user_stories.length}` :
  'No user stories found'
}

${result.extraction.requirements?.functional ?
  `Functional Requirements: ${result.extraction.requirements.functional.length}` :
  'No functional requirements found'
}

Completeness score: ${result.completeness}%

${result.guidance.commands.length > 0 ?
  `\nTo improve:\n${result.guidance.commands.map(c => '  ' + c).join('\n')}` :
  ''
}
      `;

    case 'VALID':
    case 'WARNING':
      // Full analysis possible
      return performFullAnalysis(result.extraction);
  }
}
```

### Example 3: CI/CD Validation

```typescript
// In build validation script

async function validateAllArtifacts(): Promise<ValidationReport> {
  const features = discoverFeatures();
  const results = [];

  for (const feature of features) {
    const specResult = await readArtifact(`specs/${feature}/spec.md`, 'spec');
    const planResult = await readArtifact(`specs/${feature}/plan.md`, 'plan');
    const tasksResult = await readArtifact(`specs/${feature}/tasks.md`, 'tasks');

    // Check for required progression
    if (specResult.status === 'VALID' || specResult.status === 'WARNING') {
      if (planResult.status === 'MISSING') {
        results.push({
          feature,
          error: `spec.md exists but plan.md missing. Run: /speck.plan`
        });
      }
    }

    // Aggregate issues
    if (['MISSING', 'EMPTY', 'MALFORMED'].includes(specResult.status)) {
      results.push({
        feature,
        error: specResult.guidance.info,
        recovery_commands: specResult.guidance.commands
      });
    }
  }

  return {
    total_features: features.length,
    valid: results.filter(r => !r.error).length,
    issues: results.filter(r => r.error),
    recovery_steps: aggregateRecoveryCommands(results)
  };
}
```

---

## Part 6: Error Message Taxonomy

### Error Severity Levels

```
CRITICAL  - Application cannot proceed without action
  Examples: File not found, completely unparseable, corrupted data

ERROR     - Feature cannot be used, user action required
  Examples: Empty file, missing mandatory sections, broken primary references

WARN      - Feature degraded or incomplete, should be addressed
  Examples: Malformed subsections, unresolved clarifications, broken secondary refs

INFO      - Informational, no action required but helpful context
  Examples: File parsed successfully, recovered partial data, soft deprecation
```

### Standard Error Message Format

```
[SEVERITY]: [Brief error]
┌──────────────────────────────────────────────────────┐
│ [Descriptive title]                                  │
├──────────────────────────────────────────────────────┤
│ Context information:                                  │
│ - Item 1                                             │
│ - Item 2                                             │
├──────────────────────────────────────────────────────┤
│ Recovery action:                                     │
│ Command: [exact command to run]                      │
│ Or: [manual steps]                                   │
└──────────────────────────────────────────────────────┘

[Optional: extracted content summary]
```

---

## Summary Table: Decision Framework

| File State | Detection | Status | Extraction | Guidance | Return |
|-----------|-----------|--------|-----------|----------|--------|
| Non-existent | Path not found | MISSING | None | Create with `/speck.specify` or manual steps | Error |
| Empty | Exists but 0 bytes or whitespace only | EMPTY | None | Create with `/speck.specify` or manual steps | Error |
| Malformed | Parse fails, invalid markdown | MALFORMED | None | Edit to fix, or regenerate | Error |
| Missing sections | Required headers missing | INCOMPLETE | Partial | Run `/speck.clarify` | Warn + partial data |
| Invalid subsections | Subsection unparseable | DEGRADED | Partial | Fix manually or run recovery command | Warn + partial data |
| Unresolved clarifications | Contains [NEEDS CLARIFICATION] | WARNING | Complete | Run `/speck.clarify` | Warn + data |
| Broken references | Links don't resolve | INFO/WARN | Complete | Update/create referenced files | Info + data |
| Valid | All checks pass | VALID | Complete | None | OK |

---

## Rationale & Alternatives

### Decision: Graceful Degradation Over Hard Failures

**Rationale**:
- Specifications are living documents that evolve over time
- Users benefit from partial information even when files are incomplete
- Hard failures prevent useful analysis and guidance
- Users can fix issues incrementally, not all at once

**Alternatives Considered**:
1. **Strict validation** - Reject any file with issues
   - Con: Blocks users from using valuable features during development
   - Con: No intermediate feedback, harder to diagnose issues

2. **Lenient parsing** - Extract everything, no warnings
   - Con: Users don't know what's wrong, continue with incorrect assumptions
   - Con: Difficult to improve specifications without feedback

3. **Middle ground (chosen)** - Extract what's valid, warn about issues, provide guidance
   - Pro: Users get value from incomplete work
   - Pro: Clear feedback on what needs improvement
   - Pro: Actionable recovery paths (specific commands)

### Decision: Structured Error Messages

**Rationale**:
- Users need to understand exactly what's wrong
- Users need clear next steps (commands, file edits, etc.)
- Consistent format aids learning and reduces support burden
- Easy to parse programmatically for CI/CD integration

**Alternatives Considered**:
1. **Single-line errors** - "spec.md missing"
   - Con: No guidance, users stuck

2. **Verbose prose** - Long paragraph explanations
   - Con: Hard to scan, unclear what action to take

3. **Structured boxes + commands (chosen)** - Clear visual hierarchy
   - Pro: Scannable, actionable guidance
   - Pro: Commands ready to copy-paste

### Decision: Template-Based Validation

**Rationale**:
- Spec-kit already defines standard structures
- Templates are source of truth for what "complete" looks like
- Flexible enough to handle variations during development
- Enables meaningful completeness scoring

**Alternatives Considered**:
1. **Hard-coded structure checks** - Enum of required sections
   - Con: Brittle when templates change
   - Con: Can't evolve gracefully

2. **No validation** - Accept any markdown
   - Con: No guidance, users have no idea if they're complete

3. **Template-based (chosen)** - Compare to templates during parsing
   - Pro: Single source of truth (templates)
   - Pro: Can be updated centrally
   - Pro: Explains *why* sections are needed

---

## Appendix: Testing Error Handling

### Test Cases by Scenario

#### Test 1: Missing File
```gherkin
Scenario: Reading non-existent spec.md
  Given no spec.md exists at specs/999-missing/
  When I query about feature 999
  Then system returns MISSING status
  And provides command: /speck.specify "..."
  And does not throw exception
```

#### Test 2: Empty File
```gherkin
Scenario: Reading empty spec.md
  Given spec.md exists with 0 bytes at specs/001-auth/
  When I query about feature 001
  Then system returns EMPTY status
  And extraction is null
  And guidance suggests /speck.specify
```

#### Test 3: Partial Content
```gherkin
Scenario: Reading incomplete spec.md
  Given spec.md has User Scenarios but missing Success Criteria
  When I query about feature requirements
  Then system returns INCOMPLETE status
  And extraction.user_stories has data
  And extraction.success_criteria is null
  And completeness < 100%
  And warning lists missing sections
```

#### Test 4: Malformed Scenarios
```gherkin
Scenario: Reading spec with malformed acceptance scenarios
  Given spec.md has mixed Given/When/Then formats
  When I parse acceptance scenarios
  Then system returns DEGRADED status
  And extraction contains valid scenarios only
  And warning lists malformed scenarios
  And suggestion shows correct format
```

---

**End of Error Handling Design Document**
