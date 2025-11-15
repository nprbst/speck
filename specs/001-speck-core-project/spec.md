# Feature Specification: Upstream Sync & Transformation Pipeline

**Feature Branch**: `001-speck-core-project` **Created**: 2025-11-14 **Status**:
Draft **Input**: User description: "Transform spec-kit releases into Speck's Claude-native implementation by syncing upstream content to `.specify/`, converting bash scripts to Bun TypeScript in `.speck/scripts/`, and generating `/speck.*` commands."

## Clarifications

### Session 2025-11-15

- Q: How should upstream transformations work? → A: AI-driven transformation using Claude to analyze upstream bash scripts and generate semantically equivalent Bun TypeScript code, preserving [SPECK-EXTENSION] markers
- Q: Should TypeScript support both Bun and Deno runtimes? → A: Bun-only to simplify implementation and leverage Bun's superior performance
- Q: What happens when upstream sync detects breaking changes? → A: Pause sync, present conflict analysis, offer options: skip conflicting changes, apply with manual merge, or abort entirely
- Q: What is the scope of this feature? → A: ONLY upstream sync and transformation. Command enhancements, user workflows, worktree support, and clarification improvements are separate future features.

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Transform Spec-Kit Release to Speck (Priority: P1)

A Speck maintainer receives notification that a new spec-kit release is available. They run `/speck.transform-upstream <version>` to automatically sync upstream content to `.specify/`, transform bash scripts to Bun TypeScript in `.speck/scripts/`, and generate/update `/speck.*` Claude Commands that call the Bun scripts.

**Why this priority**: This is the foundational transformation pipeline. Without it, there's no Speck - just manually maintained forks of spec-kit files.

**Independent Test**: Run `/speck.transform-upstream v1.0.0`, then verify:
1. `.specify/` contains upstream templates and bash scripts
2. `.speck/scripts/` contains Bun TS equivalents with identical CLI behavior
3. `/speck.*` commands exist and successfully call `.speck/scripts/`
4. Transformation report shows what changed and Claude's rationale

**Acceptance Scenarios**:

1. **Given** a spec-kit release tag exists, **When** maintainer runs `/speck.transform-upstream <version>`, **Then** system fetches upstream content and syncs templates/scripts to `.specify/`, preserving any existing [SPECK-EXTENSION] markers
2. **Given** upstream bash scripts synced to `.specify/scripts/bash/`, **When** transformation runs, **Then** Claude analyzes each script and generates semantically equivalent Bun TypeScript in `.speck/scripts/` with identical CLI interface (`--json`, `--paths-only` flags, exit codes, error messages)
3. **Given** Bun scripts generated, **When** transformation completes, **Then** `/speck.*` commands are created/updated to call `.speck/scripts/` (not bash), and transformation report documents changes + rationale
4. **Given** transformation encounters breaking changes, **When** conflict detected, **Then** system pauses, shows conflict analysis, and offers: skip conflicting changes, manual merge, or abort

### Edge Cases

- **Network failure during upstream fetch**: When network drops mid-fetch, transformation aborts and leaves existing `.specify/` and `.speck/` unchanged (no partial state)
- **Upstream release tag doesn't exist**: When user provides invalid tag, system shows available tags from spec-kit repo with clear error message
- **Breaking changes in bash scripts**: When upstream fundamentally changes script behavior (e.g., removes `--json` flag), Claude detects incompatibility, pauses transformation, and presents conflict analysis with options: skip this script, attempt best-effort transform with warnings, or abort
- **Existing [SPECK-EXTENSION] conflicts**: When upstream changes overlap with Speck extension boundaries, system preserves extensions but flags potential merge conflicts for manual review
- **Bun not installed**: When Bun runtime missing, transformation fails early with clear message directing to Bun installation instructions
- **First-time transformation**: When no `.specify/` or `.speck/` exists yet, system creates both directories and performs full initial sync rather than incremental

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide `/speck.transform-upstream <version>` command that accepts spec-kit release tags
- **FR-002**: System MUST fetch spec-kit release from GitHub and sync all templates and bash scripts to `.specify/` directory
- **FR-003**: System MUST preserve existing [SPECK-EXTENSION:START/END] marker boundaries during sync (don't overwrite Speck-specific code)
- **FR-004**: System MUST use Claude to analyze each bash script in `.specify/scripts/bash/` and generate semantically equivalent Bun TypeScript in `.speck/scripts/`
- **FR-005**: Bun scripts MUST maintain identical CLI interfaces: same flags (`--json`, `--paths-only`), exit codes, and error message formats as bash equivalents
- **FR-006**: System MUST generate/update `/speck.*` Claude Commands (specify, plan, clarify, tasks, implement, etc.) that call `.speck/scripts/` instead of bash
- **FR-007**: System MUST create transformation report documenting: (1) files synced to `.specify/`, (2) Bun scripts generated in `.speck/scripts/`, (3) commands updated, (4) Claude's transformation rationale
- **FR-008**: System MUST detect breaking changes in upstream bash scripts, pause transformation, and present conflict analysis with options: skip conflicting changes, attempt best-effort transform, or abort
- **FR-009**: System MUST track last synced commit SHA in `.speck/upstream-sync.json` for future incremental syncs
- **FR-010**: System MUST fail gracefully with clear error messages for: network failures, invalid tags, missing Bun runtime, or transformation conflicts
- **FR-011**: System MUST perform atomic operations - either full transformation succeeds or nothing changes (no partial state)

### Key Entities

- **Upstream Release**: A tagged spec-kit release (e.g., v1.0.0) containing templates, bash scripts, and documentation
- **Transformation Pipeline**: The `/speck.transform-upstream` workflow that: fetches upstream → syncs to `.specify/` → generates Bun TS in `.speck/scripts/` → updates `/speck.*` commands
- **Extension Marker**: [SPECK-EXTENSION:START/END] boundaries that protect Speck-specific code from being overwritten during upstream syncs
- **Upstream Tracker**: JSON file (`.speck/upstream-sync.json`) recording last synced commit SHA and sync metadata for incremental updates
- **Transformation Report**: Markdown document generated after sync showing what changed, Claude's analysis, and transformation decisions
- **Bun Script**: TypeScript implementation in `.speck/scripts/` that replicates bash script behavior with identical CLI interface

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Transformation completes in under 5 minutes for typical spec-kit releases (10-20 files)
- **SC-002**: 100% of [SPECK-EXTENSION] markers are preserved across all transformation runs
- **SC-003**: Generated Bun scripts produce byte-for-byte identical `--json` output compared to bash equivalents
- **SC-004**: Generated Bun scripts have 100% exit code compatibility with bash equivalents
- **SC-005**: Bun scripts start in under 100ms (vs ~300ms for bash equivalents)
- **SC-006**: Transformation succeeds without manual conflict resolution in 80% of upstream releases
- **SC-007**: Generated `/speck.*` commands successfully call `.speck/scripts/` and complete basic workflows

## Assumptions

1. **Claude Code Environment**: Transformation command runs in Claude Code with access to Claude for script analysis
2. **Bun Runtime**: Bun 1.0+ installed and available in PATH
3. **Upstream Availability**: spec-kit GitHub repository accessible via HTTPS
4. **Upstream Stability**: spec-kit changes are incremental, not revolutionary rewrites of core bash scripts
5. **Network Access**: Internet connectivity available for fetching upstream releases
6. **File System Permissions**: Write access to create/update `.specify/` and `.speck/` directories
7. **Git Not Required**: Transformation works in non-git directories (git only needed for actual feature workflows later)

## Dependencies

- **Upstream**: GitHub spec-kit repository (https://github.com/github/spec-kit or wherever it's hosted)
- **Runtime**: Bun 1.0+ for TypeScript execution
- **Claude**: Claude Code with slash command support for `/speck.transform-upstream`
- **Network**: HTTPS access to GitHub for fetching releases

## Out of Scope

The following are explicitly **not** part of this feature (separate features later):

- **Command Enhancements**: Claude-native improvements to `/speck.clarify`, `/speck.plan`, etc. (those are future features)
- **User Workflows**: Creating specs, clarifying requirements, generating plans (covered by generated commands, not transformation itself)
- **Worktree Support**: Multi-feature parallel development (separate feature)
- **Quality Validation**: Spec validation checklists and quality gates (separate feature)
- **Plugin Packaging**: Bundling as Claude Marketplace plugin (that's feature 002)
- **Bidirectional Sync**: Never sync Speck → spec-kit (unidirectional only)
- **Manual Script Editing**: No UI for editing generated Bun scripts (transformation regenerates them)
