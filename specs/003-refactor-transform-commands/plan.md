# Implementation Plan: Refactor Transform Commands Agent

**Branch**: `003-refactor-transform-commands` | **Date**: 2025-11-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-refactor-transform-commands/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Refactor the transformation pipeline to separate deterministic text replacements (TypeScript preprocessing) from intelligent extraction decisions (agent analysis), enabling reliable extraction of skills and agents from upstream command files while following Claude Code best practices.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Bun 1.0+ runtime
**Primary Dependencies**: Bun Shell API, GitHub REST API (for upstream releases), Claude Code agent system
**Storage**: File-based (markdown specs, JSON tracking files in `.speck/`, `.claude/skills/`, `.claude/agents/` directories)
**Testing**: Bun test framework
**Target Platform**: macOS/Linux (Claude Code environment)
**Project Type**: Single (CLI tool + agent system)
**Performance Goals**: <30 seconds per command file transformation (preprocessing + agent extraction + file creation)
**Constraints**: Agent must reference Claude Code best practices documentation during extraction, validation must occur before file writes
**Scale/Scope**: ~20-50 upstream command files per transformation batch, extraction of 1-5 skills/agents per command file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Upstream Fidelity ✅
**Status**: PASS
**Analysis**: Feature enhances transformation of upstream spec-kit commands into Claude Code-native representations. Maintains `.speck/upstream-tracker.json` tracking and preserves `/speck.transform-upstream` command infrastructure. Transformation improvements strengthen, rather than break, upstream sync capability.

### Principle II: Extension Preservation ✅
**Status**: PASS
**Analysis**: Feature does not modify extension marker handling. Preprocessing and agent extraction operate on upstream command files, not on Speck extensions. Extension markers remain respected during transformation.

### Principle III: Specification-First Development ✅
**Status**: PASS
**Analysis**: Feature spec is technology-agnostic with clear User Scenarios, Requirements, and Success Criteria sections. Implementation details (TypeScript, Bun) are appropriately confined to plan phase, not spec phase.

### Principle IV: Quality Gates ✅
**Status**: PASS
**Analysis**: Feature includes validation requirements (FR-004, FR-007a, FR-007b) and measurable success criteria (SC-001 through SC-008). Validation occurs at transformation time before file writes. Automated quality gates enforced through Bun validation scripts.

### Principle V: Claude Code Native ✅
**Status**: PASS
**Analysis**: Feature is explicitly designed to optimize Claude Code workflows. Extracts skills (auto-invoke patterns) and agents (delegated work) into proper `.claude/skills/` and `.claude/agents/` directories. Enhances `/speck.transform-upstream` command to follow Claude Code best practices for commands, skills, and agents.

### Principle VI: Technology Agnosticism ✅
**Status**: PASS
**Analysis**: Feature specification maintains technology agnosticism. Requirements focus on extraction patterns, validation criteria, and user outcomes rather than implementation choices. Success criteria are measurable without knowledge of TypeScript or Bun specifics.

### Principle VII: File Format Compatibility ✅
**Status**: PASS
**Analysis**: Feature operates on `.claude/` directory structure (skills/agents/commands) which is Claude Code-specific and does not affect `specs/` directory compatibility with spec-kit. Transformation outputs remain in standard markdown format. No changes to feature numbering, branching, or spec artifact structure.

**Overall Status**: ✅ PASS - All constitutional principles satisfied. Proceed to Phase 0.

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
│   ├── preprocess-commands.ts        # NEW: TypeScript preprocessing (text replacements)
│   ├── validate-extracted-files.ts   # NEW: Bun validation for extracted skills/agents
│   └── update-agent-context.ts       # EXISTING: Agent context updates
├── memory/
│   ├── constitution.md               # EXISTING: Project principles
│   └── transformation-history.json   # ENHANCED: Add extraction decision explanations
└── upstream/
    └── spec-kit/                     # EXISTING: Upstream command sources

.claude/
├── commands/
│   ├── speck.transform-upstream.md   # ENHANCED: Call preprocessing + agent extraction
│   └── speck.*.md                    # EXISTING: Other speck commands
├── skills/
│   └── speck.*.md                    # NEW: Extracted skill files (auto-invoke patterns)
└── agents/
    ├── speck.transform-commands.md   # ENHANCED: Focused on extraction decisions only
    └── speck.*.md                    # NEW: Extracted agent files (delegated work)

tests/
├── preprocessing.test.ts             # NEW: Test text replacement rules
├── extraction.test.ts                # NEW: Test skill/agent extraction logic
└── validation.test.ts                # NEW: Test extracted file validation
```

**Structure Decision**: Single project structure with TypeScript scripts in `.speck/scripts/`, Claude Code artifacts in `.claude/` directories, and test files in `tests/`. Preprocessing logic is separated from agent extraction logic. Validation is implemented as a standalone Bun script that runs before file writes.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations** - All constitutional principles are satisfied. No complexity tracking required.

---

## Post-Design Constitution Re-evaluation

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md) completed.*

### Principle I: Upstream Fidelity ✅
**Status**: PASS
**Analysis**: Design artifacts confirm that transformation enhancements preserve upstream sync. Preprocessing API (contracts/preprocessing-api.md) applies deterministic transformations without altering upstream methodology. Extraction API (contracts/extraction-api.md) respects upstream command structure. Transformation history tracking (data-model.md Entity #5) ensures auditability of all upstream-to-speck conversions.

### Principle II: Extension Preservation ✅
**Status**: PASS
**Analysis**: Design does not introduce any changes to extension marker handling. Preprocessing rules (data-model.md Entity #7) operate only on upstream files. No modifications to existing Speck extensions occur during transformation.

### Principle III: Specification-First Development ✅
**Status**: PASS
**Analysis**: Implementation plan maintains technology-agnostic requirements from spec. Contracts define APIs at semantic level (preprocessing, extraction, validation) without prescribing specific framework implementations beyond what's necessary for TypeScript + Bun ecosystem.

### Principle IV: Quality Gates ✅
**Status**: PASS
**Analysis**: Validation API (contracts/validation-api.md) enforces automated quality gates before file writes. Validation checks align with success criteria from spec (SC-003: description validation, SC-004: tool permissions, SC-006: structural correctness). Error handling patterns ensure gate failures block progression.

### Principle V: Claude Code Native ✅
**Status**: PASS
**Analysis**: Research findings (research.md) directly incorporate Claude Code best practices. Extraction API contract defines skill/agent file structure per official guidelines (descriptions <1024 chars, 3+ triggers, tool permission fragility levels). Quickstart.md demonstrates Claude Code-native workflow integration.

### Principle VI: Technology Agnosticism ✅
**Status**: PASS
**Analysis**: Data model entities (data-model.md) describe transformation concepts independent of implementation. Contracts focus on semantic interfaces (what preprocessing/extraction/validation accomplish) rather than implementation details. TypeScript/Bun specifics are confined to API signatures, not business logic.

### Principle VII: File Format Compatibility ✅
**Status**: PASS
**Analysis**: Design confirms `.claude/` directory operations are isolated from `specs/` directory. Data model entity relationships show clear separation between transformation outputs (skills/agents/commands in `.claude/`) and spec artifacts (in `specs/003-refactor-transform-commands/`). No changes to spec-kit file format compatibility.

**Overall Status**: ✅ PASS - All constitutional principles remain satisfied after Phase 1 design. No regressions introduced. Proceed to Phase 2 (tasks generation via `/speck.tasks` command).
