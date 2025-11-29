# Data Model: Scope Simplification

**Feature**: 015-scope-simplification
**Date**: 2025-11-28
**Status**: Complete

## Entity Overview

This feature primarily simplifies and refactors existing entities rather than introducing new ones. The key data model changes are:

1. **Simplified**: BranchEntry (remove stacked PR fields)
2. **New**: HandoffDocument (session context transfer)
3. **Renamed**: speck-knowledge → speck-help
4. **Retained**: Multi-repo entities, Config entities

---

## Entity Definitions

### 1. BranchEntry (Simplified)

**Purpose**: Maps non-standard branch names to their associated feature specs.

**Previous Schema** (to be removed):
```typescript
interface BranchEntry {
  name: string;           // ✓ KEEP
  specId: string;         // ✓ KEEP
  baseBranch: string;     // ✗ REMOVE (stacked PR)
  status: BranchStatus;   // ✗ REMOVE (stacked PR)
  pr: number | null;      // ✗ REMOVE (stacked PR)
  createdAt: string;      // ✓ KEEP
  updatedAt: string;      // ✓ KEEP
  parentSpecId?: string;  // ✓ KEEP (multi-repo)
}

type BranchStatus = "active" | "submitted" | "merged" | "abandoned"; // ✗ REMOVE
```

**Simplified Schema**:
```typescript
interface BranchEntry {
  /** Non-standard Git branch name (not following NNN-short-name pattern) */
  name: string;

  /** Associated feature spec ID (NNN-short-name format) */
  specId: string;

  /** ISO timestamp of when mapping was created */
  createdAt: string;

  /** ISO timestamp of last update */
  updatedAt: string;

  /** Parent spec ID for multi-repo child specs (optional) */
  parentSpecId?: string;
}
```

**Validation Rules**:
- `name`: Non-empty string, valid Git branch name characters
- `specId`: Matches pattern `/^\d{3}-[a-z0-9-]+$/`
- `createdAt`, `updatedAt`: Valid ISO 8601 timestamps
- `parentSpecId`: If present, must match specId pattern

**State Transitions**: None (this is a simple mapping, no state machine)

---

### 2. BranchMapping (Simplified)

**Purpose**: Container for all branch-to-spec mappings in a repository.

**Simplified Schema**:
```typescript
interface BranchMapping {
  /** Schema version for migrations */
  version: string;

  /** List of branch entries */
  branches: BranchEntry[];

  /** Index: spec ID → list of branch names */
  specIndex: Record<string, string[]>;
}
```

**File Location**: `.speck/branches.json`

**Validation Rules**:
- `version`: Semantic version string
- `branches`: Array, may be empty
- `specIndex`: Must be consistent with branches array (derived index)

---

### 3. HandoffDocument (New)

**Purpose**: Transfers feature context to new Claude Code session in worktree.

**Schema**:
```typescript
interface HandoffDocument {
  /** Feature name from spec.md */
  featureName: string;

  /** Git branch name */
  branchName: string;

  /** Relative path from worktree to spec.md */
  specPath: string;

  /** ISO timestamp of handoff creation */
  createdAt: string;

  /** Brief description of feature purpose */
  context: string;

  /** Current implementation status (if tasks.md exists) */
  status?: "not-started" | "in-progress" | "completed";

  /** Next suggested action */
  nextStep: string;
}
```

**File Location**: `<worktree>/.speck/handoff.md` (Markdown format with YAML frontmatter)

**Lifecycle**:
1. Created during worktree creation
2. Read by session start hook when Claude Code opens
3. Deleted or archived after reading (optional)

**Serialization Format** (Markdown):
```markdown
---
featureName: "Scope Simplification"
branchName: "015-scope-simplification"
specPath: "../main/specs/015-scope-simplification/spec.md"
createdAt: "2025-11-28T12:00:00Z"
status: "in-progress"
---

# Feature Handoff: Scope Simplification

## Context

[Brief description from spec.md]

## Getting Started

1. Review the spec: [../main/specs/015-scope-simplification/spec.md]
2. Check current tasks: [Run /speck.tasks if needed]
3. Start implementation: /speck.implement

## Next Step

[nextStep content]
```

---

### 4. SpeckConfig (Retained with Minor Updates)

**Purpose**: Repository-level Speck configuration.

**Location**: `.speck/config.json`

**Relevant Sections** (no changes from 012-worktree-integration):
```typescript
interface SpeckConfig {
  /** Worktree integration settings */
  worktree?: WorktreeConfig;

  /** Multi-repo settings */
  multiRepo?: MultiRepoConfig;

  /** Branch naming settings (retained for non-standard names) */
  branches?: BranchConfig;
}

interface WorktreeConfig {
  enabled: boolean;
  ideAutoLaunch: boolean;
  ide: "vscode" | "cursor" | "jetbrains";
  depsPreInstall: boolean;
  copyRules: string[];
  symlinkRules: string[];
}

interface MultiRepoConfig {
  rootPath?: string;  // Symlink target for multi-repo root
}

interface BranchConfig {
  prefix?: string;  // Optional branch name prefix (e.g., "specs/")
}
```

---

### 5. SpeckHelp Skill (Renamed from speck-knowledge)

**Purpose**: Answers questions about Speck features, commands, and workflows.

**Location**: `.claude/skills/speck-help/SKILL.md`

**Schema** (YAML frontmatter):
```yaml
---
name: speck-help
description: "Answer questions about Speck features, commands, and workflows"
---
```

**Content Changes**:
- Remove: Stacked PR documentation (section 8 in SKILL.md)
- Remove: Virtual command architecture (section 9 in SKILL.md)
- Retain: Multi-repo mode detection (section 7)
- Retain: Worktree mode detection (section 10)
- Add: Session handoff documentation
- Update: Slash command reference (remove /speck.branch, add /speck.init, /speck.help)

---

## Removed Entities

### BranchStatus (Deleted)
```typescript
// DELETED - stacked PR specific
type BranchStatus = "active" | "submitted" | "merged" | "abandoned";
```

### BranchStack (Deleted)
```typescript
// DELETED - stacked PR specific
interface BranchStack {
  branches: BranchEntry[];
  order: string[];  // Dependency order
}
```

### PRMetadata (Deleted)
```typescript
// DELETED - stacked PR specific
interface PRMetadata {
  number: number;
  url: string;
  status: "open" | "merged" | "closed";
}
```

### HookInput/HookOutput (Deleted)
```typescript
// DELETED - virtual command pattern
interface HookInput {
  command: string;
  args: string[];
  workingDir: string;
}

interface HookOutput {
  result: "allow" | "block";
  message?: string;
  output?: string;
}
```

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────┐
│                    SpeckConfig                           │
│  (.speck/config.json)                                   │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │WorktreeConfig│  │MultiRepoConfig│  │BranchConfig   │ │
│  └──────────────┘  └──────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────┘
         │
         ▼ (when creating worktree)
┌─────────────────────────────────────────────────────────┐
│                  HandoffDocument                         │
│  (<worktree>/.speck/handoff.md)                         │
├─────────────────────────────────────────────────────────┤
│  featureName, branchName, specPath, context, status     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   BranchMapping                          │
│  (.speck/branches.json)                                 │
├─────────────────────────────────────────────────────────┤
│  version                                                 │
│  branches[]  ───────────────►  BranchEntry              │
│  specIndex   (derived)           name, specId,          │
│                                  createdAt, updatedAt,  │
│                                  parentSpecId?          │
└─────────────────────────────────────────────────────────┘
```

---

## Migration Notes

### branches.json Migration

**Version Bump**: `1.x.x` → `2.0.0`

**Migration Logic**:
1. Read existing branches.json
2. For each BranchEntry:
   - Keep: `name`, `specId`, `createdAt`, `updatedAt`, `parentSpecId`
   - Drop: `baseBranch`, `status`, `pr`
3. Rebuild specIndex from simplified branches
4. Write with new version

**Backward Compatibility**:
- Migration is automatic on first read
- Old format is detected by version number
- Migration is idempotent (can run multiple times safely)

### Skill Rename Migration

1. Rename directory: `speck-knowledge` → `speck-help`
2. Update frontmatter name field
3. Update all command references
4. Update plugin.json if it references the skill

---

## File Locations Summary

| Entity | Location | Format |
|--------|----------|--------|
| BranchMapping | `.speck/branches.json` | JSON |
| SpeckConfig | `.speck/config.json` | JSON |
| HandoffDocument | `<worktree>/.speck/handoff.md` | Markdown + YAML |
| SpeckHelp Skill | `.claude/skills/speck-help/SKILL.md` | Markdown + YAML |
