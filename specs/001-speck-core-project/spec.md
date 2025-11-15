# Feature Specification: Speck - Claude Code-Optimized Specification Framework

**Feature Branch**: `001-speck-core-project` **Created**: 2025-11-14 **Status**:
Draft **Input**: User description: "We are going to create a project named
Speck. Speck is an opinionated, extensible derivative of GitHub's spec-kit
optimized for Claude Code."

## Clarifications

### Session 2025-11-14

- Q: Should clarification workflow only address max 3 explicit [NEEDS
  CLARIFICATION] markers from generation, or scan broadly for up to 5 questions
  including detected gaps? → A: Comprehensive: Clarification scans broadly and
  asks up to 5 questions, including but not limited to explicit markers
- Q: How should worktree specs directory modes (isolated vs shared) work? → A:
  Auto-detect based on git tracking: if specs/ is git-tracked, worktrees share
  it naturally; if gitignored, symlink specs/ into worktree for central
  collection
- Q: What constitutes an "iteration" in SC-007 clarification metric? → A: One
  iteration = one /speck.clarify session (max 5 questions); 90% of specs fully
  resolved in single session
- Q: What happens when a developer creates a feature with duplicate short-name?
  → A: Auto-append collision counter (e.g., 003-user-auth-2 if 002-user-auth
  exists); warn user about similar existing feature
- Q: How should Enhancement Rules be structured for upstream sync
  transformations? → A: AI-driven transformation: Claude analyzes upstream diffs
  and infers appropriate Speck adaptations preserving extension markers; no
  explicit declarative rules needed
- Q: Should TypeScript CLI support both Bun and Deno runtimes or focus on single
  runtime? → A: Bun-only: Focus exclusively on Bun runtime to simplify
  implementation and reduce maintenance overhead

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Solo Developer Creates First Feature Specification (Priority: P1)

A software developer working alone wants to create a structured specification
for a new feature using Claude Code as their development environment. They need
a workflow that guides them through specification creation, planning, and
implementation without requiring extensive setup.

**Why this priority**: This is the core value proposition of Speck - enabling
developers to work with structured specifications in Claude Code. Without this,
the tool provides no value.

**Independent Test**: Can be fully tested by running
`/speck.specify "Add user authentication"` in Claude Code and verifying that a
complete specification is generated with all required sections, stored in an
appropriate directory structure, and ready for the next phase (clarification or
planning).

**Acceptance Scenarios**:

1. **Given** a developer has Speck initialized in their project, **When** they
   run `/speck.specify` with a feature description, **Then** the system creates
   a feature branch, generates a specification from templates, and saves it to
   the appropriate directory
2. **Given** a developer has a newly generated spec, **When** they review it,
   **Then** the spec contains all mandatory sections (User Scenarios,
   Requirements, Success Criteria) without implementation details
3. **Given** a developer's specification has unclear requirements, **When** the
   spec is generated, **Then** ambiguous areas are marked with [NEEDS
   CLARIFICATION] markers (max 3) for the developer to resolve

---

### User Story 2 - Developer Syncs Upstream Spec-Kit Changes (Priority: P2)

A Speck user wants to benefit from improvements made to the upstream GitHub
spec-kit methodology without losing their Claude Code-specific enhancements like
agents, skills, and improved workflows.

**Why this priority**: Enables long-term maintainability and ensures Speck users
benefit from spec-kit community improvements while preserving Speck's value-add
features.

**Independent Test**: Can be tested by running `/speck.transform-upstream` after
upstream spec-kit has new commits, and verifying that Speck commands are updated
with upstream changes while preserving all [SPECK-EXTENSION] blocks.

**Acceptance Scenarios**:

1. **Given** upstream spec-kit has new commits since last sync, **When** the
   developer runs `/speck.transform-upstream`, **Then** Claude analyzes diffs,
   infers semantic impact, and proposes AI-transformed updates to Speck's Claude
   Code commands
2. **Given** upstream changes affect areas with Speck extensions, **When** sync
   is performed, **Then** Claude preserves Speck-specific enhancements marked
   with [SPECK-EXTENSION] boundaries and requests developer guidance only for
   ambiguous conflicts
3. **Given** sync is complete, **When** developer reviews changes, **Then** a
   detailed sync report shows which files were modified, what upstream changes
   were applied, which extensions were preserved, and Claude's transformation
   rationale

---

### User Story 3 - Developer Uses Bun-Powered TypeScript CLI (Priority: P3)

A developer prefers using command-line tools directly rather than Claude Code
slash commands, and wants a fast, type-safe CLI powered by Bun for creating
specs, plans, and tasks with near-instant startup times.

**Why this priority**: Provides flexibility for developers who want to use Speck
outside Claude Code or integrate it into automated workflows. Lower priority
because Claude Code integration is the primary use case. Bun-only focus
simplifies implementation and leverages Bun's superior performance.

**Independent Test**: Can be tested by running `speck specify "Add feature"` in
a terminal (without Claude Code) and verifying that feature creation, spec
generation, and validation work identically to the slash command version.

**Acceptance Scenarios**:

1. **Given** a developer has installed Speck's Bun-powered CLI, **When** they
   run `speck specify "feature description"`, **Then** the CLI creates a feature
   with the same behavior as the Claude Code slash command with sub-100ms
   startup time
2. **Given** a developer runs CLI commands, **When** errors occur, **Then** the
   CLI provides structured error messages with actionable guidance
3. **Given** a developer wants JSON output for automation, **When** they add the
   `--json` flag, **Then** the CLI outputs machine-readable JSON instead of
   interactive prompts

---

### User Story 4 - Team Works on Multiple Features in Parallel (Priority: P2)

Multiple developers on a team want to work on different features simultaneously
without interfering with each other's specifications, plans, and implementation
work. They need isolated workspaces for each feature.

**Why this priority**: Critical for team environments where parallel development
is common. Worktree support enables true isolation without branch-switching
overhead.

**Independent Test**: Can be tested by creating two features using worktree
mode, verifying each has its own isolated directory with independent specs, and
confirming that changes in one worktree don't affect the other.

**Acceptance Scenarios**:

1. **Given** a developer wants to start a new feature while another is in
   progress, **When** they run `/speck.specify` with worktree option, **Then** a
   new git worktree is created in a separate directory with its own feature
   branch
2. **Given** multiple worktrees exist, **When** a developer works in one
   worktree, **Then** the main repository and other worktrees remain unaffected
   by their changes
3. **Given** a worktree is created, **When** the developer opens it in their
   IDE, **Then** they see the full project context with access to all specs
   (either via git-tracked shared directory or symlink from main repo)

---

### User Story 5 - Developer Clarifies Ambiguous Requirements (Priority: P1)

After generating an initial specification, a developer encounters [NEEDS
CLARIFICATION] markers and needs to systematically resolve ambiguities through
an interactive Q&A process that updates the spec with clear, testable
requirements.

**Why this priority**: Specification quality directly impacts planning and
implementation success. Without clarification, specs remain ambiguous and lead
to rework.

**Independent Test**: Can be tested by generating a spec with clarification
markers, running `/speck.clarify`, answering the presented questions, and
verifying the spec is updated with resolved answers replacing the markers.

**Acceptance Scenarios**:

1. **Given** a spec contains [NEEDS CLARIFICATION] markers or ambiguous areas,
   **When** the developer runs `/speck.clarify`, **Then** the system performs a
   comprehensive ambiguity scan and presents up to 5 structured questions with
   suggested answers (including both explicit markers and detected gaps)
2. **Given** the developer is presented with clarification questions, **When**
   they select answers or provide custom input, **Then** the system updates the
   spec by replacing markers with the selected answers and integrating
   clarifications into appropriate sections
3. **Given** all clarifications are resolved, **When** the developer reviews the
   spec, **Then** no [NEEDS CLARIFICATION] markers remain and all requirements
   are testable and unambiguous

### Edge Cases

- **Duplicate short-name collision**: When a developer creates a feature with a
  short-name matching an existing feature (e.g., `002-user-auth` exists), system
  auto-appends collision counter (`003-user-auth-2`) and warns developer to
  review existing similar feature before proceeding
- How does the system handle extremely long feature descriptions that would
  create branch names exceeding git's 244-character limit?
- What happens when upstream sync detects breaking changes that fundamentally
  conflict with Speck's architecture?
- How does the system handle non-git repositories (developers who don't use
  version control)?
- What happens when a worktree creation fails due to disk space or permission
  issues?
- How does the system handle spec template corruption or missing required
  template sections?

## Requirements _(mandatory)_

### Functional Requirements

#### Core Specification Management

- **FR-001**: System MUST provide slash commands (`/speck.specify`,
  `/speck.clarify`, `/speck.plan`, etc.) that integrate with Claude Code's
  command interface
- **FR-002**: System MUST generate specifications from natural language feature
  descriptions using templates
- **FR-003**: System MUST validate specifications against quality criteria (no
  implementation details, testable requirements, technology-agnostic success
  criteria)
- **FR-004**: System MUST support creating specifications in git repositories
  with automatic branch creation
- **FR-005**: System MUST support creating specifications in non-git directories
  with environment-based feature tracking
- **FR-006**: System MUST limit [NEEDS CLARIFICATION] markers to a maximum of 3
  per specification during generation phase, prioritized by impact;
  clarification workflow may ask up to 5 questions total by scanning beyond
  explicit markers
- **FR-007**: System MUST generate specifications that include mandatory
  sections: User Scenarios & Testing, Requirements, and Success Criteria

#### Upstream Synchronization

- **FR-008**: System MUST track the last synced commit SHA from upstream
  spec-kit repository
- **FR-009**: System MUST preserve Speck-specific extensions marked with
  [SPECK-EXTENSION:START/END] boundaries during AI-driven upstream sync
  transformations
- **FR-010**: System MUST provide a sync command (`/speck.transform-upstream`)
  that uses Claude to analyze upstream diffs and infer appropriate Speck
  adaptations
- **FR-011**: System MUST generate sync reports documenting which files were
  modified, what upstream changes were applied, which extensions were preserved,
  and Claude's transformation rationale
- **FR-012**: System MUST validate that AI-transformed sync changes pass type
  checking and tests before updating tracking files

#### Feature Isolation & Workflow

- **FR-013**: System MUST support git worktree mode for isolated feature
  development
- **FR-014**: System MUST automatically detect and assign the next available
  feature number based on existing branches, worktrees, and spec directories
- **FR-015**: System MUST generate short feature names (2-4 words) from feature
  descriptions by extracting meaningful keywords
- **FR-015a**: System MUST detect duplicate short-names and auto-append
  collision counter (e.g., `-2`, `-3`) while warning user about similar existing
  features
- **FR-016**: System MUST create feature directory structures under
  `specs/<number>-<short-name>/`
- **FR-017**: System MUST auto-detect worktree specs directory handling: if
  specs/ is git-tracked, worktrees naturally share it; if specs/ is gitignored,
  system creates symlink to main repo's specs/ directory in each worktree to
  maintain central spec collection

#### TypeScript CLI

- **FR-018**: System MUST provide a Bun-powered TypeScript CLI (`speck` command)
  with sub-100ms startup time
- **FR-019**: System MUST provide the same functionality via CLI as via Claude
  Code slash commands
- **FR-020**: System MUST support `--json` flag for machine-readable output in
  all CLI commands
- **FR-021**: System MUST provide interactive prompts for CLI users when
  required information is missing
- **FR-022**: System MUST leverage Bun-specific APIs and features for optimal
  performance (native TypeScript execution, fast file I/O, optimized subprocess execution)

#### Quality & Validation

- **FR-023**: System MUST validate specifications against a quality checklist
  before marking them ready for planning
- **FR-024**: System MUST generate requirements checklists at
  `<feature-dir>/checklists/requirements.md`
- **FR-025**: System MUST ensure success criteria are measurable,
  technology-agnostic, and user-focused
- **FR-026**: System MUST ensure functional requirements are testable and
  unambiguous

### Key Entities

- **Feature**: Represents a development feature with number, short-name, branch
  name, description, directory path, and creation timestamp
- **Specification**: A structured document describing what users need and why,
  without implementation details
- **Upstream Tracker**: Records the last synced commit SHA, sync date, and
  file-level sync status for spec-kit repository
- **Extension Marker**: Identifies Speck-specific code blocks (marked with
  [SPECK-EXTENSION:START/END]) that must be preserved during AI-driven upstream
  sync transformations
- **Worktree**: An isolated git working directory for parallel feature
  development
- **Clarification**: A question-answer pair resolving ambiguous requirements in
  a specification

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Developers can create a complete, valid feature specification from
  a natural language description in under 2 minutes using `/speck.specify`
- **SC-002**: Specifications generated by Speck contain zero implementation
  details (no mention of frameworks, languages, databases, or tools)
- **SC-003**: 95% of specifications pass quality validation on first generation
  without requiring manual fixes
- **SC-004**: Upstream sync operations complete in under 5 minutes and preserve
  100% of Speck-specific extensions
- **SC-005**: Bun-powered CLI provides identical functionality to Claude Code
  slash commands with less than 1% behavioral deviation and sub-100ms startup
  time
- **SC-006**: Feature isolation via worktrees allows 10+ parallel features
  without cross-contamination of specs or artifacts
- **SC-007**: Clarification workflow fully resolves spec ambiguities in 1-3
  `/speck.clarify` sessions (iterations), with 90% of specs requiring only 1
  session (5 questions or fewer)
- **SC-008**: Developers can sync monthly upstream spec-kit updates without
  manual conflict resolution in 80% of cases
- **SC-009**: System detects and prevents branch name length violations (>244
  chars) with clear error messages before git operations
- **SC-010**: Non-git workflows function identically to git workflows for all
  core specification operations (specify, clarify, plan)

## Assumptions

1. **Claude Code Environment**: Primary users have access to Claude Code with
   slash command and agent capabilities
2. **Git Familiarity**: Users have basic understanding of git concepts
   (branches, commits, repositories)
3. **Template Availability**: Upstream spec-kit templates remain available and
   structurally stable
4. **Bun Runtime**: Users have Bun 1.0+ installed for TypeScript CLI
   functionality
5. **Disk Space**: Sufficient disk space available for worktree creation
   (typically 100MB-1GB per worktree)
6. **Upstream Stability**: Spec-kit methodology changes are incremental, not
   revolutionary rewrites
7. **Markdown Compatibility**: Generated specifications can be viewed in any
   standard markdown renderer
8. **Network Access**: Users have network access for fetching upstream changes
   during sync operations
9. **File System Permissions**: Users have write permissions in their project
   directories for creating specs and worktrees

## Dependencies

- **Upstream Dependency**: GitHub's spec-kit repository and templates (external,
  ongoing)
- **Runtime Dependency**: Bun 1.0+ for TypeScript CLI execution with native
  TypeScript support
- **Claude Code Version**: Compatible Claude Code version with slash command and
  agent support
- **Git Version**: Git 2.30+ for worktree support and modern porcelain commands

## Out of Scope

The following are explicitly **not** included in this feature:

- **Visual UI**: No web-based or GUI interface for managing specifications (CLI
  and Claude Code only)
- **Collaborative Editing**: No real-time multi-user editing of specifications
  (use git merge workflows)
- **Spec Versioning**: No built-in versioning beyond git's native branch/commit
  history
- **Custom Template Authoring**: No UI for creating custom templates (users edit
  markdown files directly)
- **Automated Testing**: No built-in test generation from specifications
  (testing frameworks are separate)
- **Deployment Integration**: No CI/CD pipeline generation or deployment
  automation
- **Project Management**: No issue tracking, sprint planning, or project
  management features
- **Cost Tracking**: No time estimation, budgeting, or resource allocation
  features
- **Bidirectional Sync**: Upstream sync is unidirectional (spec-kit → Speck
  only, never Speck → spec-kit)
- **Legacy Bash Script Support**: No support for running original spec-kit bash
  scripts alongside Speck
