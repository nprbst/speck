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

- Q: Script execution architecture pattern? → A: Option B - Create a single "speck-runner" skill that wraps all script execution
- Q: Backward compatibility strategy for slash commands? → A: Commands remain as slash-command entrypoints, delegate script execution to skill
- Q: Skill invocation pattern? → A: Single skill with script-name parameter

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
- **Size limit exceeded**: If packaged files exceed 5MB, build fails with error listing total size, breakdown by component (commands: X MB, agents: Y MB, templates: Z MB, scripts: W MB), and suggesting removal of non-essential documentation or compression of assets
- **Missing required files**: If templates, documentation, or changelog files are missing, build fails with error listing missing files
- **Invalid version format**: If version doesn't follow semantic versioning (e.g., "1.2.3"), build fails with error specifying correct format
- **Incomplete command definitions**: If slash command files are missing or malformed, build fails with error identifying problematic commands

**Note:** Installation, update, failure recovery, dependency validation, and runtime conflicts are handled by the Claude Plugin system and are out of scope for this feature.

## Requirements _(mandatory)_

### Functional Requirements

**Build & Packaging**
- **FR-001**: The build system MUST generate a plugin package containing all Speck slash commands from .claude/commands/ directory (including but not limited to: /speck.specify, /speck.plan, /speck.clarify, /speck.tasks, /speck.implement, /speck.analyze, /speck.constitution, /speck.checklist, /speck.taskstoissues)
- **FR-002**: The build system MUST include all Speck agent definitions in the plugin package (agents discovered in `.claude/agents/`: speck.transform-bash-to-bun.md, speck.transform-commands.md)
- **FR-003**: The build system MUST include a single "speck-runner" skill in the plugin package that wraps all script execution with script-name parameter interface (valid values defined in contracts/skill-parameter.schema.json: create-new-feature, setup-plan, check-prerequisites, update-agent-context, generate-tasks, analyze-consistency)
- **FR-004**: The build system MUST include all required templates (.specify/templates/*) in the plugin package
- **FR-005**: The build system MUST include all required scripts (.speck/scripts/*) in the plugin package for access by the speck-runner skill
- **FR-006**: The build system MUST include all constitution templates and principles in the plugin package
- **FR-007-NEW**: Slash commands MUST remain as user-facing entrypoints and invoke the speck-runner skill for all script execution; the speck-runner skill MUST handle plugin context detection internally using CLAUDE_PLUGIN_ROOT environment variable or skill-relative path resolution
- **FR-028**: The speck-runner skill MUST resolve script paths as follows: (a) If CLAUDE_PLUGIN_ROOT environment variable is set, resolve scripts relative to `${CLAUDE_PLUGIN_ROOT}/scripts/`, (b) Otherwise resolve scripts relative to repository root `.speck/scripts/`

**Plugin Metadata**
- **FR-007**: The plugin manifest MUST use "Speck" as the plugin name
- **FR-008**: The plugin manifest MUST declare git repository as the plugin identifier (per Claude Plugin conventions)
- **FR-009**: The plugin manifest MUST use version "0.1.0" for the initial release
- **FR-010**: The plugin manifest MUST declare git as a required dependency
- **FR-011**: The plugin manifest MUST declare shell/bash access as a required dependency
- **FR-012**: The plugin manifest MUST include version information following semantic versioning format
- **FR-013**: The plugin manifest MUST include comprehensive metadata: description, author, license, keywords
- **FR-014**: The plugin manifest MUST specify compatible Claude Code version requirements (minimum version: Claude Code 2.0+ per plan.md technical context)
- **FR-015**: The plugin manifest MUST declare that user project files (specs/, plans, tasks) are preserved during uninstall (verification handled by Claude Plugin system - out of scope for build process)

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

**Build Validation & Error Handling**
- **FR-024**: The build MUST fail with a descriptive error if any required files (commands, templates, scripts, documentation, changelog) are missing
- **FR-025**: The build MUST fail with a descriptive error if the total package size exceeds 5MB
- **FR-026**: The build MUST fail with a descriptive error if the version number doesn't conform to semantic versioning format
- **FR-027**: The build MUST validate that all declared slash commands have corresponding implementation files

### Key Entities

- **Plugin Package**: The distributable artifact containing all Speck components
  (commands, agents, speck-runner skill, templates, scripts), with metadata, version
  information, and installation instructions
- **Speck-Runner Skill**: A single Claude Code skill that accepts script-name parameter and executes the corresponding Speck script (e.g., create-new-feature, setup-plan, check-prerequisites, update-agent-context); commands delegate to this skill instead of executing scripts directly. Example invocation from command markdown: `Please use the speck-runner skill with script-name parameter set to "create-new-feature" and pass the feature description.`
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
- Packaging all Speck components: slash commands, agents, speck-runner skill, templates, scripts, constitution files
- Implementation of speck-runner skill with script-name parameter interface for delegated script execution
- Updating commands to detect plugin context and delegate script execution to speck-runner skill
- Marketplace listing content: description, features, usage guide, command examples
- Plugin documentation files included in package
- Changelog structure and version history documentation
- Dependency declarations (git, shell/bash, Claude Code version compatibility)
- Build validation to ensure package size stays under 5MB
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
9. Package size limit of 5MB is sufficient for all Speck components including the speck-runner skill
10. Claude Code skills can accept parameters and execute scripts bundled within the plugin using paths relative to the skill location
11. Commands (markdown files) invoke speck-runner skill unconditionally; the speck-runner skill detects execution context (standalone repo vs plugin installation) internally by checking for CLAUDE_PLUGIN_ROOT environment variable and resolves script paths accordingly (plugin: relative to CLAUDE_PLUGIN_ROOT, standalone: relative to repository root)

## Dependencies

- Claude Code plugin system and installation API
- Claude Marketplace submission and review process
- Git availability in target installation environments
- Shell/bash support for executing Speck scripts
- File system write access for creating .specify directory structure
- Existing Speck codebase and command definitions
