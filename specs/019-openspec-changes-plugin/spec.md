# Feature Specification: OpenSpec Changes Plugin

**Feature Branch**: `019-openspec-changes-plugin`
**Created**: 2025-12-07
**Status**: Draft
**Input**: User description: "Add speck-changes plugin that brings OpenSpec change management process to Speck with upstream tracking and transformation for easy migration from OpenSpec"

## Overview

This plugin adds OpenSpec's change management workflow to Speck, enabling structured proposal-based development where changes are drafted, reviewed, implemented, and archived. The plugin follows the same upstream tracking and transformation pattern established in spec 001, syncing from the OpenSpec GitHub repository and transforming Node.js CLI code to Bun TypeScript while creating Claude Code native commands.

### OpenSpec Core Concepts

OpenSpec organizes projects with two key directories:
- **`specs/`** - Source of truth containing current system specifications
- **`changes/`** - Proposed modifications grouped by feature folder

Each change folder contains:
- `proposal.md` - Rationale and overview
- `tasks.md` - Implementation checklist
- `design.md` (optional) - Technical decisions
- `specs/` - Delta files showing proposed changes

The workflow follows four stages: Draft Proposal → Review & Iterate → Implement Tasks → Archive (merge deltas back into source specs).

### Plugin Structure

The plugin is organized in `plugins/changes/` with the following structure:

```
plugins/changes/
├── commands/                    # Slash commands (Markdown with YAML frontmatter)
│   ├── speck-changes.propose.md
│   ├── speck-changes.apply.md
│   ├── speck-changes.archive.md
│   ├── speck-changes.list.md
│   ├── speck-changes.show.md
│   ├── speck-changes.validate.md
│   └── speck-changes.migrate.md
├── scripts/                     # Bun TypeScript implementations
│   ├── propose.ts
│   ├── apply.ts
│   ├── archive.ts
│   ├── validate.ts
│   ├── list.ts
│   ├── show.ts
│   └── migrate.ts
├── skills/                      # AI guidance (extracted from AGENTS.md)
│   └── changes-workflow/
│       ├── SKILL.md             # Core workflow instructions
│       ├── spec-format.md       # Delta format guidance
│       └── troubleshooting.md   # Error recovery
├── templates/                   # Artifact templates
│   ├── proposal.md
│   ├── design.md
│   ├── tasks.md
│   └── delta-spec.md
└── agents/                      # Specialized agents
    └── transform-openspec.md    # Upstream transformation
```

## Clarifications

### Session 2025-12-07

- Q: How should the plugin validate transformed code before it becomes executable? → A: Static analysis (TypeScript/ESLint) + manual review before commit
- Q: How should the plugin authenticate with GitHub API for fetching releases? → A: Use `gh` CLI authentication if available, fall back to unauthenticated
- Q: What naming rules should apply to change proposal names? → A: Kebab-case only (lowercase, hyphens, e.g., `add-user-auth`); command renamed from `draft` to `propose`
- Q: Should change proposals track explicit status beyond folder location? → A: Folder location only (`.speck/changes/` = active, `.speck/archive/` = archived)
- Q: How should the plugin handle OpenSpec structure changes across versions? → A: Single semantic/LLM-driven transformation (matching speckit pattern); OpenSpec CLI must be installed in temp location to extract .md files since it lacks standalone command files

### Session 2025-12-08

- Q: Should the spec explicitly define the skills architecture with three extracted skill files? → A: Yes, add full skills architecture with 3 skill files and their responsibilities
- Q: Should the spec define a transform agent with explicit responsibilities for handling upstream OpenSpec releases? → A: Yes, add agent specification with transformation responsibilities (AGENTS.md → skills, CLI → scripts, paths normalization)
- Q: Which path convention should be canonical for specifications? → A: Split convention - specs at `specs/` (root), changes/archive at `.speck/` (runtime data)
- Q: Should the spec define a delta-spec.md template for proper delta file format? → A: Yes, add template requirement with structure outline (sections, requirement format, scenario blocks)
- Q: Which plugin directory name should be canonical? → A: `plugins/changes/` with explicit structure overview (commands/, scripts/, skills/, agents/, templates/)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Transform OpenSpec Release to Speck Plugin (Priority: P1)

A Speck maintainer wants to add OpenSpec's change management capabilities as a plugin. They run `/speck-changes.check-upstream` to see available OpenSpec releases, then `/speck-changes.pull-upstream <version>` to fetch the release into `upstream/openspec/<version>/`. Finally, they run `/speck-changes.transform-upstream` to analyze the Node.js CLI and generate Bun TypeScript equivalents in `plugins/changes/` plus corresponding `/speck-changes.*` commands.

**Why this priority**: This is the foundational transformation pipeline. Without it, there's no plugin - just manual integration of OpenSpec code.

**Independent Test**: Run the three upstream commands, then verify:
1. `upstream/openspec/<version>/` contains pristine OpenSpec source
2. `upstream/openspec/releases.json` tracks the release metadata
3. `plugins/changes/scripts/` contains Bun TypeScript equivalents
4. `/speck-changes.*` commands exist and successfully execute
5. Transformation report shows what changed and Claude's rationale

**Acceptance Scenarios**:

1. **Given** maintainer wants to see available releases, **When** they run `/speck-changes.check-upstream`, **Then** system queries OpenSpec GitHub repo and displays available release tags with versions, dates, and release notes summaries
2. **Given** an OpenSpec release tag exists, **When** maintainer runs `/speck-changes.pull-upstream <version>`, **Then** system fetches upstream content and stores it pristine in `upstream/openspec/<version>/`, records metadata in `upstream/openspec/releases.json`, and creates/updates `upstream/openspec/latest` symlink
3. **Given** upstream content pulled, **When** maintainer runs `/speck-changes.transform-upstream`, **Then** system launches transformation agents: (1) Node.js-to-Bun transformation agent analyzes source code and generates Bun TypeScript in `plugins/changes/scripts/`, (2) command transformation agent creates `/speck-changes.*` commands in `plugins/changes/commands/`
4. **Given** both transformation agents complete, **When** all scripts and commands processed, **Then** transformation report documents scripts generated, commands created, and Claude's rationale

---

### User Story 2 - Create a Change Proposal (Priority: P1)

A developer using Speck wants to propose a change to an existing feature. They run `/speck-changes.propose <change-name>` which creates a new change folder with `proposal.md`, `tasks.md`, and delta files based on the existing specs they're modifying.

**Why this priority**: This is the core user workflow - creating structured change proposals is the primary value of the plugin.

**Independent Test**: Run `/speck-changes.propose add-auth` and verify:
1. `.speck/changes/add-auth/` folder is created
2. `proposal.md` contains structured template with rationale section
3. `tasks.md` contains implementation checklist template
4. User can populate proposal and get Claude assistance

**Acceptance Scenarios**:

1. **Given** developer wants to propose a change, **When** they run `/speck-changes.propose <name>`, **Then** system creates `.speck/changes/<name>/` folder with `proposal.md` and `tasks.md` templates
2. **Given** developer provides feature description, **When** Claude analyzes the request, **Then** system populates initial proposal content and suggests affected specs
3. **Given** existing specs exist in `specs/` directory, **When** change affects those specs, **Then** system creates delta files in `.speck/changes/<name>/specs/` with `## ADDED Requirements`, `## MODIFIED Requirements`, or `## REMOVED Requirements` sections
4. **Given** developer wants design documentation, **When** they specify `--with-design` flag, **Then** system also creates `design.md` template

---

### User Story 3 - Review and Manage Changes (Priority: P2)

A developer or team lead wants to see all active change proposals and their status. They run `/speck-changes.list` to view active changes, or `/speck-changes.show <name>` to see details of a specific change including its proposal, tasks, and delta files.

**Why this priority**: Visibility into active changes is essential for team coordination and decision-making.

**Independent Test**: Create two change proposals, then run `/speck-changes.list` and verify both appear with status indicators.

**Acceptance Scenarios**:

1. **Given** multiple change proposals exist, **When** user runs `/speck-changes.list`, **Then** system displays all active changes with names, creation dates, and completion status
2. **Given** a specific change exists, **When** user runs `/speck-changes.show <name>`, **Then** system displays proposal content, task completion status, and delta summaries
3. **Given** user wants machine-readable output, **When** they add `--json` flag, **Then** system outputs structured JSON with change metadata

---

### User Story 4 - Validate Change Proposal (Priority: P2)

A developer wants to ensure their change proposal is correctly formatted before team review. They run `/speck-changes.validate <name>` which checks proposal structure, delta formatting, and requirement syntax.

**Why this priority**: Validation ensures consistency and catches errors before team review.

**Independent Test**: Create a change with intentionally malformed delta, run `/speck-changes.validate`, and verify error is reported.

**Acceptance Scenarios**:

1. **Given** a change proposal with valid structure, **When** user runs `/speck-changes.validate <name>`, **Then** system reports success and any warnings
2. **Given** a change with malformed delta sections, **When** validation runs, **Then** system reports specific formatting errors with line numbers
3. **Given** requirements lack acceptance scenarios, **When** validation runs, **Then** system warns about missing scenario blocks

---

### User Story 5 - Archive Completed Change (Priority: P2)

After implementing a change and getting approval, the developer runs `/speck-changes.archive <name>` which merges the delta files back into the source specs and moves the change folder to `.speck/archive/`.

**Why this priority**: Archiving completes the change management cycle and updates the living specifications.

**Independent Test**: Create a change with delta additions, implement it, then run `/speck-changes.archive` and verify deltas are merged into source specs.

**Acceptance Scenarios**:

1. **Given** all tasks in a change are complete, **When** user runs `/speck-changes.archive <name>`, **Then** system merges delta content into source specs and moves change folder to `.speck/archive/<name>/`
2. **Given** incomplete tasks exist, **When** archive is attempted, **Then** system warns about incomplete tasks and requires `--force` flag to proceed
3. **Given** archive succeeds, **When** user views source specs, **Then** delta additions/modifications are reflected in the specs

---

### User Story 7 - Apply Change Proposal (Priority: P1)

A developer has a validated change proposal and wants to implement it. They run `/speck-changes.apply <name>` which guides them through implementing the tasks in the proposal's `tasks.md`, marking tasks complete as they progress.

**Why this priority**: This is the core implementation step in the OpenSpec workflow. Without it, users must manually work through tasks without Claude assistance, breaking the Draft→Review→**Implement**→Archive cycle.

**Independent Test**: Create a change proposal with tasks, run `/speck-changes.apply add-auth` and verify:
1. System reads tasks from `.speck/changes/add-auth/tasks.md`
2. Claude assists with implementing each task
3. Tasks are marked complete as they're finished
4. Progress is visible via `/speck-changes.show`

**Acceptance Scenarios**:

1. **Given** a change proposal exists with tasks, **When** user runs `/speck-changes.apply <name>`, **Then** system loads tasks from `.speck/changes/<name>/tasks.md` and presents them for implementation
2. **Given** apply is running, **When** Claude completes a task, **Then** system marks the task as complete in `tasks.md` with `[x]`
3. **Given** delta files exist, **When** implementing related tasks, **Then** system provides delta context to Claude for accurate implementation
4. **Given** all tasks are complete, **When** apply finishes, **Then** system suggests running `/speck-changes.archive <name>`

---

### User Story 6 - Migrate from OpenSpec (Priority: P3)

An existing OpenSpec user wants to migrate their project to Speck while preserving their existing specs and changes. They run `/speck-changes.migrate` which imports the `openspec/` directory structure into Speck's format.

**Why this priority**: Migration is important for adoption but secondary to core functionality.

**Independent Test**: Set up a mock OpenSpec directory, run migrate, verify specs and changes are imported correctly.

**Acceptance Scenarios**:

1. **Given** an existing `openspec/` directory, **When** user runs `/speck-changes.migrate`, **Then** system imports specs to `specs/` and changes to `.speck/changes/` with format conversion
2. **Given** OpenSpec delta files exist, **When** migration runs, **Then** delta format is preserved and validated
3. **Given** migration completes, **When** user runs `/speck-changes.list`, **Then** migrated changes appear with original metadata

---

### Edge Cases

- **Network failure during upstream fetch**: When network drops mid-fetch during `/speck-changes.pull-upstream`, command aborts leaving existing state unchanged
- **Upstream release tag doesn't exist**: When user provides invalid tag, system shows error and suggests running `/speck-changes.check-upstream`
- **Conflicting delta changes**: When two changes modify the same spec section, archive warns about potential conflicts and suggests manual review
- **Empty change proposal**: When user attempts to archive a change with no delta files, system warns and requires confirmation
- **Circular spec references**: When delta files reference specs that also have active changes, system detects and warns about potential conflicts
- **OpenSpec not installed**: When migration is attempted but no `openspec/` directory exists, system provides clear error message

## Requirements *(mandatory)*

### Functional Requirements

#### Skills Architecture

The plugin provides AI guidance through three skill files extracted from OpenSpec's AGENTS.md, located in `plugins/changes/skills/changes-workflow/`:

- **FR-040**: System MUST provide `SKILL.md` skill containing core workflow instructions: TL;DR summary, three-stage workflow (Draft → Review → Implement → Archive), and pre-task checklist
- **FR-041**: System MUST provide `spec-format.md` skill containing delta specification format: `## ADDED/MODIFIED/REMOVED Requirements` structure, requirement-scenario pairing, and RFC 2119 normative keyword usage
- **FR-042**: System MUST provide `troubleshooting.md` skill containing validation error explanations, common mistakes, and recovery procedures for malformed proposals

| Skill File | Source Sections from AGENTS.md | Purpose |
|------------|-------------------------------|---------|
| `SKILL.md` | TL;DR + Three-Stage Workflow + Before Any Task | Core workflow instructions |
| `spec-format.md` | Spec File Format + Delta Operations + Creating Change Proposals | How to write delta files |
| `troubleshooting.md` | Troubleshooting + Error Recovery + Validation Tips | Debugging and fixes |

#### Templates

The plugin provides templates in `plugins/changes/templates/` to ensure consistent artifact structure:

- **FR-048**: System MUST provide `delta-spec.md` template for creating properly formatted delta specification files
- **FR-049**: Delta-spec template MUST include sections for `## ADDED Requirements`, `## MODIFIED Requirements`, and `## REMOVED Requirements`
- **FR-050**: Delta-spec template MUST demonstrate requirement-scenario structure with `### Requirement:` and `#### Scenario:` blocks using RFC 2119 normative keywords (SHALL, MUST, SHOULD)

**Delta-spec Template Structure**:
```markdown
# Delta Specification: {{capability}}

## ADDED Requirements
### Requirement: [Name]
The system SHALL...

#### Scenario: [Name]
- **WHEN** [condition]
- **THEN** [outcome]

## MODIFIED Requirements
### Requirement: [Name]
[Full replacement text - replaces existing requirement entirely]

## REMOVED Requirements
### Requirement: [Name]
**Reason**: [Why this requirement is being removed]
**Migration**: [How existing implementations should adapt]
```

#### Transform Agent

The plugin provides a specialized agent for transforming upstream OpenSpec releases into Speck-native artifacts, located at `plugins/changes/agents/transform-openspec.md`:

- **FR-043**: System MUST provide `transform-openspec` agent that orchestrates semantic transformation of upstream OpenSpec releases
- **FR-044**: Transform agent MUST convert AGENTS.md content into the three skill files defined in FR-040 through FR-042
- **FR-045**: Transform agent MUST convert Node.js CLI source files to Bun TypeScript scripts using established patterns (fs/promises → Bun.file, child_process → Bun Shell)
- **FR-046**: Transform agent MUST normalize directory paths from OpenSpec conventions to Speck conventions (see Path Mapping table)
- **FR-047**: Transform agent MUST preserve `<!-- SPECK-EXTENSION -->` blocks in existing files with absolute priority during transformation

| Transformation | Source | Target |
|---------------|--------|--------|
| AI Instructions | `AGENTS.md` | `skills/changes-workflow/*.md` (3 files) |
| CLI Commands | Node.js source files | `scripts/*.ts` (Bun TypeScript) |
| Command Templates | Embedded .md in CLI | `commands/speck-changes.*.md` |
| Directory Paths | `openspec/*` paths | See Path Mapping below |

**Path Mapping** (OpenSpec → Speck):

| OpenSpec Path | Speck Path | Rationale |
|--------------|------------|-----------|
| `openspec/specs/` | `specs/` | Specs at project root for visibility |
| `openspec/changes/` | `.speck/changes/` | Runtime data in .speck |
| `openspec/archive/` | `.speck/archive/` | Runtime data in .speck |
| `openspec/project.md` | `.speck/project.md` | Project config in .speck |

#### Upstream Sync & Transformation

- **FR-001**: System MUST provide `/speck-changes.check-upstream` command that queries OpenSpec GitHub repo (Fission-AI/OpenSpec) and displays available release tags with versions, dates, and release notes
- **FR-002**: System MUST provide `/speck-changes.pull-upstream <version>` command that fetches OpenSpec release from GitHub and stores in `upstream/openspec/<version>/` directory
- **FR-003**: System MUST record pulled release metadata (version, pull date, commit SHA, status) in `upstream/openspec/releases.json` and create/update `upstream/openspec/latest` symlink
- **FR-004**: System MUST provide `/speck-changes.transform-upstream` command that orchestrates transformation of Node.js CLI to Bun TypeScript using specialized agents
- **FR-004a**: Transformation MUST be fully semantic and LLM-driven (matching speckit transformation pattern), not config-based; incompatible upstream versions may require transformation updates
- **FR-004b**: Pull-upstream MUST install OpenSpec CLI in a temp location and extract embedded .md template files, since OpenSpec lacks standalone command files
- **FR-005**: (See FR-047) Transform agent MUST preserve SPECK-EXTENSION blocks during transformation
- **FR-006**: System MUST generate or update tests for transformed scripts in `plugins/changes/tests/`
- **FR-007**: Transformation MUST run TypeScript compilation and ESLint validation on generated code before reporting success; maintainer performs manual review before committing
- **FR-008**: Upstream commands MUST use `gh` CLI authentication when available (via `gh auth token`), falling back to unauthenticated GitHub API with 60 requests/hour limit

#### Change Management Core

- **FR-010**: System MUST provide `/speck-changes.propose <name>` command that creates change folder at `.speck/changes/<name>/` with `proposal.md`, `tasks.md`, and optional `design.md`
- **FR-010a**: Change names MUST be kebab-case only (lowercase letters, numbers, hyphens); system rejects invalid names with specific error message
- **FR-011**: System MUST support delta file format with `## ADDED Requirements`, `## MODIFIED Requirements`, and `## REMOVED Requirements` sections
- **FR-012**: Each requirement in delta files MUST include at least one `#### Scenario:` block using SHALL/MUST language (per RFC 2119 normative keywords)
- **FR-013**: System MUST provide `/speck-changes.list` command to display all active changes with names, dates, and status
- **FR-014**: System MUST provide `/speck-changes.show <name>` command to display change details including proposal, tasks, and deltas
- **FR-015**: System MUST provide `/speck-changes.validate <name>` command that checks proposal structure, delta file formatting (ADDED/MODIFIED/REMOVED sections), and requirement syntax (FR-### IDs, scenario blocks, RFC 2119 normative keywords)
- **FR-016**: System MUST provide `/speck-changes.apply <name>` command that loads tasks from `.speck/changes/<name>/tasks.md` and guides implementation
- **FR-016a**: Apply command MUST mark tasks complete in `tasks.md` as they are finished (changing `[ ]` to `[x]`)
- **FR-016b**: Apply command MUST provide delta file context to Claude when implementing tasks related to spec changes
- **FR-017**: Apply command MUST suggest `/speck-changes.archive <name>` when all tasks are complete

#### Archive & Merge

- **FR-020**: System MUST provide `/speck-changes.archive <name>` command that merges delta files into source specs
- **FR-021**: Archive MUST move completed change folder to `.speck/archive/<name>/` with timestamp
- **FR-022**: Archive MUST warn if incomplete tasks exist and require `--force` flag to proceed
- **FR-023**: System MUST detect conflicting changes when multiple proposals modify the same spec section

#### Migration

- **FR-030**: System MUST provide `/speck-changes.migrate` command that imports existing `openspec/` directory structure
- **FR-031**: Migration MUST convert OpenSpec specs to Speck `specs/` format
- **FR-032**: Migration MUST import OpenSpec changes to `.speck/changes/` preserving metadata
- **FR-033**: Migration MUST validate imported content after conversion

### Key Entities

- **Change Proposal**: A folder in `.speck/changes/<name>/` containing proposal.md, tasks.md, optional design.md, and specs/ delta files representing a proposed modification to the system. Status is determined by folder location: `.speck/changes/` = active, `.speck/archive/` = archived (no separate status field)
- **Delta File**: A markdown file in `.speck/changes/<name>/specs/` showing proposed changes using `## ADDED`, `## MODIFIED`, or `## REMOVED` sections with requirement-scenario pairs
- **Proposal Document**: Markdown file explaining the rationale, scope, and expected outcomes of a proposed change
- **Tasks List**: Markdown file containing implementation checklist for a change proposal
- **Archive**: Directory at `.speck/archive/` containing completed change folders with merged history
- **Release Registry**: JSON file (`upstream/openspec/releases.json`) tracking all pulled OpenSpec releases with metadata
- **Transformation History**: JSON file tracking which upstream source maps to which generated Speck artifacts

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `/speck-changes.check-upstream` completes in under 10 seconds and displays all available release tags
- **SC-002**: `/speck-changes.pull-upstream <version>` completes in under 2 minutes for typical releases (typical = <50 files, <5MB total)
- **SC-003**: `/speck-changes.transform-upstream` completes in under 5 minutes for typical releases (typical = <50 files, <5MB total)
- **SC-004**: `/speck-changes.propose` creates a complete change folder structure in under 5 seconds
- **SC-005**: `/speck-changes.validate` provides actionable feedback for 100% of formatting errors
- **SC-006**: `/speck-changes.archive` successfully merges deltas into source specs without data loss
- **SC-007**: Migration successfully imports 95% of OpenSpec projects without manual intervention (measured against sample of 20 public OpenSpec repos; success = zero validation errors post-migration)
- **SC-008**: All generated commands work correctly in Claude Code environment

## Assumptions

1. **Claude Code Environment**: Commands run in Claude Code with access to Claude for analysis
2. **Bun Runtime**: Bun 1.0+ installed and available in PATH
3. **Upstream Availability**: OpenSpec GitHub repository (Fission-AI/OpenSpec) accessible via HTTPS
4. **Network Access**: Internet connectivity available for fetching upstream releases
5. **File System Permissions**: Write access to create/update `.speck/` and `upstream/` directories
6. **Existing Speck Setup**: Speck is already initialized in the project (`.speck/` exists)

## Dependencies

- **Upstream**: OpenSpec GitHub repository (https://github.com/Fission-AI/OpenSpec)
- **Runtime**: Bun 1.0+ for TypeScript execution
- **Claude**: Claude Code with slash command and agent support
- **Network**: HTTPS access to GitHub for fetching releases
- **Speck Core**: Existing Speck installation (spec 001) for integration

## Out of Scope

The following are explicitly **not** part of this feature:

- **Interactive Dashboard**: OpenSpec's `openspec view` interactive TUI (use list/show commands instead)
- **Multi-tool Integration**: OpenSpec's AGENTS.md generation for other AI tools
- **Init Command**: Speck already has initialization; plugin uses existing setup
- **Bidirectional Sync**: Never sync Speck → OpenSpec (unidirectional only)
- **Slash Command Generation**: OpenSpec's tool-specific slash command generation for Cursor, Copilot, etc.
