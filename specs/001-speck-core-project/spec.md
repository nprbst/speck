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

### Session 2025-11-15

- Q: Given that the Bun CLI reimplements bash scripts (not Claude Code commands), which specific bash scripts should it provide? → A: All existing bash scripts: check-prerequisites.sh, setup-plan.sh, update-agent-context.sh, create-new-feature.sh
- Q: How should the Bun CLI scripts be invoked by slash commands? → A: Backward-compatible wrapper: Each bash script becomes a thin wrapper calling the Bun equivalent, so slash commands don't need modification during gradual migration
- Q: How should the system handle extremely long feature descriptions that would create branch names exceeding git's 244-character limit? → A: Truncate short-name intelligently at word boundaries to fit within limits while preserving readability, then append hash suffix for uniqueness
- Q: What happens when upstream sync detects breaking changes that fundamentally conflict with Speck's architecture? → A: Pause sync and present conflict analysis to user with three options: skip conflicting changes, apply with manual merge, or abort sync entirely
- Q: How does the system handle non-git repositories (developers who don't use version control)? → A: Require git: Fail with clear error message directing users to initialize git repository first
- Q: What is the correct implementation priority order for Speck? → A: P1: Upstream sync & transformation (spec-kit → Speck), P2: Transform bash scripts to Bun TS in `.speck/scripts/`, P3: Keep `.specify/scripts/bash/` for `/speckit.*` backward compat, P4: Create `/speck.*` commands that call `.speck/scripts/`. Only after the transformation pipeline works should we extend individual commands.

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

### User Story 1 - Developer Syncs Upstream Spec-Kit to Speck (Priority: P1)

A Speck maintainer needs to transform the latest spec-kit release into Speck's enhanced Claude Code implementation. This involves: (1) syncing upstream spec-kit templates and bash scripts to `.specify/`, (2) converting bash scripts to Bun TypeScript implementations in `.speck/scripts/`, (3) creating/updating `/speck.*` Claude Commands, Agents, and Skills that call the Bun scripts, while (4) preserving `.specify/scripts/bash/` for `/speckit.*` backward compatibility.

**Why this priority**: This is the foundational transformation pipeline that creates Speck from spec-kit. Without this working, there's no point in enhancing individual commands - we have no established baseline to enhance.

**Independent Test**: Can be fully tested by running `/speck.transform-upstream` with a spec-kit release tag, then verifying: (1) `.specify/` updated with upstream content, (2) `.speck/scripts/` contains Bun TS equivalents of bash scripts, (3) `/speck.*` commands exist and call Bun scripts, (4) `.specify/scripts/bash/` preserved and `/speckit.*` commands still work.

**Acceptance Scenarios**:

1. **Given** a new spec-kit release is available, **When** maintainer runs `/speck.transform-upstream <version>`, **Then** the system syncs upstream templates and scripts to `.specify/`, preserving [SPECK-EXTENSION] markers
2. **Given** upstream bash scripts are synced, **When** transformation runs, **Then** Bun TypeScript equivalents are generated in `.speck/scripts/` with identical CLI interfaces and behavior
3. **Given** Bun scripts are ready, **When** transformation completes, **Then** `/speck.*` Claude Commands are created/updated to call `.speck/scripts/` implementations, while `.specify/scripts/bash/` remains unchanged for `/speckit.*` backward compatibility
4. **Given** transformation is complete, **When** developer runs both `/speckit.specify` and `/speck.specify`, **Then** both work correctly with `/speckit.*` using bash scripts and `/speck.*` using Bun scripts

---

### User Story 2 - Developer Uses Bun-Powered Speck Scripts (Priority: P2)

After the transformation pipeline is working, a Speck user runs `/speck.specify` to create a new feature specification. The command delegates to `.speck/scripts/` Bun TypeScript implementations for fast, type-safe operations (git branching, file generation, validation) while maintaining a familiar slash command interface.

**Why this priority**: Once the transformation pipeline establishes the baseline, this validates that the Bun scripts work correctly in the actual user workflow. This is the first real end-user value delivery.

**Independent Test**: Can be tested by running `/speck.specify "Add user authentication"` and verifying: (1) Bun scripts in `.speck/scripts/` execute successfully, (2) feature branch created, (3) spec generated in correct directory, (4) sub-100ms script startup time.

**Acceptance Scenarios**:

1. **Given** Speck transformation is complete, **When** developer runs `/speck.specify` with a feature description, **Then** the `/speck.specify` command calls `.speck/scripts/create-new-feature.ts` (Bun) which executes in under 100ms and creates a feature branch with proper naming
2. **Given** the Bun script runs, **When** it generates the spec, **Then** the spec is created in `specs/<number>-<short-name>/spec.md` with all mandatory sections populated from templates
3. **Given** a developer also has `/speckit.*` commands available, **When** they run `/speckit.specify`, **Then** it works identically but uses `.specify/scripts/bash/` scripts, proving backward compatibility

---

### User Story 3 - Developer Iterates on Transformation Pipeline (Priority: P3)

After establishing the basic transformation pipeline, a Speck maintainer receives feedback that certain spec-kit patterns don't translate well to Claude Code. They need to enhance the transformation logic to better adapt upstream content for Claude's conversational, agent-based workflows while preserving the core spec-kit methodology.

**Why this priority**: Only after the pipeline works end-to-end (P1-P2) should we refine the transformation quality. This enables continuous improvement based on real usage.

**Independent Test**: Can be tested by identifying a spec-kit template pattern that translates poorly, updating `.speck/transformers/` logic, re-running `/speck.transform-upstream`, and verifying the improved output in generated `/speck.*` commands or templates.

**Acceptance Scenarios**:

1. **Given** a spec-kit bash script pattern doesn't leverage Claude's capabilities, **When** maintainer updates transformation logic in `.speck/transformers/`, **Then** next upstream sync generates improved Bun TypeScript code that better utilizes Claude Agents
2. **Given** transformation logic is updated, **When** `/speck.transform-upstream` runs, **Then** existing [SPECK-EXTENSION] markers are preserved while new transformations are applied
3. **Given** improved transformations are deployed, **When** end users run `/speck.*` commands, **Then** they experience enhanced Claude-native workflows while maintaining spec-kit compatibility

---

### User Story 4 - Developer Enhances Individual Speck Commands (Priority: P4)

With the transformation pipeline working and basic commands operational, a developer wants to add Speck-specific enhancements to `/speck.clarify` that go beyond spec-kit's capabilities. For example, using Claude Agents for deeper ambiguity detection, or adding interactive clarification flows that leverage Claude's conversational strengths.

**Why this priority**: Only after the foundation is solid (P1-P3) should we invest in command-specific enhancements. Premature optimization of individual commands wastes effort if the underlying transformation pipeline changes.

**Independent Test**: Can be tested by adding a [SPECK-EXTENSION] block to `/speck.clarify` that implements Claude-native clarification UI, running the enhanced command, and verifying it provides better UX than the baseline spec-kit equivalent while `/speckit.clarify` continues to work unchanged.

**Acceptance Scenarios**:

1. **Given** `/speck.clarify` baseline works, **When** developer adds Claude Agent-based ambiguity scanning in a [SPECK-EXTENSION] block, **Then** the enhanced command detects subtle ambiguities that spec-kit's pattern matching would miss
2. **Given** enhanced clarification runs, **When** developer interacts with Claude, **Then** the conversational flow feels natural and leverages Claude's understanding of requirements engineering
3. **Given** enhancements are deployed, **When** next upstream sync occurs, **Then** [SPECK-EXTENSION] blocks are preserved and baseline clarification logic stays synced with spec-kit

### Edge Cases

- **Duplicate short-name collision**: When a developer creates a feature with a
  short-name matching an existing feature (e.g., `002-user-auth` exists), system
  auto-appends collision counter (`003-user-auth-2`) and warns developer to
  review existing similar feature before proceeding
- **Branch name length overflow**: When a feature description would create a
  branch name exceeding git's 244-character limit, system intelligently
  truncates the short-name at word boundaries to preserve readability (e.g.,
  `003-implement-comprehensive-user-authentication-with-...` becomes
  `003-implement-comprehensive-user-auth-a1b2c3`), appending a 6-character hash
  suffix derived from the full description for uniqueness
- **Upstream sync breaking changes**: When upstream sync detects breaking
  changes that fundamentally conflict with Speck's architecture (e.g., spec-kit
  removes a workflow that Speck extends), system pauses sync, presents Claude's
  conflict analysis showing which changes conflict and why, and offers three
  options: (1) skip conflicting changes and apply only safe updates, (2) apply
  with manual merge requiring developer intervention, or (3) abort sync entirely
  and preserve current state
- **Non-git repository usage**: When a developer attempts to use Speck commands
  in a directory without git initialization, system fails immediately with clear
  error message: "Speck requires git. Please run 'git init' to initialize a
  repository, or use 'git clone' if working with an existing project." Provides
  helpful next steps for git setup
- What happens when a worktree creation fails due to disk space or permission
  issues?
- How does the system handle spec template corruption or missing required
  template sections?

## Requirements _(mandatory)_

### Functional Requirements

#### Upstream Synchronization & Transformation (Priority 1)

- **FR-001**: System MUST provide `/speck.transform-upstream <version>` command to sync spec-kit releases and transform them into Speck's Claude-native implementation
- **FR-002**: System MUST sync upstream spec-kit templates and bash scripts to `.specify/` directory, preserving existing [SPECK-EXTENSION] markers
- **FR-003**: System MUST transform spec-kit bash scripts into Bun TypeScript equivalents in `.speck/scripts/` with identical CLI interfaces and behavior
- **FR-004**: System MUST generate/update `/speck.*` Claude Commands, Agents, and Skills that call `.speck/scripts/` Bun implementations
- **FR-005**: System MUST preserve `.specify/scripts/bash/` for backward compatibility so existing `/speckit.*` commands continue to work unchanged
- **FR-006**: System MUST maintain dual command namespaces: `/speckit.*` (calls bash in `.specify/scripts/bash/`) and `/speck.*` (calls Bun in `.speck/scripts/`)

#### Transformation Quality & Extension Preservation

- **FR-007**: System MUST preserve Speck-specific extensions marked with [SPECK-EXTENSION:START/END] boundaries during upstream transformations
- **FR-008**: System MUST use Claude to analyze upstream bash scripts and generate semantically equivalent Bun TypeScript code (not naive line-by-line translation)
- **FR-009**: System MUST generate transformation reports showing: (1) which spec-kit files synced to `.specify/`, (2) which Bun scripts generated in `.speck/scripts/`, (3) which `/speck.*` commands updated, (4) Claude's transformation rationale
- **FR-010**: System MUST detect breaking changes that conflict with Speck's architecture, pause sync, present conflict analysis, and offer options: skip conflicting changes, apply with manual merge, or abort entirely
- **FR-011**: System MUST track last synced spec-kit commit SHA in `.speck/upstream-sync.json` for incremental sync support

#### Bun TypeScript Script Implementation (Priority 2)

- **FR-012**: `.speck/scripts/` MUST contain Bun TypeScript implementations of all spec-kit bash scripts with sub-100ms startup time
- **FR-013**: Bun scripts MUST support `--json` and `--paths-only` flags for machine-readable output matching bash conventions
- **FR-014**: Bun scripts MUST return identical exit codes and error message formats as spec-kit bash equivalents
- **FR-015**: Bun scripts MUST leverage Bun-specific APIs (native TS execution, fast file I/O, optimized subprocess handling) for performance
- **FR-016**: System MUST validate Bun script output matches bash equivalents through automated comparison tests

#### Command Enhancement Support (Priority 3-4)

- **FR-017**: System MUST provide `/speck.*` Claude Commands that call `.speck/scripts/` Bun implementations (not bash)
- **FR-018**: `/speck.*` commands MAY include [SPECK-EXTENSION] blocks for Claude-native enhancements (Agents, Skills, improved UX)
- **FR-019**: System MUST ensure `/speckit.*` commands remain unchanged and continue calling `.specify/scripts/bash/` for backward compatibility
- **FR-020**: System MUST generate specifications that include mandatory sections: User Scenarios & Testing, Requirements, Success Criteria
- **FR-021**: System MUST require git initialization and fail with clear error when invoked in non-git directories

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
- **Bash Script Reimplementation**: TypeScript equivalents of infrastructure
  bash scripts (check-prerequisites.sh, setup-plan.sh, update-agent-context.sh,
  create-new-feature.sh) invoked via thin bash wrapper scripts that delegate to
  Bun CLI, maintaining identical CLI interfaces and output formats while
  requiring no slash command modifications

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
- **SC-005**: Bun-powered CLI reimplementations of bash scripts produce
  byte-for-byte identical output to bash versions for --json mode, with 100%
  exit code compatibility and sub-100ms startup time
- **SC-006**: Feature isolation via worktrees allows 10+ parallel features
  without cross-contamination of specs or artifacts
- **SC-007**: Clarification workflow fully resolves spec ambiguities in 1-3
  `/speck.clarify` sessions (iterations), with 90% of specs requiring only 1
  session (5 questions or fewer)
- **SC-008**: Developers can sync monthly upstream spec-kit updates without
  manual conflict resolution in 80% of cases
- **SC-009**: System automatically handles branch names approaching git's
  244-character limit by intelligently truncating at word boundaries and
  appending hash suffixes, ensuring 100% of feature creations succeed without
  manual intervention
- **SC-010**: System detects non-git directories in under 50ms and provides
  clear, actionable error messages with git initialization guidance, preventing
  user confusion

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
- **Standalone CLI User Interface**: The Bun TypeScript CLI does NOT provide a
  user-facing command interface with commands like `speck specify` or `speck
  plan`. It only reimplements the four internal bash scripts that slash commands
  delegate to. Claude Code slash commands remain the sole user interface.
