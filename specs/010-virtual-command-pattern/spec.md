# Feature Specification: Virtual Command Pattern with Dual-Mode CLI

**Feature Branch**: `010-virtual-command-pattern`
**Created**: 2025-11-21
**Status**: Draft
**Input**: User description: "I would like to improve Speck by using the 'virtual command pattern' to call out to a single dual-mode speck cli with subcommands for each existing script, packaged within the plugin and called by hooks. I would also like to explore automatically running the check-prerequisites script automatically by hooking the /speck slash commands so that they do not need to do the Bash roundtrip themselves. In addition to recording a spec.md file, also please extract the critical knowledge and techniques from the above chat history into a addendum document that we can reference while planning and tasking."

## Clarifications

### Session 2025-11-21

- Q: Should we add a POC user story to validate the hooks-based virtual command pattern before full implementation? → A: Yes, add User Story 0 for POC
- Q: What should the POC implement to prove feasibility? → A: Test command + one real Speck command (speck-env)
- Q: Which hook type should trigger automatic prerequisite checks for slash commands? → A: PrePromptSubmit - Check before slash command expansion
- Q: How should existing individual script files be migrated to the unified CLI? → A: Incremental migration - one-by-one, keep both until validated, then deprecate
- Q: How long should individual command scripts remain supported after unified CLI is fully implemented? → A: One feature release cycle after all commands migrated and tested

## User Scenarios & Testing

### User Story 0 - POC: Hook-Based Virtual Command Pattern (Priority: P0)

A developer creates a minimal proof-of-concept demonstrating that Claude Code's PreToolUse hooks can successfully intercept virtual commands, route them to scripts, and return results. The POC implements two commands: a simple test command (`test-hello`) to prove the hook mechanism works, and one real Speck command (`speck-env`) to validate integration with existing infrastructure.

**Why this priority**: P0 (foundational) - Without confirming the hook mechanism works as documented, the entire feature is at risk. This POC must succeed before proceeding with User Stories 1-5.

**Independent Test**: Can be tested by creating a minimal hook script that intercepts both `test-hello` and `speck-env`, routes to appropriate scripts, and verifies Claude displays correct output for both commands.

**Acceptance Scenarios**:

1. **Given** a minimal hook script registered in plugin.json, **When** Claude executes `test-hello world`, **Then** hook intercepts the command and returns "Hello world"
2. **Given** hook receives JSON stdin with `{"tool_input": {"command": "test-hello world"}}`, **When** hook parses and routes command, **Then** hook returns valid hookSpecificOutput with updatedInput
3. **Given** hook intercepts `speck-env` command, **When** routed to existing env script, **Then** output matches direct script execution (validates integration)
4. **Given** hook script fails or returns malformed JSON, **When** Claude attempts execution, **Then** error is clearly reported and doesn't crash Claude
5. **Given** POC succeeds with both commands, **When** developer reviews implementation, **Then** pattern is documented and ready for production commands

---

### User Story 1 - Seamless Virtual Command Invocation (Priority: P1)

A Claude user working with Speck can invoke plugin functionality using simple virtual commands (e.g., `speck-analyze`, `speck-branch`) without needing to know the plugin's installation path. Claude's hook system intercepts these commands and routes them to the actual plugin scripts transparently.

**Why this priority**: This is the core value proposition - simplifying plugin invocation and eliminating path-dependent commands. Without this, users must manually discover and use full paths to plugin scripts.

**Independent Test**: Can be tested by configuring the hook system, invoking a virtual command like `speck-env` from Claude, and verifying the correct output appears without any path references in the user's command.

**Acceptance Scenarios**:

1. **Given** Claude Code with Speck plugin installed and hooks configured, **When** user asks Claude to run `speck-env`, **Then** Claude executes the command without requiring full path specification
2. **Given** user invokes `speck-branch list`, **When** hook intercepts the command, **Then** hook routes to actual CLI script and returns branch list output
3. **Given** user invokes unknown virtual command `speck-unknown`, **When** hook processes the command, **Then** hook passes through without modification and command fails naturally with "command not found"
4. **Given** virtual command with arguments `speck-branch create feature-name`, **When** hook intercepts command, **Then** all arguments are preserved and passed correctly to underlying script
5. **Given** virtual command that produces JSON output, **When** hook returns result, **Then** JSON structure is preserved without corruption

---

### User Story 2 - Dual-Mode CLI Operation (Priority: P1)

A Speck CLI script can operate in two modes: as a standalone command-line tool (for direct testing and development) and as a hook-invoked script (for Claude integration). Both modes execute identical business logic and produce consistent results.

**Why this priority**: Dual-mode operation enables testability, debugging, and direct script usage while maintaining Claude integration. Single-mode tools would require separate implementations or forgo standalone usage.

**Independent Test**: Can be tested by running the same command both directly (`bun cli.ts analyze --input file.txt`) and via hook simulation (piping JSON to `bun cli.ts --hook`), verifying identical functional outcomes.

**Acceptance Scenarios**:

1. **Given** developer runs CLI directly with `bun speck.ts branch list`, **When** CLI executes in normal mode, **Then** output displays branch list using Commander framework
2. **Given** hook invokes CLI with JSON stdin containing `{"tool_input": {"command": "speck-branch list"}}`, **When** CLI detects hook mode, **Then** CLI executes same logic and returns hook-formatted response
3. **Given** CLI command fails in normal mode with exit code 1, **When** same command fails in hook mode, **Then** hook returns error via stderr redirection with exit code 1
4. **Given** CLI accepts flags like `--verbose` in normal mode, **When** same flags passed via hook JSON, **Then** flags are parsed and respected identically
5. **Given** CLI outputs structured data in normal mode, **When** executed via hook, **Then** data structure is preserved and wrapped in echo command for Claude consumption

---

### User Story 3 - Automatic Prerequisites Check (Priority: P2)

When a user invokes any `/speck.*` slash command, the system automatically runs prerequisite checks (repository mode detection, feature context validation) via PrePromptSubmit hook before the slash command expands. This runs once per command invocation, eliminating the need for each command to manually invoke check-prerequisites.

**Why this priority**: Reduces boilerplate, ensures consistent environment validation, and improves user experience by catching configuration issues early. Not P1 because commands can function with manual checks as fallback.

**Independent Test**: Can be tested by triggering a slash command in an invalid state (e.g., wrong branch) and verifying automatic prerequisite check catches the issue before command expansion.

**Acceptance Scenarios**:

1. **Given** user invokes `/speck.plan` slash command, **When** PrePromptSubmit hook fires before expansion, **Then** hook automatically runs check-prerequisites and provides context to command
2. **Given** prerequisite check detects invalid state (e.g., not on feature branch), **When** check fails in PrePromptSubmit, **Then** command aborts with clear error message before expansion
3. **Given** prerequisite check succeeds in PrePromptSubmit, **When** check provides repository mode and feature context, **Then** context is injected into command environment or prompt context
4. **Given** user invokes command directly via CLI (not slash command), **When** command runs, **Then** PrePromptSubmit hook is not triggered (CLI mode bypasses hook)
5. **Given** prerequisite check runs automatically via PrePromptSubmit, **When** check completes, **Then** execution time adds minimal overhead (< 100ms) and runs only once per slash command

---

### User Story 4 - Centralized Command Registry (Priority: P2)

The plugin maintains a single registry mapping virtual command names to their corresponding subcommands and handlers. When a virtual command is invoked, the router looks up the handler and executes it, avoiding hardcoded command parsing logic scattered across multiple files.

**Why this priority**: Improves maintainability and makes adding new commands straightforward. Not P1 because initial implementation can work with hardcoded mappings for MVP.

**Independent Test**: Can be tested by adding a new command to the registry, invoking it via virtual command pattern, and verifying it executes without modifying hook routing logic.

**Acceptance Scenarios**:

1. **Given** plugin defines registry mapping `{"branch": {handler: branchHandler, parseArgs: parseBranchArgs}}`, **When** user invokes `speck-branch list`, **Then** router looks up "branch" and executes branchHandler
2. **Given** new command added to registry with `{"validate": {handler: validateHandler}}`, **When** user invokes `speck-validate`, **Then** command executes without hook code changes
3. **Given** registry defines argument parser for command, **When** hook receives command with arguments, **Then** parser extracts flags and positional args correctly
4. **Given** registry lookup fails for unknown command, **When** hook processes request, **Then** hook returns empty JSON to pass through
5. **Given** command handler throws error, **When** hook executes handler, **Then** error is caught and returned as stderr output with exit code 1

---

### User Story 5 - Knowledge Base Document (Priority: P3)

The project includes a comprehensive addendum document that extracts critical techniques from the hook system design discussions. This document serves as a reference for future development and helps new contributors understand the architectural patterns.

**Why this priority**: Important for long-term maintainability but not critical for initial functionality. Can be created after implementation proves the pattern works.

**Independent Test**: Can be tested by reviewing the document for completeness against a checklist of key concepts (PreToolUse hooks, updatedInput pattern, dual-mode design, argument parsing, error handling).

**Acceptance Scenarios**:

1. **Given** addendum document exists in specs directory, **When** developer reads it, **Then** document explains PreToolUse hook mechanism with code examples
2. **Given** document covers dual-mode CLI pattern, **When** developer implements new command, **Then** document provides complete template for both modes
3. **Given** document explains virtual command pattern, **When** new plugin is created, **Then** document serves as implementation guide
4. **Given** document includes testing patterns, **When** developer writes tests, **Then** document shows how to test both CLI and hook modes
5. **Given** document covers error handling, **When** command fails, **Then** document explains how errors propagate through hook system

---

### Edge Cases

- What happens when hook receives malformed JSON input?
- How does system handle commands with quoted arguments containing special characters?
- What occurs when CLI script path contains spaces or special characters?
- How does system behave when same command is invoked concurrently by multiple Claude instances?
- What happens when hook router script fails to load or has syntax errors?
- How does system handle commands that produce very large output (> 100KB)?
- What occurs when git repository is in detached HEAD state?
- How does system handle symbolic links in plugin installation path?
- What happens when both individual script and unified CLI implement same command during migration?
- How does system handle version mismatches between hook router and CLI during incremental rollout?
- What occurs when user invokes deprecated individual script directly after migration completes?

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a single unified CLI entry point (`speck.ts` or similar) that handles all Speck subcommands
- **FR-002**: CLI MUST support both normal mode (Commander-based) and hook mode (JSON stdin) with identical business logic
- **FR-003**: Hook system MUST intercept virtual commands matching pattern `speck-<subcommand>` and route to CLI
- **FR-004**: Hook MUST preserve all command arguments (flags, positional args, quoted strings) when routing
- **FR-005**: Hook MUST return output in Claude-compatible format using `updatedInput` with echo commands
- **FR-006**: System MUST support automatic prerequisite checking for slash commands via PrePromptSubmit hook (runs once before command expansion)
- **FR-007**: CLI MUST provide help text and version information in normal mode
- **FR-008**: Hook MUST pass through non-matching commands (not starting with `speck-`) without modification
- **FR-009**: System MUST handle errors gracefully in both modes and propagate exit codes correctly
- **FR-010**: Hook MUST detect mode (CLI vs hook) automatically based on stdin TTY status or explicit flag
- **FR-011**: Command registry MUST map virtual command names to handler functions and argument parsers
- **FR-012**: CLI MUST support all existing Speck commands (specify, plan, tasks, clarify, branch, env, etc.) as subcommands
- **FR-013**: Hook response MUST include `permissionDecision: "allow"` for intercepted commands
- **FR-014**: Hook response MUST escape single quotes in output to prevent shell injection
- **FR-015**: System MUST provide comprehensive tests covering CLI mode, hook mode, and error scenarios
- **FR-016**: Hook configuration MUST be declared in plugin.json manifest for automatic registration
- **FR-017**: System MUST provide addendum document extracting key architectural patterns and techniques
- **FR-018**: System MUST support incremental migration where individual command scripts and unified CLI coexist until all commands validated
- **FR-019**: Individual command scripts MUST remain functional during migration period to ensure zero breaking changes
- **FR-020**: Individual command scripts MUST be deprecated and removed one feature release cycle after all commands migrated to unified CLI and tested in production

### Key Entities

- **Virtual Command**: User-facing command name (e.g., `speck-branch`) that maps to actual CLI subcommand
- **Command Registry**: Data structure mapping virtual command names to handler functions and parsers
- **Hook Router**: Script that receives Bash tool calls via stdin, identifies virtual commands, and routes to CLI
- **Dual-Mode CLI**: Single executable that operates in both standalone (Commander) and hook-invoked (JSON stdin) modes
- **Hook Input**: JSON structure containing `tool_input.command` field with the command string to intercept
- **Hook Output**: JSON structure containing `hookSpecificOutput` with `updatedInput.command` for the substituted command
- **Command Handler**: Function that implements business logic for a specific subcommand
- **Argument Parser**: Function that extracts typed parameters from command string or argv array

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can invoke all Speck functionality using virtual commands without specifying plugin installation paths
- **SC-002**: CLI scripts can be tested directly via `bun test` with >90% code coverage for both modes
- **SC-003**: Hook routing adds <100ms latency to command execution time
- **SC-004**: Adding new commands requires changes only to command registry, not hook routing logic
- **SC-005**: Slash command execution time reduces by 30% due to automatic prerequisite caching
- **SC-006**: Zero breaking changes to existing Speck workflows during migration period - all current commands continue working until deprecated one release cycle after full migration
- **SC-007**: Hook system handles 100% of valid command invocations without falling back to error states
- **SC-008**: Documentation enables new contributors to add commands in <30 minutes
- **SC-009**: Test suite validates both CLI and hook modes with identical assertions for each command
- **SC-010**: Error messages in both modes provide actionable guidance (not generic "command failed")
