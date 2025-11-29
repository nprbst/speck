# Research: Scope Simplification

**Feature**: 015-scope-simplification
**Date**: 2025-11-28
**Status**: Complete

## Executive Summary

This research document consolidates technical decisions and best practices for the Scope Simplification feature. The feature removes stacked PR support and virtual commands while consolidating to a dual-mode CLI with auto-install, auto-worktree creation, and streamlined documentation.

---

## Research Areas

### 1. CLI Architecture: Dual-Mode vs Hook-Based

**Decision**: Dual-mode CLI with `--json` and `--hook` output flags

**Rationale**: The existing virtual command pattern (PreToolUse hook intercepting Bash commands and routing to CLI handlers) adds complexity without proportional benefit. A simpler dual-mode CLI that can be invoked directly or via hooks with output format flags achieves the same goals with less code.

**Alternatives Considered**:
- **Virtual commands only**: Too complex, requires hook bundling and JSON protocol
- **CLI only, no hook support**: Loses Claude Code integration benefits
- **Separate binaries for each mode**: Maintenance overhead, code duplication

**Implementation Approach**:
- Single `speck` entry point using Commander.js
- `--json` flag outputs structured JSON (for LLM parsing)
- `--hook` flag outputs hook-formatted responses (for Claude Code hooks)
- Default: Human-readable terminal output
- All three modes share command implementation logic

---

### 2. Symlink Installation Strategy

**Decision**: Create symlink at `~/.local/bin/speck` pointing to repository CLI entry point

**Rationale**: The `~/.local/bin` directory is the XDG Base Directory standard for user-installed executables. It's commonly in PATH on Unix systems and provides a clean separation from system binaries.

**Alternatives Considered**:
- **npm global install**: Requires npm, may conflict with Bun-based execution
- **Homebrew formula**: macOS-only, maintenance overhead for formula updates
- **/usr/local/bin**: Requires sudo, potential permission issues
- **Shell alias**: Non-portable, requires manual setup

**Implementation Approach**:
1. Check if `~/.local/bin` exists, create if missing
2. Create symlink: `~/.local/bin/speck` → `<repo>/src/cli/index.ts`
3. Verify symlink works with shebang: `#!/usr/bin/env bun`
4. Check if `~/.local/bin` is in PATH, warn if not with instructions

---

### 3. Worktree Integration with Handoff Documents

**Decision**: Write handoff document to worktree, load via Claude Code session start hook

**Rationale**: New Claude Code sessions in worktrees need context about the feature being worked on. A handoff document provides this context without requiring the developer to manually explain the feature.

**Alternatives Considered**:
- **Copy spec.md to worktree**: Duplicates content, may become stale
- **Symlink spec.md**: Works but doesn't provide session-specific context
- **Environment variable**: Limited information capacity, not persistent

**Implementation Approach**:
1. On worktree creation, generate handoff document at `<worktree>/.speck/handoff.md`
2. Handoff document contains: feature name, spec path, branch name, initial context
3. Claude Code session start hook (`SessionStart`) checks for handoff document
4. If present, load content and optionally delete after loading

**Handoff Document Schema**:
```markdown
# Feature Handoff: [Feature Name]

**Branch**: [branch-name]
**Spec**: [relative path to spec.md from worktree]
**Created**: [timestamp]

## Context

[Brief description of feature and current state]

## Getting Started

1. Review the spec: [link to spec.md]
2. Check current tasks: [link to tasks.md if exists]
3. Start implementation with /speck.implement
```

---

### 4. Branches.json Simplification

**Decision**: Retain `.speck/branches.json` with simplified schema for non-standard branch tracking only

**Rationale**: The current schema contains stacked PR-specific fields (baseBranch, status, pr). These should be removed, keeping only branch-to-spec mappings for non-standard branch names.

**Alternatives Considered**:
- **Remove entirely**: Breaks support for non-standard branch naming (user requirement)
- **Keep full schema**: Maintains dead code and complexity
- **New file format**: Migration overhead, no benefit

**Current Schema** (to be simplified):
```typescript
interface BranchEntry {
  name: string;           // KEEP
  specId: string;         // KEEP
  baseBranch: string;     // REMOVE (stacked PR)
  status: BranchStatus;   // REMOVE (stacked PR)
  pr: number | null;      // REMOVE (stacked PR)
  createdAt: string;      // KEEP
  updatedAt: string;      // KEEP
  parentSpecId?: string;  // KEEP (multi-repo)
}
```

**Simplified Schema**:
```typescript
interface BranchEntry {
  name: string;           // Non-standard branch name
  specId: string;         // Associated NNN-short-name
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
  parentSpecId?: string;  // Multi-repo parent spec
}

interface BranchMapping {
  version: string;        // Schema version
  branches: BranchEntry[];
  specIndex: Record<string, string[]>; // spec ID → branch names
}
```

---

### 5. Skill Rename Strategy

**Decision**: Rename `speck-knowledge` to `speck-help`

**Rationale**: The new name better reflects the user-facing purpose (getting help) rather than the implementation detail (knowledge base). Aligns with `/speck.help` command naming.

**Alternatives Considered**:
- **Keep speck-knowledge**: Doesn't match command naming convention
- **Create new speck-help alongside**: Duplication, confusion

**Implementation Approach**:
1. Rename directory: `.claude/skills/speck-knowledge/` → `.claude/skills/speck-help/`
2. Update skill name in `SKILL.md` frontmatter
3. Update all references in commands, documentation
4. Remove stacked PR and virtual command sections from skill content

---

### 6. Code Removal Strategy

**Decision**: Phased removal with clear deletion lists

**Rationale**: Clean removal is better than deprecation for this scope reduction. Dead code should be fully deleted, not hidden behind flags.

**Files/Directories to DELETE**:
- `.speck/scripts/branch-command.ts` (stacked PR implementation)
- `.speck/scripts/commands/branch.ts` (stacked PR handler)
- `.speck/scripts/lib/hook-utils.ts` (virtual command pattern)
- `.speck/scripts/lib/mode-detector.ts` (virtual command pattern)
- `.speck/scripts/build-hook.ts` (virtual command build)
- `.claude/commands/speck.branch.md` (stacked PR slash command)
- `specs/008-stacked-pr-support/` (entire feature directory)

**Files to REFACTOR**:
- `.speck/scripts/speck.ts` (remove hook mode, keep CLI mode)
- `.speck/scripts/commands/index.ts` (remove branch command entry)
- `.speck/scripts/common/branch-mapper.ts` (simplify schema)
- `.claude-plugin/plugin.json` (remove PreToolUse hook)
- `.claude/skills/speck-knowledge/` (rename and update content)

**Files to CREATE**:
- `src/cli/index.ts` (main CLI entry point)
- `.claude/commands/speck.init.md` (install command)
- `.claude/commands/speck.help.md` (help command)
- `.speck/scripts/commands/install.ts` (install handler)
- `.speck/scripts/commands/help.ts` (help handler)

---

### 7. Website Content Pruning Strategy

**Decision**: Remove all stacked PR and virtual command documentation, retain multi-repo docs

**Rationale**: Documentation must accurately reflect current feature set. Removed features should not be documented.

**Content to Remove**:
- Any page/section mentioning stacked PRs
- Any page/section mentioning virtual commands
- Branch dependency documentation
- PR automation documentation

**Content to Retain**:
- Multi-repo setup and usage
- Core workflow (specify → plan → tasks → implement)
- Worktree integration (enhanced for auto-creation)
- CLI command reference (updated for new structure)

**Content to Add**:
- `/speck.init` installation command
- `/speck.help` help command
- Session handoff documentation
- Simplified getting-started (under 5 minutes)

---

### 8. Test Strategy for Scope Reduction

**Decision**: Test baseline capture before removal, ensure zero regressions

**Rationale**: Constitution Principle X (Zero Test Regression) requires maintaining test health. Removing features should reduce test count but not break remaining tests.

**Implementation Approach**:
1. Capture test baseline before any changes
2. Delete tests that only test removed features
3. Update tests that reference removed features
4. Verify final pass count equals (baseline - deleted tests)
5. Document test changes in feature notes

---

## Technology Decisions Summary

| Area | Decision | Key Files |
|------|----------|-----------|
| CLI Mode | Dual-mode with --json/--hook flags | `src/cli/index.ts` |
| Installation | Symlink to ~/.local/bin/speck | `commands/install.ts` |
| Session Handoff | Handoff.md in worktree | `worktree/handoff.ts` |
| Branch Tracking | Simplified branches.json | `common/branch-mapper.ts` |
| Skill Naming | Rename to speck-help | `.claude/skills/speck-help/` |
| Removal | Delete files, don't deprecate | See deletion list above |
| Website | Prune removed features | `website/src/content/docs/` |
| Testing | Baseline + deletion + verification | Per Constitution Principle X |

---

## Open Questions (None)

All clarifications were provided in the spec. No additional research questions remain.

---

## References

- Spec: [specs/015-scope-simplification/spec.md](./spec.md)
- Constitution: [.speck/memory/constitution.md](../../.speck/memory/constitution.md)
- Existing worktree spec: [specs/012-worktree-integration/spec.md](../012-worktree-integration/spec.md)
- Existing skill: [.claude/skills/speck-knowledge/SKILL.md](../../.claude/skills/speck-knowledge/SKILL.md)
