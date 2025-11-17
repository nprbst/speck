# Feature Specification: Speck Workflow Skill

**Feature Branch**: `005-speck-skill`
**Created**: 2025-11-16
**Status**: Draft
**Input**: User description: "Create a Claude Skill in .claude/skills for auto-invoked Speck workflow assistance. The skill gives Claude in-depth understanding of Speck/spec-kit structure (specs/NUM-short-name/**/*.md files) and correct interpretation of each file type, referencing templates for generic versions. This allows users to interact with Speck without slash commands."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read and Interpret Specs (Priority: P1)

A user working on a Speck feature wants to ask Claude questions about their spec.md file without manually running `/speck.specify` or other commands. Claude should automatically understand the spec structure and provide accurate guidance.

**Why this priority**: Core value proposition - enables natural conversation about Speck artifacts without requiring users to learn slash command syntax.

**Independent Test**: Can be fully tested by asking Claude "What does my spec.md say about user authentication?" and verifying Claude correctly identifies and interprets the spec sections (requirements, scenarios, success criteria).

**Acceptance Scenarios**:

1. **Given** a user has a spec.md file in specs/003-user-auth/, **When** they ask "What are the functional requirements for user authentication?", **Then** Claude reads the spec.md file and accurately lists all FR-XXX items from the Requirements section
2. **Given** a user asks about success criteria, **When** they reference a feature by number or name, **Then** Claude locates the correct spec.md and extracts the SC-XXX items from Success Criteria section
3. **Given** a spec.md with [NEEDS CLARIFICATION] markers, **When** user asks about unclear areas, **Then** Claude identifies and explains what needs clarification without prompting to run /speck.clarify

---

### User Story 2 - Understand Plan Structure (Priority: P2)

A developer needs to understand the implementation plan for a feature. They ask Claude natural questions about plan.md contents, and Claude automatically interprets the plan structure (architecture decisions, technical approach, dependencies).

**Why this priority**: Second most common use case - helps developers understand implementation details without navigating complex markdown structures manually.

**Independent Test**: Can be tested by asking "What's the technical approach for the payment gateway?" and verifying Claude correctly extracts architecture decisions and technical details from plan.md.

**Acceptance Scenarios**:

1. **Given** a plan.md exists for a feature, **When** user asks "What technologies are we using?", **Then** Claude identifies the Technical Approach section and lists all technologies, frameworks, and tools
2. **Given** user asks about dependencies, **When** they reference a feature, **Then** Claude reads the Dependencies section and explains both internal and external dependencies
3. **Given** user needs to understand scope, **When** they ask "What's in scope vs out of scope?", **Then** Claude distinguishes between In Scope and Out of Scope sections accurately

---

### User Story 3 - Navigate Task Lists (Priority: P3)

A user wants to check task status or understand what tasks remain for a feature. They ask Claude questions like "What tasks are left for feature 003?" and Claude interprets tasks.md structure to provide accurate status.

**Why this priority**: Useful but less critical than spec/plan understanding - task tracking is often handled by project management tools.

**Independent Test**: Can be tested by asking "How many tasks are completed for the auth feature?" and verifying Claude counts tasks by status correctly.

**Acceptance Scenarios**:

1. **Given** a tasks.md with multiple task sections, **When** user asks about remaining work, **Then** Claude counts incomplete tasks and summarizes what's left
2. **Given** tasks organized by dependency order, **When** user asks "What can I work on next?", **Then** Claude identifies tasks with satisfied dependencies that are not yet started
3. **Given** user asks about a specific task, **When** they reference it by name or number, **Then** Claude locates the task and provides its description, acceptance criteria, and dependencies

---

### User Story 4 - Compare Templates to Actual Files (Priority: P4)

A user wants to verify their spec.md follows the correct structure. They ask Claude to compare their spec against the template, and Claude references `.specify/templates/spec-template.md` to identify missing or misplaced sections.

**Why this priority**: Quality assurance feature - less urgent than basic interpretation but valuable for maintaining consistency.

**Independent Test**: Can be tested by creating an incomplete spec.md and asking "Does my spec follow the template?" - Claude should identify missing mandatory sections.

**Acceptance Scenarios**:

1. **Given** a spec.md missing mandatory sections, **When** user asks if it's complete, **Then** Claude compares against spec-template.md and lists missing sections (User Scenarios, Requirements, Success Criteria)
2. **Given** a plan.md with sections in wrong order, **When** user asks about structure, **Then** Claude identifies deviations from plan-template.md structure
3. **Given** user asks about a section purpose, **When** they reference any template section, **Then** Claude explains the section's intent based on template comments and guidelines

---

### Edge Cases

- **Non-existent feature reference**: When user references a feature that doesn't exist (e.g., "Tell me about feature 999"), search for partial matches in feature directory names and suggest alternatives (e.g., "Feature 999 not found. Did you mean: 099-payment-gateway?")
- **Malformed or incomplete files**: Parse gracefully, extract whatever sections are available, and warn user about missing or malformed parts (e.g., "This spec.md is missing the mandatory Success Criteria section")
- **Invalid file type requests**: Explain the requested file doesn't exist in Speck structure, list valid file types (spec.md, plan.md, tasks.md), and suggest which might contain the information they're looking for
- **Similar feature names in conversation**: Use most recently mentioned feature as context for follow-up questions; when ambiguous (e.g., both "user-auth" and "auth-tokens" recently mentioned), ask user for clarification
- What if templates are updated but existing specs follow old structure?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Skill MUST automatically activate when user asks questions about Speck specs, plans, or tasks without requiring explicit slash command invocation
- **FR-002**: Skill MUST correctly interpret the structure of spec.md files including all sections: User Scenarios, Requirements, Success Criteria, Key Entities
- **FR-003**: Skill MUST correctly interpret the structure of plan.md files including Technical Approach, Architecture Decisions, Dependencies, and Scope boundaries
- **FR-004**: Skill MUST correctly interpret the structure of tasks.md files including task groupings, dependencies, acceptance criteria, and status
- **FR-005**: Skill MUST reference template files (`.specify/templates/spec-template.md`, `plan-template.md`, `tasks-template.md`) to understand expected structure and section purposes
- **FR-006**: Skill MUST locate feature directories using the pattern `specs/NUM-short-name/` where NUM is a zero-padded number (e.g., 001, 002, 005)
- **FR-007**: Skill MUST distinguish between different file types (spec.md, plan.md, tasks.md) and apply correct interpretation rules to each
- **FR-008**: Skill MUST identify and explain [NEEDS CLARIFICATION] markers in specs without triggering slash commands
- **FR-009**: Skill MUST recognize priority levels (P1, P2, P3) in user stories and explain their significance
- **FR-010**: Skill MUST understand acceptance scenario format (Given/When/Then) and extract test conditions correctly
- **FR-011**: Skill MUST identify mandatory vs optional sections in specs and plans based on template annotations
- **FR-012**: Skill MUST provide helpful error messages when referenced features, files, or sections cannot be found

### Key Entities

- **Skill Definition**: A markdown file in `.claude/skills/` with YAML frontmatter containing name, description, activation triggers, and instructions for interpreting Speck structures
- **Feature Directory**: A directory following pattern `specs/NUM-short-name/` containing spec.md, plan.md (optional), tasks.md (optional), and checklists/ subdirectory
- **Spec File**: A spec.md file following template structure with mandatory sections (User Scenarios, Requirements, Success Criteria) and optional sections (Key Entities, Assumptions)
- **Plan File**: A plan.md file following template structure with Technical Approach, Architecture Decisions, Dependencies, and Scope sections
- **Tasks File**: A tasks.md file with dependency-ordered task lists, each task having description, acceptance criteria, dependencies, and status
- **Template Files**: Reference templates in `.specify/templates/` that define expected structure, section purposes, and validation rules

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can ask natural language questions about any Speck artifact (spec/plan/tasks) and receive accurate answers without running slash commands in 95% of cases (measured by: 100 representative question dataset covering all user stories, manual validation that Claude's response correctly extracts requested information, pass threshold: ≥95 correct responses)
- **SC-002**: Claude correctly identifies and extracts information from specific sections (e.g., "What are the functional requirements?") with 100% accuracy when section exists (accuracy defined as: extracts all content between section header and next same-level header without omissions or hallucinations, correctly handles nested subsections)
- **SC-003**: Skill activates automatically within 1 conversational turn when user mentions feature numbers, spec/plan/tasks files, or Speck-related questions
- **SC-004**: Users report 80% reduction in need to manually run `/speck.specify`, `/speck.plan`, or `/speck.tasks` commands for reading/understanding existing artifacts (baseline: ~10 manual slash commands per session for reading artifacts, target: ≤2 commands per session)
- **SC-005**: Claude provides helpful guidance when files or sections are missing, suggesting correct next steps based on Speck workflow (e.g., "Run /speck.specify to create spec first")
- **SC-006**: Template comparison requests identify missing mandatory sections with 100% accuracy
- **SC-007**: Users can switch between discussing multiple features in same conversation without confusion or misidentification

## Clarifications

### Session 2025-11-16

- Q: How should the skill activate automatically based on user context? → A: Skill activation via concise, carefully formatted `description` in frontmatter for high trigger likelihood (implementation details deferred to planning)
- Q: What happens when a user references a feature number that doesn't exist? → A: Search for partial matches and suggest alternatives
- Q: How does the skill handle specs/plans/tasks that are malformed or missing expected sections? → A: Parse gracefully, extract available sections, warn about missing/malformed parts
- Q: What if user asks about a file type that doesn't exist in Speck structure? → A: Explain the file doesn't exist in Speck structure, list valid file types, suggest which might contain relevant info
- Q: How does Claude distinguish between different features with similar names in multi-feature conversations? → A: Use most recently mentioned feature as context, ask for clarification if ambiguous

## Assumptions

- Templates in `.specify/templates/` follow consistent structure and are kept up-to-date with Speck workflow
- Feature directories always follow the `specs/NUM-short-name/` naming pattern with zero-padded numbers
- Spec, plan, and tasks files use consistent markdown section headers (## for main sections)
- Users will reference features using either number (e.g., "003"), short-name (e.g., "user-auth"), or full directory name (e.g., "003-user-auth")
- The skill should be non-destructive - only read and interpret files, never modify them without explicit user request
- Skill activation relies on concise, carefully formatted `description` field in YAML frontmatter to maximize trigger probability
