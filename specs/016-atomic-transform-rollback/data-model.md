# Data Model: Atomic Transform Rollback

**Feature**: 016-atomic-transform-rollback
**Date**: 2025-11-30

## Entity Definitions

### StagingContext

Represents an active staging session for a transformation operation.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `rootDir` | `string` | Absolute path to staging directory | Must be `.speck/.transform-staging/<version>/` |
| `scriptsDir` | `string` | Path to scripts subdirectory | `${rootDir}/scripts/` |
| `commandsDir` | `string` | Path to commands subdirectory | `${rootDir}/commands/` |
| `agentsDir` | `string` | Path to agents subdirectory | `${rootDir}/agents/` |
| `skillsDir` | `string` | Path to skills subdirectory | `${rootDir}/skills/` |
| `targetVersion` | `string` | Upstream version being transformed | Semantic version string |
| `metadata` | `StagingMetadata` | Persisted staging state | Stored in `${rootDir}/staging.json` |

**Derived Paths**:
- Production scripts target: `.speck/scripts/`
- Production commands target: `.claude/commands/`
- Production agents target: `.claude/agents/`
- Production skills target: `.claude/skills/`

---

### StagingMetadata

Persisted metadata for staging directory state, stored in `staging.json`.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `status` | `StagingStatus` | Current staging phase | Enum value |
| `startTime` | `string` | ISO 8601 timestamp of staging start | Must be valid ISO date |
| `targetVersion` | `string` | Upstream version being transformed | Matches directory name |
| `previousVersion` | `string \| null` | Previous successful transformation version | `null` for first transformation |
| `agentResults` | `AgentResults` | Results from agent executions | Updated as agents complete |
| `productionBaseline` | `ProductionBaseline` | File state snapshot at staging start | For conflict detection |

---

### StagingStatus

Enum representing the current phase of a staging operation.

| Value | Description | Valid Transitions |
|-------|-------------|-------------------|
| `staging` | Initial state, staging directory created | → `agent1-complete`, `failed` |
| `agent1-complete` | Agent 1 finished writing to staging | → `agent2-complete`, `failed` |
| `agent2-complete` | Agent 2 finished writing to staging | → `ready`, `failed` |
| `ready` | All agents complete, ready to commit | → `committing`, `rolled-back` |
| `committing` | Files being moved to production | → `committed`, `failed` |
| `committed` | Successfully committed (terminal) | (none) |
| `failed` | Transformation failed (terminal) | (none) |
| `rolled-back` | Manually or automatically rolled back (terminal) | (none) |

**State Machine**:
```
                     ┌─────────────────────────────────────────┐
                     │                                         │
                     ▼                                         │
  ┌─────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────┴───┐
  │ staging │──│ agent1-complete │──│ agent2-complete │──│  ready  │
  └────┬────┘  └───────┬─────────┘  └───────┬─────────┘  └────┬────┘
       │               │                    │                 │
       │               │                    │                 │
       ▼               ▼                    ▼                 ▼
  ┌────────┐      ┌────────┐          ┌────────┐        ┌───────────┐
  │ failed │      │ failed │          │ failed │        │ committing│
  └────────┘      └────────┘          └────────┘        └─────┬─────┘
                                                              │
                                           ┌──────────────────┼──────────────────┐
                                           ▼                  ▼                  ▼
                                      ┌─────────┐        ┌────────┐        ┌───────────┐
                                      │committed│        │ failed │        │rolled-back│
                                      └─────────┘        └────────┘        └───────────┘
```

---

### AgentResults

Results from agent executions, used for recovery and inspection.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `agent1` | `AgentResult \| null` | Agent 1 (bash-to-bun) results | `null` until agent completes |
| `agent2` | `AgentResult \| null` | Agent 2 (commands) results | `null` until agent completes |

**AgentResult**:

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether agent completed successfully |
| `filesWritten` | `string[]` | List of files written to staging |
| `error` | `string \| null` | Error message if failed |
| `duration` | `number` | Execution time in milliseconds |

---

### ProductionBaseline

Snapshot of production file state at staging start, used for conflict detection.

| Field | Type | Description |
|-------|------|-------------|
| `files` | `Record<string, FileBaseline>` | Map of production file paths to their baseline state |
| `capturedAt` | `string` | ISO 8601 timestamp when baseline was captured |

**FileBaseline**:

| Field | Type | Description |
|-------|------|-------------|
| `exists` | `boolean` | Whether file existed at baseline |
| `mtime` | `number \| null` | Modification time (ms since epoch), `null` if didn't exist |
| `size` | `number \| null` | File size in bytes, `null` if didn't exist |

---

### StagedFile

Represents a file in staging with its source and destination paths.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `stagingPath` | `string` | Absolute path in staging directory | Must be under `StagingContext.rootDir` |
| `productionPath` | `string` | Target path in production directory | Must be in allowed production directories |
| `category` | `FileCategory` | Type of file | `scripts` \| `commands` \| `agents` \| `skills` |
| `relativePath` | `string` | Path relative to category directory | e.g., `check-prerequisites.ts` |

**FileCategory Enum**:

| Value | Staging Dir | Production Dir |
|-------|-------------|----------------|
| `scripts` | `.speck/.transform-staging/<v>/scripts/` | `.speck/scripts/` |
| `commands` | `.speck/.transform-staging/<v>/commands/` | `.claude/commands/` |
| `agents` | `.speck/.transform-staging/<v>/agents/` | `.claude/agents/` |
| `skills` | `.speck/.transform-staging/<v>/skills/` | `.claude/skills/` |

---

### TransformationStatus (Extended)

Extension to existing transformation history status tracking.

| Field | Type | Description | New/Existing |
|-------|------|-------------|--------------|
| `version` | `string` | Upstream version | Existing |
| `status` | `string` | Transformation outcome | Extended enum |
| `timestamp` | `string` | ISO 8601 timestamp | Existing |
| `error` | `string \| null` | Error message if failed | Existing |
| `stagingId` | `string \| null` | Staging directory name if applicable | **New** |
| `filesCommitted` | `string[] \| null` | List of committed files | **New** |
| `rollbackReason` | `string \| null` | Why rollback occurred | **New** |

**Extended Status Values**:
- `transformed` - Successfully committed (existing)
- `failed` - Failed at any stage (existing, add detail)
- `partial` - Partially complete (existing)
- `rolled-back` - Explicitly rolled back (**new**)

---

## Relationships

```
StagingContext
    │
    ├── contains → StagingMetadata (1:1, stored in staging.json)
    │                   │
    │                   ├── contains → AgentResults (1:1)
    │                   │                   │
    │                   │                   └── contains → AgentResult[] (1:N)
    │                   │
    │                   └── contains → ProductionBaseline (1:1)
    │                                       │
    │                                       └── contains → FileBaseline[] (1:N)
    │
    └── contains → StagedFile[] (1:N)

TransformationHistory
    │
    └── contains → TransformationStatus[] (1:N, one per version attempt)
```

---

## Validation Rules

### StagingContext

1. `rootDir` MUST start with `.speck/.transform-staging/`
2. `targetVersion` MUST be a valid directory name (no `/`, `\`, `:`, etc.)
3. All subdirectories MUST be children of `rootDir`

### StagingMetadata

1. `status` MUST be a valid `StagingStatus` enum value
2. `startTime` MUST be a valid ISO 8601 timestamp
3. `targetVersion` MUST match the directory name
4. `productionBaseline` MUST be captured before any agent runs

### StagedFile

1. `stagingPath` MUST exist as a file (not directory)
2. `productionPath` MUST be in one of the allowed production directories
3. `category` MUST match the subdirectory containing the file

### State Transitions

1. Status MUST only transition along valid paths in state machine
2. Terminal states (`committed`, `failed`, `rolled-back`) MUST NOT transition
3. `agent1-complete` MUST have non-null `agentResults.agent1`
4. `agent2-complete` MUST have non-null `agentResults.agent1` and `agentResults.agent2`
5. `ready` MUST have both agents with `success: true`
