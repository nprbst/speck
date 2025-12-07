# Research: Speck Reviewer Plugin

**Feature Branch**: `018-speck-reviewer-plugin`
**Created**: 2025-12-07
**Status**: Complete

## Technology Decisions

### Runtime & Language

**Decision**: TypeScript 5.3+ with Bun 1.0+ runtime

**Rationale**:
- Matches existing speck plugin stack for consistency
- Bun provides fast startup (critical for CLI responsiveness)
- Direct compatibility with existing POC codebase in `claude-pr-review-extensions-poc/cli/`
- Bun Shell API simplifies subprocess/file operations

**Alternatives Considered**:
- Node.js: Slower startup, additional package manager complexity
- Deno: Would require rewriting existing POC code, different module system

### CLI Architecture

**Decision**: Direct command pattern with Bun executable

**Rationale**:
- POC already implements this pattern successfully in `cli/src/index.ts`
- Simple command dispatch via `commands: Record<string, (args: string[]) => Promise<void>>`
- No framework overhead (Commander.js not needed for this simpler CLI)
- Shebang-based execution: `#!/usr/bin/env bun`

**Alternatives Considered**:
- Commander.js: Used by main speck CLI but adds overhead for simpler command set
- Yargs: Similar overhead, not needed for straightforward command routing

### GitHub API Integration

**Decision**: `gh` CLI as primary interface, GitHub REST API for advanced operations

**Rationale**:
- POC validates this approach works reliably
- `gh` handles auth, rate limiting, pagination automatically
- REST API direct calls via `gh api` for operations not exposed in `gh pr`
- Users already have `gh` installed for most GitHub workflows

**Alternatives Considered**:
- Octokit SDK: More code, requires managing tokens separately
- GraphQL API: More complex, not needed for PR review operations

### State Persistence

**Decision**: File-based JSON at `.speck/review-state.json` per repository

**Rationale**:
- POC already implements this pattern with well-defined schema
- Per-repo state matches user expectation (review state travels with checkout)
- JSON format allows easy debugging and manual editing if needed
- Atomic writes via temp file + rename prevent corruption

**Alternatives Considered**:
- SQLite: Overkill for single-session state
- Memory only: Loses state on session end, poor UX for large PRs

### Plugin Distribution

**Decision**: Monorepo with shared `marketplace.json` at `.claude-plugin/`

**Rationale**:
- Spec requirement FR-001 mandates root-level marketplace.json
- Each plugin has own `plugin.json` manifest
- Existing speck plugin migrates to `plugins/speck/`
- New speck-reviewer at `plugins/speck-reviewer/`
- Shared marketplace enables single source add for both plugins

**Alternatives Considered**:
- Separate repositories: Harder to maintain shared code, user adds multiple sources
- Single plugin with optional features: Violates FR-003 independent installation

### Clustering Algorithm

**Decision**: Two-stage heuristic + LLM refinement

**Rationale**:
- POC implements Stage 1 (heuristic) in `clustering.ts`
- Directory-based grouping provides fast initial structure
- LLM refinement (Stage 2) happens in skill layer for semantic naming
- Cross-cutting concern detection catches config/deps/migrations

**Alternatives Considered**:
- Pure LLM clustering: Too slow for large PRs, expensive
- Pure heuristic: Misses semantic relationships between files

### Speck Integration

**Decision**: Check `specs/NNN-branch-name/spec.md` and `.speck/branches.json`

**Rationale**:
- Matches existing speck convention for feature branch tracking
- `branches.json` provides authoritative mapping when branch names differ
- Graceful degradation when no spec exists (FR-022)

**Alternatives Considered**:
- Require spec for all reviews: Too restrictive, not all PRs have specs
- Git notes: Non-standard, not used elsewhere in speck

## Dependencies

### Runtime Dependencies

| Package | Purpose | Status |
|---------|---------|--------|
| `bun` | Runtime, shell API, test runner | Required, 1.0+ |
| `gh` | GitHub CLI operations | Required, user provides |
| `zod` | Runtime schema validation | Optional, for type safety |

### No Additional NPM Dependencies

The POC demonstrates all functionality with zero external npm packages beyond bun builtins:
- File operations: `fs` built-in
- Path handling: `path` built-in
- JSON parsing: Native
- HTTP: `gh api` CLI wrapper

## Existing Code to Extract

From `claude-pr-review-extensions-poc/cli/src/`:

| File | Lines | Extraction Notes |
|------|-------|-----------------|
| `index.ts` | 467 | Command routing, remove VSCode extension commands |
| `state.ts` | 407 | Full extraction, well-structured |
| `clustering.ts` | 476 | Full extraction, clean module |
| `github.ts` | ~300 | Extract PR operations, skip extension-specific |
| `links.ts` | ~200 | Simplify for terminal-only (no VSCode URIs) |
| `logger.ts` | ~100 | Full extraction |

**Not extracted** (extension-specific):
- `vscode.ts` - VSCode extension bridge
- `port-discovery.ts` - Extension port discovery
- `analytics.ts` - Extension analytics

## Risks & Mitigations

### Risk: gh CLI Not Authenticated

**Mitigation**: Clear error message with auth instructions
```
Error: GitHub CLI not authenticated
Run: gh auth login
```

### Risk: Large PR Performance

**Mitigation**:
- Heuristic clustering is O(n) where n = files
- Limit cluster display to prevent context overflow
- Sub-cluster large directories (50+ files) by subdirectory (FR per spec)

### Risk: State File Conflicts

**Mitigation**:
- Atomic writes via temp file + rename
- Schema versioning for forward compatibility
- Clear warning on version mismatch

## Open Questions Resolved

1. **Q: How to handle monorepo plugin structure?**
   A: Root `marketplace.json` lists both plugins, each has own `plugin.json`

2. **Q: Should CLI be separate package or part of plugin?**
   A: Part of plugin at `plugins/speck-reviewer/cli/`, symlinked to PATH

3. **Q: How to detect Speck specs for PR branches?**
   A: Check `specs/{branch-name}/spec.md` and `.speck/branches.json` mapping
