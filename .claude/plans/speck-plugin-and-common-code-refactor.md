# Plan: Speck Monorepo Shared Code Refactor

**Goal**: Enable code sharing between plugins by extracting common utilities to `packages/shared/` and completing T005 (migrate speck plugin to `plugins/speck/`)

**Decisions**:
- Logger API: Use richer enum-based API from main speck, add `json()` method from speck-reviewer
- Execution order: Option A - Extract shared code first, then migrate plugin
- Templates: Move to `plugins/speck/templates/`
- Breaking changes: Acceptable (no backward compatibility layer)

---

## Phase 1: Workspace Setup

### 1.1 Initialize Bun Workspaces
**File**: `package.json`
```json
{
  "workspaces": ["packages/*", "plugins/*"]
}
```

### 1.2 Create Shared Package Structure
```
packages/shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts              # Re-exports all modules
    ├── logger.ts             # Unified logger with SPECK_DEBUG support
    ├── errors.ts             # Error classes
    ├── file-ops.ts           # Atomic file operations
    ├── json-state.ts         # JSON state persistence
    ├── output.ts             # Output formatting
    ├── types.ts              # Shared type definitions
    └── github/
        ├── index.ts          # Re-exports all github utilities
        ├── cli.ts            # gh CLI wrapper (auth, token, graphql)
        ├── api.ts            # REST API client (releases, download)
        └── types.ts          # GitHub type definitions
```

### 1.3 Configure Package
**File**: `packages/shared/package.json`
```json
{
  "name": "@speck/common",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./logger": "./src/logger.ts",
    "./errors": "./src/errors.ts",
    "./file-ops": "./src/file-ops.ts",
    "./json-state": "./src/json-state.ts",
    "./output": "./src/output.ts",
    "./types": "./src/types.ts",
    "./github": "./src/github/index.ts",
    "./github/cli": "./src/github/cli.ts",
    "./github/api": "./src/github/api.ts",
    "./github/types": "./src/github/types.ts"
  }
}
```

---

## Phase 2: Extract Shared Utilities

### 2.1 Logger Module
**Source**: `.speck/scripts/lib/logger.ts` (primary) + `plugins/speck-reviewer/cli/src/logger.ts` (add `json()`)
**Target**: `packages/shared/src/logger.ts`

Preserve richer API:
- `LogLevel` enum (DEBUG, INFO, WARN, ERROR, NONE)
- `configureLogger(config)` - mode-aware configuration
- `debug()`, `info()`, `warn()`, `error()` - level-filtered logging
- `createScopedLogger(scope)` - prefixed logging
- `logExecutionTime(label, fn)` - performance debugging
- **Add**: `json(data)` - machine-readable JSON output (from speck-reviewer)

### 2.2 Error Classes
**Source**: `.speck/scripts/common/errors.ts` + `.speck/scripts/lib/error-handler.ts`
**Target**: `packages/shared/src/errors.ts`

### 2.3 File Operations
**Source**: `.speck/scripts/common/file-ops.ts`
**Target**: `packages/shared/src/file-ops.ts`

### 2.4 JSON State Persistence
**Source**: `.speck/scripts/common/json-tracker.ts` + atomic write pattern from `plugins/speck-reviewer/cli/src/state.ts`
**Target**: `packages/shared/src/json-state.ts`

### 2.5 Output Formatting
**Source**: `.speck/scripts/lib/output-formatter.ts` + `plugins/speck-reviewer/cli/src/links.ts`
**Target**: `packages/shared/src/output.ts`

### 2.6 Shared Types
**Source**: `.speck/scripts/lib/types.ts` + common parts from `plugins/speck-reviewer/cli/src/types.ts`
**Target**: `packages/shared/src/types.ts`

### 2.7 GitHub CLI Utilities
**Source**: `plugins/speck-reviewer/cli/src/github.ts`
**Target**: `packages/shared/src/github/cli.ts`

**Exports**:
```typescript
export function checkGhAuth(): Promise<boolean>;
export function getGitHubToken(): Promise<string>;
export function getCurrentUser(): Promise<string>;
export function getRepoFullName(): Promise<{owner: string, repo: string}>;
export function getCurrentBranch(): Promise<string>;
export function ghGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
```

### 2.8 GitHub REST API Client
**Source**: `.speck/scripts/common/github-api.ts`
**Target**: `packages/shared/src/github/api.ts`

**Exports**:
```typescript
export interface RateLimitInfo { remaining: number; reset: Date; }
export async function fetchReleases(owner: string, repo: string, options?: GitHubApiOptions): Promise<GitHubRelease[]>;
export async function downloadTarball(url: string, destPath: string): Promise<void>;
export function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null;
```

### 2.9 GitHub Types
**Source**: Consolidate from both plugins
**Target**: `packages/shared/src/github/types.ts`

**Exports**:
```typescript
export interface GitHubRelease { tag_name: string; tarball_url: string; published_at: string; ... }
export interface GitHubApiOptions { token?: string; baseUrl?: string; }
export interface PRInfo { number: number; title: string; author: string; ... }
export interface DiffFile { path: string; additions: number; deletions: number; }
```

---

## Phase 3: Update speck-reviewer (before migration)

### 3.1 Add Dependency
**File**: `plugins/speck-reviewer/cli/package.json`
```json
{ "dependencies": { "@speck/common": "workspace:*" } }
```

### 3.2 Update Imports
- **Delete** `cli/src/logger.ts` → `import { debug, info, warn, error, json } from "@speck/common/logger"`
- **Update** `cli/src/state.ts` → import atomic write utilities from `@speck/common/json-state`
- **Update** `cli/src/github.ts` → import shared utilities from `@speck/common/github/cli`, keep PR-specific functions (postComment, submitReview, fetchReviewThreadResolvedStatus, etc.) in place

---

## Phase 4: Full Migration (T005)

Move speck plugin from root to `plugins/speck/`:

### 4.1 Create plugins/speck/ structure
```
plugins/speck/
├── .claude-plugin/
│   └── plugin.json
├── commands/           # From .claude/commands/
├── skills/             # From .claude/skills/
├── agents/             # From .claude/agents/
├── scripts/            # From .speck/scripts/
│   ├── common/
│   ├── lib/
│   ├── commands/
│   ├── contracts/
│   ├── worktree/
│   ├── hooks/
│   └── transform-upstream/
├── cli/                # From src/cli/
│   ├── index.ts
│   └── bootstrap.sh
├── templates/          # From .speck/templates/
└── package.json
```

### 4.2 Move files
| Source | Destination |
|--------|-------------|
| `.claude/commands/*` | `plugins/speck/commands/` |
| `.claude/skills/*` | `plugins/speck/skills/` |
| `.claude/agents/*` | `plugins/speck/agents/` |
| `.speck/scripts/*` | `plugins/speck/scripts/` |
| `.speck/templates/*` | `plugins/speck/templates/` |
| `src/cli/*` | `plugins/speck/cli/` |
| `.claude-plugin/plugin.json` | `plugins/speck/.claude-plugin/plugin.json` |

### 4.3 Update speck plugin imports
Update imports throughout `plugins/speck/scripts/`:
```typescript
// Before
import { debug, error } from "../../lib/logger.ts";
import { StackedModeError } from "../common/errors.ts";

// After
import { debug, error } from "@speck/common/logger";
import { StackedModeError } from "@speck/common/errors";
```

### 4.4 Clean up root
- **Remove**: `.claude/commands/`, `.claude/skills/`, `.claude/agents/`
- **Remove**: `.speck/scripts/`, `.speck/templates/`
- **Keep**: `.speck/` directory for runtime state (`config.json`, `branches.json`, `root` symlink)
- **Remove**: `src/cli/`
- **Update**: Root `.claude-plugin/` to just be the marketplace index

### 4.5 Update marketplace.json
**File**: `.claude-plugin/marketplace.json`
```json
{
  "name": "speck-market",
  "plugins": [
    { "name": "speck", "version": "1.10.2", "source": "./plugins/speck" },
    { "name": "speck-reviewer", "version": "1.2.0", "source": "./plugins/speck-reviewer" }
  ]
}
```

---

## Phase 5: Update Build System

### 5.1 Update BuildConfig paths
**File**: `scripts/build-plugin.ts`

| Config Property | Old Value | New Value |
|-----------------|-----------|-----------|
| `commandsSourceDir` | `.claude/commands` | `plugins/speck/commands` |
| `agentsSourceDir` | `.claude/agents` | `plugins/speck/agents` |
| `skillsSourceDir` | `.claude/skills` | `plugins/speck/skills` |
| `templatesSourceDir` | `.speck/templates` | `plugins/speck/templates` |
| `scriptsSourceDir` | `.speck/scripts` | `plugins/speck/scripts` |

### 5.2 Add shared package build step
Add pre-build step to ensure shared package types are available before plugin builds.

### 5.3 Update hook paths
Update `plugin.json` hook paths to reference new locations:
```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "command": "bun ${CLAUDE_PLUGIN_ROOT}/dist/pre-prompt-submit-hook.js"
    }]
  }
}
```

---

## Phase 6: Testing & Validation

1. Add tests in `packages/shared/tests/`
2. Verify both plugins build: `bun run build-plugin`
3. Verify plugin installation from marketplace
4. Run existing test suites: `bun test`
5. Test CLI commands work identically

---

## Critical Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add workspaces config |
| `scripts/build-plugin.ts` | Update all paths from root to `plugins/speck/` |
| `plugins/speck-reviewer/cli/package.json` | Add @speck/common dependency |
| `plugins/speck-reviewer/cli/src/logger.ts` | DELETE (use shared) |
| `plugins/speck-reviewer/cli/src/state.ts` | Import from @speck/common/json-state |
| `plugins/speck-reviewer/cli/src/github.ts` | Import shared utilities, keep PR-specific |
| `.claude-plugin/marketplace.json` | Update to reference plugins/ paths |

## Files to Create

| File | Description |
|------|-------------|
| `packages/shared/package.json` | Package manifest |
| `packages/shared/tsconfig.json` | TypeScript config |
| `packages/shared/src/index.ts` | Main entry point |
| `packages/shared/src/logger.ts` | Unified logger (rich API + json()) |
| `packages/shared/src/errors.ts` | Error classes |
| `packages/shared/src/file-ops.ts` | File operations |
| `packages/shared/src/json-state.ts` | JSON state persistence |
| `packages/shared/src/output.ts` | Output formatting |
| `packages/shared/src/types.ts` | Shared types |
| `packages/shared/src/github/index.ts` | GitHub re-exports |
| `packages/shared/src/github/cli.ts` | gh CLI wrapper |
| `packages/shared/src/github/api.ts` | REST API client |
| `packages/shared/src/github/types.ts` | GitHub types |
| `plugins/speck/package.json` | Plugin package manifest |

## Files to Delete (after migration)

| Path | Reason |
|------|--------|
| `.claude/commands/*` | Moved to plugins/speck/commands/ |
| `.claude/skills/*` | Moved to plugins/speck/skills/ |
| `.claude/agents/*` | Moved to plugins/speck/agents/ |
| `.speck/scripts/*` | Moved to plugins/speck/scripts/ |
| `.speck/templates/*` | Moved to plugins/speck/templates/ |
| `src/cli/*` | Moved to plugins/speck/cli/ |
| `plugins/speck-reviewer/cli/src/logger.ts` | Replaced by @speck/common |
| `.speck/scripts/contracts/github-api.ts` | Types moved to shared |

---

## Success Criteria

1. No duplicate utility code between plugins
2. `bun run build-plugin` succeeds
3. All existing tests pass
4. Both plugins install from marketplace without conflict
5. Existing functionality works identically
6. Future plugins can import from `@speck/common`

---

## Execution Checklist

- [ ] Phase 1: Create `packages/shared/` with package.json and tsconfig.json
- [ ] Phase 2.1: Extract logger module (rich API + json method)
- [ ] Phase 2.2: Extract error classes
- [ ] Phase 2.3: Extract file operations
- [ ] Phase 2.4: Extract JSON state persistence
- [ ] Phase 2.5: Extract output formatting
- [ ] Phase 2.6: Extract shared types
- [ ] Phase 2.7: Extract GitHub CLI utilities
- [ ] Phase 2.8: Extract GitHub REST API client
- [ ] Phase 2.9: Consolidate GitHub types
- [ ] Phase 3: Update speck-reviewer imports to use @speck/common
- [ ] Phase 4.1: Create plugins/speck/ directory structure
- [ ] Phase 4.2: Move all files from root to plugins/speck/
- [ ] Phase 4.3: Update speck plugin imports to use @speck/common
- [ ] Phase 4.4: Clean up root directories
- [ ] Phase 4.5: Update marketplace.json
- [ ] Phase 5: Update build-plugin.ts paths
- [ ] Phase 6: Run tests and verify builds
