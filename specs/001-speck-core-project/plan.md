# Implementation Plan: Upstream Sync & Transformation Pipeline

**Branch**: `001-speck-core-project` | **Date**: 2025-11-15 | **Spec**:
[spec.md](spec.md) **Input**: Feature specification from
`/specs/001-speck-core-project/spec.md` including medium-weight tests for
TypeScript `.speck/scripts` implementations and common/utilities

## Summary

This feature establishes the three-command upstream sync and transformation
pipeline (`/speck.check-upstream`, `/speck.pull-upstream <version>`,
`/speck.transform-upstream`) that enables Speck to pull spec-kit releases into
`upstream/<version>/` directories and transform bash scripts into Bun TypeScript
equivalents in `.speck/scripts/`, plus transform `/speckit.*` commands into
`/speck.*` commands with proper agent/skill factoring. The plan now includes
medium-weight test coverage for the generated TypeScript implementations and
common utilities to ensure transformation quality and CLI interface
compatibility.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno
1.40+ compatibility (secondary - out of scope after clarification) **Primary
Dependencies**: Bun runtime, Bun Shell API, GitHub REST API (for fetching
releases), Claude Code slash command and agent system **Storage**: File-based
(markdown specs, JSON tracking files in `.speck/` and `upstream/` directories)
**Testing**: Bun test framework for medium-weight tests covering
`.speck/scripts/` implementations and common/utilities, focusing on CLI
interface compatibility, exit code behavior, and JSON output equivalence
**Target Platform**: macOS/Linux development environments with Bun 1.0+
installed, Claude Code extension in VS Code **Project Type**: Single project
(CLI tooling and transformation agents) **Performance Goals**:
`/speck.check-upstream` <10s, `/speck.pull-upstream` <2min for typical releases,
`/speck.transform-upstream` <5min, Bun script startup <100ms (vs ~300ms bash)
**Constraints**: 100% exit code compatibility, byte-for-byte identical `--json`
output, preserve [SPECK-EXTENSION] markers, atomic operations (no partial state)
**Scale/Scope**: Transform 5-10 bash scripts per typical spec-kit release,
support 10+ parallel features without contamination, 80% transformation success
without manual conflict resolution

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Upstream Fidelity ✅

- Tracking upstream spec-kit version via `upstream/releases.json`
- All Speck-specific code marked with `[SPECK-EXTENSION:START/END]` boundaries
- `/speck.transform-upstream` provides semantic synchronization
- Transformation reports document changes and preserved extensions

### II. Extension Preservation ✅

- Extension markers enforced during transformation
- Transformation tools never modify content within extension boundaries
- Conflicts halt sync and request human resolution
- Extension manifest maintained (future: `extension-markers.json`)

### III. Specification-First Development ✅

- Feature spec completed with mandatory sections: User Scenarios & Testing,
  Requirements, Success Criteria
- Spec is technology-agnostic (focused on WHAT, not HOW)
- Success criteria are measurable and technology-agnostic
- Functional requirements are testable and unambiguous
- No `[NEEDS CLARIFICATION]` markers remaining (all resolved in Session
  2025-11-15)

### IV. Quality Gates ✅

- Specification includes comprehensive User Story 1 with Independent Test
  section
- Automated validation criteria: no implementation details (SC-002), testable
  requirements, measurable success criteria
- Quality checklist location:
  `specs/001-speck-core-project/checklists/requirements.md` (to be created)

### V. Claude Code Native ✅

- Slash commands: `/speck.check-upstream`, `/speck.pull-upstream`,
  `/speck.transform-upstream`
- Agents: `.claude/agents/speck.transform-bash-to-bun.md`,
  `.claude/agents/speck.transform-commands.md`
- Skills: Future extraction of reusable patterns (template rendering,
  validation)
- TypeScript CLI not in scope for this feature (focus is upstream
  sync/transformation only)

### VI. Technology Agnosticism ✅

- Feature spec contains zero framework/language mentions in requirements
  sections
- Success criteria focus on user outcomes (transformation success rate, time
  limits, compatibility percentages)
- Implementation details isolated to Technical Context section of this plan
- Out of Scope section explicitly excludes non-transformation features

### VII. File Format Compatibility ✅

- `specs/` directory structure matches spec-kit: `specs/001-speck-core-project/`
- Artifact file names follow spec-kit conventions: `spec.md`, `plan.md`,
  `tasks.md` (future), `checklists/*.md`
- Markdown file format compatible with spec-kit templates
- Feature numbering: 3-digit zero-padded (001)
- Branch naming: `001-speck-core-project`
- Speck-specific metadata stored in `.speck/` and `upstream/` (outside `specs/`)

**GATE STATUS: PASSED** - All constitutional principles satisfied. No violations
requiring justification.

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
├── scripts/                 # Bun TypeScript implementations (generated by transformation)
│   ├── check-upstream.ts    # Implements /speck.check-upstream
│   ├── pull-upstream.ts     # Implements /speck.pull-upstream
│   └── common/              # Shared utilities for scripts
│       ├── github-api.ts    # GitHub REST API client
│       ├── json-tracker.ts  # upstream/releases.json management
│       ├── symlink-manager.ts # upstream/latest symlink operations
│       └── file-ops.ts      # Atomic file operations
└── upstream-tracker.json    # Current upstream version tracking

upstream/
├── releases.json            # Registry of all pulled releases
├── latest -> v1.0.0/        # Symlink to most recent release
├── v1.0.0/                  # Pristine upstream content
│   ├── .specify/
│   │   ├── templates/
│   │   └── scripts/bash/    # Original bash scripts
│   └── .claude/commands/    # Original /speckit.* commands
└── v1.1.0/                  # Another release (example)

.claude/
├── commands/
│   ├── speck.check-upstream.md
│   ├── speck.pull-upstream.md
│   └── speck.transform-upstream.md
├── agents/
│   ├── transform-bash-to-bun.md    # Bash → Bun TS transformation agent
│   └── transform-commands.md        # /speckit.* → /speck.* transformation agent
└── skills/                          # Future: reusable capabilities

tests/
├── .speck-scripts/          # Medium-weight tests for .speck/scripts/
│   ├── check-upstream.test.ts
│   ├── pull-upstream.test.ts
│   ├── transform-upstream.test.ts
│   └── common/              # Tests for common utilities
│       ├── github-api.test.ts
│       ├── json-tracker.test.ts
│       ├── symlink-manager.test.ts
│       └── file-ops.test.ts
└── fixtures/                # Test fixtures (mock upstream releases, etc.)
```

**Structure Decision**: Single project structure. The feature is primarily
transformation tooling with file-based storage. Tests are organized by
implementation area (`.speck/scripts/` and `common/` utilities), using
medium-weight testing strategy to verify CLI interface compatibility, exit code
behavior, and JSON output equivalence without requiring full end-to-end
integration tests.

## Complexity Tracking

No constitutional violations - this section is empty.
