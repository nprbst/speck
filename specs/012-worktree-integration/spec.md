# Feature Specification: Worktree Integration

**Feature Branch**: `012-worktree-integration`
**Created**: 2025-11-22
**Status**: Draft
**Input**: User description: "I would like to make worktrees a first-class part of the Speck workflow. (Opt-in, of course.) When a new spec branch is created, a worktree should be created for that branch, and if desired by the user (decision recorded somewhere) a new IDE (default: VSCode) should be openned pointing at that worktree. Also, if we can figure out how for the tech stack, dependencies should already be installed before openning the IDE (in the worktree dir). In order for worktrees to work well, we need to make the set of files/directories that should be copied or symlinked configurable...which is starting to feel like a .speck/config.json file is needed."

## Clarifications

### Session 2025-11-22

- Q: When a worktree already exists at the intended location (edge case from line 77), how should the system respond? → A: Error with reuse option - Abort by default, but allow `--reuse-worktree` flag to skip recreation
- Q: When dependency installation is enabled (User Story 3), should the IDE launch wait for dependencies to finish installing, or should it launch immediately and install in the background? → A: Blocking install - IDE launches only after dependency installation completes (user sees progress indicator)
- Q: The spec mentions configurable copy/symlink rules for files (FR-009, FR-010), but doesn't specify the pattern matching syntax. What pattern syntax should be supported for file/directory rules? → A: Glob patterns and explicit list of relative paths, stored in a Speck configuration file in a well known location
- Q: Should worktree integration apply only to new spec branches created via `/speck:specify`, or should it also apply to branches created via `/speck:branch`? → A: Worktrees should optionally apply to both new specs and branches created via `/speck:branch`
- Q: When the system calculates a branch name automatically, should it proceed immediately or ask for user approval? → A: Branch name should be provided to the user for approval before creation
- Q: Should the system support configurable branch name prefixes (e.g., `specs/` before `NNN-short-name`) for teams that want namespace organization? → A: Yes, support configurable standard branch prefix for spec branches (e.g., `specs/NNN-short-name`), opt-in configuration that breaks backwards compatibility with spec-kit
- Q: When a worktree is manually deleted but the branch still exists (edge case from line 80), how should the system handle this inconsistency? → A: Auto-reconcile - Detect and clean up stale worktree references automatically, notify user
- Q: When untracked files exist in the parent repository that match copy rules (e.g., `.env` files), should these files be copied to the new worktree? → A: Yes, copy untracked files

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Isolated Feature Development (Priority: P1)

As a developer, I want to work on multiple features simultaneously without switching branches in my main repository, so that I can context-switch quickly between different features without losing my working state.

**Why this priority**: This is the core value proposition of worktree integration. It enables the most common use case and delivers immediate productivity gains by eliminating branch-switching overhead.

**Independent Test**: Can be fully tested by creating a new spec branch and verifying a worktree is created at the expected location with the feature branch checked out. Delivers value by allowing developers to work on the feature in the worktree while keeping the main repository on a different branch.

**Acceptance Scenarios**:

1. **Given** I have worktree integration enabled, **When** I create a new spec branch `002-user-auth`, **Then** a worktree is created at `.speck/worktrees/002-user-auth` with the `002-user-auth` branch checked out
2. **Given** I have worktree integration disabled, **When** I create a new spec branch `002-user-auth`, **Then** no worktree is created and the branch is created in the main repository
3. **Given** a worktree already exists for branch `002-user-auth`, **When** I attempt to create the same spec branch again, **Then** the system detects the existing worktree and either reuses it or reports an error

---

### User Story 2 - Automated IDE Launch (Priority: P2)

As a developer, I want my IDE to automatically open when a worktree is created, so that I can start working immediately without manual navigation.

**Why this priority**: This enhances the P1 workflow by eliminating manual steps, but the core worktree functionality is still valuable without it. Developers can manually open the IDE if this feature is not yet available.

**Independent Test**: Can be tested by creating a new spec branch with IDE auto-launch enabled and verifying that VSCode (or configured IDE) opens with the worktree directory as the workspace root. Delivers value by reducing setup time from ~30 seconds to instant.

**Acceptance Scenarios**:

1. **Given** I have worktree integration and IDE auto-launch enabled, **When** I create a new spec branch `003-payment-flow`, **Then** my configured IDE opens with the worktree directory as the workspace
2. **Given** I have worktree integration enabled but IDE auto-launch disabled, **When** I create a new spec branch, **Then** the worktree is created but no IDE is launched
3. **Given** my IDE is already open with a different worktree, **When** I create a new spec branch with auto-launch enabled, **Then** a new IDE window opens for the new worktree without closing the existing one

---

### User Story 3 - Pre-installed Dependencies (Priority: P3)

As a developer, I want dependencies to be pre-installed in the worktree before the IDE opens, so that I can start coding immediately without waiting for installation.

**Why this priority**: This is a nice-to-have optimization that improves the P2 experience. Developers can still manually install dependencies if needed, so this doesn't block core functionality.

**Independent Test**: Can be tested by creating a new spec branch, waiting for the IDE to open, and verifying that dependencies are already installed (e.g., `node_modules` exists and is populated). Delivers value by reducing wait time from ~1-5 minutes to zero.

**Acceptance Scenarios**:

1. **Given** I have worktree integration and dependency pre-installation enabled, **When** I create a new spec branch for a Node.js project, **Then** dependencies are installed with a progress indicator, and the IDE launches only after installation completes
2. **Given** the dependency installation fails, **When** the failure is detected, **Then** the IDE does not launch and I see an error message with actionable troubleshooting steps
3. **Given** I have multiple package managers available (npm, yarn, pnpm, bun), **When** dependencies are installed, **Then** the system uses the same package manager as the parent repository

---

### User Story 4 - Configurable Worktree Setup (Priority: P2)

As a developer, I want to configure which files and directories should be copied or symlinked to worktrees, so that each worktree has the necessary configuration without duplicating large files.

**Why this priority**: This is critical for worktrees to work correctly across different project types. Without proper configuration, worktrees may be missing essential files (configs, environment files) or may duplicate large directories unnecessarily.

**Independent Test**: Can be tested by configuring copy/symlink rules, creating a worktree, and verifying that specified files/directories are copied or symlinked as configured. Delivers value by ensuring worktrees have the right balance of isolation and shared resources.

**Acceptance Scenarios**:

1. **Given** I have configured `.env` files to be copied, **When** a worktree is created, **Then** the `.env` file is copied to the worktree and changes in the worktree don't affect the main repository
2. **Given** I have configured `node_modules` to be symlinked, **When** a worktree is created, **Then** a symlink to the parent's `node_modules` is created (if it exists)
3. **Given** no worktree configuration exists, **When** a worktree is created, **Then** reasonable defaults are used (e.g., copy config files, symlink large dependency directories)

---

### Edge Cases

- What happens when the worktree creation fails due to insufficient disk space?
- **Existing worktree collision**: When a directory already exists at the intended worktree location, abort with error by default. Support `--reuse-worktree` flag to skip recreation and reuse the existing worktree without modification.
- What happens when the IDE launch fails (e.g., IDE not installed, permission denied)?
- **Dependency installation failure**: When dependency installation fails (network error, incompatible versions, etc.), abort IDE launch and display error message with troubleshooting steps. Do not open a partially-configured worktree.
- **Stale worktree references**: When a worktree is manually deleted but the branch still exists, automatically detect and clean up stale references (via `git worktree prune`), notify user of the cleanup action
- How does the system handle worktrees when switching between multi-repo and single-repo modes?
- **Untracked file copying**: When untracked files in the parent repository match copy rules (e.g., `.env`, `.env.local`), copy them to the new worktree to ensure necessary local configuration is available

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support opt-in worktree integration through a configuration setting
- **FR-002**: System MUST create a worktree when a new spec branch is created via `/speck:specify` or `/speck:branch` (if worktree integration is enabled)
- **FR-003**: System MUST place worktrees in a predictable location (default: `.speck/worktrees/[branch-name]`)
- **FR-004**: System MUST record the user's IDE auto-launch preference in persistent configuration
- **FR-005**: System MUST support configuring which IDE to launch (default: VSCode)
- **FR-006**: System MUST launch the configured IDE pointing to the worktree directory (if IDE auto-launch is enabled)
- **FR-007**: System MUST detect the project's package manager (npm, yarn, pnpm, bun) for dependency installation
- **FR-008**: System MUST install dependencies in the worktree before opening the IDE (if dependency pre-installation is enabled), blocking IDE launch until installation completes and displaying progress to the user
- **FR-009**: System MUST support configurable rules for which files/directories to copy to worktrees, using glob patterns or explicit relative paths; copy operations include untracked files from parent repository when they match copy rules
- **FR-010**: System MUST support configurable rules for which files/directories to symlink in worktrees, using glob patterns or explicit relative paths
- **FR-011**: System MUST provide reasonable defaults for copy/symlink rules if no configuration exists
- **FR-012**: System MUST handle errors gracefully (worktree creation failure, IDE launch failure, dependency installation failure) with clear error messages
- **FR-013**: System MUST detect and report conflicts when a worktree already exists at the intended location, aborting by default unless `--reuse-worktree` flag is provided
- **FR-014**: System MUST persist worktree configuration in `.speck/config.json`
- **FR-015**: System MUST validate worktree configuration schema and report errors for invalid configurations
- **FR-016**: System MUST present automatically calculated branch names to the user for approval before creating the branch
- **FR-017**: System MUST support optional configurable branch name prefix (e.g., `specs/`) for spec branches, stored in repository configuration
- **FR-018**: System MUST automatically detect and clean up stale worktree references when worktrees are manually deleted, notifying the user of cleanup actions

### Key Entities

- **Worktree Configuration**: Represents user preferences for worktree integration (enabled/disabled, IDE auto-launch preference, IDE choice, dependency pre-installation preference)
- **File Rule**: Represents a rule for how a file or directory should be handled in worktrees (copy, symlink, or ignore), using glob patterns (e.g., `*.env`, `**/*.config.js`) or explicit relative paths
- **Worktree Metadata**: Represents information about a created worktree (branch name, worktree path, creation timestamp, status)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can create a new spec branch and have a ready-to-use worktree in under 30 seconds (excluding dependency installation time)
- **SC-002**: When IDE auto-launch is enabled, the IDE opens automatically within 5 seconds of worktree creation
- **SC-003**: When dependency pre-installation is enabled, dependencies are installed before IDE launch for 95% of supported project types
- **SC-004**: Developers can work on 3+ features simultaneously in separate worktrees without branch-switching
- **SC-005**: Worktree configuration can be set up in under 2 minutes through interactive prompts or manual editing
- **SC-006**: Error messages for worktree failures provide actionable troubleshooting steps in 100% of common error scenarios

## Assumptions

1. **Default worktree location**: Worktrees will be created in `.speck/worktrees/` by default to keep them organized and out of the way
2. **Git worktree support**: Users have Git 2.5+ which introduced the `git worktree` command
3. **Disk space**: Users have sufficient disk space for multiple worktrees (system will check and warn if space is low)
4. **IDE detection**: VSCode is installed in standard locations (macOS: `/Applications/Visual Studio Code.app`, Windows: `%LOCALAPPDATA%\Programs\Microsoft VS Code`, Linux: `/usr/share/code` or `/usr/bin/code`)
5. **Package manager detection**: Projects use standard package manager markers (`package-lock.json` for npm, `yarn.lock` for yarn, `pnpm-lock.yaml` for pnpm, `bun.lockb` for bun)
6. **Configuration scope**: Worktree configuration is repository-specific (not global) and stored in `.speck/config.json`
7. **Default copy rules**: Configuration files (`.env`, `.env.local`, `*.config.js`, `*.config.ts`) are copied by default
8. **Default symlink rules**: Large dependency directories (`node_modules`, `.bun`, `.cache`) are candidates for symlinking but will only be symlinked if they exist in the parent
9. **Multi-repo compatibility**: Worktree configuration applies to each repository independently in multi-repo setups
10. **Backward compatibility**: Existing workflows without worktrees continue to work unchanged when worktree integration is disabled
11. **Branch name prefixes**: Optional branch name prefix (e.g., `specs/`) is opt-in and breaks backwards compatibility with spec-kit; default behavior uses no prefix for compatibility
12. **Branch name approval**: All automatically calculated branch names require user approval before creation to prevent unwanted branch names
