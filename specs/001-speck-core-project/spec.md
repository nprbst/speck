# Feature Specification: Upstream Sync & Transformation Pipeline

**Feature Branch**: `001-speck-core-project` **Created**: 2025-11-14 **Status**:
Draft **Input**: User description: "Transform spec-kit releases into Speck's
Claude-native implementation by syncing upstream content to `.specify/`,
converting bash scripts to Bun TypeScript in `.speck/scripts/`, and generating
`/speck.*` commands."

## Clarifications

### Session 2025-11-15

- Q: How should upstream transformations work? → A: AI-driven transformation
  using Claude to analyze upstream bash scripts and generate semantically
  equivalent Bun TypeScript code, preserving [SPECK-EXTENSION] markers
- Q: Should TypeScript support both Bun and Deno runtimes? → A: Bun-only to
  simplify implementation and leverage Bun's superior performance
- Q: What happens when upstream sync detects breaking changes? → A: Pause sync,
  present conflict analysis, offer options: skip conflicting changes, apply with
  manual merge, or abort entirely
- Q: What is the scope of this feature? → A: ONLY upstream sync and
  transformation. Command enhancements, user workflows, worktree support, and
  clarification improvements are separate future features.
- Q: Should sync/transform be a single command or split into separate commands?
  → A: Three separate commands: `/speck.check-upstream` (show available
  releases), `/speck.pull-upstream <version>` (pull into `upstream/<version>`
  tree, track in `upstream/releases.json`), `/speck.transform-upstream` (convert
  bash → Bun TS). The `.specify/` directory is NOT to be modified or extended.
- Q: How should transformation handle bash-specific constructs that have no
  direct TypeScript equivalent? → A: Prefer pure TypeScript equivalents where
  possible, use Bun's Shell API for shell-like constructs, fall back to
  `Bun.spawn()` for complex bash-specific patterns that can't be cleanly
  translated.
- Q: What metadata should be tracked in `upstream/releases.json` and how is
  "latest" version determined? → A: Track version, commit SHA, pull date, and
  transformation status (pulled/transformed/failed). "Latest" = most recently
  pulled version. Also create `upstream/latest` symlink pointing to the latest
  release directory.
- Q: How do upstream bash scripts map to generated `/speck.*` commands? → A:
  Mapping defined by upstream `/speckit.*` command configuration (e.g.,
  `speckit.plan.md` references `.specify/scripts/bash/setup-plan.sh --json`).
  Transformation has two jobs: (1) transform bash scripts to Bun TypeScript, (2)
  transform `/speckit.*` commands into `/speck.*` commands, updating script
  references AND factoring out sections better implemented as `.claude/agents`
  or `.claude/skills`.
- Q: What criteria determine when to factor command sections into agents vs.
  skills vs. inline? → A: Agent for multi-step autonomous workflows (>3 steps
  with branching logic), skill for reusable cross-command capabilities, inline
  for simple sequential procedures. The `/speck.transform-upstream` command
  implementation itself should use two agents: one for bash-to-Bun
  transformation, another for `/speckit.*` commands to Speck
  commands/agents/skills transformation.
- Q: When the bash-to-Bun transformation agent encounters an existing TypeScript
  file in `.speck/scripts/`, what should be the priority for SPECK-EXTENSION
  blocks? → A: Existing TypeScript SPECK-EXTENSION blocks take absolute
  priority; never modify them
- Q: When running `/speck.transform-upstream` on a spec-kit release that has
  already been transformed, should the transformation agents re-run tests for
  unchanged files? → A: Always re-run all tests for all transformed files
  regardless of changes
- Q: When the transformation report documents "specific changes made" for an
  updated file, what level of detail should be included? → A: File-level summary
  (e.g., "Added --version flag", "Updated error handling")
- Q: Should the command transformation agent extract workflow sections into
  agents/skills during transformation, or preserve command structure for later
  factoring? → A: Extract in this transformation - analyze command body markdown
  to identify workflow sections, extract into `.claude/agents/` or
  `.claude/skills/` files, then update command body to invoke them (fulfills
  Claude-native goal)
- Q: How should transformed commands invoke extracted agents/skills? → A: Use
  Task tool for agents (e.g.,
  `Task(subagent_type: "general-purpose", prompt: "Execute .claude/agents/X.md...")`),
  use Skill tool for skills (e.g., `Skill(skill: "skill-name")`)

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

A Speck maintainer receives notification that a new spec-kit release is
available. They run `/speck.check-upstream` to see available releases, then
`/speck.pull-upstream <version>` to fetch upstream content into
`upstream/<version>/` directory with metadata tracked in
`upstream/releases.json`. Finally, they run `/speck.transform-upstream` to
analyze the pulled bash scripts and generate Bun TypeScript equivalents in
`.speck/scripts/` plus corresponding `/speck.*` Claude Commands.

**Why this priority**: This is the foundational transformation pipeline. Without
it, there's no Speck - just manually maintained forks of spec-kit files.

**Independent Test**: Run `/speck.check-upstream`,
`/speck.pull-upstream v1.0.0`, `/speck.transform-upstream`, then verify:

1. `upstream/v1.0.0/` contains pristine upstream templates and bash scripts
2. `upstream/releases.json` tracks the v1.0.0 release metadata
3. `.speck/scripts/` contains Bun TS equivalents with identical CLI behavior
4. `/speck.*` commands exist and successfully call `.speck/scripts/`
5. Transformation report shows what changed and Claude's rationale

**Acceptance Scenarios**:

1. **Given** maintainer wants to see available releases, **When** they run
   `/speck.check-upstream`, **Then** system queries spec-kit GitHub repo and
   displays available release tags with versions, dates, and release notes
   summaries
2. **Given** a spec-kit release tag exists, **When** maintainer runs
   `/speck.pull-upstream <version>`, **Then** system fetches upstream content
   and stores it pristine in `upstream/<version>/` directory, records metadata
   (version, commit SHA, pull date, status: "pulled") in
   `upstream/releases.json`, creates/updates `upstream/latest` symlink to point
   to this version, and does NOT modify `.specify/` directory
3. **Given** upstream content pulled to `upstream/<version>/`, **When**
   maintainer runs `/speck.transform-upstream`, **Then** system launches two
   specialized agents in sequence: (1) bash-to-Bun transformation agent analyzes
   bash scripts in `upstream/<version>/scripts/bash/` and generates semantically
   equivalent Bun TypeScript in `.speck/scripts/` with identical CLI interface,
   (2) command transformation agent transforms upstream `/speckit.*` command
   files into `/speck.*` commands, updating script references from
   `.specify/scripts/bash/` to `.speck/scripts/`, and updates status to
   "transformed" in `upstream/releases.json`
4. **Given** command transformation agent running, **When** agent analyzes
   upstream `/speckit.*` command structure, **Then** agent applies factoring
   criteria: creates `.claude/agents/` for multi-step autonomous workflows (>3
   steps with branching), creates `.claude/skills/` for reusable cross-command
   capabilities, keeps simple sequential procedures inline
5. **Given** both transformation agents complete, **When** all scripts and
   commands processed, **Then** transformation report documents: (1) Bun scripts
   generated, (2) `/speck.*` commands created/updated, (3) agents/skills
   factored out, (4) Claude's rationale for all transformations
6. **Given** transformation fails, **When** error occurs during transformation,
   **Then** system updates status to "failed" in `upstream/releases.json` with
   error details, and preserves existing `.speck/scripts/` unchanged
7. **Given** transformation encounters breaking changes, **When** conflict
   detected, **Then** system pauses, shows conflict analysis, and offers: skip
   conflicting changes, manual merge, or abort

### Edge Cases

- **Network failure during upstream fetch**: When network drops mid-fetch during
  `/speck.pull-upstream`, command aborts and leaves existing `upstream/` and
  `.speck/` unchanged (no partial state)
- **Upstream release tag doesn't exist**: When user provides invalid tag to
  `/speck.pull-upstream`, system shows error and suggests running
  `/speck.check-upstream` to see available releases
- **Breaking changes in bash scripts**: When upstream fundamentally changes
  script behavior (e.g., removes `--json` flag), bash-to-Bun transformation
  agent detects incompatibility, pauses transformation, and presents conflict
  analysis with options: skip this script, attempt best-effort transform with
  warnings, or abort
- **Agent failure during transformation**: When either transformation agent
  fails (e.g., bash-to-Bun agent encounters unsupported syntax, or command
  transformation agent can't parse `/speckit.*` structure),
  `/speck.transform-upstream` halts immediately, preserves existing `.speck/`
  state, records failure in `upstream/releases.json`, and reports which agent
  failed and why
- **Bun not installed**: When Bun runtime missing, `/speck.transform-upstream`
  fails early with clear message directing to Bun installation instructions
- **First-time transformation**: When no `upstream/` or `.speck/` exists yet,
  `/speck.pull-upstream` creates `upstream/<version>/` directory and
  `/speck.transform-upstream` creates `.speck/scripts/` directory
- **Multiple upstream versions pulled**: When `upstream/` contains multiple
  version directories (e.g., `upstream/v1.0.0/` and `upstream/v1.1.0/`),
  `/speck.transform-upstream` without arguments transforms the version pointed
  to by `upstream/latest` symlink (most recently pulled); optional `--version`
  flag allows targeting specific version
- **Symlink already exists**: When `/speck.pull-upstream` runs and
  `upstream/latest` symlink already exists, system removes old symlink and
  creates new one pointing to newly pulled version

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide `/speck.check-upstream` command that queries
  spec-kit GitHub repo and displays available release tags with versions, dates,
  and release notes summaries
- **FR-002**: System MUST provide `/speck.pull-upstream <version>` command that
  fetches spec-kit release from GitHub and stores upstream version in
  `upstream/<version>/` directory
- **FR-003**: System MUST record pulled release metadata (version, pull date,
  commit SHA, release notes URL, status: "pulled") in `upstream/releases.json`
  file and create/update `upstream/latest` symlink to point to newly pulled
  version directory
- **FR-004**: System MUST NOT modify or extend `.specify/` directory during
  upstream pull operations (`.specify/` remains static/read-only for upstream
  sync purposes)
- **FR-005**: System MUST provide `/speck.transform-upstream` command (optional
  `--version` flag, defaults to `upstream/latest` symlink target) that
  orchestrates dual transformation by launching two specialized agents in
  sequence
- **FR-005a**: System MUST provide bash-to-Bun transformation agent
  (`.claude/agents/transform-bash-to-bun.md`) that analyzes bash scripts from
  `upstream/<version>/.specify/scripts/bash/` and generates semantically
  equivalent Bun TypeScript in `.speck/scripts/` using transformation strategy:
  prefer pure TypeScript equivalents, use Bun Shell API for shell-like
  constructs, fall back to `Bun.spawn()` for complex bash-specific patterns
- **FR-005a.1**: Bash-to-Bun agent MUST check for existing TypeScript files in
  `.speck/scripts/` before transformation and preserve SPECK-EXTENSION blocks
  from existing TypeScript files with absolute priority (never modify existing
  extension blocks)
- **FR-005a.2**: Bash-to-Bun agent MUST minimize changes when existing
  TypeScript file has same functionality, only updating parts affected by
  upstream changes while preserving existing code structure, variable names, and
  patterns
- **FR-005a.3**: Bash-to-Bun agent MUST generate or update lightweight contract
  tests in `tests/.speck-scripts/` covering CLI flags, exit codes, and JSON
  output structure
- **FR-005a.4**: Bash-to-Bun agent MUST validate generated TypeScript compiles
  without errors and passes all tests before reporting success (tests MUST be
  run for all files regardless of whether file was created or updated)
- **FR-005b**: System MUST provide command transformation agent
  (`.claude/agents/transform-commands.md`) that transforms upstream `/speckit.*`
  command files from `upstream/<version>/.claude/commands/` into `/speck.*`
  commands in `.claude/commands/`
- **FR-005b.1**: Command transformation agent MUST check for existing Speck
  command files in `.claude/commands/` before transformation and preserve
  SPECK-EXTENSION blocks from existing commands with absolute priority (never
  modify existing extension blocks)
- **FR-005b.2**: Command transformation agent MUST minimize changes when
  existing command has same functionality, only updating script references and
  upstream-affected parts while preserving existing workflow steps and patterns
- **FR-006**: Bun scripts MUST maintain identical CLI interfaces: same flags
  (`--json`, `--paths-only`), exit codes, and error message formats as bash
  equivalents
- **FR-007**: Command transformation agent MUST analyze command body markdown to
  identify workflow sections and apply factoring criteria: create
  `.claude/agents/` for multi-step autonomous workflows (>3 steps with branching
  logic), create `.claude/skills/` for reusable cross-command capabilities, keep
  simple sequential procedures inline in command body
- **FR-007a**: Command transformation agent MUST extract identified workflow
  sections into separate agent files in `.claude/agents/` or skill files in
  `.claude/skills/`, then update the command body to invoke the new
  agents/skills instead of containing the logic inline
- **FR-007b**: Command transformation agent MUST update script references in
  transformed `/speck.*` commands from `.specify/scripts/bash/` paths to
  `.speck/scripts/` paths
- **FR-008**: System MUST update status in `upstream/releases.json` to
  "transformed" on successful transformation or "failed" (with error details) on
  failure
- **FR-009**: System MUST create transformation report documenting: (1) upstream
  version transformed, (2) whether each file was created new or updated from
  existing, (3) Bun scripts generated in `.speck/scripts/` with test file paths,
  (4) `/speck.*` commands created/updated in `.claude/commands/`, (5) file-level
  summary of specific changes made (e.g., "Added --version flag", "Updated error
  handling") not line-by-line diffs, (6) agents/skills factored out in
  `.claude/agents/` or `.claude/skills/` with extraction completeness (all
  workflow sections >3 steps with branching logic extracted per FR-007
  criteria), (7) SPECK-EXTENSION blocks preserved with line numbers, (8)
  validation results (compilation, execution, tests passed), (9) Claude's
  transformation rationale for all changes
- **FR-010**: System MUST detect breaking changes in upstream bash scripts via
  Claude analysis (breaking changes defined as: removed/renamed CLI flags,
  changed exit code semantics, altered JSON output schema structure, or
  incompatible behavioral changes), pause transformation, and present conflict
  analysis with options: skip conflicting changes, attempt best-effort
  transform, or abort
- **FR-011**: System MUST fail gracefully with clear error messages for: network
  failures, invalid tags, missing Bun runtime, or transformation conflicts
- **FR-012**: System MUST perform atomic operations - either full command
  succeeds or nothing changes (no partial state)

### Key Entities

- **Upstream Release**: A tagged spec-kit release (e.g., v1.0.0) containing
  templates, bash scripts, and documentation, stored pristine in
  `upstream/<version>/` directory
- **Release Registry**: JSON file (`upstream/releases.json`) tracking all pulled
  releases with metadata (version, pull date, commit SHA, release notes URL,
  transformation status: "pulled"/"transformed"/"failed")
- **Latest Symlink**: `upstream/latest` symlink pointing to most recently pulled
  release directory (e.g., `upstream/v1.2.0/`), updated by
  `/speck.pull-upstream`, used as default source by `/speck.transform-upstream`
- **Transformation Pipeline**: Three-command workflow: `/speck.check-upstream`
  (discover releases) → `/speck.pull-upstream <version>` (fetch to
  `upstream/<version>/`, update symlink) → `/speck.transform-upstream`
  (orchestrates two-agent dual transformation)
- **Bash-to-Bun Transformation Agent**: Specialized agent
  (`.claude/agents/transform-bash-to-bun.md`) that analyzes bash scripts from
  `upstream/<version>/scripts/bash/` and generates semantically equivalent Bun
  TypeScript in `.speck/scripts/` with identical CLI interfaces
- **Command Transformation Agent**: Specialized agent
  (`.claude/agents/transform-commands.md`) that converts upstream `/speckit.*`
  command files to `/speck.*` commands by: (1) updating script references from
  `.specify/scripts/bash/` to `.speck/scripts/`, (2) applying factoring criteria
  to identify and extract sections as `.claude/agents/` (multi-step autonomous
  workflows >3 steps) or `.claude/skills/` (reusable cross-command
  capabilities), (3) preserving command structure and workflow intent
- **Upstream Directory**: Read-only `upstream/<version>/` tree containing
  pristine spec-kit release content (templates, bash scripts, `/speckit.*`
  commands, docs) for transformation source material
- **Transformation Report**: Markdown document generated after
  `/speck.transform-upstream` showing: upstream version, Bun scripts generated,
  `/speck.*` commands created/updated, agents/skills factored out, and Claude's
  transformation rationale for all changes
- **Bun Script**: TypeScript implementation in `.speck/scripts/` that replicates
  bash script behavior with identical CLI interface

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `/speck.check-upstream` completes in under 10 seconds and displays
  all available release tags
- **SC-002**: `/speck.pull-upstream <version>` completes in under 2 minutes for
  typical spec-kit releases (10-20 files)
- **SC-003**: `/speck.transform-upstream` completes in under 5 minutes for
  typical spec-kit releases (analyzing 5-10 bash scripts)
- **SC-004**: Generated Bun scripts produce semantically equivalent `--json`
  output compared to bash equivalents (identical schema, data values, and exit
  codes; whitespace and key ordering may differ)
- **SC-005**: Generated Bun scripts have 100% exit code compatibility with bash
  equivalents
- **SC-006**: Bun scripts start in under 100ms (vs ~300ms for bash equivalents)
- **SC-007**: Transformation succeeds without manual conflict resolution in 80%
  of upstream releases
- **SC-008**: Generated `/speck.*` commands successfully call `.speck/scripts/`
  and complete basic workflows
- **SC-009**: `upstream/releases.json` accurately tracks all pulled releases
  with complete metadata

## Assumptions

1. **Claude Code Environment**: Commands run in Claude Code with access to
   Claude for script analysis
2. **Bun Runtime**: Bun 1.0+ installed and available in PATH
3. **Upstream Availability**: spec-kit GitHub repository accessible via HTTPS
4. **Upstream Stability**: spec-kit changes are incremental, not revolutionary
   rewrites of core bash scripts
5. **Network Access**: Internet connectivity available for fetching upstream
   releases
6. **File System Permissions**: Write access to create/update `upstream/` and
   `.speck/` directories (`.specify/` is NOT modified)
7. **Git Not Required**: Transformation works in non-git directories (git only
   needed for actual feature workflows later)

## Dependencies

- **Upstream**: GitHub spec-kit repository (https://github.com/github/spec-kit
  or wherever it's hosted)
- **Runtime**: Bun 1.0+ for TypeScript execution
- **Claude**: Claude Code with slash command support for
  `/speck.check-upstream`, `/speck.pull-upstream`, `/speck.transform-upstream`,
  and agent support for `.claude/agents/transform-bash-to-bun.md` and
  `.claude/agents/transform-commands.md`
- **Network**: HTTPS access to GitHub for fetching releases

## Out of Scope

The following are explicitly **not** part of this feature (separate features
later):

- **Command Enhancements**: Claude-native improvements to `/speck.clarify`,
  `/speck.plan`, etc. (those are future features)
- **User Workflows**: Creating specs, clarifying requirements, generating plans
  (covered by generated commands, not transformation itself)
- **Worktree Support**: Multi-feature parallel development (separate feature)
- **Quality Validation**: Spec validation checklists and quality gates (separate
  feature)
- **Plugin Packaging**: Bundling as Claude Marketplace plugin (that's
  feature 002)
- **Bidirectional Sync**: Never sync Speck → spec-kit (unidirectional only)
- **Manual Script Editing**: No UI for editing generated Bun scripts
  (transformation regenerates them)
