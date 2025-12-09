# Implementation Plan: OpenSpec Changes Plugin

**Branch**: `019-openspec-changes-plugin` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-openspec-changes-plugin/spec.md`
**Status**: Planning

## Summary

This plugin brings OpenSpec's change management workflow to Speck, enabling structured proposal-based development where changes are drafted, reviewed, implemented, and archived. The implementation follows the established upstream tracking and transformation pattern from spec 001, syncing from the OpenSpec GitHub repository (Fission-AI/OpenSpec) and transforming Node.js CLI code to Bun TypeScript while creating Claude Code native commands.

The plugin provides commands for:
- Upstream sync (`/speck-changes.check-upstream`, `/speck-changes.pull-upstream`, `/speck-changes.transform-upstream`)
- Change management (`/speck-changes.propose`, `/speck-changes.list`, `/speck-changes.show`, `/speck-changes.validate`)
- Implementation workflow (`/speck-changes.apply`)
- Archive workflow (`/speck-changes.archive`)
- Migration support (`/speck-changes.migrate`)

## Technical Context

**Language/Version**: TypeScript 5.3+ with Bun 1.0+ runtime
**Primary Dependencies**: Bun Shell API (filesystem, subprocess), GitHub REST API (releases), `gh` CLI (authentication)
**Storage**: File-based (`.speck/changes/`, `.speck/archive/`, `upstream/openspec/`, `releases.json`)
**Testing**: Bun test runner with TDD workflow
**Target Platform**: macOS/Linux (Claude Code CLI environment)
**Project Type**: Claude Code plugin
**Performance Goals**: Commands complete in <10s (check-upstream), <2min (pull), <5min (transform), <5s (propose/validate)
**Constraints**: Must work offline for local change management, requires network only for upstream sync
**Scale/Scope**: Single-project plugin, ~10 slash commands, ~8 TypeScript scripts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Upstream Fidelity | ✅ PASS | Plugin syncs from OpenSpec GitHub releases via semantic transformation |
| II. Extension Preservation | ✅ PASS | SPECK-EXTENSION markers preserved during transformation (FR-005) |
| III. Specification-First | ✅ PASS | Spec completed before implementation |
| IV. Quality Gates | ✅ PASS | Validation command (FR-015) enforces delta format quality |
| V. Claude Code Native | ✅ PASS | All functionality exposed via `/speck-changes.*` slash commands |
| VI. Technology Agnosticism | ✅ PASS | Spec describes WHAT (change management), not HOW (implementation) |
| VII. File Format Compatibility | ✅ PASS | Plugin uses `.speck/` directory, not `specs/` core structure |
| VIII. Command-Implementation Separation | ✅ PASS | Commands delegate to `plugins/speck-changes/scripts/*.ts` |
| IX. Preflight Gate | ⏳ PENDING | Will validate generated code via typecheck + lint (FR-007) |
| X. Website Documentation | ⏳ PENDING | Will update website if commands are user-facing |
| XI. TDD | ⏳ PENDING | Tests in `plugins/speck-changes/tests/` (FR-006) |
| XII. Skill Synchronization | ⏳ PENDING | Will update speck-help skill with new commands |

**Gate Status**: ✅ PASS - No violations requiring justification. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/019-openspec-changes-plugin/
├── plan.md              # This file
├── research.md          # Phase 0 output - upstream analysis, transformation strategy
├── data-model.md        # Phase 1 output - entity definitions
├── quickstart.md        # Phase 1 output - developer setup
└── tasks.md             # Phase 2 output (created by /speck.tasks)
```

### Source Code (repository root)

```text
plugins/changes/                      # Plugin root (follows plugins/speck, plugins/reviewer pattern)
├── .claude-plugin/
│   └── plugin.json                   # Plugin manifest
├── package.json                      # Dependencies (@speck/common)
├── tsconfig.json                     # TypeScript config
├── commands/                         # Slash command definitions
│   ├── check-upstream.md             # /speck-changes.check-upstream
│   ├── pull-upstream.md              # /speck-changes.pull-upstream
│   ├── transform-upstream.md         # /speck-changes.transform-upstream
│   ├── propose.md                    # /speck-changes.propose
│   ├── list.md                       # /speck-changes.list
│   ├── show.md                       # /speck-changes.show
│   ├── validate.md                   # /speck-changes.validate
│   ├── apply.md                      # /speck-changes.apply
│   ├── archive.md                    # /speck-changes.archive
│   └── migrate.md                    # /speck-changes.migrate
├── scripts/                          # TypeScript implementations
│   ├── check-upstream.ts             # Query OpenSpec releases
│   ├── pull-upstream.ts              # Fetch and store release
│   ├── transform-upstream.ts         # Orchestrate transformation
│   ├── propose.ts                    # Create change proposal
│   ├── list.ts                       # List active changes
│   ├── show.ts                       # Show change details
│   ├── validate.ts                   # Validate change structure
│   ├── apply.ts                      # Implement change tasks
│   ├── archive.ts                    # Merge and archive change
│   ├── migrate.ts                    # Import OpenSpec project
│   └── lib/                          # Plugin-specific utilities
│       ├── delta.ts                  # Delta file parsing/generation
│       └── transform.ts              # Node.js→Bun transformation utils
├── templates/                        # Change proposal templates
│   ├── proposal.md                   # Proposal template
│   ├── tasks.md                      # Tasks template
│   ├── design.md                     # Optional design template
│   └── delta-spec.md                 # Delta specification template
├── skills/                           # AI guidance (extracted from AGENTS.md)
│   └── changes-workflow/
│       ├── SKILL.md                  # Core workflow instructions
│       ├── spec-format.md            # Delta format guidance
│       └── troubleshooting.md        # Error recovery
├── agents/                           # Specialized agents
│   └── transform-openspec.md         # Upstream transformation
└── tests/                            # Plugin tests
    ├── check-upstream.test.ts
    ├── pull-upstream.test.ts
    ├── transform-upstream.test.ts
    ├── propose.test.ts
    ├── list.test.ts
    ├── show.test.ts
    ├── validate.test.ts
    ├── apply.test.ts
    ├── archive.test.ts
    ├── migrate.test.ts
    └── fixtures/                     # Test fixtures
        ├── mock-openspec/            # Mock OpenSpec project
        └── mock-releases/            # Mock GitHub release data

upstream/openspec/                    # Pristine upstream storage
├── releases.json                     # Release metadata registry
├── latest -> <version>/              # Symlink to active version
└── <version>/                        # Versioned release directories (e.g., v0.16.0/)
    └── [OpenSpec CLI source]

.speck/changes/                       # Active change proposals (user project runtime)
└── <change-name>/
    ├── proposal.md
    ├── tasks.md
    ├── design.md                     # Optional
    └── specs/                        # Delta files
        └── <affected-spec>.md

.speck/archive/                       # Completed changes (user project runtime)
└── <change-name>/
```

**Structure Decision**: Claude Code plugin structure following Principle VIII (command-implementation separation) and the refactored monorepo pattern established in `plugins/speck/` and `plugins/reviewer/`. Commands in `plugins/changes/commands/` delegate to TypeScript scripts in `plugins/changes/scripts/`. Shared utilities (GitHub API, logging, errors, file-ops) imported from `@speck/common`.

## Complexity Tracking

No violations requiring justification. The project structure follows established Speck plugin patterns.

## Documentation Impact

**Website Updates Required**: Yes
- New plugin documentation page: `website/src/content/docs/plugins/speck-changes.md`
- Update command reference: `website/src/content/docs/commands/reference.md`

**Skill Updates Required**: Yes
- Add `/speck-changes.*` commands to speck-help skill
- Document change proposal workflow

## Testing Strategy

**TDD Approach**: Red-green-refactor at task level
**Coverage Thresholds**: 80% line coverage, 100% critical paths
**Fixture Strategy**:
- Mock OpenSpec project structure for migration tests
- Mock GitHub API responses for upstream tests
- Temporary directories for change proposal tests

## Analysis Findings (from /speck:analyze)

**Analysis Date**: 2025-12-08 | **Tasks Complete**: 52/63 (82.5%)

### Blocking Items Before Feature Completion

| Task | Requirement | Constitution | Priority |
|------|-------------|--------------|----------|
| T019 | FR-007 (TypeScript/ESLint validation) | IX (Preflight Gate) | HIGH |
| T051 | - | XII (Skill Synchronization) | HIGH |
| T052 | - | X (Website Documentation) | HIGH |

### Foundation Tasks (Should Complete)

| Task | Requirements | Notes |
|------|--------------|-------|
| T011a | FR-048, FR-049, FR-050 | Delta-spec template |
| T011b-T011e | FR-040, FR-041, FR-042 | Skills (3 files) |
| T011f | FR-043-047 | Transform agent |
| T014a | FR-004b | OpenSpec CLI template extraction |
| T019a | FR-006 | Additional test coverage |

### Recommended Completion Order

1. **Foundation** (T011a-T011f) - establishes skills/agents/templates for transform workflow
2. **Upstream** (T014a) - enables full OpenSpec template extraction
3. **Quality** (T019, T019a) - satisfies Constitution IX
4. **Documentation** (T051, T052, T053) - satisfies Constitution X, XII

### Coverage Summary

- All 50 functional requirements have task coverage
- 39 requirements fully implemented (78%)
- 11 requirements pending implementation (22%)
- No critical issues, 5 HIGH, 6 MEDIUM, 2 LOW

---

## Phase 0: Research Findings

See [research.md](./research.md) for:
- OpenSpec CLI analysis and extraction strategy
- Node.js to Bun transformation patterns
- Delta file format specification
- GitHub API authentication approach

## Phase 1: Design Artifacts

See supporting documents:
- [data-model.md](./data-model.md) - Entity definitions
- [quickstart.md](./quickstart.md) - Developer setup
