# Contract: File Interpretation

**Feature**: 005-speck-skill
**Date**: 2025-11-17
**Purpose**: Define the contract for how the skill interprets Speck artifact files

---

## Overview

This contract specifies how the Speck Workflow Skill reads and interprets spec.md, plan.md, and tasks.md files, including handling of malformed or incomplete files.

---

## Input Schema

```typescript
interface InterpretFileRequest {
  filePath: string;          // Absolute path to artifact file
  fileType: 'spec' | 'plan' | 'tasks';
  templatePath: string;      // Path to corresponding template file
  validationLevel: 'strict' | 'lenient';  // How strict to validate
}
```

### Example Input

```json
{
  "filePath": "/Users/nathan/git/github.com/nprbst/speck-005-speck-skill/specs/005-speck-skill/spec.md",
  "fileType": "spec",
  "templatePath": ".specify/templates/spec-template.md",
  "validationLevel": "lenient"
}
```

---

## Output Schema

```typescript
interface FileInterpretation {
  status: FileStatus;
  completeness: number;      // 0-100 percentage
  data: ArtifactData;        // Extracted structured data
  warnings: Warning[];       // Issues found during parsing
  recoveryGuidance: string;  // Actionable next steps
  rawContent: string;        // Original file content
}

type FileStatus =
  | 'MISSING'      // File doesn't exist
  | 'EMPTY'        // File exists but has no content
  | 'MALFORMED'    // Cannot parse markdown structure
  | 'INCOMPLETE'   // Valid structure but missing mandatory sections
  | 'DEGRADED'     // Has content but some subsections malformed
  | 'WARNING'      // Complete but has unresolved clarifications
  | 'VALID';       // Complete and valid

interface Warning {
  type: 'missing_section' | 'malformed_subsection' | 'broken_reference' | 'needs_clarification';
  severity: 'error' | 'warning' | 'info';
  section?: string;
  line?: number;
  message: string;
}
```

---

## Processing Logic

### Phase 1: File Access

```typescript
function readFile(path: string): FileAccessResult {
  try {
    const content = fs.readFileSync(path, 'utf8');
    return { success: true, content };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, status: 'MISSING', error: 'File not found' };
    }
    if (error.code === 'EACCES') {
      return { success: false, status: 'MISSING', error: 'Permission denied' };
    }
    return { success: false, status: 'MALFORMED', error: error.message };
  }
}
```

**Output on MISSING**:
```json
{
  "status": "MISSING",
  "completeness": 0,
  "data": null,
  "warnings": [{
    "type": "missing_section",
    "severity": "error",
    "message": "spec.md not found at specs/005-speck-skill/"
  }],
  "recoveryGuidance": "Run /speck.specify \"Feature description\" to create the spec",
  "rawContent": ""
}
```

---

### Phase 2: Content Validation

```typescript
function validateContent(content: string): ContentValidation {
  if (!content || content.trim() === '') {
    return { valid: false, status: 'EMPTY' };
  }

  // Check if parseable markdown
  try {
    const ast = parseMarkdown(content);
    return { valid: true, status: 'PARSEABLE', ast };
  } catch (error) {
    return { valid: false, status: 'MALFORMED', error };
  }
}
```

**Output on EMPTY**:
```json
{
  "status": "EMPTY",
  "completeness": 0,
  "data": null,
  "warnings": [{
    "type": "missing_section",
    "severity": "error",
    "message": "spec.md exists but is empty"
  }],
  "recoveryGuidance": "Run /speck.specify to regenerate the spec from scratch",
  "rawContent": ""
}
```

---

### Phase 3: Structure Extraction

```typescript
function extractStructure(ast: MarkdownAST, fileType: string): ExtractedStructure {
  const sections: Section[] = [];

  // Extract all H2 and H3 headers
  for (const node of ast.children) {
    if (node.type === 'heading') {
      sections.push({
        level: node.depth,
        title: extractText(node),
        content: extractContentUntilNextHeading(ast, node),
        lineNumber: node.position.start.line
      });
    }
  }

  return { sections };
}
```

---

### Phase 4: Template Validation

```typescript
function validateAgainstTemplate(
  actualSections: Section[],
  template: Template,
  validationLevel: 'strict' | 'lenient'
): ValidationResult {
  const warnings: Warning[] = [];
  let completeness = 0;

  const mandatorySections = template.sections.filter(s => s.mandatory);
  const foundMandatory = mandatorySections.filter(ms =>
    actualSections.some(as => fuzzyMatch(as.title, ms.title))
  );

  // Calculate completeness
  completeness = (foundMandatory.length / mandatorySections.length) * 100;

  // Generate warnings for missing sections
  const missingSections = mandatorySections.filter(ms =>
    !actualSections.some(as => fuzzyMatch(as.title, ms.title))
  );

  for (const missing of missingSections) {
    warnings.push({
      type: 'missing_section',
      severity: 'error',
      section: missing.title,
      message: `Mandatory section "${missing.title}" is missing`
    });
  }

  // Determine final status
  let status: FileStatus;
  if (warnings.some(w => w.severity === 'error')) {
    status = 'INCOMPLETE';
  } else if (warnings.some(w => w.severity === 'warning')) {
    status = 'DEGRADED';
  } else {
    status = 'VALID';
  }

  return { status, completeness, warnings };
}
```

---

## File Type-Specific Contracts

### Spec File Interpretation

**Input**: `fileType: "spec"`

**Data Structure**:
```typescript
interface SpecData {
  title: string;
  metadata: {
    branch: string;
    created: string;
    status: string;
    input: string;
  };
  userStories: UserStory[];
  requirements: Requirement[];
  successCriteria: SuccessCriterion[];
  keyEntities?: Entity[];
  clarifications?: Clarification[];
}

interface UserStory {
  number: number;
  title: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  whyThisPriority: string;
  independentTest: string;
  acceptanceScenarios: AcceptanceScenario[];
}

interface AcceptanceScenario {
  given: string;
  when: string;
  then: string;
}

interface Requirement {
  id: string;  // FR-001, FR-002, etc.
  description: string;
}

interface SuccessCriterion {
  id: string;  // SC-001, SC-002, etc.
  description: string;
}
```

**Validation Rules**:
1. MUST have H1 header matching `# Feature Specification: (.+)`
2. MUST have section `## User Scenarios & Testing *(mandatory)*`
3. MUST have section `## Requirements *(mandatory)*`
4. MUST have section `## Success Criteria *(mandatory)*`
5. User stories MUST follow `### User Story N - Title (Priority: PN)` format
6. Acceptance scenarios MUST have Given/When/Then format
7. Requirements MUST have format `**FR-XXX**: Description`
8. Success criteria MUST have format `**SC-XXX**: Description`

**Example Output** (valid spec):
```json
{
  "status": "VALID",
  "completeness": 100,
  "data": {
    "title": "Speck Workflow Skill",
    "metadata": {
      "branch": "005-speck-skill",
      "created": "2025-11-16",
      "status": "Draft"
    },
    "userStories": [
      {
        "number": 1,
        "title": "Read and Interpret Specs",
        "priority": "P1",
        "acceptanceScenarios": [
          {
            "given": "a user has a spec.md file in specs/003-user-auth/",
            "when": "they ask \"What are the functional requirements for user authentication?\"",
            "then": "Claude reads the spec.md file and accurately lists all FR-XXX items"
          }
        ]
      }
    ],
    "requirements": [
      {
        "id": "FR-001",
        "description": "Skill MUST automatically activate when user asks questions about Speck specs"
      }
    ],
    "successCriteria": [
      {
        "id": "SC-001",
        "description": "Users can ask natural language questions about any Speck artifact and receive accurate answers in 95% of cases"
      }
    ]
  },
  "warnings": [],
  "recoveryGuidance": "Spec is complete and valid",
  "rawContent": "..."
}
```

---

### Plan File Interpretation

**Input**: `fileType: "plan"`

**Data Structure**:
```typescript
interface PlanData {
  title: string;
  metadata: {
    branch: string;
    date: string;
    specLink: string;
  };
  summary: string;
  technicalContext: {
    language?: string;
    dependencies?: string;
    storage?: string;
    testing?: string;
    platform?: string;
  };
  constitutionCheck: {
    principles: ConstitutionPrinciple[];
    violations: Violation[];
  };
  projectStructure: {
    documentation: string;
    sourceCode: string;
  };
  phases: Phase[];
}

interface Phase {
  number: number;
  name: string;
  description: string;
  outputs: string[];
}
```

**Validation Rules**:
1. MUST have H1 header matching `# Implementation Plan: (.+)`
2. MUST have section `## Summary`
3. MUST have section `## Technical Context`
4. MUST have section `## Constitution Check`
5. MUST have section `## Project Structure`
6. Constitution Check MUST reference applicable principles

---

### Tasks File Interpretation

**Input**: `fileType: "tasks"`

**Data Structure**:
```typescript
interface TasksData {
  title: string;
  metadata: {
    prerequisites: string[];
  };
  phases: TaskPhase[];
  dependencies: DependencyGraph;
  implementationStrategy: string;
}

interface TaskPhase {
  number: number;
  name: string;
  tasks: Task[];
}

interface Task {
  id: string;
  priority?: string;
  userStory?: number;
  description: string;
  acceptanceCriteria: string[];
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed';
}
```

**Validation Rules**:
1. MUST have H1 header matching `# Tasks: (.+)`
2. MUST have section `## Format: [ID] [P?] [Story] Description`
3. MUST have at least one `## Phase N:` section
4. Tasks MUST have unique IDs
5. Task dependencies MUST reference valid task IDs
6. Dependency graph MUST be acyclic

---

## Error Cases and Recovery

### Error Case 1: Missing Mandatory Section

**Scenario**: spec.md exists but missing "Success Criteria"

**Output**:
```json
{
  "status": "INCOMPLETE",
  "completeness": 66,
  "warnings": [{
    "type": "missing_section",
    "severity": "error",
    "section": "Success Criteria",
    "message": "Mandatory section 'Success Criteria *(mandatory)*' is missing"
  }],
  "recoveryGuidance": "Run /speck.clarify to add missing sections, or edit spec.md manually to include:\n## Success Criteria *(mandatory)*"
}
```

---

### Error Case 2: Malformed Subsection

**Scenario**: Acceptance scenario missing "When" clause

**Output**:
```json
{
  "status": "DEGRADED",
  "completeness": 90,
  "data": {
    "userStories": [
      {
        "number": 1,
        "acceptanceScenarios": [
          {
            "given": "a user has a spec.md file",
            "when": "[MALFORMED]",
            "then": "Claude reads the spec.md file"
          }
        ]
      }
    ]
  },
  "warnings": [{
    "type": "malformed_subsection",
    "severity": "warning",
    "section": "User Story 1, Acceptance Scenario 1",
    "line": 23,
    "message": "Acceptance scenario is missing 'When' clause or doesn't follow Given/When/Then format"
  }],
  "recoveryGuidance": "Edit spec.md:23 to fix acceptance scenario format:\n**Given** X, **When** Y, **Then** Z"
}
```

---

### Error Case 3: [NEEDS CLARIFICATION] Markers Present

**Scenario**: spec.md has unresolved clarification markers

**Output**:
```json
{
  "status": "WARNING",
  "completeness": 100,
  "warnings": [{
    "type": "needs_clarification",
    "severity": "info",
    "section": "Requirements",
    "message": "3 unresolved [NEEDS CLARIFICATION] markers in spec"
  }],
  "recoveryGuidance": "Run /speck.clarify to resolve clarifications before proceeding to /speck.plan"
}
```

---

## Acceptance Criteria

1. ✅ Skill correctly identifies file status (MISSING, EMPTY, MALFORMED, INCOMPLETE, DEGRADED, WARNING, VALID)
2. ✅ Skill extracts all available sections even from malformed files
3. ✅ Skill calculates completeness percentage based on mandatory sections
4. ✅ Skill generates specific warnings for each issue found
5. ✅ Skill provides actionable recovery guidance for each error state
6. ✅ Skill validates acceptance scenarios follow Given/When/Then format
7. ✅ Skill validates requirement and success criteria IDs are unique
8. ✅ Skill detects [NEEDS CLARIFICATION] markers and warns appropriately
9. ✅ Skill handles broken cross-file references gracefully
10. ✅ Skill preserves raw content for debugging and manual inspection

---

## Notes

- **Graceful degradation**: Skill always attempts to extract maximum useful information, even from incomplete or malformed files
- **Template-driven validation**: All validation rules come from template structure (mandatory markers, section headers)
- **Line number tracking**: Skill tracks line numbers for all warnings to enable quick fixes
- **Fuzzy matching**: Section titles are matched with tolerance for minor variations (extra spaces, capitalization)
- **Non-destructive**: Skill never modifies files; only reads and reports issues
