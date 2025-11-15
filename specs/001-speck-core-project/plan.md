# Implementation Plan: Speck - Claude Code-Optimized Specification Framework

**Branch**: `001-speck-core-project` | **Date**: 2025-11-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-speck-core-project/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Speck is an opinionated, extensible derivative of GitHub's spec-kit optimized for Claude Code. It provides slash commands, agents, and Bun-powered TypeScript CLI for creating, managing, and syncing specifications. The system maintains upstream compatibility via AI-driven semantic transformation while adding Claude Code-native workflows for feature development.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary)
**Primary Dependencies**: Bun runtime, Git 2.30+, Claude Code (slash command + agent support)
**Storage**: File-based (markdown specs, JSON tracking files in `.speck/` directory)
**Testing**: Bun's built-in test runner (`bun:test`) for sub-100ms startup and native TypeScript support
**Target Platform**: macOS/Linux/Windows with Bun installed
**Project Type**: Single project (CLI tool + Claude Code commands)
**Performance Goals**: Sub-100ms CLI startup (SC-005), <2min spec generation (SC-001), <5min upstream sync (SC-004)
**Constraints**: 100% backward compatibility with spec-kit file format (Constitution VII), 100% extension preservation during sync (Constitution II)
**Scale/Scope**: Support 10+ parallel worktrees (SC-006), handle monthly upstream syncs (SC-008)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Upstream Fidelity
✅ **PASS** - Feature maintains compatibility with spec-kit methodology via:
- Extension marker system (`[SPECK-EXTENSION:START/END]`)
- `/speck.transform-upstream` command for AI-driven semantic sync
- Tracking in `.speck/upstream-tracker.json`
- Sync report generation (FR-011)

### II. Extension Preservation (NON-NEGOTIABLE)
✅ **PASS** - All Speck enhancements protected during sync:
- MANDATORY extension markers implemented (FR-009)
- Transformation tools respect extension boundaries
- Conflict detection halts sync for human resolution (FR-012a)
- Extension manifest tracking (constitution requirement)

### III. Specification-First Development
✅ **PASS** - This implementation plan follows spec-first workflow:
- Spec created first ([spec.md](spec.md))
- Technology-agnostic requirements defined
- Mandatory sections complete (User Scenarios, Requirements, Success Criteria)
- Max 3 [NEEDS CLARIFICATION] markers enforced (FR-006)

### IV. Quality Gates
✅ **PASS** - Automated validation implemented:
- Quality checklist generation (FR-024)
- Spec validation before planning (FR-023)
- 95% first-pass success target (SC-003)
- Testable requirements with measurable success criteria

### V. Claude Code Native
✅ **PASS** - Core workflows optimized for Claude Code:
- Slash commands as primary interface (`/speck.*`)
- Agents for long-running processes (clarification, transformation)
- Bun CLI provides parity for non-Claude Code users (SC-005)
- All user stories demonstrate Claude Code integration

### VI. Technology Agnosticism
✅ **PASS** - Spec maintains technology-agnostic focus:
- Zero implementation details in spec (SC-002)
- Success criteria focus on user outcomes
- Out of Scope explicitly excludes technical implementations
- Runtime choice (Bun) documented in plan, not spec

### VII. File Format Compatibility (NON-NEGOTIABLE)
✅ **PASS** - 100% spec-kit file format compatibility:
- `specs/<number>-<short-name>/` structure (FR-016)
- Standard artifact names: spec.md, plan.md, tasks.md (FR-007)
- Feature numbering identical (3-digit zero-padded)
- Branch naming matches spec-kit conventions (FR-015)
- Speck metadata in `.speck/` separate from specs/ (FR-008)

**GATE RESULT**: ✅ ALL CONSTITUTIONAL PRINCIPLES SATISFIED - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-speck-core-project/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── README.md
│   ├── specify.schema.json
│   └── transform-upstream.schema.json
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── core/                # Core domain entities and models
│   ├── feature.ts
│   ├── specification.ts
│   ├── upstream-tracker.ts
│   └── extension-marker.ts
├── cli/                 # Bun-powered TypeScript CLI (bash script reimplementations)
│   ├── check-prerequisites.ts
│   ├── setup-plan.ts
│   ├── update-agent-context.ts
│   └── create-new-feature.ts
├── commands/            # Slash command implementations
│   ├── specify.ts
│   ├── clarify.ts
│   ├── plan.ts
│   ├── tasks.ts
│   ├── implement.ts
│   ├── analyze.ts
│   └── transform-upstream.ts
├── agents/              # Long-running agent implementations
│   ├── clarification-agent.ts
│   ├── planning-agent.ts
│   └── transformation-agent.ts
├── lib/                 # Shared utilities and helpers
│   ├── git.ts           # Git operations (branch, worktree, diff)
│   ├── file-io.ts       # Bun.file/Bun.write wrappers
│   ├── validation.ts    # Spec quality validation
│   └── template.ts      # Template rendering
└── index.ts             # Main entry point

tests/
├── unit/                # Unit tests for individual functions
│   ├── core/
│   ├── cli/
│   └── lib/
├── integration/         # Integration tests for workflows
│   ├── specify.test.ts
│   ├── clarify.test.ts
│   └── transform-upstream.test.ts
└── contract/            # Contract tests against JSON schemas
    ├── specify-contract.test.ts
    └── transform-upstream-contract.test.ts

.specify/
├── memory/
│   └── constitution.md  # Constitutional principles
├── scripts/
│   └── bash/            # Bash wrapper scripts (delegate to Bun CLI)
│       ├── check-prerequisites.sh
│       ├── setup-plan.sh
│       ├── update-agent-context.sh
│       └── create-new-feature.sh
└── templates/           # Markdown templates
    ├── spec-template.md
    ├── plan-template.md
    └── tasks-template.md

.claude/
└── commands/            # Slash command definitions
    ├── speck.specify.md
    ├── speck.clarify.md
    ├── speck.plan.md
    ├── speck.tasks.md
    ├── speck.implement.md
    ├── speck.analyze.md
    ├── speck.transform-upstream.md
    ├── speck.constitution.md
    └── speck.checklist.md

.speck/                  # Speck-specific metadata (outside specs/ for Constitution VII)
├── upstream-tracker.json
└── sync-reports/
    └── 2025-11-15-report.md
```

**Structure Decision**: Single project (CLI tool + Claude Code commands). The architecture separates concerns into:
- **Core domain models** (`src/core/`): Entity definitions matching data-model.md
- **CLI scripts** (`src/cli/`): Bun TypeScript reimplementations of bash scripts
- **Slash commands** (`src/commands/`): Implementation of `/speck.*` commands
- **Agents** (`src/agents/`): Long-running, iterative processes (clarification, transformation)
- **Shared utilities** (`src/lib/`): Reusable helpers for git, file I/O, validation, templates

This structure supports the Bun-only runtime focus (FR-022) and maintains clear separation between user-facing commands (slash commands), infrastructure scripts (CLI), and reusable logic (lib).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations detected.** All constitutional principles have been satisfied (see Constitution Check section above).

---

## Post-Design Constitution Re-Check

*As required by workflow: Re-evaluate constitutional principles after Phase 1 design artifacts are complete.*

### Re-Evaluation Results

All 7 constitutional principles remain **SATISFIED** after Phase 1 design:

✅ **I. Upstream Fidelity**: Design maintains spec-kit compatibility via extension markers and semantic transformation (data-model.md: UpstreamTracker, ExtensionMarker entities; contracts/transform-upstream.schema.json)

✅ **II. Extension Preservation (NON-NEGOTIABLE)**: Extension marker preservation is mandatory in data-model validation rules and transformation contracts (100% preservation rate enforced)

✅ **III. Specification-First Development**: This plan followed spec → research → design workflow; no implementation has occurred yet

✅ **IV. Quality Gates**: Data model includes validation gates (Specification.qualityCheckPassed field, validation rules documented)

✅ **V. Claude Code Native**: Source structure includes dedicated agents/ and commands/ directories; slash commands remain primary interface per quickstart.md

✅ **VI. Technology Agnosticism**: Spec contains zero implementation details; technical choices documented in plan, not spec (verified via spec.md review)

✅ **VII. File Format Compatibility (NON-NEGOTIABLE)**: Data model enforces `specs/<number>-<short-name>/` structure, standard artifact names, and Speck metadata isolation in `.speck/` (Feature.directoryPath validation, Specification.filePath patterns)

**FINAL GATE RESULT**: ✅ ALL CONSTITUTIONAL PRINCIPLES REMAIN SATISFIED POST-DESIGN

---

## Phase 2: Next Steps

This plan completes Phase 0 (Research) and Phase 1 (Design). The following artifacts have been generated:

✅ **Phase 0 Outputs**:
- [research.md](research.md): Technical decisions for testing framework, CLI patterns, AI transformation

✅ **Phase 1 Outputs**:
- [data-model.md](data-model.md): Entity definitions, validation rules, state transitions
- [contracts/](contracts/): JSON Schema definitions for `/speck.specify` and `/speck.transform-upstream` commands
- [quickstart.md](quickstart.md): End-user getting started guide
- [CLAUDE.md](../../CLAUDE.md): Updated agent context (via `.specify/scripts/bash/update-agent-context.sh`)

**To proceed to Phase 2 (Tasks)**, run:
```
/speckit.tasks
```

This will generate `tasks.md` with dependency-ordered implementation tasks based on the design artifacts above.

**Implementation will begin after tasks are approved**, using:
```
/speckit.implement
```

---

## Summary

**Branch**: `001-speck-core-project`
**Status**: Phase 1 Complete (Design artifacts ready)
**Constitutional Compliance**: ✅ All principles satisfied
**Next Command**: `/speckit.tasks` to generate actionable task list
