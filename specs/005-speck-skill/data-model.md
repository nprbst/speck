# Data Model: Speck Workflow Skill

**Feature**: 005-speck-skill
**Date**: 2025-11-17
**Purpose**: Define entities, fields, relationships, and validation rules for the Speck Workflow Skill

---

## Overview

The Speck Workflow Skill operates on a file-based data model where:
- **Skill Definition** configures behavior and activation triggers
- **Feature Directories** contain specification artifacts
- **Artifact Files** (spec.md, plan.md, tasks.md) follow template structures
- **Template Files** define expected structure and validation rules

This data model focuses on the *structure and relationships* of these entities, not implementation.

---

## Entity 1: Skill Definition

### Description
A markdown file in `.claude/skills/` with YAML frontmatter that configures skill behavior, activation triggers, and interpretation instructions.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **name** | string | Yes | Skill identifier (e.g., "speck-workflow") |
| **description** | string | Yes | Concise capability statement for activation (80-150 chars) |
| **instructions** | markdown | Yes | Main skill body explaining how to interpret Speck artifacts |
| **filePath** | path | Yes | Location in `.claude/skills/speck-workflow.md` |

### Validation Rules

1. **description** field MUST be 80-150 characters for optimal activation probability
2. **description** MUST mention: file types (spec/plan/tasks), problem solved (natural language Q&A), key concepts (requirements, architecture)
3. **name** MUST be unique across all skills in `.claude/skills/`
4. **instructions** MUST include: template references, section parsing rules, error handling guidance
5. File MUST have valid YAML frontmatter delimited by `---`

### Relationships

- **References** → Template Files (spec-template.md, plan-template.md, tasks-template.md)
- **Reads** → Feature Directories (discovers via glob pattern)
- **Interprets** → Artifact Files (extracts structured data)

### State Transitions

```
Created → Installed → Activated → Executing → Completed
                   ↓
                Inactive (skill doesn't match query)
```

---

## Entity 2: Feature Directory

### Description
A directory following pattern `specs/NUM-short-name/` containing specification artifacts for a single feature.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **featureNumber** | string (3 digits) | Yes | Zero-padded number (e.g., "005") |
| **shortName** | string | Yes | Kebab-case identifier (e.g., "speck-skill") |
| **fullName** | string | Yes | Combined format: "005-speck-skill" |
| **directoryPath** | path | Yes | Absolute path to `specs/005-speck-skill/` |
| **specFile** | path | Yes | Path to `spec.md` (mandatory) |
| **planFile** | path | No | Path to `plan.md` (created after `/speck.plan`) |
| **tasksFile** | path | No | Path to `tasks.md` (created after `/speck.tasks`) |
| **checklistsDir** | path | No | Path to `checklists/` subdirectory |

### Validation Rules

1. Directory name MUST match regex: `^\d{3}-[a-z0-9-]+$`
2. **featureNumber** MUST be exactly 3 digits (001-999)
3. **shortName** MUST use lowercase letters, numbers, and hyphens only
4. **specFile** MUST exist (other files optional depending on workflow phase)
5. Directory MUST be located directly under `specs/` (no nesting)

### Relationships

- **Contains** → Artifact Files (spec.md, plan.md, tasks.md)
- **Contains** → Checklists Directory (`checklists/*.md`)
- **Discovered By** → Skill Definition (via glob pattern matching)
- **Matches** → Git Branch (same name pattern: `005-speck-skill`)

### State Transitions

```
Specified (spec.md exists)
    ↓
Planned (plan.md exists)
    ↓
Tasked (tasks.md exists)
    ↓
Implementing (tasks in progress)
    ↓
Complete (all tasks completed)
```

---

## Entity 3: Spec File Structure

### Description
A `spec.md` file following spec-template.md structure with mandatory sections for user scenarios, requirements, and success criteria.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **title** | string | Yes | Feature name (from H1 header) |
| **metadata** | object | Yes | Branch, created date, status, input |
| **userStories** | array | Yes | List of user scenarios with priorities |
| **requirements** | object | Yes | Functional requirements (FR-XXX) |
| **successCriteria** | array | Yes | Measurable outcomes (SC-XXX) |
| **keyEntities** | array | No | Data entities (if feature involves data) |
| **clarifications** | array | No | Q&A from clarification sessions |
| **assumptions** | array | No | Project assumptions |
| **edgeCases** | array | No | Edge case scenarios |

### Validation Rules

1. MUST have H1 header: `# Feature Specification: [FEATURE NAME]`
2. MUST have section: `## User Scenarios & Testing *(mandatory)*`
3. MUST have section: `## Requirements *(mandatory)*`
4. MUST have section: `## Success Criteria *(mandatory)*`
5. Each **userStory** MUST include: priority (P1-P4), independent test, acceptance scenarios
6. Acceptance scenarios MUST follow Given-When-Then format
7. Each **requirement** MUST have unique ID (FR-001, FR-002, etc.)
8. Each **successCriterion** MUST be measurable (include numbers, percentages, or clear pass/fail)
9. **[NEEDS CLARIFICATION]** markers MUST be resolved before planning phase

### Relationships

- **Follows** → spec-template.md (defines expected structure)
- **Referenced By** → Plan File (Input field links to spec)
- **Referenced By** → Tasks File (tasks implement requirements)
- **Contains** → User Stories (embedded)
- **Contains** → Requirements (embedded)

### State Transitions

```
Draft ([NEEDS CLARIFICATION] markers present)
    ↓
Clarified (all markers resolved)
    ↓
Reviewed (passed quality checklist)
    ↓
Approved (ready for planning)
```

---

## Entity 4: Plan File Structure

### Description
A `plan.md` file following plan-template.md structure with technical context, architecture decisions, and implementation phases.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **title** | string | Yes | Feature name (from H1 header) |
| **metadata** | object | Yes | Branch, date, spec link |
| **summary** | string | Yes | Primary requirement + technical approach |
| **technicalContext** | object | Yes | Language, dependencies, storage, testing, platform |
| **constitutionCheck** | object | Yes | Validation against constitutional principles |
| **projectStructure** | object | Yes | Documentation and source code layout |
| **phase0Research** | object | No | Research findings (if generated) |
| **phase1Design** | object | No | Data model, contracts, quickstart |
| **complexityTracking** | array | No | Violation justifications (if needed) |

### Validation Rules

1. MUST have H1 header: `# Implementation Plan: [FEATURE]`
2. MUST have section: `## Summary`
3. MUST have section: `## Technical Context`
4. MUST have section: `## Constitution Check`
5. **constitutionCheck** MUST reference applicable constitutional principles
6. **technicalContext** MAY contain "NEEDS CLARIFICATION" (resolved in Phase 0)
7. **projectStructure** MUST show both documentation (specs/) and source (src/) layouts
8. **complexityTracking** MUST justify any constitutional violations
9. MUST NOT contain implementation details leaked from spec (violates Principle VI)

### Relationships

- **Follows** → plan-template.md (defines expected structure)
- **References** → Spec File (links in metadata and summary)
- **References** → Constitution File (`.specify/memory/constitution.md`)
- **Contains** → Research Document (Phase 0 output)
- **Contains** → Data Model Document (Phase 1 output)
- **Contains** → Contracts Directory (Phase 1 output)

### State Transitions

```
Technical Context Filled
    ↓
Constitution Check Passed
    ↓
Phase 0 Research Complete
    ↓
Phase 1 Design Complete
    ↓
Ready for Tasks Generation
```

---

## Entity 5: Tasks File Structure

### Description
A `tasks.md` file with dependency-ordered task lists, each task having description, acceptance criteria, dependencies, and status.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **title** | string | Yes | Feature name (from H1 header) |
| **metadata** | object | Yes | Prerequisites, organization notes |
| **format** | object | Yes | Task ID format explanation |
| **phases** | array | Yes | Grouped tasks by phase (Phase 1, Phase 2, etc.) |
| **dependencies** | object | Yes | Dependency graph explanation |
| **implementationStrategy** | string | Yes | MVP, incremental, or parallel approach |

#### Task Object Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **taskId** | string | Yes | Unique identifier (e.g., "IMPL-001") |
| **priority** | string | No | Priority marker (P1-P4) if applicable |
| **userStory** | string | No | Related user story number |
| **description** | string | Yes | Task description |
| **acceptanceCriteria** | array | Yes | Testable criteria for completion |
| **dependencies** | array | No | Task IDs that must complete first |
| **status** | enum | Yes | pending, in_progress, completed |

### Validation Rules

1. MUST have H1 header: `# Tasks: [FEATURE NAME]`
2. MUST have section: `## Format: [ID] [P?] [Story] Description`
3. Each task MUST have: unique ID, description, acceptance criteria, status
4. Task dependencies MUST reference valid task IDs
5. Dependency order MUST be acyclic (no circular dependencies)
6. **status** MUST be one of: pending, in_progress, completed
7. Tasks MUST be grouped by phases
8. Each phase MUST have checkpoint marker

### Relationships

- **Follows** → tasks-template.md (defines expected structure)
- **References** → Spec File (implements requirements and user stories)
- **References** → Plan File (implements design decisions)
- **Contains** → Task Objects (embedded)

### State Transitions

```
Generated (from /speck.tasks command)
    ↓
In Progress (tasks being implemented)
    ↓
Partially Complete (some tasks done)
    ↓
Complete (all tasks completed)
```

---

## Entity 6: Template File

### Description
Reference templates in `.specify/templates/` that define expected structure, section purposes, and validation rules for artifact files.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **templateName** | string | Yes | File name (e.g., "spec-template.md") |
| **filePath** | path | Yes | Absolute path to template |
| **sections** | array | Yes | List of section definitions |
| **comments** | array | Yes | HTML comments with guidelines |

#### Section Definition Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **name** | string | Yes | Section title (e.g., "Requirements") |
| **header** | string | Yes | Full markdown header line |
| **level** | number | Yes | Heading level (1-6) |
| **mandatory** | boolean | Yes | Whether section is required |
| **purpose** | string | Yes | Extracted from comments |
| **guidelines** | array | No | Parsing/content guidelines |
| **examples** | array | No | Example content |

### Validation Rules

1. Template MUST be valid markdown
2. Mandatory sections MUST be marked with `*(mandatory)*` annotation
3. Optional sections MUST be marked with `*(include if...)*` or `OPTIONAL` keyword
4. Each section SHOULD have HTML comment explaining purpose
5. Templates MUST use consistent heading levels (no skipping H3 after H2)
6. Action-required sections MUST have `ACTION REQUIRED:` comment

### Relationships

- **Defines Structure For** → Spec File (spec-template.md)
- **Defines Structure For** → Plan File (plan-template.md)
- **Defines Structure For** → Tasks File (tasks-template.md)
- **Referenced By** → Skill Definition (for parsing instructions)
- **Used By** → Validation Functions (check completeness)

### State Transitions

Templates are relatively static but may evolve:
```
Created (initial version)
    ↓
Updated (constitution amendments, new guidelines)
    ↓
Synced (from upstream spec-kit updates)
```

---

## Relationships Diagram

```
Skill Definition
    ├─ reads → Feature Directories (glob pattern)
    ├─ references → Template Files (for parsing)
    └─ interprets → Artifact Files (extracts data)

Feature Directory
    ├─ contains → Spec File (mandatory)
    ├─ contains → Plan File (optional)
    ├─ contains → Tasks File (optional)
    └─ contains → Checklists Directory (optional)

Spec File
    ├─ follows → spec-template.md
    ├─ referenced by → Plan File
    └─ referenced by → Tasks File

Plan File
    ├─ follows → plan-template.md
    ├─ references → Spec File
    ├─ references → Constitution File
    └─ contains → Research Document

Tasks File
    ├─ follows → tasks-template.md
    ├─ references → Spec File
    └─ references → Plan File

Template Files
    ├─ defines structure for → Artifact Files
    └─ referenced by → Skill Definition
```

---

## Data Flows

### Flow 1: User Query → Feature Discovery → Artifact Interpretation

```
User asks question
    ↓
Skill activates (semantic matching on description)
    ↓
Parse query to extract feature reference (numeric, name, or context)
    ↓
Three-tier matching:
  1. Exact directory name match
  2. Numeric prefix match (pad to 3 digits)
  3. Fuzzy substring match
    ↓
Load artifact file (spec.md, plan.md, or tasks.md)
    ↓
Validate against template structure
    ↓
Extract sections and content
    ↓
Return structured data with warnings (if incomplete)
```

### Flow 2: Template Comparison Request

```
User asks "Does my spec follow the template?"
    ↓
Skill activates
    ↓
Identify feature from query
    ↓
Load spec-template.md
    ↓
Load actual spec.md from feature directory
    ↓
Extract sections from both
    ↓
Compare mandatory sections
    ↓
Identify missing/extra/out-of-order sections
    ↓
Return diff report with warnings
```

### Flow 3: Malformed File Handling

```
User asks about incomplete spec
    ↓
Skill loads spec.md
    ↓
Attempt markdown parsing
    ↓
File state classification:
  - MISSING → Error, suggest /speck.specify
  - EMPTY → Error, suggest /speck.specify
  - MALFORMED → Warning, extract partial data
  - INCOMPLETE → Warning, identify missing sections
  - VALID → Success, return full data
    ↓
Return available data + warnings + recovery guidance
```

---

## Validation Rules Summary

### Cross-Entity Validation

1. **Feature Directory ↔ Spec File**: Every feature directory MUST contain spec.md
2. **Spec File ↔ Plan File**: Plan MUST reference spec in metadata
3. **Spec File ↔ Tasks File**: Tasks MUST implement requirements from spec
4. **Plan File ↔ Constitution**: Plan MUST pass constitution check
5. **Artifact Files ↔ Templates**: Artifacts MUST have mandatory sections from templates

### Data Integrity Rules

1. Feature numbers MUST be unique across all directories
2. Task IDs MUST be unique within tasks.md
3. Requirement IDs (FR-XXX) MUST be unique within spec.md
4. Success Criteria IDs (SC-XXX) MUST be unique within spec.md
5. Feature directory names MUST match git branch names

---

## Notes

- This data model is **technology-agnostic** (no implementation details)
- Entities represent **file-based structures** (not runtime objects)
- Validation rules enable **quality gates** (Constitution Principle IV)
- State transitions reflect **Speck workflow phases** (specify → clarify → plan → tasks → implement)
- Relationships support **cross-artifact consistency** (spec ↔ plan ↔ tasks alignment)
