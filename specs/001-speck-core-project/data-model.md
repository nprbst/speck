# Data Model: Speck - Claude Code-Optimized Specification Framework

**Branch**: `001-speck-core-project` | **Date**: 2025-11-15 | **Plan**: [plan.md](plan.md)

This document defines the core entities, their fields, relationships, validation rules, and state transitions for the Speck system.

---

## Entity: Feature

Represents a development feature with associated metadata for tracking and organization.

### Fields

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `number` | integer | Yes | 3-digit zero-padded feature number (e.g., 001, 042) | Must be unique, auto-incremented, range: 001-999 |
| `shortName` | string | Yes | Kebab-case short name (2-4 words) extracted from description | Max length: adjusted to keep branch name ≤244 chars; auto-append collision counter if duplicate; truncate at word boundaries with hash suffix if needed |
| `branchName` | string | Yes | Git branch name: `{number}-{shortName}` | Format: `\d{3}-[a-z0-9-]+`; max 244 characters (git limit) |
| `description` | string | Yes | Full natural language feature description | Min 10 characters, max 1000 characters |
| `directoryPath` | string | Yes | Absolute path to feature's specs directory | Format: `specs/{number}-{shortName}/` |
| `createdAt` | timestamp | Yes | ISO 8601 timestamp of feature creation | ISO 8601 format (e.g., 2025-11-15T14:30:00Z) |
| `status` | enum | Yes | Current feature lifecycle status | One of: `draft`, `clarifying`, `planning`, `ready_for_implementation`, `implementing`, `completed` |
| `worktreePath` | string | No | Absolute path to worktree directory (if worktree mode used) | Must be valid directory path outside main repo |

### Relationships
- **One Feature** has **one Specification** (1:1)
- **One Feature** has **zero or one ImplementationPlan** (1:0..1)
- **One Feature** has **zero or more Clarifications** (1:*)

### State Transitions
```
draft → clarifying → planning → ready_for_implementation → implementing → completed
  ↓         ↓           ↓              ↓                      ↓
  └─────────┴───────────┴──────────────┴──────────────────────┘
         (can transition back to earlier states for rework)
```

**Transition Rules**:
- `draft → clarifying`: When `/speck.clarify` is invoked
- `clarifying → planning`: When all `[NEEDS CLARIFICATION]` markers resolved
- `planning → ready_for_implementation`: When plan.md generated and Constitution Check passes
- `ready_for_implementation → implementing`: When `/speck.implement` begins
- `implementing → completed`: When all tasks in tasks.md marked complete

---

## Entity: Specification

A structured markdown document describing what users need and why, without implementation details.

### Fields

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `featureNumber` | integer | Yes | Reference to parent Feature | Must match existing Feature.number |
| `filePath` | string | Yes | Absolute path to spec.md file | Format: `specs/{number}-{shortName}/spec.md` |
| `createdAt` | timestamp | Yes | ISO 8601 timestamp of spec creation | ISO 8601 format |
| `lastModifiedAt` | timestamp | Yes | ISO 8601 timestamp of last modification | ISO 8601 format; must be ≥ createdAt |
| `userScenarios` | array[UserScenario] | Yes | Prioritized list of user stories | Min 1 scenario; each must have priority (P1, P2, etc.) |
| `requirements` | object | Yes | Functional and non-functional requirements | Must contain `functional` array and optional `nonFunctional` array |
| `successCriteria` | array[SuccessCriterion] | Yes | Measurable, technology-agnostic success metrics | Min 3 criteria; each must be measurable and user-focused |
| `clarificationMarkers` | array[string] | No | Locations of `[NEEDS CLARIFICATION]` markers | Max 3 markers; extracted via regex `\[NEEDS CLARIFICATION\]` |
| `assumptions` | array[string] | Yes | Documented assumptions about environment, users, or constraints | Min 1 assumption |
| `dependencies` | array[Dependency] | No | External dependencies required for feature | Each must specify type (upstream, runtime, version) |
| `outOfScope` | array[string] | Yes | Explicitly excluded features or capabilities | Min 1 out-of-scope item |
| `qualityCheckPassed` | boolean | Yes | Whether spec passed automated quality validation | Defaults to `false`; set to `true` when validation succeeds |

### Validation Rules (Quality Gates)
- **No implementation details**: Spec content must NOT mention frameworks, languages, databases, or specific APIs (SC-002)
- **Testable requirements**: Each functional requirement must have corresponding acceptance scenario
- **Technology-agnostic success criteria**: Success criteria must focus on user outcomes, not system internals
- **Mandatory sections**: Must include User Scenarios, Requirements, Success Criteria, Assumptions, Out of Scope
- **Clarification limit**: Max 3 `[NEEDS CLARIFICATION]` markers (FR-006)

### Relationships
- **One Specification** belongs to **one Feature** (1:1)
- **One Specification** has **zero or more Clarifications** (1:*)

---

## Entity: UserScenario

Represents an independently testable user story or journey.

### Fields

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `title` | string | Yes | User story title | Max 100 characters |
| `description` | string | Yes | Full user story narrative | Min 50 characters |
| `priority` | enum | Yes | Priority level | One of: `P1` (critical), `P2` (important), `P3` (nice-to-have), `P4` (future) |
| `whyThisPriority` | string | Yes | Rationale for priority assignment | Min 20 characters |
| `independentTest` | string | Yes | How to test this story independently | Must describe standalone test scenario |
| `acceptanceScenarios` | array[AcceptanceScenario] | Yes | Given-When-Then acceptance criteria | Min 1 scenario |

### Validation Rules
- Each scenario must be independently implementable as viable MVP
- Priority must reflect importance (P1 = highest)
- Independent test must demonstrate standalone value

---

## Entity: AcceptanceScenario

Given-When-Then format acceptance criteria for a user scenario.

### Fields

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `given` | string | Yes | Precondition/context | Starts with "Given"; min 10 characters |
| `when` | string | Yes | User action/trigger | Starts with "When"; min 10 characters |
| `then` | string | Yes | Expected outcome | Starts with "Then"; min 10 characters |

---

## Entity: Clarification

A question-answer pair resolving ambiguous requirements in a specification.

### Fields

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `featureNumber` | integer | Yes | Reference to parent Feature | Must match existing Feature.number |
| `sessionDate` | date | Yes | Date of clarification session | Format: YYYY-MM-DD |
| `question` | string | Yes | Clarification question asked by system | Min 20 characters; must end with `?` |
| `answer` | string | Yes | User-provided or selected answer | Min 10 characters |
| `resolvedMarkerLocation` | string | No | Location in spec where marker was resolved | File path + line number (e.g., "spec.md:42") |

### Validation Rules
- Max 5 questions per clarification session (SC-007)
- 90% of specs should require only 1 session (SC-007)

### Relationships
- **One Clarification** belongs to **one Feature** (1:1)
- **One Clarification** resolves **one Specification** ambiguity (1:1)

---

## Entity: ImplementationPlan

The plan.md artifact generated by `/speck.plan` command.

### Fields

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `featureNumber` | integer | Yes | Reference to parent Feature | Must match existing Feature.number |
| `filePath` | string | Yes | Absolute path to plan.md file | Format: `specs/{number}-{shortName}/plan.md` |
| `createdAt` | timestamp | Yes | ISO 8601 timestamp of plan creation | ISO 8601 format |
| `technicalContext` | object | Yes | Technology choices and constraints | Must NOT have any "NEEDS CLARIFICATION" values after research.md generated |
| `constitutionCheckResult` | enum | Yes | Result of constitutional principle validation | One of: `PASS`, `PASS_WITH_JUSTIFICATION`, `FAIL` |
| `researchFilePath` | string | Yes | Path to research.md (Phase 0 output) | Format: `specs/{number}-{shortName}/research.md` |
| `dataModelFilePath` | string | Yes | Path to data-model.md (Phase 1 output) | Format: `specs/{number}-{shortName}/data-model.md` |
| `contractsDirectoryPath` | string | Yes | Path to contracts/ directory (Phase 1 output) | Format: `specs/{number}-{shortName}/contracts/` |
| `quickstartFilePath` | string | Yes | Path to quickstart.md (Phase 1 output) | Format: `specs/{number}-{shortName}/quickstart.md` |

### Validation Rules (Quality Gates)
- Constitution Check must PASS before proceeding to Phase 0
- All NEEDS CLARIFICATION items in Technical Context must be resolved before Phase 1
- Phase 1 artifacts must be generated before Phase 2 (tasks.md)

### Relationships
- **One ImplementationPlan** belongs to **one Feature** (1:1)

---

## Entity: UpstreamTracker

Tracks synchronization state with upstream spec-kit repository.

### Fields

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `lastSyncedCommit` | string | Yes | SHA of last synced upstream commit | Must be valid git SHA (40 hex characters) |
| `lastSyncDate` | timestamp | Yes | ISO 8601 timestamp of last successful sync | ISO 8601 format |
| `upstreamRepo` | string | Yes | URL of upstream repository | Must be valid git URL; default: `https://github.com/github/spec-kit` |
| `upstreamBranch` | string | Yes | Tracked upstream branch name | Default: `main` |
| `currentVersion` | string | Yes | Semantic version of last synced release | Format: `vX.Y.Z` (semver) |
| `syncedFiles` | array[SyncedFile] | Yes | Per-file sync tracking | Min 1 file |
| `status` | enum | Yes | Overall sync status | One of: `synced`, `out_of_sync`, `syncing`, `conflict` |

### Validation Rules
- File stored at `.speck/upstream-tracker.json`
- lastSyncedCommit must be verifiable against upstream repo
- syncedFiles array must include all tracked files

---

## Entity: SyncedFile

Tracks synchronization state for a single file from upstream.

### Fields

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `upstreamPath` | string | Yes | Path in upstream spec-kit repo | Relative path from repo root |
| `speckPaths` | array[string] | Yes | Corresponding paths in Speck | Min 1 path; relative from repo root |
| `lastUpstreamHash` | string | Yes | SHA256 hash of last synced upstream file content | Must be valid SHA256 (64 hex characters) |
| `syncStatus` | enum | Yes | File-level sync status | One of: `synced`, `modified`, `conflict`, `skipped` |
| `lastSyncDate` | timestamp | Yes | ISO 8601 timestamp of last sync for this file | ISO 8601 format |

---

## Entity: ExtensionMarker

Identifies and protects Speck-specific code blocks during upstream sync.

### Fields

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `name` | string | Yes | Unique identifier for extension | Kebab-case; max 50 characters |
| `filePath` | string | Yes | Path to file containing extension | Relative from repo root |
| `startLine` | integer | Yes | Line number of `[SPECK-EXTENSION:START]` marker | Must be > 0 |
| `endLine` | integer | Yes | Line number of `[SPECK-EXTENSION:END]` marker | Must be > startLine |
| `description` | string | No | Optional description of extension purpose | Max 200 characters |
| `preservationStatus` | enum | Yes | Whether extension was preserved in last sync | One of: `preserved`, `modified`, `removed`, `conflict` |

### Validation Rules (NON-NEGOTIABLE)
- Extension markers MUST use format: `<!-- [SPECK-EXTENSION:START] {name} -->` and `<!-- [SPECK-EXTENSION:END] {name} -->`
- Markers must be balanced (every START has corresponding END)
- Nested markers are prohibited
- Content within markers MUST NOT be modified by upstream sync transformations (Constitution II)

---

## Entity: Worktree

An isolated git working directory for parallel feature development.

### Fields

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `featureNumber` | integer | Yes | Reference to parent Feature | Must match existing Feature.number |
| `path` | string | Yes | Absolute path to worktree directory | Must be outside main repo; must be valid directory |
| `branchName` | string | Yes | Git branch name for this worktree | Format: `\d{3}-[a-z0-9-]+` |
| `createdAt` | timestamp | Yes | ISO 8601 timestamp of worktree creation | ISO 8601 format |
| `specsAccessMode` | enum | Yes | How worktree accesses specs directory | One of: `shared_git_tracked` (naturally shared via git), `symlinked` (symlink from main repo if specs/ is gitignored) |

### Validation Rules
- Worktree path must not overlap with other worktrees
- Worktree must have dedicated feature branch
- Specs access mode determined by checking if `specs/` is git-tracked (FR-017)

### Relationships
- **One Worktree** belongs to **one Feature** (1:1)

---

## Entity: BashScriptReimplementation

TypeScript CLI equivalent of infrastructure bash scripts.

### Fields

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| `scriptName` | string | Yes | Original bash script filename | One of: `check-prerequisites.sh`, `setup-plan.sh`, `update-agent-context.sh`, `create-new-feature.sh` |
| `cliCommand` | string | Yes | Bun CLI equivalent command | Format: `bun run cli.ts {command}` |
| `wrapperPath` | string | Yes | Path to bash wrapper script | Format: `.specify/scripts/bash/{scriptName}` |
| `implementationPath` | string | Yes | Path to TypeScript implementation | Format: `src/cli/{command}.ts` or similar |
| `compatibilityStatus` | enum | Yes | Behavioral compatibility with bash version | One of: `100%_compatible`, `partial`, `not_implemented` |
| `startupTime` | integer | No | Measured CLI startup time in milliseconds | Must be ≤100ms (SC-005) |

### Validation Rules
- Bash wrapper must pass all arguments transparently to Bun CLI
- JSON output (--json flag) must be byte-for-byte identical to bash version (SC-005)
- Exit codes must match bash version exactly (FR-021)
- Slash commands require zero modifications (FR-019)

---

## Entity Relationship Diagram (Summary)

```
Feature (1) ──── (1) Specification
   │                    │
   │                    └─── (*) Clarification
   │
   ├─── (0..1) ImplementationPlan
   │              │
   │              ├─── (1) research.md
   │              ├─── (1) data-model.md
   │              ├─── (1) contracts/
   │              └─── (1) quickstart.md
   │
   └─── (0..1) Worktree

UpstreamTracker (1) ──── (*) SyncedFile

ExtensionMarker (global collection, file-based detection)

BashScriptReimplementation (4 fixed scripts)
```

---

## Storage & Persistence

All entities are stored as **file-based artifacts** (markdown and JSON) in the following structure:

```
specs/{number}-{shortName}/
├── spec.md                    # Specification entity
├── plan.md                    # ImplementationPlan entity
├── research.md                # Phase 0 research output
├── data-model.md              # Phase 1 data model output (this file)
├── quickstart.md              # Phase 1 quickstart guide
├── contracts/                 # Phase 1 API contracts (JSON schemas)
│   ├── specify.schema.json
│   └── transform-upstream.schema.json
└── tasks.md                   # Phase 2 tasks (generated by /speckit.tasks, not /speckit.plan)

.speck/
├── upstream-tracker.json      # UpstreamTracker entity
└── sync-reports/
    └── {date}-report.md       # Sync reports

.specify/
├── memory/
│   └── constitution.md        # Constitutional principles
├── scripts/
│   └── bash/                  # BashScriptReimplementation wrappers
└── templates/                 # Markdown templates
```

**Persistence Strategy**:
- **Features**: Tracked via git branches + directory existence in `specs/`
- **Specifications**: Markdown files (`spec.md`) with frontmatter metadata
- **Clarifications**: Embedded in spec.md under `## Clarifications` section
- **ImplementationPlans**: Markdown files (`plan.md`)
- **UpstreamTracker**: JSON file (`.speck/upstream-tracker.json`)
- **ExtensionMarkers**: Detected dynamically via marker comments in markdown/code files
- **Worktrees**: Managed via git worktree commands; metadata tracked in git's worktree state

---

## Validation Summary

| Entity | Gate Type | Trigger | Success Criteria |
|--------|-----------|---------|------------------|
| Specification | Quality Gate | Before planning | No implementation details, testable requirements, ≤3 clarification markers, 95% first-pass success (SC-003) |
| ImplementationPlan | Constitution Check | Before Phase 0 research | All 7 constitutional principles PASS or PASS_WITH_JUSTIFICATION |
| UpstreamTracker | Sync Validation | After transformation | 100% extension preservation (SC-004), type checks pass, tests pass |
| ExtensionMarker | Preservation Validation | During sync | 100% of markers preserved (Constitution II, non-negotiable) |
| BashScriptReimplementation | Compatibility Validation | Before wrapper deployment | Byte-for-byte JSON output match, identical exit codes, <100ms startup (SC-005) |

---

This data model provides the foundation for Phase 1 contract generation and Phase 2 task planning.
