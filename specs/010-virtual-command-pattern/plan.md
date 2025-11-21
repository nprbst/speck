# Implementation Plan: Virtual Command Pattern with Dual-Mode CLI

**Branch**: `010-virtual-command-pattern` | **Date**: 2025-11-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-virtual-command-pattern/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Executive Summary

This feature introduces a virtual command pattern enabling seamless CLI invocation without path dependencies, eliminating the need for users to know plugin installation paths. The system implements a dual-mode CLI (standalone Commander-based and hook-invoked JSON stdin) with automatic prerequisite checking via PrePromptSubmit hooks. A centralized command registry manages virtual-to-actual command mappings, enabling incremental migration from individual scripts to a unified CLI entry point.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Bun 1.0+ runtime
**Primary Dependencies**: Commander.js (CLI framework), Bun Shell API (subprocess/stdio), Claude Code Plugin System 2.0+ (hooks)
**Storage**: File-based (plugin.json for hook configuration, command registry as TypeScript module)
**Testing**: Bun test framework (unit tests for CLI modes, integration tests for hook interception)
**Target Platform**: macOS/Linux (Claude Code native environment)
**Project Type**: Single project (CLI tool with plugin integration)
**Performance Goals**: <100ms hook routing latency, <30min to add new command to registry
**Constraints**: Zero breaking changes during migration, PreToolUse hook JSON format compliance, single quotes escaping for shell safety
**Scale/Scope**: 15+ existing Speck commands to migrate, support for concurrent Claude instances, POC with 2 commands (test-hello, speck-env)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Upstream Fidelity (Principle I)
**Status**: ✅ PASS
**Rationale**: Feature is Speck-specific (Claude Code hooks don't exist in spec-kit), but doesn't modify core workflow files that would need upstream sync. All hook implementations will use `[SPECK-EXTENSION]` markers if upstream gains similar functionality.

### Extension Preservation (Principle II)
**Status**: ✅ PASS
**Rationale**: This feature IS an extension. All hook scripts and CLI code will be marked with extension boundaries if they touch any templates or workflows that might sync with upstream.

### Specification-First Development (Principle III)
**Status**: ✅ PASS
**Rationale**: Spec.md completed with user stories, requirements, success criteria. No implementation details leaked into spec (technologies documented in Technical Context section of plan.md, not spec.md).

### Quality Gates (Principle IV)
**Status**: ✅ PASS (Pending checklist validation)
**Rationale**: Feature includes measurable success criteria (SC-001 through SC-010), testable requirements (FR-001 through FR-020), and clear acceptance scenarios. Will validate against quality checklist before Phase 1.

### Claude Code Native (Principle V)
**Status**: ✅ PASS
**Rationale**: Feature optimizes Claude Code experience through PreToolUse hooks and virtual command pattern. Slash commands remain primary interface. Hook usage is appropriate for runtime interception (not Session Start).

### Technology Agnosticism (Principle VI)
**Status**: ✅ PASS
**Rationale**: Spec.md contains zero framework mentions. Technical choices (TypeScript, Commander.js, Bun) documented only in plan.md Technical Context. Success criteria focus on user outcomes, not system internals.

### File Format Compatibility (Principle VII)
**Status**: ✅ PASS
**Rationale**: No changes to `specs/` directory structure or artifact formats. Hook code lives in `.speck/` and `.claude-plugin/`, outside spec-kit conventions. Feature specs remain spec-kit compatible.

### Command-Implementation Separation (Principle VIII)
**Status**: ⚠️ ATTENTION REQUIRED
**Rationale**: This feature specifically implements the separation principle by moving logic from command files to `.speck/scripts/speck.ts`. However, need to verify existing commands don't violate this during migration. Migration plan ensures one-by-one validation and deprecation cycle.

### Summary
**Overall Status**: ✅ PASS with monitoring
**Action Required**: During implementation, audit existing `.claude/commands/*.md` files for embedded TypeScript and refactor to delegate to new unified CLI.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
.speck/
├── scripts/
│   ├── speck.ts              # NEW: Unified dual-mode CLI entry point
│   ├── build-hook.ts         # NEW: Build script for bundled hook
│   ├── commands/             # NEW: Command handler implementations
│   │   ├── env.ts           # Handler for speck-env command
│   │   ├── branch.ts        # Handler for speck-branch command
│   │   ├── test-hello.ts    # POC test handler
│   │   └── index.ts         # Command registry export
│   ├── hooks/               # NEW: Hook router scripts
│   │   └── pre-tool-use.ts  # PreToolUse hook for virtual command interception
│   ├── lib/                 # Shared utilities (arg parsing, mode detection)
│   │   ├── hook-utils.ts    # Hook JSON parsing/formatting
│   │   ├── mode-detector.ts # CLI vs hook mode detection
│   │   └── shell-escape.ts  # Single quote escaping for shell safety
│   ├── dist/                # NEW: Build output (gitignored)
│   │   └── speck-hook.js    # Bundled single-file hook script
│   └── [existing scripts]   # Legacy individual scripts (to be deprecated)

.claude-plugin/
├── plugin.json              # UPDATED: Add PreToolUse hook registration
└── marketplace.json

tests/
├── unit/
│   ├── speck-cli.test.ts    # Dual-mode CLI tests
│   ├── hook-router.test.ts  # Hook interception tests
│   ├── command-handlers.test.ts
│   └── arg-parsing.test.ts
└── integration/
    ├── virtual-command.test.ts  # End-to-end virtual command tests
    └── hook-simulation.test.ts  # JSON stdin/stdout simulation

specs/010-virtual-command-pattern/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output (pending)
├── data-model.md        # Phase 1 output (pending)
├── quickstart.md        # Phase 1 output (pending)
└── contracts/           # Phase 1 output (pending)
    ├── hook-input.schema.json
    ├── hook-output.schema.json
    └── command-registry.schema.json
```

**Structure Decision**: Single project structure. This is a CLI tool with plugin integration hooks, not a web/mobile app. Core implementation lives in `.speck/scripts/` to maintain plugin packaging structure. Hook scripts are registered via `.claude-plugin/plugin.json`. Tests validate both CLI and hook execution modes.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations requiring justification. Constitution Check passed with monitoring for Principle VIII compliance during implementation.

---

## Phase 0: Research (Completed)

All technical unknowns from the Technical Context have been researched and resolved. See [research.md](research.md) for detailed decisions.

**Key Outcomes**:
- Claude Code PreToolUse hook JSON format documented
- Dual-mode CLI pattern established with Commander.js
- Command registry architecture defined with type-safe interfaces
- Shell escaping pattern validated (POSIX single-quote escaping)
- Incremental migration strategy with validation gates
- Concurrency handled via process isolation
- PrePromptSubmit hook pattern for automatic prerequisite checks (supports both `/speck.` and `/speck:` separators for standard and plugin-qualified commands)

All `[NEEDS CLARIFICATION]` markers resolved.

---

## Phase 1: Design & Contracts (Completed)

### Artifacts Generated

1. **[data-model.md](data-model.md)**: Entity definitions and relationships
   - VirtualCommand, CommandRegistryEntry, HookInput, HookOutput
   - CommandContext, CommandResult, ArgumentParser, CommandHandler
   - Validation rules and state transitions
   - Entity relationship diagram

2. **[contracts/](contracts/)**: JSON Schema contracts
   - `hook-input.schema.json`: PreToolUse hook stdin structure
   - `hook-output.schema.json`: PreToolUse hook stdout structure
   - `command-registry.schema.json`: Registry metadata schema
   - `command-result.schema.json`: Handler return value schema
   - `README.md`: Contract usage documentation

3. **[quickstart.md](quickstart.md)**: POC implementation guide
   - Environment setup steps
   - POC code for test-hello and speck-env commands
   - Hook router implementation
   - Dual-mode CLI scaffolding
   - Testing procedures and validation checklist
   - Troubleshooting guide

### Design Decisions Summary

**Hook Architecture**:
- PreToolUse hook intercepts `speck-*` and `test-*` commands
- Routes to unified CLI via stdin pipe with `--hook` flag
- Returns echo-wrapped output for Claude consumption
- Pass-through for non-matching commands (empty JSON response)

**Dual-Mode CLI**:
- Single entry point: `.speck/scripts/speck.ts`
- Mode detection: Explicit `--hook` flag or TTY check
- Commander.js for argument parsing in both modes
- Identical business logic, different output formatting

**Command Registry**:
- TypeScript object mapping command name to handler metadata
- Optional custom argument parsers per command
- Versioned handlers for future migration tracking
- Type-safe with compile-time validation

**Shell Safety**:
- POSIX single-quote escaping: `text.replace(/'/g, "'\\'''")`
- Output wrapped in `echo 'escaped text'` for hook mode
- Validated against injection scenarios

**Migration Strategy**:
- POC with 2 commands (test-hello, speck-env)
- Incremental migration with validation gates
- One-by-one command migration with output comparison tests
- Deprecation warnings, then removal after one release cycle

---

## Constitution Check (Post-Design Re-evaluation)

*Re-checking after Phase 1 design completion*

### Upstream Fidelity (Principle I)
**Status**: ✅ PASS (Unchanged)
**Rationale**: Design artifacts (data-model.md, contracts/, quickstart.md) are feature-specific and don't conflict with upstream spec-kit structure. Hook implementation lives entirely in `.speck/` directory.

### Extension Preservation (Principle II)
**Status**: ✅ PASS (Unchanged)
**Rationale**: All hook scripts and CLI code are Speck extensions. No upstream content modified.

### Specification-First Development (Principle III)
**Status**: ✅ PASS (Unchanged)
**Rationale**: Specification (spec.md) remains technology-agnostic. All implementation details confined to plan.md, data-model.md, and quickstart.md.

### Quality Gates (Principle IV)
**Status**: ✅ PASS
**Rationale**: Design phase complete with comprehensive contracts, data models, and testing guidance. Ready for Phase 2 (tasks generation) with clear acceptance criteria from spec.md.

### Claude Code Native (Principle V)
**Status**: ✅ PASS (Unchanged)
**Rationale**: Design leverages Claude Code's PreToolUse hook system as primary integration mechanism. POC validates hook mechanism before full implementation.

### Technology Agnosticism (Principle VI)
**Status**: ✅ PASS (Unchanged)
**Rationale**: Spec.md remains free of technology mentions. Technical choices (TypeScript, Commander.js, Bun) documented only in planning artifacts.

### File Format Compatibility (Principle VII)
**Status**: ✅ PASS (Unchanged)
**Rationale**: Design maintains `specs/` directory compatibility. All implementation artifacts live in `.speck/` and `.claude-plugin/`.

### Command-Implementation Separation (Principle VIII)
**Status**: ✅ PASS (Validated)
**Rationale**: Design explicitly enforces separation by creating unified CLI in `.speck/scripts/speck.ts` with command handlers in separate modules. Hook router delegates to CLI, maintaining clear boundaries. Migration plan includes audit of existing `.claude/commands/*.md` files to refactor violations.

### Summary
**Overall Status**: ✅ PASS
**Action Required**: None. Constitution compliance validated through design phase. Ready to proceed to Phase 2 (tasks generation via `/speck.tasks` command).
