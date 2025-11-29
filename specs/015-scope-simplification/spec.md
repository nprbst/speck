# Feature Specification: Scope Simplification

**Feature Branch**: `015-scope-simplification`
**Created**: 2025-11-28
**Status**: Complete
**Input**: User description: "Simplify and robustify Speck by removing stacked PR support, virtual commands, consolidating to dual-mode CLI with auto-install, auto-worktree creation on new specs, and pruning website content"

## Clarifications

### Session 2025-11-28

- Q: Should multi-repo support be removed? → A: NO - multi-repo support is critical and MUST be retained
- Q: Should branches.json be removed? → A: NO - keep branches.json for tracking non-standard branch names
- Q: How should install be triggered? → A: Add `/speck.init` slash command that triggers the install
- Q: What flags for hook vs JSON output? → A: Use `--hook` for hook IO mode, `--json` for JSON output mode (both supported, different purposes)
- Q: Help command and skill naming? → A: Add `/speck.help` command that loads speck-help skill (renamed from speck-knowledge)
- Q: How to prime new Claude session in worktree? → A: Write handoff document to new branch, Claude Code loads it on session start via hook

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Invokes Speck CLI Directly (Priority: P1)

A developer working on a feature wants to use Speck commands from their terminal without going through Claude Code. They type `speck` and see available subcommands, then run `speck create-new-feature "Add dark mode"` to start a new feature spec with automatic worktree creation and IDE launch.

**Why this priority**: The CLI is the foundational interface for both human developers and Claude Code hooks. If this works reliably, all other functionality builds on top of it.

**Independent Test**: Can be fully tested by running `speck --help` and `speck create-new-feature --help` from any directory, confirming commands are accessible and documented.

**Acceptance Scenarios**:

1. **Given** Speck is installed, **When** user types `speck` with no arguments, **Then** they see a help menu listing all available subcommands
2. **Given** Speck is installed, **When** user types `speck create-new-feature "My Feature"`, **Then** a new branch is created, spec directory initialized, worktree created (if enabled), and IDE launched at the worktree
3. **Given** Speck is installed, **When** user types `speck check-prerequisites`, **Then** they see validation results for their current directory

---

### User Story 2 - Claude Code Invokes Speck via Hooks (Priority: P1)

Claude Code running in VSCode needs to execute Speck commands reliably via Bash tool calls. The hook system uses `--hook` flag for hook IO mode, while `--json` flag provides JSON output for easy LLM parsing.

**Why this priority**: Equal priority with P1 above because this is the primary integration point for AI-assisted development. Both human and AI usage must work.

**Independent Test**: Can be fully tested by invoking CLI with `--hook` flag and verifying hook-formatted output, and separately with `--json` flag verifying JSON output.

**Acceptance Scenarios**:

1. **Given** Claude Code needs to check prerequisites, **When** hook invokes `speck check-prerequisites --hook`, **Then** hook-formatted output is returned for Claude Code consumption
2. **Given** Claude Code needs JSON output, **When** invoking `speck check-prerequisites --json`, **Then** structured JSON output is returned for LLM parsing
3. **Given** Claude Code needs to create a feature, **When** hook invokes `speck create-new-feature --json --number 5 --short-name "my-feature" "Feature description"`, **Then** JSON output contains BRANCH_NAME, SPEC_FILE, and FEATURE_NUM fields
4. **Given** any Speck command fails, **When** invoked with `--json` flag, **Then** error is returned as structured JSON with error type and message

---

### User Story 3 - New Spec Creates Worktree with Session Handoff (Priority: P2)

When a developer creates a new feature spec, Speck automatically creates a Git worktree for the new branch, writes a handoff document containing feature context, launches VSCode at the worktree, and the new Claude Code session loads the handoff document on start to be primed for working on the feature.

**Why this priority**: This automates the tedious setup steps that every feature requires and ensures the new Claude session has full context. Reduces friction significantly but depends on P1 working first.

**Independent Test**: Can be fully tested by running `speck create-new-feature "Test Feature"`, verifying worktree exists, handoff document is present, IDE launches, and new Claude session shows feature context.

**Acceptance Scenarios**:

1. **Given** worktree integration is enabled in config, **When** user creates a new feature, **Then** a Git worktree is created at `../<repo-name>-worktrees/<branch-name>/`
2. **Given** worktree is created successfully, **When** spec is initialized, **Then** a handoff document is written to the worktree containing feature name, spec path, and initial context
3. **Given** handoff document exists in worktree, **When** VSCode opens with Claude Code, **Then** Claude Code session start hook loads the handoff document to prime the session
4. **Given** worktree is created successfully, **When** IDE auto-launch is enabled, **Then** VSCode opens at the worktree path with Claude Code extension active
5. **Given** worktree creation fails for any reason, **When** user creates a feature, **Then** the spec is still created in the main repo and a warning is displayed (non-fatal)
6. **Given** user passes `--no-worktree` flag, **When** creating a feature, **Then** worktree creation is skipped regardless of config

---

### User Story 4 - Developer Installs Speck CLI via /speck.init (Priority: P2)

A developer cloning a Speck-enabled repository for the first time runs the `/speck.init` slash command in Claude Code, which triggers the `speck init` CLI command to set up the `speck` command in their PATH.

**Why this priority**: One-time setup that enables all P1 functionality. Must be simple and reliable.

**Independent Test**: Can be fully tested by running `/speck.init` in Claude Code or `speck init` directly, then invoking `speck` from a different directory.

**Acceptance Scenarios**:

1. **Given** user runs `/speck.init` in Claude Code, **When** the command executes, **Then** `speck init` is invoked and a symlink is created at `~/.local/bin/speck`
2. **Given** user runs `speck init` directly, **When** the command executes, **Then** a symlink is created at `~/.local/bin/speck` pointing to the repo's CLI entry point
3. **Given** `~/.local/bin` is in user's PATH, **When** they open a new terminal, **Then** `speck` command is available globally
4. **Given** symlink already exists, **When** user runs init again, **Then** they see a message that Speck is already installed (idempotent)
5. **Given** `~/.local/bin` does not exist, **When** user runs init, **Then** the directory is created before symlinking

---

### User Story 5 - Developer Gets Help via /speck.help (Priority: P2)

A developer working with Speck wants to ask questions about how to use Speck features, commands, or workflows. They run `/speck.help` which loads the speck-help skill to provide contextual answers.

**Why this priority**: Help and discoverability are essential for adoption and self-service troubleshooting.

**Independent Test**: Can be fully tested by running `/speck.help` followed by a question and verifying the skill provides relevant answers.

**Acceptance Scenarios**:

1. **Given** user runs `/speck.help`, **When** command executes, **Then** the speck-help skill is loaded and ready to answer questions
2. **Given** speck-help skill is loaded, **When** user asks "how do I create a new feature?", **Then** skill provides accurate answer based on Speck documentation
3. **Given** speck-help skill is loaded, **When** user asks about spec/plan/tasks files, **Then** skill explains the purpose and structure of each

---

### User Story 6 - Developer Uses Non-Standard Branch Names (Priority: P2)

A developer wants to use a branch name that doesn't follow the standard `NNN-short-name` convention. The system tracks this branch in `.speck/branches.json` so it can be associated with its feature spec.

**Why this priority**: Supports flexibility in team workflows where branch naming conventions may vary.

**Independent Test**: Can be fully tested by creating a feature with a custom branch name and verifying it appears in branches.json.

**Acceptance Scenarios**:

1. **Given** user creates a feature with custom branch name, **When** spec is created, **Then** branch-to-spec mapping is recorded in `.speck/branches.json`
2. **Given** a non-standard branch is checked out, **When** user runs `speck check-prerequisites`, **Then** system looks up the branch in branches.json to find associated spec
3. **Given** branches.json contains mapping, **When** branch is deleted, **Then** entry can be cleaned up manually or via future maintenance command

---

### User Story 7 - Developer Works in Multi-Repo Setup (Priority: P2)

A developer working with a multi-repo Speck configuration (root repo with linked child repos) can use all core Speck functionality including shared specs, child-repo local specs, and cross-repo context awareness.

**Why this priority**: Multi-repo support is critical for enterprise/team use cases where multiple related repositories share specifications.

**Independent Test**: Can be fully tested by setting up a root repo with linked child repo and verifying spec operations work in both contexts.

**Acceptance Scenarios**:

1. **Given** a multi-repo setup with root and child repos, **When** user runs `speck check-prerequisites` in child repo, **Then** system detects multi-repo mode and reports correct paths
2. **Given** a shared spec in root repo, **When** user works in child repo, **Then** they can access and reference the shared spec
3. **Given** user creates spec in child repo, **When** prompted for location, **Then** they can choose parent (shared) or local (child-only) placement

---

### User Story 8 - Developer Reads Streamlined Documentation (Priority: P3)

A new user visits the Speck website to understand what Speck does and how to use it. The documentation is focused, concise, and covers the core workflow plus multi-repo support, without mentioning removed features like stacked PRs or virtual commands.

**Why this priority**: Documentation supports adoption but is not blocking for core functionality.

**Independent Test**: Can be fully tested by reviewing the website content for any mentions of stacked PRs or virtual commands.

**Acceptance Scenarios**:

1. **Given** a new user visits the website, **When** they read the getting started guide, **Then** they can understand Speck's purpose and basic workflow in under 5 minutes
2. **Given** the website is deployed, **When** searching for "stacked PR" or "virtual command", **Then** no results are found (features fully removed from docs)
3. **Given** the website content, **When** reviewed for consistency, **Then** all command references match the actual CLI interface
4. **Given** user wants multi-repo info, **When** they navigate to docs, **Then** multi-repo setup and usage is documented

---

### Edge Cases

- What happens when Bun is not installed? Bootstrap displays platform-specific install instructions (curl for all, Homebrew for macOS, WSL note for WSL), exits with informative message. After user installs Bun and re-runs, bootstrap creates `.runner.sh` and rewires symlink for zero-overhead subsequent runs.
- What happens when Git is not installed or version is too old? CLI reports clear error with minimum version requirement.
- What happens when user runs `speck` outside a Git repository? CLI reports "Not a git repository" error.
- What happens when worktree directory already exists? Skip creation, report existing path, continue with IDE launch.
- What happens when IDE launch fails (VSCode not installed)? Report warning but don't fail the command.
- What happens when user's shell doesn't include `~/.local/bin` in PATH? Install command reports this with instructions to add it.
- What happens when branches.json is corrupted or missing? Gracefully handle with default behavior (standard branch naming).
- What happens when multi-repo symlink is broken? Report clear error with instructions to re-link.
- What happens when handoff document cannot be written? Report warning but continue with worktree creation (non-fatal).
- What happens when session start hook fails to load handoff? Claude session starts normally without pre-loaded context (graceful degradation).

## Requirements *(mandatory)*

### Functional Requirements

#### Removal Requirements (Scope Reduction)

- **FR-001**: System MUST remove all stacked PR functionality including branch dependency tracking, cycle detection, and aggregated views
- **FR-002**: System MUST remove the virtual command pattern including JSON stdin/stdout protocol for command dispatch
- **FR-003**: System MUST remove the `/speck.branch` slash command and all branch dependency-related commands from the CLI

#### Retained Requirements (NOT Removed)

- **FR-004**: System MUST retain `.speck/branches.json` for tracking non-standard branch names and their associated specs
- **FR-005**: System MUST retain multi-repo support including symlink detection, parent/child repo concepts, and shared specs

#### CLI Requirements (Consolidation)

- **FR-006**: System MUST provide a single `speck` entry point executable via `#!/usr/bin/env bun`
- **FR-007**: CLI MUST support subcommands: `init`, `create-new-feature`, `check-prerequisites`, `env`, `help`
- **FR-008**: CLI MUST accept `--json` flag on all commands to output structured JSON for LLM parsing
- **FR-009**: CLI MUST accept `--hook` flag on all commands for hook IO mode (reads JSON from stdin, outputs hook-formatted response)
- **FR-009a**: When `--hook` flag is present, CLI MUST read JSON payload from stdin containing hook context before processing
- **FR-010**: CLI MUST accept `--help` flag on all commands and subcommands showing usage and options
- **FR-011**: CLI MUST return non-zero exit codes on errors with descriptive error messages
- **FR-012**: CLI MUST work equally well for human interactive use and programmatic invocation

#### Slash Command Requirements

- **FR-013**: System MUST provide `/speck.init` slash command that triggers CLI installation
- **FR-014**: System MUST provide `/speck.help` slash command that loads the speck-help skill for answering questions

#### Skill Requirements

- **FR-015**: System MUST rename speck-knowledge skill to speck-help
- **FR-016**: speck-help skill MUST provide contextual answers about Speck features, commands, and workflows

#### Auto-Install Requirements

- **FR-017**: `speck init` MUST create a symlink at `~/.local/bin/speck` pointing to the repository's bootstrap script
- **FR-018**: `speck init` MUST create `~/.local/bin/` directory if it doesn't exist
- **FR-019**: `speck init` MUST be idempotent (running twice produces no errors)
- **FR-020**: `speck init` MUST report if `~/.local/bin` is not in the user's PATH with instructions to add it

#### Bun Bootstrap Requirements

- **FR-020a**: System MUST provide a `bootstrap.sh` script that detects Bun installation before executing CLI
- **FR-020b**: If Bun is not found, bootstrap MUST display platform-specific installation instructions (macOS/Linux/WSL)
- **FR-020c**: Bootstrap MUST check common Bun locations: PATH, `$HOME/.bun/bin/bun`, `/usr/local/bin/bun`, `/opt/homebrew/bin/bun`
- **FR-020d**: After Bun is detected, bootstrap MUST rewire the `speck` symlink to point directly to `index.ts`
- **FR-020e**: Bootstrap self-removal pattern MUST result in zero overhead for subsequent CLI invocations (direct exec via shebang)

#### Worktree Integration Requirements

- **FR-021**: When creating a new feature with worktree enabled, system MUST create a Git worktree at a predictable path
- **FR-021a**: System MUST use atomic `git worktree add -b <branch> <path> HEAD` to create branch and worktree without switching the current checkout
- **FR-022**: Worktree path MUST follow the pattern `../<repo-name>-worktrees/<branch-name>/`
- **FR-023**: After worktree creation, system MUST launch configured IDE at the worktree path
- **FR-024**: IDE launch MUST pass arguments to auto-open Claude Code extension
- **FR-025**: Worktree creation and IDE launch failures MUST be non-fatal warnings, not blocking errors
- **FR-026**: Users MUST be able to override worktree behavior with `--no-worktree` and `--no-ide` flags

#### Session Handoff Requirements

- **FR-027**: When creating a worktree, system MUST write a handoff document to `.speck/handoff.md` in the worktree
- **FR-028**: Handoff document MUST contain: feature name, spec path, branch name, and initial context for Claude
- **FR-029**: System MUST write `.claude/settings.json` to worktree with SessionStart hook configuration pointing to handoff script
- **FR-029a**: SessionStart hook script MUST output JSON with `hookSpecificOutput.additionalContext` to inject handoff content into Claude session
- **FR-029b**: Hook script MUST use proper JSON escaping (e.g., `jq -Rs`) for handoff content
- **FR-030**: After handoff document is loaded, system MUST archive it (rename to `handoff.done.md`) AND remove SessionStart hook from settings.json
- **FR-030a**: Hook self-cleanup prevents repeated context injection on subsequent session starts
- **FR-031**: Handoff document and hook setup failures MUST be non-fatal warnings (graceful degradation)

#### VSCode Integration Requirements

- **FR-031a**: When creating a worktree, system MUST write `.vscode/tasks.json` with auto-open Claude panel configuration
- **FR-031b**: VSCode task MUST use `runOn: folderOpen` to trigger on workspace open
- **FR-031c**: VSCode task MUST use `${command:claude-vscode.focus}` to focus existing Claude panel

#### Branch Tracking Requirements

- **FR-032**: System MUST record branch-to-spec mappings in `.speck/branches.json` for non-standard branch names
- **FR-033**: `check-prerequisites` MUST consult branches.json to resolve spec for non-standard branch names
- **FR-034**: branches.json schema MUST support: branch name, spec ID, created timestamp

#### Website Requirements (Content Pruning)

- **FR-035**: Website MUST NOT contain any documentation about stacked PRs
- **FR-036**: Website MUST NOT contain any documentation about virtual commands
- **FR-037**: Website MUST document multi-repo setup and usage
- **FR-038**: Website MUST document the streamlined CLI commands with examples
- **FR-039**: Website getting-started guide MUST be completable in under 5 minutes of reading

### Key Entities

- **Speck CLI**: Single entry point (`speck`) that dispatches to subcommands
- **Feature Spec**: Directory containing `spec.md`, `plan.md`, `tasks.md` for a feature
- **Worktree**: Git worktree created as sibling to main repository for isolated feature work
- **Config**: `.speck/config.json` file containing worktree preferences and other settings
- **Branch Mapping**: `.speck/branches.json` file tracking non-standard branch names to specs
- **Multi-Repo Root**: Repository containing shared specs that child repos link to via symlink
- **Handoff Document**: Temporary file written to worktree containing context for new Claude session
- **speck-help Skill**: Skill (formerly speck-knowledge) that answers questions about Speck usage

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can install and start using Speck CLI in under 2 minutes
- **SC-002**: All CLI commands respond in under 500ms for interactive use
- **SC-003**: New feature creation (including worktree + IDE launch) completes in under 10 seconds
- **SC-004**: 100% of CLI commands work identically whether invoked by humans or Claude Code hooks
- **SC-005**: Website documentation word count reduced by at least 40% compared to pre-simplification (adjusted for retaining multi-repo docs)
- **SC-006**: Zero mentions of removed features (stacked PRs, virtual commands) in codebase or documentation
- **SC-007**: Test suite execution time reduced proportionally to removed code
- **SC-008**: New users can understand Speck's core workflow from documentation in under 5 minutes
- **SC-009**: Multi-repo workflows function correctly after simplification
- **SC-010**: Non-standard branch names are correctly resolved to their specs via branches.json
- **SC-011**: New Claude sessions in worktrees are pre-loaded with feature context via handoff document
- **SC-012**: `/speck.help` successfully answers common usage questions

## Assumptions

- Users have Bun 1.0+ installed (required for CLI execution)
- Users have Git 2.5+ installed (required for worktree support)
- Users are on macOS or Linux (Windows support not in initial scope)
- VSCode is the primary IDE for worktree integration (other IDEs may work but are not tested)
- `~/.local/bin` is a reasonable default location for user-installed binaries on Unix systems
- Claude Code extension supports session start hooks for loading context

## Out of Scope

- Stacked PR workflow (explicitly removed, may return in future)
- Virtual command pattern (explicitly removed)
- Windows support for CLI installation
- IDE support beyond VSCode
- Branch dependency tracking
- PR automation/GitHub integration
