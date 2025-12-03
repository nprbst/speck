---
title: "Capability Matrix"
description: "Feature compatibility reference showing which Speck capabilities are supported across single-repo, multi-repo root, and multi-repo child contexts."
category: "reference"
order: 1
tags: ["reference", "compatibility", "multi-repo", "features"]
lastUpdated: 2025-11-29
---

# Capability Matrix

This reference table shows feature compatibility across different Speck usage contexts. Use this to understand which capabilities are available in your repository setup.

**Covers**: Specifications 007, 012, 015 (Multi-repo support, Worktree integration, Scope simplification)

## Repository Modes

- **Single-Repo**: Traditional single-repository project
- **Multi-Repo Root**: Root repository in multi-repo setup (contains shared specs)
- **Multi-Repo Child**: Child repository linked to shared spec root

## Support Status

- ✅ **Supported** - Feature fully functional in this context
- ❌ **Not Supported** - Feature not available in this context
- ⚠️ **Partial** - Feature available with documented limitations
- **N/A** - Feature concept doesn't apply to this context

## Core Features

| Feature | Single-Repo | Multi-Repo Root | Multi-Repo Child | Limitations |
|---------|-------------|-----------------|------------------|-------------|
| **Basic Workflow** | | | | |
| Create specifications | ✅ Supported | ✅ Supported | N/A (Uses shared spec) | Child repos read from symlinked parent spec |
| Generate plans | ✅ Supported | ✅ Supported | ✅ Supported | Plans are per-repo (different implementations) |
| Generate tasks | ✅ Supported | ✅ Supported | ✅ Supported | Tasks based on per-repo plan |
| Execute implementation | ✅ Supported | ✅ Supported | ✅ Supported | None |
| Create constitutions | ✅ Supported | ✅ Supported | ✅ Supported | Per-repo constitutions (different principles allowed) |

## Multi-Repo Features (Spec 007)

| Feature | Single-Repo | Multi-Repo Root | Multi-Repo Child | Limitations |
|---------|-------------|-----------------|------------------|-------------|
| Symlink detection | N/A (Single repo) | ✅ Supported | ✅ Supported (via `.speck/root`) | Requires manual `/speck:link` setup in child repos |
| Shared specifications | N/A (Single repo) | ✅ Supported | ✅ Supported | Spec lives at root, children reference via symlink |
| Per-repo implementation plans | N/A (Single repo) | ✅ Supported | ✅ Supported | Each repo generates independent `plan.md` from shared spec |
| Cross-repo coordination | N/A (Single repo) | ⚠️ Manual (via shared spec) | ⚠️ Manual (via shared spec) | No automatic synchronization - requires manual review |
| `/speck:link` command | N/A (Single repo) | N/A (Root doesn't link) | ✅ Supported | Creates `.speck/root` symlink to parent directory |
| `/speck:env` multi-repo detection | N/A (Single repo) | ✅ Supported (Shows root) | ✅ Supported (Shows child) | Displays current repository context and linked root |

## Worktree Integration (Spec 012)

| Feature | Single-Repo | Multi-Repo Root | Multi-Repo Child | Limitations |
|---------|-------------|-----------------|------------------|-------------|
| Automatic worktree creation | ✅ Supported | ✅ Supported | ✅ Supported | Creates peer worktree directory |
| Session handoff | ✅ Supported | ✅ Supported | ✅ Supported | Handoff document written to worktree |
| IDE auto-launch | ✅ Supported | ✅ Supported | ✅ Supported | VSCode, Cursor, WebStorm supported |
| Dependency auto-install | ✅ Supported | ✅ Supported | ✅ Supported | Runs package manager install |
| Non-standard branch names | ✅ Supported | ✅ Supported | ✅ Supported | Tracked in `.speck/branches.json` |

## CLI & Hooks (Spec 015)

| Feature | Single-Repo | Multi-Repo Root | Multi-Repo Child | Limitations |
|---------|-------------|-----------------|------------------|-------------|
| Dual-mode CLI | ✅ Supported | ✅ Supported | ✅ Supported | Works in terminal and Claude Code |
| Global CLI installation | ✅ Supported | ✅ Supported | ✅ Supported | `speck init` creates ~/.local/bin symlink |
| Automatic prerequisite checks | ✅ Supported | ✅ Supported | ✅ Supported | UserPromptSubmit hook runs before slash commands |
| JSON output mode | ✅ Supported | ✅ Supported | ✅ Supported | `--json` flag for structured output |
| Hook output mode | ✅ Supported | ✅ Supported | ✅ Supported | `--hook` flag for Claude Code integration |
| Context pre-loading | ✅ Supported | ✅ Supported | ✅ Supported | Feature directory and docs injected into prompt |

## Detailed Limitations

### Multi-Repo Coordination (Spec 007)

**Limitation**: Cross-repo coordination is manual via shared specification and contracts.

**What's Supported**:
- Shared `spec.md` at root level (single source of truth)
- Per-repo `plan.md` and `tasks.md` (independent implementations)
- Per-repo constitutions (different architectural principles allowed)

**What's NOT Supported**:
- Automatic synchronization of implementation progress
- Unified task view across all child repos

**Workaround**: Use shared contracts in `spec.md` to define APIs and interfaces. Each child repo implements its side of the contract independently.

### Performance Overhead

**Multi-Repo Detection** (Spec 007):
- Single-repo: <2ms median detection overhead (minimal)
- Multi-repo root: <10ms median detection overhead
- Multi-repo child: <10ms median detection overhead (symlink resolution)

**Worktree Creation** (Spec 012):
- <10 seconds for full worktree setup including IDE launch

**Hook Execution** (Spec 015):
- <100ms hook latency (trigger to CLI execution start)

## Usage Guidelines

### When to Use Each Repository Mode

**Choose Single-Repo When**:
- All code lives in one repository
- No cross-repo coordination needed
- Simplest setup is priority

**Choose Multi-Repo Root When**:
- You have a central specifications repository
- Multiple child repos implement shared features
- You manage the canonical spec definitions

**Choose Multi-Repo Child When**:
- Your repo is part of a multi-repo setup
- You implement features from shared parent specs
- You need independent implementation plans from shared specifications

### When to Use Worktrees

**Use Worktrees When**:
- Working on multiple features in parallel
- Want to avoid branch-switching overhead
- Need isolated workspaces for different features
- Want automatic session handoff between Claude sessions

**Skip Worktrees When**:
- Working on single feature at a time
- Prefer traditional branch-based workflow
- Limited disk space (worktrees duplicate working files)

---

**Last Updated**: 2025-11-29 | **Covers**: Specs 007, 012, 015
