# Research: Atomic Transform Rollback

**Feature**: 016-atomic-transform-rollback
**Date**: 2025-11-30

## Research Questions

### Q1: How does the current transform-upstream command work?

**Decision**: The command orchestrates two sequential agents that write directly to production directories.

**Rationale**: The current implementation in `.claude/commands/speck.transform-upstream.md` follows this flow:
1. Validates Bun runtime and resolves upstream version
2. Discovers changed files by diffing previous vs. current upstream
3. Invokes Agent 1 (transform-bash-to-bun) with `OUTPUT_DIR: .speck/scripts/`
4. Invokes Agent 2 (transform-commands) with `OUTPUT_DIR: .claude/commands/`
5. Updates transformation history

**Problem**: If Agent 2 fails after Agent 1 succeeds, transformed scripts exist in production without corresponding command updates.

**Alternatives Considered**:
- Transaction-based database: Overkill for file-based operations
- Git-based rollback: Complex, ties staging to version control

### Q2: What existing atomic file operation patterns exist in the codebase?

**Decision**: Leverage existing `file-ops.ts` module which already implements atomic patterns.

**Rationale**: The codebase has mature file operation utilities:

| Function | Purpose | Pattern |
|----------|---------|---------|
| `createTempDir()` | Create temp directory with prefix | Namespace isolation |
| `removeDirectory()` | Recursive delete with force | Cleanup |
| `atomicMove()` | POSIX atomic rename | Atomic commit |
| `withTempDir()` | Callback with automatic cleanup | Lifecycle management |
| `atomicWrite()` | Temp file + rename | Atomic file creation |
| `copyDirectory()` | Recursive copy via Bun Shell | Staging population |

**Key Insight**: `atomicMove()` already exists and handles the core atomic rename operation. The new staging manager should compose these existing primitives.

### Q3: What staging directory structure should be used?

**Decision**: Use `.speck/.transform-staging/<version>/` with subdirectories mirroring production structure.

**Rationale**:
- Version-specific directories prevent collisions between concurrent transformations
- Subdirectory structure (scripts/, commands/, agents/, skills/) mirrors production targets
- Metadata file (staging.json) enables orphan detection and recovery
- Location inside `.speck/` keeps staging artifacts out of user-visible directories

**Structure**:
```
.speck/.transform-staging/v2.1.0/
├── staging.json          # {status, startTime, version, agentResults}
├── scripts/
├── commands/
├── agents/
└── skills/
```

**Alternatives Considered**:
- System temp directory (`/tmp/`): Cross-filesystem moves aren't atomic; harder to detect orphans
- Single flat staging directory: No version isolation, harder to track multiple attempts
- Staging inside `upstream/`: Conceptual mismatch (upstream is source, not working area)

### Q4: How should orphaned staging directories be detected and recovered?

**Decision**: Check for existing staging directories at command startup; use metadata to determine state.

**Rationale**:
- Any directory in `.speck/.transform-staging/` at startup indicates incomplete transformation
- `staging.json` metadata contains:
  - `status`: "staging" | "agent1-complete" | "agent2-complete" | "ready" | "committing"
  - `startTime`: When staging began (for timeout detection)
  - `agentResults`: Results from each agent (for resume/inspect)

**Recovery Options**:
1. **Commit**: If status is "ready" or "agent2-complete", can safely commit
2. **Rollback**: Delete staging directory, preserve production
3. **Inspect**: Display staging contents and metadata for manual decision

**Alternatives Considered**:
- Lock files: Race conditions still possible; doesn't help with crash recovery
- Process ID tracking: PID reuse makes this unreliable
- Timeout-based cleanup: Too aggressive; user may want to inspect/recover

### Q5: How should file conflicts during commit be handled?

**Decision**: Record production file mtimes at staging start; warn before overwriting changed files.

**Rationale**:
- Recording mtimes at staging start creates a baseline
- At commit time, compare current mtimes to recorded values
- Changed files indicate concurrent modification (rare but possible)
- Warning allows user to inspect changes before proceeding

**Implementation**:
```typescript
interface StagingMetadata {
  productionBaseline: Record<string, {
    mtime: number;
    exists: boolean;
  }>;
}
```

**Alternatives Considered**:
- Checksum comparison: Slower, unnecessary since mtime changes on any modification
- Git integration: Adds dependency, complicates non-git usage
- No conflict detection: Silently overwriting changed files is unsafe

### Q6: What transformation status states are needed?

**Decision**: Extend existing status values with staging-specific states.

**Current states**: `transformed` | `failed` | `partial`

**New states**:
- `staging`: Transformation in progress, writing to staging directory
- `committing`: Staging complete, moving files to production
- `rolled-back`: Staging was deleted due to failure or user request

**Rationale**: Explicit states enable:
- Clear status reporting to users
- Accurate history tracking
- Recovery decision-making for orphaned staging

## Technology Decisions

### POSIX Atomic Rename Semantics

**Decision**: Rely on POSIX `rename()` guarantees for atomic file moves.

**Rationale**: On POSIX systems (macOS, Linux), `rename()` is atomic when source and destination are on the same filesystem. This is the standard pattern for atomic file operations.

**Constraint**: Staging directory MUST be on the same filesystem as production directories. Since both are inside the repository (`.speck/` and `.claude/`), this is guaranteed.

### Zod Schemas for Metadata

**Decision**: Use Zod for validating staging metadata JSON.

**Rationale**:
- Consistent with existing codebase patterns (Zod used throughout)
- Runtime validation catches corrupted or manually-edited metadata
- TypeScript type inference reduces boilerplate

### Error Handling Strategy

**Decision**: Fail fast with detailed error messages; always attempt cleanup.

**Rationale**:
- Transformation is not latency-sensitive; safety over speed
- Detailed errors help diagnose issues
- Cleanup on error prevents accumulating orphaned staging directories

## References

- [.speck/scripts/common/file-ops.ts](../../.speck/scripts/common/file-ops.ts) - Existing atomic operations
- [.speck/scripts/common/transformation-history.ts](../../.speck/scripts/common/transformation-history.ts) - Status tracking
- [.claude/commands/speck.transform-upstream.md](../../.claude/commands/speck.transform-upstream.md) - Current command
- [.claude/agents/speck.transform-bash-to-bun.md](../../.claude/agents/speck.transform-bash-to-bun.md) - Agent 1
- [.claude/agents/speck.transform-commands.md](../../.claude/agents/speck.transform-commands.md) - Agent 2
