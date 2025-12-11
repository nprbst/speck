# Data Model: OpenSpec Changes Plugin

**Date**: 2025-12-07
**Feature**: 019-openspec-changes-plugin

## Entities

### ChangeProposal

A folder in `.speck/changes/<name>/` representing a proposed modification to the system.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Kebab-case identifier (e.g., `add-user-auth`) |
| location | enum | `active` (`.speck/changes/`) or `archived` (`.speck/archive/`) |
| createdAt | ISO date | When proposal was created |
| proposal | ProposalDocument | The proposal.md content |
| tasks | TasksList | The tasks.md content |
| design | DesignDocument? | Optional design.md content |
| deltas | DeltaFile[] | Spec delta files in `specs/` subdirectory |

**Validation Rules**:
- `name` must be kebab-case: `/^[a-z0-9]+(-[a-z0-9]+)*$/`
- `name` must not conflict with existing change or archive
- `location` is determined by folder path, not stored field

**State Transitions**:
```
[created] → active → archived
                ↑
                └── (can be restored with --force)
```

---

### ProposalDocument

Markdown file explaining the rationale, scope, and expected outcomes.

| Field | Type | Description |
|-------|------|-------------|
| title | string | Change proposal title |
| summary | string | Brief description of the change |
| rationale | string | Why this change is needed |
| scope | string[] | List of affected areas/specs |
| expectedOutcome | string | What success looks like |

**File**: `.speck/changes/<name>/proposal.md`

---

### TasksList

Markdown file containing implementation checklist.

| Field | Type | Description |
|-------|------|-------------|
| tasks | Task[] | Ordered list of implementation tasks |

**Nested: Task**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Task identifier (e.g., `T001`) |
| description | string | What needs to be done |
| status | enum | `pending`, `in_progress`, `completed` |

**File**: `.speck/changes/<name>/tasks.md`

---

### DesignDocument

Optional markdown file for technical decisions.

| Field | Type | Description |
|-------|------|-------------|
| decisions | Decision[] | Key technical decisions |
| alternatives | Alternative[] | Alternatives considered |

**File**: `.speck/changes/<name>/design.md`

---

### DeltaFile

Specification file showing proposed changes to an existing spec.

| Field | Type | Description |
|-------|------|-------------|
| specName | string | Name of the affected spec |
| addedRequirements | Requirement[] | New requirements to add |
| modifiedRequirements | ModifiedRequirement[] | Changed requirements |
| removedRequirements | RemovedRequirement[] | Requirements to remove |

**Nested: Requirement**

| Field | Type | Description |
|-------|------|-------------|
| id | string? | Optional requirement ID |
| title | string | Requirement title |
| description | string | Requirement details |
| scenarios | Scenario[] | Acceptance scenarios |

**Nested: ModifiedRequirement**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Requirement being modified |
| before | string | Original text |
| after | string | New text |

**Nested: RemovedRequirement**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Requirement being removed |
| reason | string | Why it's being removed |

**Nested: Scenario**

| Field | Type | Description |
|-------|------|-------------|
| name | string | Scenario name |
| given | string | Precondition |
| when | string | Action |
| then | string | Expected outcome |

**File**: `.speck/changes/<name>/specs/<spec-name>.md`

---

### ReleaseRegistry

JSON file tracking all pulled OpenSpec releases.

| Field | Type | Description |
|-------|------|-------------|
| releases | Release[] | List of pulled releases |
| latestVersion | string | Currently active version |

**Nested: Release**

| Field | Type | Description |
|-------|------|-------------|
| version | string | Semver version (e.g., `v0.16.0`) |
| pullDate | ISO date | When release was pulled |
| commitSha | string | Git commit SHA |
| status | enum | `active`, `superseded` |
| releaseDate | ISO date | Original release date |
| releaseNotes | string | Summary from GitHub |

**File**: `upstream/openspec/releases.json`

---

### TransformationHistory

JSON file tracking source-to-artifact mappings.

| Field | Type | Description |
|-------|------|-------------|
| version | string | OpenSpec version transformed |
| transformDate | ISO date | When transformation ran |
| artifacts | Artifact[] | Generated files |

**Nested: Artifact**

| Field | Type | Description |
|-------|------|-------------|
| source | string | Upstream source path |
| target | string | Generated target path |
| type | enum | `script`, `command`, `template` |
| rationale | string | Claude's transformation rationale |

**File**: `.speck/plugins/speck-changes/transform-history.json`

---

## Directory Structure

```text
.speck/
├── changes/                          # Active proposals
│   └── <name>/
│       ├── proposal.md               # ProposalDocument
│       ├── tasks.md                  # TasksList
│       ├── design.md                 # DesignDocument (optional)
│       └── specs/                    # Delta files
│           └── <spec-name>.md        # DeltaFile
├── archive/                          # Completed proposals
│   └── <name>/                       # Same structure as changes/
└── plugins/
    └── speck-changes/
        ├── plugin.json               # Plugin manifest
        ├── scripts/                   # TypeScript implementations
        ├── templates/                 # Proposal templates
        └── transform-history.json    # TransformationHistory

upstream/
└── openspec/
    ├── releases.json                 # ReleaseRegistry
    ├── latest -> v0.16.0/            # Symlink to active
    └── v0.16.0/                      # Pristine release files
```

## Validation Schemas (Zod)

```typescript
import { z } from 'zod';

export const ChangeNameSchema = z.string().regex(
  /^[a-z0-9]+(-[a-z0-9]+)*$/,
  'Change name must be kebab-case (lowercase letters, numbers, hyphens)'
);

export const ScenarioSchema = z.object({
  name: z.string().min(1),
  given: z.string().min(1),
  when: z.string().min(1),
  then: z.string().min(1),
});

export const RequirementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  scenarios: z.array(ScenarioSchema).min(1),
});

export const DeltaFileSchema = z.object({
  specName: z.string().min(1),
  addedRequirements: z.array(RequirementSchema).default([]),
  modifiedRequirements: z.array(z.object({
    id: z.string(),
    before: z.string(),
    after: z.string(),
  })).default([]),
  removedRequirements: z.array(z.object({
    id: z.string(),
    reason: z.string().min(1),
  })).default([]),
});

export const ReleaseSchema = z.object({
  version: z.string().regex(/^v\d+\.\d+\.\d+$/),
  pullDate: z.string().datetime(),
  commitSha: z.string().length(40),
  status: z.enum(['active', 'superseded']),
  releaseDate: z.string().datetime(),
  releaseNotes: z.string(),
});

export const ReleaseRegistrySchema = z.object({
  releases: z.array(ReleaseSchema),
  latestVersion: z.string(),
});
```
