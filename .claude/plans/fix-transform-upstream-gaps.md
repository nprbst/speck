# Analysis: Weaknesses and Gaps in `speck.transform-upstream.md`

## Executive Summary

After reviewing spec 001 (the original intent), the current `speck.transform-upstream.md` command, the two transformation agents, and the transformation history showing 3 successful transformations (v0.0.83 → v0.0.84 → v0.0.85), I've identified the key gap that needs addressing:

**Atomic rollback is promised but not implemented.**

---

## The Problem: No Atomic Rollback

**Spec 001 Intent** (FR-012):
> "System MUST perform atomic operations - either full command succeeds or nothing changes (no partial state)"

**Transform-upstream.md States**:
> "If Agent 2 fails → rollback Agent 1 changes, status updated to 'failed'"
> "Agents should use temp directories and atomic moves to ensure this property."

**Current Reality**:
1. `transformation-history.ts` has `writeHistory()` with atomic write (temp file + rename) - good
2. But there's no mechanism to rollback **file system changes** made by Agent 1 if Agent 2 fails
3. If Agent 1 transforms bash → TypeScript in `.speck/scripts/`, then Agent 2 fails, the scripts remain transformed but commands aren't updated = broken state

---

## Proposed Solution: Staged Transformation with Rollback

### Architecture Overview

```
Transform Workflow:
1. Create staging directory: .speck/.transform-staging/<version>/
2. Agent 1: Write transformed scripts to staging/scripts/
3. Agent 2: Write transformed commands to staging/commands/
4. If both succeed: Atomic move from staging → production directories
5. If either fails: Delete staging directory (no changes to production)
6. Clean up staging directory
```

### Implementation Plan

#### 1. Add Staging Manager (`transformation-staging.ts`)

New file: `.speck/scripts/common/transformation-staging.ts`

```typescript
interface StagingContext {
  stagingDir: string;           // .speck/.transform-staging/v0.0.86/
  scriptsDir: string;           // .speck/.transform-staging/v0.0.86/scripts/
  commandsDir: string;          // .speck/.transform-staging/v0.0.86/commands/
  version: string;
}

// Create staging directories
async function createStagingContext(version: string): Promise<StagingContext>

// Copy a file to staging (for modifications)
async function stageFile(ctx: StagingContext, targetPath: string): Promise<string>

// Commit: Move all staged files to production
async function commitStaging(ctx: StagingContext): Promise<void>

// Rollback: Delete staging directory
async function rollbackStaging(ctx: StagingContext): Promise<void>

// Check if staging exists (for recovery)
async function hasActiveStaging(): Promise<StagingContext | null>
```

#### 2. Update Transform-Upstream Command

Modify `.claude/commands/speck.transform-upstream.md` to:

1. **Before Agent 1**: Create staging context
2. **Pass staging paths to agents**: Tell them to write to staging, not production
3. **After Agent 2 success**: Call `commitStaging()`
4. **On any failure**: Call `rollbackStaging()`
5. **Add recovery check**: Detect orphaned staging from crashed transformation

Example update to Agent 1 invocation:
```
Task tool parameters:
  prompt: |
    ...
    **OUTPUT_DIR**: .speck/.transform-staging/<version>/scripts/  # NOT .speck/scripts/
    ...
```

#### 3. Update Transformation Agents

Both agents need minor updates:
- Accept staging path as OUTPUT_DIR
- Write files to staging instead of production
- Report written files for commit tracking

#### 4. Add Recovery Command

Add `/speck.transform-recover` or a `--recover` flag:
- Detects orphaned staging directory
- Offers: commit (if transformation completed), rollback (if incomplete), or inspect

---

## Files to Modify

| File | Change |
|------|--------|
| `.speck/scripts/common/transformation-staging.ts` | **NEW** - Staging manager |
| `.claude/commands/speck.transform-upstream.md` | Add staging lifecycle |
| `.claude/agents/speck.transform-bash-to-bun.md` | Accept staging OUTPUT_DIR |
| `.claude/agents/speck.transform-commands.md` | Accept staging OUTPUT_DIR |
| `specs/001-speck-core-project/contracts/` | Add staging types (optional) |

---

## Edge Cases to Handle

1. **Transformation crashes mid-commit**: Add commit log to staging to track partial progress
2. **File conflicts**: If production file was modified since staging started, detect and warn
3. **Existing staging directory**: Refuse to start new transformation if orphaned staging exists

---

## Accepted Limitations (per user feedback)

- **FR-007 factoring**: Accepted as advisory, not enforced
- **json-tracker.ts**: Obsolete, can be removed from documentation
- **Speck-native scripts**: Transform-upstream should preserve them via SPECK-EXTENSION markers, not via explicit classification

---

## Summary

The key deliverable is implementing the **staged transformation with rollback** pattern to fulfill FR-012's atomic operation guarantee. This protects against the scenario where Agent 1 succeeds but Agent 2 fails, leaving the codebase in an inconsistent state.
