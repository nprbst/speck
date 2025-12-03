---
title: "Worktree Integration"
description: "Work on multiple features simultaneously using isolated Git worktrees with automatic IDE launch and dependency installation."
category: advanced-features
audience: [existing-users, evaluators]
prerequisites: ["/docs/getting-started/quick-start", "/docs/core-concepts/workflow"]
tags: ["worktrees", "parallel-development", "setup", "workflow"]
lastUpdated: 2025-12-02
relatedPages: ["/docs/commands/reference", "/docs/configuration/speck-config"]
order: 4
---

# Worktree Integration

Work on multiple features simultaneously in isolated Git worktrees with automatic IDE launch and pre-installed dependencies.

## Overview

Git worktrees allow you to have multiple branches checked out at the same time. Speck's worktree integration automates the entire setup process:
- Creates isolated worktrees for each feature branch
- Configures file sharing and copying
- Pre-installs dependencies
- Automatically launches your IDE

**Benefits**:
- 🚀 **Instant context switching** - No branch switching or stashing required
- 🔄 **Parallel development** - Work on multiple features simultaneously
- 🎯 **Clean isolation** - Each feature has its own working directory
- ⚡ **Zero setup time** - IDE opens with dependencies already installed
- 📋 **Session handoff** - New Claude sessions automatically receive feature context

## Prerequisites

- Speck plugin installed in Claude Code
- Git 2.5+ (worktree support required)
- Git repository initialized

**No additional tools required** - worktree integration works with any Git workflow.

## Quick Start

### 1. Enable Worktree Integration

Create or edit `.speck/config.json` in your repository:

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true,
      "editor": "vscode"
    },
    "dependencies": {
      "autoInstall": true
    }
  }
}
```

Or use the interactive setup wizard:

```bash
bun .speck/scripts/worktree/cli.ts init
```

### 2. Create a Feature with Worktree

When creating a new feature, Speck automatically creates a worktree:

```bash
/speck:specify "Add user authentication"
```

Speck will:
1. Create a new branch (e.g., `002-user-auth`)
2. Create an isolated worktree directory
3. Copy/symlink configured files
4. Install dependencies (if enabled)
5. Launch your IDE (if enabled)

### 3. Work in Parallel

Create multiple features and switch between IDE windows:

```bash
# Create first feature
/speck:specify "Add payment processing"
# → Opens VSCode window for 002-payment-processing

# Create second feature (while first is still open)
/speck:specify "Update user profile UI"
# → Opens new VSCode window for 003-user-profile

# Both features are now running in separate worktrees
```

## Configuration Guide

### Master Switch

Enable or disable worktree integration:

```json
{
  "worktree": {
    "enabled": true  // Default: true
  }
}
```

When disabled, Speck creates branches in the main repository (classic Git workflow).

### IDE Auto-Launch

Configure which IDE to launch automatically:

```json
{
  "worktree": {
    "ide": {
      "autoLaunch": true,       // Default: false
      "editor": "vscode"        // VSCode (default)
      // Alternative options:
      // "cursor" - Cursor editor
      // "webstorm" - WebStorm
      // "idea" - IntelliJ IDEA
      // "pycharm" - PyCharm
    }
  }
}
```

**Supported IDEs**:
- **VSCode**: `vscode` (recommended - full Claude Code integration)
- **Cursor**: `cursor` (Claude Code integration)
- **JetBrains IDEs**: `webstorm`, `idea`, `pycharm` (IDE launch only)

> **Note**: Session handoff with automatic Claude Code launch only works with VSCode and Cursor. JetBrains IDEs will open the worktree but require manually starting Claude Code.

### Dependency Pre-Installation

Automatically install dependencies before the IDE opens:

```json
{
  "worktree": {
    "dependencies": {
      "autoInstall": true  // Default: false
    }
  }
}
```

Speck automatically detects your package manager (npm, yarn, pnpm, bun) and runs the appropriate install command.

**Progress indicator** shows installation status:
```
Installing dependencies with bun...
[████████████████████----] 80% (installing packages)
```

### File Copy and Symlink Rules

Control which files are copied or symlinked to worktrees:

```json
{
  "worktree": {
    "files": {
      "rules": [
        {
          "pattern": ".env*",
          "action": "copy"
        },
        {
          "pattern": "*.config.{js,ts}",
          "action": "copy"
        },
        {
          "pattern": "node_modules",
          "action": "symlink"
        },
        {
          "pattern": ".bun",
          "action": "symlink"
        }
      ],
      "includeUntracked": true  // Copy untracked files that match patterns
    }
  }
}
```

**Pattern Syntax**: Uses Bun.Glob patterns
- `*` - Match any characters except `/`
- `**` - Match any characters including `/`
- `?` - Match single character
- `[abc]` - Match character class
- `{a,b}` - Match alternatives

**Action Types**:
- `copy` - Create independent copy (changes don't affect main repo)
- `symlink` - Create symbolic link (shares with main repo)
- `ignore` - Don't copy or symlink

**Default Rules** (if not configured):
- **Copy**: `.env*`, `*.config.js`, `*.config.ts`
- **Symlink**: `node_modules`, `.bun`, `.cache` (if they exist)

### Branch Name Prefix

Add a prefix to all spec branches (e.g., `specs/002-user-auth`):

```json
{
  "worktree": {
    "branchPrefix": "specs/"  // Default: none
  }
}
```

**Note**: Using a branch prefix breaks backwards compatibility with spec-kit (spec-kit expects branches without prefixes).

### Worktree Naming

Speck automatically calculates worktree directory names based on your repository layout:

**Layout 1: Repository directory matches repository name**
```
/Users/dev/my-app/          # Main repo (directory = repo name)
/Users/dev/my-app-002-user-auth/  # Worktree (peer directory)
/Users/dev/my-app-003-payments/   # Another worktree
```

**Layout 2: Repository directory matches branch name**
```
/Users/dev/main/            # Main repo (directory = branch name)
/Users/dev/002-user-auth/   # Worktree (peer directory, no prefix)
/Users/dev/003-payments/    # Another worktree
```

Worktrees are always created as **peer directories** of the main repository (one level up).

## Session Handoff

When you open a new Claude Code session in a worktree directory, Speck automatically provides context about the feature you're working on. This is called **session handoff**.

### How It Works

1. When a worktree is created, Speck writes a **handoff document** (`.speck/handoff.md`) to the worktree
2. The handoff document contains:
   - Feature directory path
   - Available spec documents (spec.md, plan.md, tasks.md)
   - Current task progress
   - Context needed to continue work
3. When you open Claude Code in the worktree, the UserPromptSubmit hook reads the handoff document
4. Your new session immediately has context about the feature

### Handoff Document Contents

The handoff document (`.speck/handoff.md`) contains:

```markdown
# Session Handoff

## Feature Context
- **Feature Directory**: specs/002-user-auth
- **Branch**: 002-user-auth
- **Created**: 2025-11-29

## Available Documents
- spec.md - Feature specification
- plan.md - Implementation plan
- tasks.md - Task breakdown (15/20 completed)

## Current Status
Phase 3 of 5 in progress. Last task: T015 (Add login API endpoint)

## Next Steps
1. Complete T016: Add password hashing
2. Run tests for authentication module
3. Update API documentation
```

### Benefits

**Without session handoff** (traditional workflow):
```
1. Open IDE in worktree
2. Start Claude Code
3. "What feature am I working on?" → Read spec.md
4. "What's the plan?" → Read plan.md
5. "Where did I leave off?" → Read tasks.md
6. Finally start working
```

**With session handoff**:
```
1. Open IDE in worktree
2. Start Claude Code
3. Claude immediately knows the feature, plan, and current progress
4. Start working right away
```

### Configuration

Session handoff is **automatically enabled** when worktree integration is enabled. The handoff document (`.speck/handoff.md`) is always created in worktrees to provide context for new Claude Code sessions.

### Updating Handoff Documents

The handoff document is automatically updated when:
- Tasks are marked complete in tasks.md
- Plan or spec changes are made
- You run `/speck:implement` and progress is made

You can manually regenerate the handoff document:

```bash
bun .speck/scripts/worktree/cli.ts update-handoff
```

## User Stories

### User Story 1: Isolated Feature Development (P1)

**Goal**: Work on multiple features simultaneously without branch switching.

**Example**:
```bash
# Main repo on branch 'main'
cd /Users/dev/my-app

# Create first feature → worktree at /Users/dev/my-app-002-auth
/speck:specify "Add authentication"

# Create second feature → worktree at /Users/dev/my-app-003-payments
/speck:specify "Add payment processing"

# Both worktrees exist simultaneously
# Main repo still on 'main' branch
```

**Value**: Eliminate branch-switching overhead, maintain multiple working states.

### User Story 2: Automated IDE Launch (P2)

**Goal**: IDE opens automatically when worktree is created.

**Example**:
```bash
# With IDE auto-launch enabled
/speck:specify "Add user dashboard"
# → Creates worktree
# → Installs dependencies
# → Opens VSCode window pointing to worktree
# → You can start coding immediately
```

**Value**: Reduces setup time from ~30 seconds to instant.

### User Story 3: Pre-installed Dependencies (P3)

**Goal**: Dependencies install before IDE opens.

**Example**:
```bash
# With dependency auto-install enabled
/speck:specify "Add analytics tracking"
# → Creates worktree
# → Displays: "Installing dependencies with bun..."
# → Progress bar shows installation status
# → IDE opens only after installation completes
# → node_modules already populated
```

**Value**: Reduces wait time from ~1-5 minutes to zero (happens before IDE launch).

### User Story 4: Configurable Worktree Setup (P2)

**Goal**: Control file isolation and resource sharing.

**Example**:
```json
{
  "worktree": {
    "files": {
      "rules": [
        // Copy environment files (each worktree has independent config)
        { "pattern": ".env*", "action": "copy" },

        // Symlink dependencies (share to save disk space)
        { "pattern": "node_modules", "action": "symlink" },

        // Copy config files (each worktree can have different settings)
        { "pattern": "*.config.{js,ts}", "action": "copy" }
      ]
    }
  }
}
```

**Value**: Balance between isolation and disk space efficiency.

## Manual Worktree Management

### List All Worktrees

```bash
bun .speck/scripts/worktree/cli.ts list
```

**Output**:
```
Worktrees:
  002-user-auth      /Users/dev/my-app-002-user-auth     (clean)
  003-payment-flow   /Users/dev/my-app-003-payment-flow  (modified)
```

**JSON output** (for scripting):
```bash
bun .speck/scripts/worktree/cli.ts list --json
```

### Create Worktree Manually

```bash
bun .speck/scripts/worktree/cli.ts create 004-analytics
```

**Flags**:
- `--no-worktree` - Create branch without worktree (override config)
- `--no-ide` - Skip IDE launch
- `--no-deps` - Skip dependency installation
- `--reuse-worktree` - Reuse existing worktree if it exists

### Remove Worktree

```bash
bun .speck/scripts/worktree/cli.ts remove 002-user-auth
```

**Confirmation prompt**:
```
Remove worktree for branch '002-user-auth'?
  - Worktree directory: /Users/dev/my-app-002-user-auth
  - All files in worktree will be deleted
  - Git worktree reference will be removed

Continue? (yes/no):
```

### Cleanup Stale Worktrees

```bash
bun .speck/scripts/worktree/cli.ts prune
```

**Dry run** (see what would be removed):
```bash
bun .speck/scripts/worktree/cli.ts prune --dry-run
```

## Command Integration

### `/speck:specify` with Worktrees

Create a new feature specification with worktree:

```bash
/speck:specify "Add user notifications"
```

**Flags**:
- `--no-worktree` - Create branch without worktree (override config)
- `--no-ide` - Skip IDE launch
- `--no-deps` - Skip dependency installation
- `--reuse-worktree` - Reuse existing worktree if it exists

## Troubleshooting

**Common worktree issues:**
- Insufficient disk space → Run `bun .speck/scripts/worktree/cli.ts prune` to clean up
- Worktree collision → Use `--reuse-worktree` flag or remove existing worktree
- IDE launch failure → Verify `which code` works; worktree remains usable manually
- Dependency installation failure → Check network; try manual `bun install`
- Git version too old → Requires Git 2.5+

Speck automatically cleans up stale worktree references when running any worktree command.

For detailed solutions, see [Worktree Issues](/docs/getting-started/troubleshooting#worktree-issues) in the Troubleshooting Guide.

## Best Practices

### When to Use Worktrees

✅ **Use worktrees when**:
- Working on multiple features simultaneously
- Context-switching frequently between features
- Need to keep IDE windows open for different features
- Want to maintain separate dependency installations

❌ **Don't use worktrees when**:
- Working on a single feature at a time
- Limited disk space (<5 GB available)
- Project has very large dependencies (>1 GB)

### File Rule Guidelines

**Copy these files** (need isolation):
- Environment files: `.env*`
- Configuration files: `*.config.{js,ts}`
- IDE settings: `.vscode/`, `.idea/`

**Symlink these directories** (save disk space):
- Dependencies: `node_modules`, `.bun`, `vendor/`, `venv/`
- Build caches: `.cache/`, `.next/`, `.nuxt/`

**Ignore these** (handled by Git):
- Source code: `src/`, `lib/`, `app/`
- Tests: `test/`, `tests/`, `__tests__/`
- Documentation: `docs/`, `README.md`

### Disk Space Management

Monitor disk usage across worktrees:

```bash
# Check total worktree disk usage
du -sh .speck/worktrees/

# Check individual worktrees
du -sh .speck/worktrees/*
```

**Tips**:
- Symlink `node_modules` instead of separate installs (saves 100+ MB per worktree)
- Remove unused worktrees regularly
- Use `bun pm cache rm` to clear package manager cache

### Multi-Repo Considerations

Worktree configuration is **per-repository**:
- Each repo in a multi-repo setup has independent worktree config
- Shared specs don't affect worktree behavior
- Switching between single-repo and multi-repo modes doesn't affect existing worktrees

## Performance

**Worktree Creation Benchmarks**:
- Git worktree add: <1 second
- File copy/symlink: <3 seconds (typical project, <1000 files)
- Dependency install: 10-60 seconds (varies by package manager and project size)
- IDE launch: <2 seconds

**Total time** (with auto-install enabled): 15-70 seconds
**Total time** (without auto-install): 5-10 seconds

**Comparison to manual workflow**:
- Manual branch switch + stash: ~10 seconds
- Manual IDE navigation: ~5 seconds
- Manual dependency install: ~30-60 seconds
- **Total manual**: 45-75 seconds

**Worktree workflow saves**: 30-60 seconds per context switch + maintains all working states.

## Examples

### Minimal Setup (Worktrees Only)

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true
  }
}
```

Creates worktrees without IDE launch or dependency install.

### Full Automation

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true,
      "editor": "vscode"
    },
    "dependencies": {
      "autoInstall": true
    },
    "files": {
      "rules": [
        { "pattern": ".env*", "action": "copy" },
        { "pattern": "*.config.{js,ts}", "action": "copy" },
        { "pattern": "node_modules", "action": "symlink" }
      ],
      "includeUntracked": true
    }
  }
}
```

Fully automated worktree creation with all features enabled.

### JetBrains IDE Setup

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true,
      "editor": "webstorm"  // Or: idea, pycharm
    }
  }
}
```

> **Note**: JetBrains IDEs will open the worktree but don't support automatic Claude Code terminal launch. You'll need to start Claude Code manually.

### Conservative Disk Usage

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "dependencies": {
      "autoInstall": false  // Manual install to save disk space
    },
    "files": {
      "rules": [
        { "pattern": ".env*", "action": "copy" },
        { "pattern": "node_modules", "action": "symlink" },  // Share deps
        { "pattern": ".bun", "action": "symlink" },
        { "pattern": ".cache", "action": "symlink" }
      ]
    }
  }
}
```

Minimal disk usage by symlinking all large directories.

## See Also

- [Configuration Reference](/docs/configuration/speck-config) - Full `.speck/config.json` schema
- [Commands Reference](/docs/commands/reference) - All Speck commands
- [Feature Development Workflow](/docs/workflows/feature-development) - End-to-end workflow with worktrees
