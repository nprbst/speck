# Implementation Plan: Worktree Integration

**Branch**: `012-worktree-integration` | **Date**: 2025-11-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-worktree-integration/spec.md`

## Summary

Integrate Git worktrees as a first-class, opt-in feature in the Speck workflow. When enabled, creating a new spec branch automatically creates an isolated worktree, optionally launches an IDE pointing to that worktree, and optionally pre-installs dependencies before the IDE opens. This enables developers to work on multiple features simultaneously without branch-switching overhead, improving context-switching speed and maintaining isolated working states.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Bun 1.0+ runtime
**Primary Dependencies**: Zod (schema validation), Git 2.5+ CLI (worktree support), Bun Shell API
**Storage**: File-based configuration (`.speck/config.json`), Git worktrees as peer directories of main repository (naming based on repository layout)
**Testing**: Test-Driven Development (TDD) with Bun test framework
- **Development Approach**: Red-green-refactor per task (write failing tests first, implement minimum code to pass, refactor)
- **Unit Tests**: Required for all modules (individual functions in `.speck/scripts/worktree/`)
  - Test all public (exported) functions
  - Test all critical error paths (disk space, Git version, worktree collision, IDE launch failures, dependency failures)
  - Verify error detection AND actionable error messages (must include: cause, impact, remediation steps)
- **Integration Tests**: Required for workflows (multi-step operations)
  - Use real Git operations with temporary repositories in `tests/fixtures/tmp-*` (auto-cleanup after test)
  - Mock IDE launches and package manager operations (use test doubles to verify commands without executing)
  - Test worktree lifecycle, file operations, end-to-end workflows
- **Test Coverage Enforcement**:
  - **Minimum Thresholds**: 80% line coverage for all modules, 100% coverage for critical error paths
  - **Tool**: Bun built-in coverage (`bun test --coverage`)
  - **Enforcement**: Build MUST fail if coverage drops below thresholds
  - **Configuration**: Coverage thresholds in `bunfig.toml` or test configuration
- **Test Fixtures**: Shared utilities for temporary Git repository creation/cleanup, mock IDE commands, mock package manager commands
- **Test Environment Requirements**: Git 2.5+ installed for integration tests
**Target Platform**: Cross-platform (macOS, Linux, Windows) with platform-specific IDE detection
**Project Type**: Single project (CLI enhancement to existing Speck)
**Performance Goals**:
- Worktree creation: <5 seconds (excluding dependency installation)
- IDE launch: <2 seconds
- File copy/symlink operations: <3 seconds for typical project size (<1000 files)

**Constraints**:
- Must maintain Git worktree compatibility (standard Git operations work in worktrees)
- Must handle disk space constraints gracefully (warn if <1GB available)
- Must support projects without worktree integration (fully opt-in)
- Must preserve existing Speck workflows (backwards compatible)

**Scale/Scope**:
- Support 10+ parallel worktrees per repository
- Configuration file size <100KB
- File copy rules support glob patterns (up to 100 rules)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Evaluation (Phase 0)

✅ **Principle I: Upstream Fidelity** - PASS
This feature is a Speck-specific Claude Code enhancement and does not conflict with spec-kit methodology. Worktree integration is opt-in and does not modify core spec-kit file formats (spec.md, plan.md, tasks.md). Speck extensions will be marked with `[SPECK-EXTENSION]` boundaries in commands.

✅ **Principle II: Extension Preservation** - PASS
All worktree-related code will be contained within Speck-specific scripts and commands, marked with extension boundaries. No modifications to spec-kit core workflows.

✅ **Principle III: Specification-First Development** - PASS
This plan follows from spec.md (012-worktree-integration), which contains no implementation details. The spec describes user scenarios and requirements in technology-agnostic terms.

✅ **Principle IV: Quality Gates** - PASS
Spec has passed quality validation (User Scenarios, Requirements, Success Criteria all present and testable). All clarifications have been resolved.

✅ **Principle V: Claude Code Native** - PASS
Worktree integration will be exposed via slash commands (`/speck:specify`, `/speck:branch`) and configurable via interactive setup wizard. No session-start hooks required (commands are self-contained).

✅ **Principle VI: Technology Agnosticism** - PASS
The specification (spec.md) is technology-agnostic, focusing on user workflows and outcomes. Implementation details are contained in this plan and research artifacts.

✅ **Principle VII: File Format Compatibility** - PASS
Worktree configuration is stored in `.speck/config.json` (Speck-specific), not in `specs/` directory. Spec-kit file formats remain unchanged. Projects can disable worktree integration without data loss.

✅ **Principle VIII: Command-Implementation Separation** - PASS
Commands will delegate to TypeScript scripts in `.speck/scripts/worktree/`. No complex logic in `.claude/commands/*.md` files.

✅ **Principle IX: Code Quality Standards** - PENDING
Will be validated during implementation. All code must pass `bun run typecheck` and `bun run lint` with zero errors before feature completion.

✅ **Principle X: Zero Test Regression Policy** - PENDING
Baseline test suite status will be captured before implementation begins. Final implementation must maintain or improve pass rate.

✅ **Principle XI: Website Documentation Synchronization** - PASS
Feature adds user-facing commands, workflows, and configuration options. Website documentation updates will be required and are included in implementation planning (Phase 9 tasks).

**Gate Result**: ✅ PASS - Proceed to Phase 0 research

### Post-Design Evaluation (Phase 1)

✅ **Principle I: Upstream Fidelity** - PASS
Design maintains separation between Speck enhancements and spec-kit core. Configuration schema (contracts/config-schema.ts) uses Speck-specific storage location (`.speck/config.json`).

✅ **Principle II: Extension Preservation** - PASS
All contracts and data models are Speck-specific. Extension markers will be added to command files that integrate worktree functionality.

✅ **Principle III: Specification-First Development** - PASS
Design artifacts (data-model.md, contracts/) are derived from technology-agnostic spec. Implementation choices documented in research.md with clear rationale.

✅ **Principle IV: Quality Gates** - PASS
Data model includes 19 validation rules mapped to all FR-* requirements. Contracts cover all functional requirements with type safety.

✅ **Principle V: Claude Code Native** - PASS
CLI contracts (contracts/cli-interface.md) designed for both slash command integration and standalone CLI usage. Interactive setup wizard planned for user-friendly configuration.

✅ **Principle VI: Technology Agnosticism** - PASS
Spec remains technology-agnostic. Research.md documents technology choices (Zod, Git CLI, Bun Shell) with rationale.

✅ **Principle VII: File Format Compatibility** - PASS
Configuration storage (`.speck/config.json`) is outside `specs/` directory. Worktree metadata stored in `.speck/worktrees/`. No changes to spec-kit file formats.

✅ **Principle VIII: Command-Implementation Separation** - PASS
Internal API (contracts/internal-api.ts) defines 40+ functions in separate TypeScript modules. Commands will be thin wrappers calling these implementations.

✅ **Principle IX: Code Quality Standards** - PENDING
Design includes full TypeScript interfaces and Zod schemas for type safety. Implementation must pass typecheck and lint before completion.

✅ **Principle X: Zero Test Regression Policy** - PENDING
Test baseline will be captured before implementation. Feature completion requires zero new test failures.

✅ **Principle XI: Website Documentation Synchronization** - PENDING
This feature adds major user-facing functionality (commands, workflows, configuration). Website documentation updates are tracked in Phase 9 tasks and must be completed before release.

**Gate Result**: ✅ PASS - Proceed to Phase 2 (tasks generation)

## Project Structure

### Documentation (this feature)

```text
specs/012-worktree-integration/
├── spec.md              # Feature specification
├── plan.md              # This file (/speck:plan command output)
├── research.md          # Phase 0 output (technical research)
├── data-model.md        # Phase 1 output (entities and validation)
├── quickstart.md        # Phase 1 output (developer guide)
├── contracts/           # Phase 1 output (API contracts)
│   ├── config-schema.ts     # Zod schemas and TypeScript types
│   ├── cli-interface.md     # CLI command specifications
│   └── internal-api.ts      # Function signatures
└── tasks.md             # Phase 2 output (/speck:tasks command - NOT YET CREATED)
```

### Source Code (repository root)

```text
.speck/
├── config.json          # User configuration (worktree settings, file rules, IDE prefs)
└── scripts/
    └── worktree/        # Worktree integration scripts
        ├── create.ts        # Create worktree + setup workflow
        ├── remove.ts        # Remove worktree + cleanup
        ├── list.ts          # List all worktrees
        ├── prune.ts         # Cleanup stale references
        ├── config.ts        # Configuration management
        ├── file-ops.ts      # File copy/symlink operations (with relative symlinks)
        ├── ide-launch.ts    # IDE detection and launch
        ├── deps-install.ts  # Dependency installation
        ├── validation.ts    # Validation utilities (including Git version check)
        └── naming.ts        # Worktree naming logic (repo layout detection)

# Worktrees created as peer directories (one level up from main repo):
../
├── speck/                       # Main repository (if dir name matches repo name)
├── speck-012-worktree-integration/  # Worktree (prefixed with repo name)
└── speck-013-another-feature/       # Another worktree (prefixed with repo name)

# OR (if main repo dir name matches branch name, e.g., "main"):
../
├── main/                        # Main repository (dir name = branch name)
├── 012-worktree-integration/   # Worktree (no prefix, just branch name)
└── 013-another-feature/        # Another worktree (no prefix, just branch name)

.claude/
└── commands/
    ├── speck.specify.md     # Enhanced with worktree integration
    └── speck.branch.md      # Enhanced with worktree integration

src/                     # Existing Speck source (if applicable)

tests/
├── fixtures/
│   └── test-utils.ts        # Shared test utilities (temp Git repo, mocks)
├── integration/
│   ├── worktree-create.test.ts
│   ├── worktree-lifecycle.test.ts
│   ├── worktree-config.test.ts
│   ├── ide-launch.test.ts
│   ├── file-ops.test.ts
│   └── deps-install.test.ts
└── unit/
    ├── config.test.ts
    ├── config-schema.test.ts
    ├── validation.test.ts
    ├── naming.test.ts
    ├── git.test.ts
    ├── errors.test.ts
    ├── file-ops.test.ts
    ├── ide-launch.test.ts
    ├── deps-install.test.ts
    └── workflows.test.ts
```

**Structure Decision**: Single project structure chosen because worktree integration is an enhancement to existing Speck CLI, not a separate application. All implementation resides in `.speck/scripts/worktree/` subdirectory to maintain modularity and testability. Configuration lives in `.speck/config.json` to align with Speck's file-based storage principle.

**Worktree Location Strategy**: Worktrees are created as sibling directories of the main repository (both at the same parent directory level) to avoid Git nesting issues and enable proper worktree isolation. The naming strategy uses two modes based on repository directory layout: (1) If the repository directory name matches the repository name, worktrees are prefixed with `<repo-name>-<slugified-branch-name>`. (2) If the repository directory name matches the current branch name (e.g., `main`, `master`), worktrees use only `<slugified-branch-name>` without prefix. This dual-mode approach accommodates different repository organization styles while maintaining predictable worktree naming.

## Complexity Tracking

> **No constitutional violations requiring justification.**

All constitutional principles pass pre-design and post-design evaluation. The feature:
- Maintains upstream fidelity (Principle I)
- Uses extension boundaries (Principle II)
- Follows specification-first approach (Principle III)
- Implements quality gates (Principle IV)
- Integrates with Claude Code natively (Principle V)
- Keeps specs technology-agnostic (Principle VI)
- Preserves file format compatibility (Principle VII)
- Separates commands from implementation (Principle VIII)
- Will enforce code quality standards during implementation (Principle IX)
- Will validate zero test regressions before completion (Principle X)
- Will update website documentation for user-facing changes (Principle XI)

## Documentation Impact

**Website Updates Required**: ✅ YES - This feature adds major user-facing functionality

**Affected Documentation Pages**:
- `website/src/content/docs/getting-started/quickstart.md` - Add worktree setup instructions
- `website/src/content/docs/features/worktrees.md` - NEW PAGE - Comprehensive worktree guide
- `website/src/content/docs/configuration/speck-config.md` - NEW PAGE - Document `.speck/config.json` schema
- `website/src/content/docs/commands/specify.md` - Add `--no-worktree`, `--no-ide`, `--no-deps` flags
- `website/src/content/docs/commands/branch.md` - Add worktree integration flags
- `website/src/content/docs/workflows/feature-development.md` - Update with worktree workflow

**Rationale**: Worktree integration is a major user-facing feature that:
- Adds new commands and flags (`--no-worktree`, `--reuse-worktree`, etc.)
- Changes default workflow behavior when enabled (automatic worktree creation)
- Introduces new configuration options (`.speck/config.json`)
- Affects getting-started experience (worktree setup in quickstart)
- Provides new capabilities (parallel feature development, IDE auto-launch)

**Documentation Tasks**: See tasks.md Phase 9 for website synchronization tasks

**Compliance**: Per Constitution Principle XI, website documentation MUST be updated before feature completion. Website updates are tracked as mandatory tasks and verified in feature completion checklist.

## Next Steps

✅ **Phase 0 Complete**: research.md generated with all technical decisions documented
✅ **Phase 1 Complete**: data-model.md, contracts/, and quickstart.md generated
⏭️ **Phase 2**: Generate tasks.md using `/speck:tasks` command
⏭️ **Phase 3**: Begin implementation following quickstart.md checklist

**To proceed**: Run `/speck:tasks` to generate the implementation task breakdown.
