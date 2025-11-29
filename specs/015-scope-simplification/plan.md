# Implementation Plan: Scope Simplification

**Branch**: `015-scope-simplification` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-scope-simplification/spec.md`
**Status**: Planning Complete

## Summary

Simplify and robustify Speck by removing stacked PR support and virtual commands, consolidating to a dual-mode CLI with auto-install, auto-worktree creation on new specs with session handoff, and pruning website content. Retains multi-repo support and branches.json for non-standard branch name tracking.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Bun 1.0+ runtime
**Primary Dependencies**: Commander.js (CLI), Zod (validation), Git 2.5+ (worktrees), jq (JSON processing in hooks)
**Storage**: File-based (`.speck/config.json`, `.speck/branches.json`, `.speck/handoff.md`, `.claude/settings.json`)
**Testing**: Bun test runner with TDD approach per Constitution Principle XII
**Target Platform**: macOS, Linux (Unix-like systems)
**Project Type**: Single (CLI tool with plugin components)
**Performance Goals**: <100ms CLI response, <10s feature creation with worktree
**Constraints**: Must work in both terminal and Claude Code hook contexts
**Scale/Scope**: Single-repo and multi-repo configurations, 10+ parallel features

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Validation ✅

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Upstream Fidelity | ✅ Pass | Removing features doesn't affect upstream sync capability |
| II. Extension Preservation | ✅ Pass | No extensions being modified |
| III. Specification-First | ✅ Pass | Spec completed before planning |
| IV. Quality Gates | ✅ Pass | Will run checklist before implementation |
| V. Claude Code Native | ✅ Pass | Adding /speck.init and /speck.help commands |
| VI. Technology Agnosticism | ✅ Pass | Spec is technology-agnostic |
| VII. File Format Compatibility | ✅ Pass | Simplifying branches.json maintains compatibility |
| VIII. Command-Implementation Separation | ✅ Pass | All commands delegate to scripts |
| IX. Code Quality Standards | ⏳ Pending | Will validate during implementation |
| X. Zero Test Regression | ⏳ Pending | Test baseline to be captured |
| XI. Website Documentation | ⏳ Pending | Website updates planned |
| XII. TDD | ⏳ Pending | Tests will be written first |
| XIII. Documentation Skill Sync | ⏳ Pending | speck-help skill updates planned |

### Post-Design Validation ✅

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Upstream Fidelity | ✅ Pass | No impact on upstream sync |
| II. Extension Preservation | ✅ Pass | No extensions modified |
| VII. File Format Compatibility | ✅ Pass | branches.json v2.0.0 maintains compatibility with migration |
| VIII. Command-Implementation Separation | ✅ Pass | CLI delegates to script handlers |

## Project Structure

### Documentation (this feature)

```text
specs/015-scope-simplification/
├── spec.md              # Feature specification ✅
├── plan.md              # This file ✅
├── research.md          # Phase 0 output ✅
├── data-model.md        # Phase 1 output ✅
├── quickstart.md        # Phase 1 output ✅
├── session-handoff-addendum.md  # Implementation details for session handoff ✅
├── bootstrap-addendum.md        # Implementation details for Bun bootstrap ✅
├── contracts/           # Phase 1 output ✅
│   ├── cli-interface.ts
│   ├── handoff-document.ts
│   └── branch-mapping.ts
├── checklists/
│   └── requirements.md  # Quality checklist ✅
└── tasks.md             # Phase 2 output ✅
```

### Source Code (repository root)

```text
src/
└── cli/
    ├── index.ts         # NEW: Main CLI entry point (TypeScript)
    ├── bootstrap.sh     # NEW: Bun detection and self-removing wrapper
    └── .runner.sh       # GENERATED: Direct bun exec wrapper (after bootstrap)

.speck/
├── scripts/
│   ├── speck.ts         # REFACTOR: Remove hook mode
│   ├── commands/
│   │   ├── index.ts     # REFACTOR: Remove branch command
│   │   ├── init.ts      # NEW: Init command handler
│   │   └── help.ts      # NEW: Help command handler
│   ├── common/
│   │   └── branch-mapper.ts  # REFACTOR: Simplified schema
│   └── worktree/
│       ├── handoff.ts        # NEW: Handoff document generation
│       └── handoff-hook.sh   # NEW: SessionStart hook script template
├── config.json          # Existing: Speck configuration
└── branches.json        # Existing: Branch mappings

# Files written to NEW WORKTREES (not in main repo):
# <worktree>/.speck/handoff.md           # Handoff document
# <worktree>/.claude/settings.json       # SessionStart hook config
# <worktree>/.claude/scripts/handoff.sh  # Hook script (copied from template)
# <worktree>/.vscode/tasks.json          # Auto-open Claude panel

.claude/
├── commands/
│   ├── speck.init.md    # NEW: Install command
│   ├── speck.help.md    # NEW: Help command
│   └── speck.branch.md  # DELETE: Stacked PR command
└── skills/
    └── speck-help/      # RENAMED from speck-knowledge
        ├── SKILL.md
        ├── reference.md
        ├── examples.md
        └── workflows.md

.claude-plugin/
└── plugin.json          # REFACTOR: Remove PreToolUse hook

tests/
├── unit/
│   ├── init.test.ts         # NEW (renamed from install.test.ts)
│   ├── handoff.test.ts      # NEW
│   └── branch-mapper.test.ts # REFACTOR
├── integration/
│   └── cli-modes.test.ts    # NEW: Test --json and --hook modes
└── contract/
    └── branch-schema.test.ts # REFACTOR: Test v2.0.0 schema

website/
└── src/content/docs/    # REFACTOR: Remove stacked PR/virtual command docs
```

**Structure Decision**: Single project structure with CLI in `src/cli/`, scripts in `.speck/scripts/`, and tests in `tests/`.

## Complexity Tracking

No complexity violations. This feature simplifies the codebase rather than adding complexity.

## Testing Strategy

### Test Coverage Requirements

Per Constitution Principle XII (TDD):

- **Unit tests**: All public functions in new/refactored modules
- **Integration tests**: CLI mode switching, worktree + handoff creation
- **Minimum threshold**: 80% line coverage for new code
- **Critical paths**: Error handling for install, handoff creation, migration

### Test Baseline

Capture before implementation:
```bash
bun test > specs/015-scope-simplification/test-baseline.txt
```

Expected changes:
- Remove tests for deleted features (stacked PR, virtual commands)
- Add tests for new features (install, handoff, simplified branch-mapper)
- Net result: Pass count should stay approximately equal

### Test-First Tasks

Each implementation task has a corresponding test task that runs first:
- T001-TEST → T001 (Install command)
- T002-TEST → T002 (CLI consolidation)
- etc.

## Documentation Impact

### Website Updates Required (Principle XI)

1. Remove stacked PR documentation
2. Remove virtual command documentation
3. Add `/speck.init` command reference
4. Add `/speck.help` command reference
5. Add session handoff documentation
6. Update getting-started guide (under 5 minutes)

### Skill Updates Required (Principle XIII)

1. Rename `speck-knowledge` → `speck-help`
2. Remove stacked PR section (section 8)
3. Remove virtual command section (section 9)
4. Update slash command table
5. Add session handoff documentation

## Implementation Phases

### Phase 1: Code Removal & Migration
- Delete stacked PR files
- Delete virtual command files
- Remove command registry entries
- Update plugin.json

### Phase 2: CLI Consolidation
- Create `src/cli/index.ts` entry point
- Create `src/cli/bootstrap.sh` with Bun detection and self-removal pattern
- Implement init command (symlink to bootstrap.sh)
- Add --json and --hook output modes
- Update package.json scripts
- See [bootstrap-addendum.md](./bootstrap-addendum.md) for bootstrap implementation details

### Phase 3: Worktree + Handoff Integration
- Use atomic `git worktree add -b` for branch+worktree creation (no checkout switching)
- Implement handoff document generation (`.speck/handoff.md`)
- Write `.claude/settings.json` with SessionStart hook to worktree
- Write `.claude/scripts/handoff.sh` hook script to worktree
- Write `.vscode/tasks.json` for auto-open Claude panel
- Implement hook self-cleanup (archive handoff, remove hook from settings)
- See [session-handoff-addendum.md](./session-handoff-addendum.md) for implementation details

### Phase 4: Skill & Documentation
- Rename and update speck-help skill
- Create /speck.init and /speck.help commands
- Update website documentation

### Phase 5: Validation
- Run full test suite
- Verify zero regressions
- Verify all success criteria met
- Code quality validation (typecheck + lint)

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing workflows | Keep branches.json with migration path |
| Test regressions | Capture baseline, track deletions vs additions |
| Multi-repo impact | Retain all multi-repo code, test thoroughly |
| PATH issues for install | Detect and warn with instructions |
| Handoff loading failures | Make non-fatal, graceful degradation |

## Success Criteria Mapping

| Criteria | Implementation |
|----------|---------------|
| SC-001: Install in <2 min | Single `speck init` command |
| SC-002: CLI response <500ms | Direct command execution, no hook overhead |
| SC-003: Feature creation <10s | Worktree + handoff in single operation |
| SC-004: Same behavior human/AI | --json and --hook flags on all commands |
| SC-005: Docs 40% reduction | Remove stacked PR and virtual command sections |
| SC-006: Zero removed feature mentions | Grep verification step in tasks |
| SC-007: Test time reduction | Proportional to removed code |
| SC-008: 5-minute getting started | Streamlined documentation |
| SC-009: Multi-repo works | No changes to multi-repo code |
| SC-010: branches.json resolution | getSpecForBranch() in simplified schema |
| SC-011: Session handoff works | Integration test for handoff loading via SessionStart hook with `hookSpecificOutput.additionalContext` |
| SC-012: /speck.help works | Skill activation test |

## Next Step

Run `/speck.tasks` to generate the task breakdown from this plan.
