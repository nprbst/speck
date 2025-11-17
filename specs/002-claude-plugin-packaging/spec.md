# Feature Specification: Claude Plugin Packaging

**Feature Branch**: `002-claude-plugin-packaging` **Created**: 2025-11-15
**Status**: Draft **Input**: User description: "We are completely missing the
hard requirement that the resulting set of Claude Commands, Agents, and Skill
must be packaged as an installable Claude Pluging, wrapped in a Claude
Marketplace."

## Clarifications

### Session 2025-11-15

- Q: When plugin installation or update fails mid-process (network interruption, permission error, etc.), what should the recovery strategy be? → A: Handled by Claude Plugin system - not in scope for this feature
- Q: How should plugin package integrity be validated before installation? → A: Handled by Claude Plugin system - not in scope for this feature
- Q: What is the scope boundary for this feature? → A: Emit build artifacts in correct plugin format with correct metadata for Claude Marketplace. Installation, validation, updates, and failure handling are managed by Claude Plugin infrastructure.
- Q: When the build process encounters missing required files (templates, documentation, changelog), what should happen? → A: Fail build with error - Stop build process and report missing files to prevent incomplete package publication
- Q: What should the official plugin name be in the Claude Marketplace? → A: Speck (note: Claude Plugin identifiers are git repositories)
- Q: What version number should the initial Speck plugin release use? → A: 0.1.0
- Q: When the Claude Plugin format specification is unknown, incomplete, or changes during development, what should the build system do? → A: Claude Plugin format is published and stable. Research it during the plan stage.

### Session 2025-11-16

- Q: Script execution architecture pattern? → A: Option B - Create a single "speck-runner" skill that wraps all script execution (SUPERSEDED by Q4)
- Q: Backward compatibility strategy for slash commands? → A: Commands remain as slash-command entrypoints, delegate script execution to skill (SUPERSEDED by Q4)
- Q: Skill invocation pattern? → A: Single skill with script-name parameter (SUPERSEDED by Q4)
- Q: Environment setup architecture pattern? → A: Option A - SessionStart hook runs setup script that writes `SPECK_PLUGIN_ROOT` to `CLAUDE_ENV_FILE`; commands use `${SPECK_PLUGIN_ROOT:-".speck"}/scripts/foo.ts` pattern with bash fallback
- Q: Speck-Runner Skill vs Direct Script Execution? → A: Option B - Direct bash execution with environment variables; speck-runner skill approach is superseded by SessionStart hooks solution
- Q: Command debugging output for environment verification? → A: Option A - Commands include `echo "DEBUG: $(env | grep PLUGIN)"` at the top for environment variable verification
- Q: Observability and error reporting for build failures and validation errors? → A: Option B - Structured error output with actionable guidance (e.g., "Missing setup-env.sh → Create script at scripts/setup-env.sh with template...")

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Install Speck Plugin from Marketplace (Priority: P1)

A developer wants to use Speck's specification and planning capabilities in
their Claude environment. They discover the Speck plugin in the Claude
Marketplace, click install, and within seconds have access to all Speck slash
commands (/speck.specify, /speck.plan, etc.) without any manual setup.

**Why this priority**: This is the core distribution mechanism that makes Speck
accessible to users. Without this, users cannot easily adopt Speck.

**Independent Test**: Can be fully tested by searching for "Speck" in Claude
Marketplace, clicking install, and verifying that `/speck.specify` command
becomes available. Delivers immediate value by enabling all Speck functionality.

**Acceptance Scenarios**:

1. **Given** a user browses the Claude Marketplace, **When** they search for
   specification tools, **Then** Speck appears in search results with clear
   description and metadata
2. **Given** a user views the Speck plugin page, **When** they click "Install",
   **Then** the plugin installs successfully within 10 seconds
3. **Given** the plugin is installed, **When** the user types `/speck` in
   Claude, **Then** all Speck commands appear in autocomplete
4. **Given** the plugin is installed, **When** the user runs
   `/speck.specify "add user authentication"`, **Then** the command executes
   successfully and creates a specification

---

### User Story 2 - Update Installed Plugin (Priority: P2)

A user has Speck installed and a new version is released with bug fixes and new
features. They receive a notification in Claude about the update, review the
changelog, and update with one click while preserving their existing
specifications and project data.

**Why this priority**: Ensures users can receive improvements and fixes without
manual intervention or data loss. Critical for long-term plugin maintenance.

**Independent Test**: Can be tested by publishing a new version of Speck,
waiting for update notification, clicking update, and verifying that (a) new
features work, (b) existing specs remain intact, and (c) the process completes
in under 30 seconds.

**Acceptance Scenarios**:

1. **Given** a new version is published, **When** the user opens Claude,
   **Then** they see a notification about the Speck update
2. **Given** an update notification appears, **When** the user clicks "View
   Changes", **Then** they see a clear changelog with new features and fixes
3. **Given** the user clicks "Update", **When** the update completes, **Then**
   existing specifications and project files remain unchanged
4. **Given** the update completes, **When** the user runs a command, **Then**
   new features are immediately available

---

### User Story 3 - Uninstall Plugin Cleanly (Priority: P3)

A user decides they no longer need Speck or want to try an alternative tool.
They navigate to their installed plugins, select Speck, and uninstall it. The
plugin is removed completely, but their specification files remain in their
project for future reference or migration.

**Why this priority**: Provides users with control and confidence that they can
remove the plugin without losing their work. Lower priority than install/update
but important for user trust.

**Independent Test**: Can be tested by installing Speck, creating several specs,
uninstalling the plugin, and verifying that (a) Speck commands no longer appear,
(b) specification files still exist in the project, and (c) uninstall completes
in under 10 seconds.

**Acceptance Scenarios**:

1. **Given** Speck is installed, **When** the user opens plugin settings,
   **Then** Speck appears in the list of installed plugins
2. **Given** the user selects Speck, **When** they click "Uninstall", **Then**
   the system warns about removal but confirms data preservation
3. **Given** the user confirms uninstall, **When** the process completes,
   **Then** all Speck commands are removed from Claude
4. **Given** the plugin is uninstalled, **When** the user checks their project
   directory, **Then** all specs, plans, and generated files remain intact

---

### User Story 4 - Discover Plugin Capabilities (Priority: P2)

A user has heard about Speck but wants to understand what it does before
installing. They view the plugin page in the marketplace which shows clear
documentation, screenshots/demos of key workflows, version history, and user
ratings. This helps them make an informed decision.

**Why this priority**: Good plugin metadata and documentation drives adoption
and reduces support burden. Essential for marketplace success but lower priority
than core install functionality.

**Independent Test**: Can be tested by viewing the Speck marketplace page as a
non-installed user and verifying that all key information (description,
features, commands, screenshots, requirements) is clearly presented and
accurate.

**Acceptance Scenarios**:

1. **Given** a user views the Speck marketplace page, **When** they scroll
   through the description, **Then** they see a clear explanation of what Speck
   does and key benefits
2. **Given** the marketplace page loads, **When** the user looks for usage
   examples, **Then** they see documentation of primary commands with sample
   outputs
3. **Given** the user wants to verify compatibility, **When** they check
   requirements, **Then** they see clear information about dependencies and
   supported environments
4. **Given** the user wants social proof, **When** they view ratings and
   reviews, **Then** they see aggregate rating and recent user feedback

---

### Edge Cases

**Build-time concerns:**
- **Size limit exceeded**: If packaged files exceed 5MB, build fails with structured error: "BUILD FAILED: Package size X.XX MB exceeds 5MB limit. Breakdown: commands (X MB), agents (Y MB), templates (Z MB), scripts (W MB). Action: Remove non-essential documentation or compress assets."
- **Missing required files**: If templates, documentation, changelog, or setup-env.sh script are missing, build fails with structured error listing each missing file and its expected path, e.g., "BUILD FAILED: Missing required files: [1] scripts/setup-env.sh → Create bash script to write SPECK_PLUGIN_ROOT to CLAUDE_ENV_FILE"
- **Invalid version format**: If version doesn't follow semantic versioning, build fails with structured error: "BUILD FAILED: Invalid version 'X.Y' in package.json. Expected format: MAJOR.MINOR.PATCH (e.g., 1.2.3). Action: Update package.json version field."
- **Incomplete command definitions**: If slash command files are missing or malformed, build fails with structured error identifying problematic commands and required fixes
- **Missing SessionStart hook configuration**: If hooks/hooks.json is missing or doesn't include the SessionStart hook for setup-env.sh, build fails with structured error: "BUILD FAILED: Missing SessionStart hook in hooks/hooks.json. Action: Add hook configuration to execute scripts/setup-env.sh at session start."

**Runtime concerns (plugin context):**
- **SessionStart hook failure**: If setup-env.sh fails to execute or cannot write to CLAUDE_ENV_FILE, commands fall back to bash default `${SPECK_PLUGIN_ROOT:-".speck"}` which resolves to `.speck` (may fail if scripts not in expected location)
- **CLAUDE_ENV_FILE not available**: Commands use bash parameter expansion fallback; script execution proceeds with `.speck` path (expected to fail in plugin context where scripts are at `${CLAUDE_PLUGIN_ROOT}/.speck`)

**Note:** Installation, update, failure recovery, dependency validation, and runtime conflicts are handled by the Claude Plugin system and are out of scope for this feature.

## Requirements _(mandatory)_

### Functional Requirements

**Build & Packaging**
- **FR-001**: The build system MUST generate a plugin package containing all Speck slash commands from .claude/commands/ directory (including but not limited to: /speck.specify, /speck.plan, /speck.clarify, /speck.tasks, /speck.implement, /speck.analyze, /speck.constitution, /speck.checklist, /speck.taskstoissues)
- **FR-002**: The build system MUST include all Speck agent definitions in the plugin package (agents discovered in `.claude/agents/`: speck.transform-bash-to-bun.md, speck.transform-commands.md)
- **FR-003**: ~~The build system MUST include a single "speck-runner" skill in the plugin package that wraps all script execution with script-name parameter interface~~ (REMOVED - superseded by direct bash execution approach)
- **FR-004**: The build system MUST include all required templates (.specify/templates/*) in the plugin package
- **FR-005**: The build system MUST include all required scripts (.speck/scripts/*) in the plugin package
- **FR-006**: The build system MUST include all constitution templates and principles in the plugin package
- **FR-006b**: The build system MUST include the setup-env.sh bash script that writes `SPECK_PLUGIN_ROOT` environment variable to `CLAUDE_ENV_FILE`
- **FR-007-NEW**: Slash commands MUST use bash script invocations with the pattern `bun run ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/<script-name>.ts` to allow context-aware path resolution with fallback to standalone repository structure
- **FR-007b**: Slash commands MUST include debugging output `echo "DEBUG: $(env | grep PLUGIN)"` at the beginning of bash execution steps to verify environment variable setup for troubleshooting path resolution issues
- **FR-028**: The plugin package MUST include a SessionStart hook that executes a setup script (`scripts/setup-env.sh`) to write `export SPECK_PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}/.speck"` to the `CLAUDE_ENV_FILE`, making the plugin scripts directory available to all subsequent bash commands throughout the session
- **FR-029**: The setup script MUST only write to `CLAUDE_ENV_FILE` when the variable is present (plugin context); in standalone repository context (no `CLAUDE_ENV_FILE`), commands fall back to `.speck` via bash parameter expansion default value

**Plugin Metadata**
- **FR-007**: The plugin manifest MUST use "Speck" as the plugin name
- **FR-008**: The plugin manifest MUST declare git repository as the plugin identifier (per Claude Plugin conventions)
- **FR-009**: The plugin manifest MUST use version "0.1.0" for the initial release
- **FR-010**: The plugin manifest MUST declare git as a required dependency
- **FR-011**: The plugin manifest MUST declare shell/bash access as a required dependency
- **FR-012**: The plugin manifest MUST include version information following semantic versioning format
- **FR-013**: The plugin manifest MUST include comprehensive metadata: description, author, license, keywords
- **FR-014**: The plugin manifest MUST specify compatible Claude Code version requirements (minimum version: Claude Code 2.0+ per plan.md technical context)
- **FR-015**: The plugin manifest SHOULD document that user project files (specs/, plans, tasks) are preserved during uninstall (actual preservation handled by Claude Plugin system - no build process validation required)

**Documentation & Marketplace Content**
- **FR-016**: The plugin package MUST include usage documentation for marketplace display
- **FR-017**: The plugin package MUST include a changelog documenting version history with initial 0.1.0 entry
- **FR-018**: The marketplace listing content MUST include clear description of Speck's capabilities
- **FR-019**: The marketplace listing content MUST include examples of primary commands with expected outputs
- **FR-020**: The marketplace listing content MUST include compatibility and dependency information

**Build Output Format**
- **FR-021**: The build output MUST conform to Claude Marketplace plugin package format specifications (see research.md for format details discovered during Phase 0)
- **FR-022**: The plugin package size MUST be under 5MB
- **FR-023**: The build system MUST assume target users are working in a git-initialized repository
- **FR-023-NOTE**: The build system assumes git repository exists but does NOT validate this assumption - build will proceed even if .git/ directory is absent

**Build Validation & Error Handling**
- **FR-024**: The build MUST fail with structured error messages that include: (1) failure type, (2) specific invalid state detected, (3) actionable guidance for resolution (e.g., missing file path and purpose, expected format example, suggested remediation steps)
- **FR-025**: The build MUST fail with a descriptive error if the total package size exceeds 5MB, including size breakdown by component type
- **FR-026**: The build MUST fail with a descriptive error if the version number doesn't conform to semantic versioning format, including example of correct format
- **FR-027**: The build MUST validate that all declared slash commands have corresponding implementation files
- **FR-030**: All build validation errors MUST follow the pattern "BUILD FAILED: [description of what failed]. [Current state details]. Action: [specific steps to fix]"

### Key Entities

- **Plugin Package**: The distributable artifact containing all Speck components
  (commands, agents, templates, scripts, SessionStart hook), with metadata, version
  information, and installation instructions
- **SessionStart Hook**: A Claude Code hook configuration that executes setup-env.sh script when a new Claude session begins; the script writes `export SPECK_PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}/.speck"` to `CLAUDE_ENV_FILE`, making the plugin scripts directory path available to all bash commands throughout the session
- **Setup Script (setup-env.sh)**: Bash script that detects plugin context (presence of `CLAUDE_ENV_FILE`) and writes `SPECK_PLUGIN_ROOT` environment variable for session-persistent path resolution; commands use `${SPECK_PLUGIN_ROOT:-".speck"}` pattern to fall back to `.speck` in standalone repository context
- **Marketplace Listing**: The public-facing page in Claude Marketplace showing
  plugin name, description, features, screenshots, version history, ratings, and
  installation button
- **Plugin Manifest**: Configuration file defining plugin metadata,
  dependencies, file mappings, version compatibility, and installation hooks
- **Installation State**: Record of installed plugin version, installation
  timestamp, user configuration, and file locations for update/uninstall
  operations
- **Changelog**: Version-specific documentation of new features, bug fixes,
  breaking changes, and migration notes

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can find Speck in Claude Marketplace search results within 5
  seconds of searching for "specification" or "planning"
- **SC-002**: Users can complete plugin installation from discovery to first
  command execution in under 60 seconds
- **SC-003**: Plugin updates preserve 100% of existing user specifications and
  project files
- **SC-004**: Plugin installation succeeds on first attempt for 95% of users in
  supported environments
- **SC-005**: Uninstalling and reinstalling the plugin results in identical
  functionality and file structure
- **SC-006**: Users can access complete plugin documentation without leaving the
  Claude Marketplace interface
- **SC-007**: The plugin package size is under 5MB to ensure fast download and
  installation
- **SC-008**: Plugin marketplace page receives an average rating of 4.0+ stars
  from users (once ratings are available)

## Scope Boundaries

### In Scope

- Build system that generates Claude Marketplace-compliant plugin packages
- Plugin manifest definition with all required metadata (name, version, author, license, dependencies, compatibility)
- Packaging all Speck components: slash commands, agents, templates, scripts, constitution files, SessionStart hook configuration
- SessionStart hook configuration (hooks/hooks.json) that registers setup-env.sh script
- Setup script (setup-env.sh) that writes `SPECK_PLUGIN_ROOT` environment variable to `CLAUDE_ENV_FILE` for session-persistent path resolution
- Updating commands to use direct bash execution with `${SPECK_PLUGIN_ROOT:-".speck"}` pattern for context-aware script path resolution
- Marketplace listing content: description, features, usage guide, command examples
- Plugin documentation files included in package
- Changelog structure and version history documentation
- Dependency declarations (git, shell/bash, Claude Code version compatibility)
- Build validation to ensure package size stays under 5MB
- Build validation to ensure SessionStart hook and setup script are present
- Assumption that target environment is a git-initialized repository

### Out of Scope

- Plugin installation mechanism (handled by Claude Plugin system)
- Plugin update mechanism (handled by Claude Plugin system)
- Plugin uninstall mechanism (handled by Claude Plugin system)
- Package integrity validation (handled by Claude Plugin system)
- Installation failure recovery (handled by Claude Plugin system)
- Dependency checking at runtime (handled by Claude Plugin system)
- File conflict resolution during installation (handled by Claude Plugin system)
- Version conflict detection (handled by Claude Plugin system)
- Web interface for plugin configuration
- Automated testing of plugin installation
- Multi-language support for documentation (English only initially)
- Plugin analytics or usage tracking
- Paid/premium features or pricing tiers
- Integration with external package managers outside Claude ecosystem
- Backward compatibility with pre-plugin Speck installations

## Assumptions

1. Claude Marketplace has a published and stable plugin package format specification that will be researched during the planning phase
2. Claude Plugin identifiers are based on git repositories (per Claude Plugin conventions)
3. Plugin packages can include shell scripts and declare git/bash as dependencies
4. Users who install Speck are working in git-initialized repositories
5. Users have basic familiarity with command-line tools and git workflows
6. Marketplace provides standard metadata fields for plugin manifests (name, version, author, license, description, keywords, dependencies)
7. Plugin format supports including both executable code (commands, agents, skills) and data files (templates, scripts, documentation)
8. Claude Plugin system handles installation, updates, uninstalls, and dependency validation
9. Package size limit of 5MB is sufficient for all Speck components (commands, agents, templates, scripts, SessionStart hook)
10. SessionStart hooks have access to `CLAUDE_ENV_FILE` environment variable, which provides a file path where environment variables can be persisted for the entire Claude session
11. Environment variables written to `CLAUDE_ENV_FILE` during SessionStart hooks are available in all subsequent bash tool calls throughout the session
12. Commands use bash parameter expansion `${SPECK_PLUGIN_ROOT:-".speck"}` to default to `.speck` when the environment variable is not set (standalone repository context)

## Dependencies

- Claude Code plugin system and installation API
- Claude Marketplace submission and review process
- Git availability in target installation environments
- Shell/bash support for executing Speck scripts
- File system write access for creating .specify directory structure
- Existing Speck codebase and command definitions
