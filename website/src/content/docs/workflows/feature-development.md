---
title: "Feature Development Workflow"
description: "Complete end-to-end workflow for developing features with Speck, including worktree-based parallel development"
category: examples
audience: [existing-users, evaluators]
prerequisites: ["/docs/getting-started/quick-start", "/docs/core-concepts/workflow"]
tags: ["workflow", "worktrees", "parallel-development", "best-practices"]
lastUpdated: 2025-11-22
relatedPages: ["/docs/advanced-features/worktrees", "/docs/advanced-features/stacked-prs", "/docs/commands/reference"]
order: 4
---

# Feature Development Workflow

Complete end-to-end workflow for developing features with Speck, including worktree-based parallel development for working on multiple features simultaneously.

## Overview

Speck supports two feature development workflows:

1. **Traditional Workflow**: Single working directory with branch switching (classic Git)
2. **Worktree Workflow**: Multiple isolated worktrees for parallel development (requires [worktree integration](/docs/advanced-features/worktrees))

This guide covers both workflows and when to use each.

## Traditional Workflow (Single Working Directory)

### When to Use

✅ **Use traditional workflow when**:
- Working on a single feature at a time
- Limited disk space (<5 GB available)
- Simple projects without complex dependencies
- Quick bug fixes or small changes

### Complete Example

```bash
# 1. Create specification
/speck:specify "Add user profile editing feature"

# 2. Clarify ambiguities (optional but recommended)
/speck:clarify
# Answer questions about requirements, edge cases, scope

# 3. Generate implementation plan
/speck:plan
# Review: plan.md, research.md, data-model.md, contracts/, quickstart.md

# 4. Generate task breakdown
/speck:tasks
# Review: tasks.md with dependency-ordered tasks

# 5. Execute implementation
/speck:implement
# Tasks execute automatically in dependency order

# 6. Validate (optional)
/speck:analyze
# Check for spec/plan/task inconsistencies

# 7. Commit and push
git add .
git commit -m "feat: add user profile editing

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin 002-user-profile
```

**Time to completion**: 30-90 minutes (depending on feature complexity)

## Worktree Workflow (Parallel Development)

### When to Use

✅ **Use worktree workflow when**:
- Working on multiple features simultaneously
- Frequent context-switching between features
- Need to keep multiple IDE windows open
- Want separate dependency installations per feature
- Reviewing code while developing another feature

### Setup (One-Time)

**Option 1: Interactive Setup Wizard**

```bash
bun .speck/scripts/worktree/cli.ts init
```

**Option 2: Manual Configuration**

Create `.speck/config.json`:

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true,
      "editor": "code"  // or "cursor", "webstorm", etc.
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

### Complete Example (Parallel Features)

**Scenario**: You're working on three features simultaneously:
1. User authentication (Priority 1)
2. Analytics dashboard (Priority 2)
3. Admin settings panel (Priority 3)

#### Feature 1: User Authentication

```bash
# Create first feature → worktree at ../my-app-002-user-auth/
/speck:specify "Add user authentication with email/password"
# → Worktree created
# → Dependencies installed automatically
# → VSCode opens pointing to worktree

# Continue with normal workflow in VSCode window 1
/speck:clarify
/speck:plan
/speck:tasks
/speck:implement
```

#### Feature 2: Analytics Dashboard (While Feature 1 is Open)

```bash
# Create second feature → worktree at ../my-app-003-analytics-dashboard/
/speck:specify "Add analytics dashboard with charts"
# → New worktree created
# → New VSCode window opens
# → Feature 1 worktree and VSCode window remain open

# Work on Feature 2 in VSCode window 2
/speck:plan
/speck:tasks
/speck:implement
```

#### Feature 3: Admin Settings (While Features 1 & 2 are Open)

```bash
# Create third feature → worktree at ../my-app-004-admin-settings/
/speck:specify "Add admin settings panel"
# → Third worktree created
# → Third VSCode window opens
# → Features 1 and 2 remain open

# Work on Feature 3 in VSCode window 3
```

**Result**: Three IDE windows, three isolated worktrees, no branch switching!

### Context Switching

Switch between features by clicking IDE windows:

```
Window 1: my-app-002-user-auth/       (branch: 002-user-auth)
Window 2: my-app-003-analytics/       (branch: 003-analytics-dashboard)
Window 3: my-app-004-admin-settings/  (branch: 004-admin-settings)
Main repo: my-app/                     (branch: main)
```

**No branch switching** - each worktree maintains its own working state.

### Cleanup After Feature Completion

```bash
# Remove worktree when feature is complete
bun .speck/scripts/worktree/cli.ts remove 002-user-auth

# Confirmation prompt:
# Remove worktree for branch '002-user-auth'?
#   - Worktree directory: /Users/dev/my-app-002-user-auth
#   - All files in worktree will be deleted
#   - Git worktree reference will be removed
# Continue? (yes/no): yes

# ✓ Worktree removed
```

**Cleanup stale worktrees** (manually deleted directories):

```bash
bun .speck/scripts/worktree/cli.ts prune
```

## Worktree + Stacked PRs Workflow

Combine worktrees with stacked PRs for maximum productivity on large features.

### Scenario: Large Feature (Multi-Layer Implementation)

**Feature**: Add complete payment processing system
**Layers**: Database → API → UI → Testing

#### Layer 1: Database Schema

```bash
# Main feature branch (no worktree needed, just tracking)
git checkout -b username/payment-processing

# Create first stacked branch with worktree
/speck:branch create username/payment-db --base username/payment-processing
# → Worktree created at ../my-app-username-payment-db/
# → VSCode opens in worktree

# Implement database layer
/speck:specify "Add payment database schema"
/speck:plan
/speck:implement

# Commit and create PR
git add .
git commit -m "feat: add payment database schema"
git push origin username/payment-db
gh pr create --base username/payment-processing
```

#### Layer 2: API Endpoints (Depends on DB)

```bash
# Create second stacked branch with new worktree
/speck:branch create username/payment-api --base username/payment-db
# → New worktree at ../my-app-username-payment-api/
# → New VSCode window opens
# → DB worktree remains open

# Implement API layer
/speck:specify "Add payment API endpoints"
/speck:plan
/speck:implement

# Commit and create stacked PR
git add .
git commit -m "feat: add payment API endpoints"
git push origin username/payment-api
gh pr create --base username/payment-db  # Stacked on DB PR
```

#### Layer 3: UI Components (Depends on API)

```bash
# Create third stacked branch with new worktree
/speck:branch create username/payment-ui --base username/payment-api
# → Third worktree
# → Third VSCode window
# → API and DB worktrees remain open

# Implement UI layer
/speck:specify "Add payment UI components"
/speck:plan
/speck:implement
```

**Result**: Three worktrees, three VSCode windows, three PRs (stacked), no branch switching!

**PR Stack**:
```
main
└── username/payment-processing (base branch)
    └── username/payment-db (PR #101)
        └── username/payment-api (PR #102, depends on #101)
            └── username/payment-ui (PR #103, depends on #102)
```

## Worktree Management Commands

### List All Worktrees

```bash
bun .speck/scripts/worktree/cli.ts list
```

**Output**:
```
Worktrees:
  002-user-auth        /Users/dev/my-app-002-user-auth         (clean)
  003-analytics        /Users/dev/my-app-003-analytics         (modified)
  004-admin-settings   /Users/dev/my-app-004-admin-settings    (clean)
```

### Create Worktree Manually

```bash
bun .speck/scripts/worktree/cli.ts create 005-feature-name
```

### Remove Worktree

```bash
bun .speck/scripts/worktree/cli.ts remove 002-user-auth
```

### Cleanup Stale Worktrees

```bash
bun .speck/scripts/worktree/cli.ts prune --dry-run  # See what would be removed
bun .speck/scripts/worktree/cli.ts prune             # Actually remove
```

## Command Flags Reference

### Worktree Override Flags

Both `/speck:specify` and `/speck:branch` support these flags:

- `--no-worktree` - Create branch without worktree (override config)
- `--no-ide` - Skip IDE auto-launch (override config)
- `--no-deps` - Skip dependency installation (override config)
- `--reuse-worktree` - Reuse existing worktree if it exists

**Examples**:

```bash
# Create spec without worktree (even if config enables it)
/speck:specify "Quick bug fix" --no-worktree

# Create worktree but skip IDE launch
/speck:specify "Background task feature" --no-ide

# Create worktree, skip dependency install (install manually later)
/speck:specify "New API endpoint" --no-deps

# Reuse existing worktree directory
/speck:specify "Resume work on feature" --reuse-worktree
```

## Best Practices

### Disk Space Management

**Monitor disk usage**:

```bash
du -sh .speck/worktrees/        # Total worktree usage
du -sh .speck/worktrees/*       # Individual worktree usage
```

**Tips for conserving disk space**:
1. Symlink `node_modules` instead of separate installs
2. Remove completed worktrees promptly
3. Use `--no-deps` flag if you don't need dependencies immediately
4. Clear package manager cache: `bun pm cache rm --all`

### When to Create Worktrees

✅ **Create worktrees for**:
- Features you'll work on in parallel
- Long-running development (>1 day)
- Features requiring separate dependencies
- Code review while developing another feature

❌ **Don't create worktrees for**:
- Quick bug fixes (<30 minutes)
- Tiny changes (<10 lines)
- Experimental throwaway code

### Worktree Lifecycle

**Typical lifecycle**:
1. Create worktree: `/speck:specify` or `/speck:branch create`
2. Develop feature over days/weeks
3. Commit and push regularly
4. Create PR when ready
5. Remove worktree after PR is merged: `bun .speck/scripts/worktree/cli.ts remove`

**Don't let worktrees accumulate** - remove them when features are merged.

### Multi-Repo Considerations

Worktree configuration is **per-repository**:
- Each repo in multi-repo setup has independent worktree config
- Shared specs (via `/speck:link`) don't affect worktree behavior
- Child repos can have different worktree settings than root repo

**Example**:
```
root-repo/
├── .speck/config.json  → worktrees enabled
└── specs/001-auth/

frontend-repo/
├── specs/ → symlink to root-repo/specs/
└── .speck/config.json  → worktrees disabled (simpler workflow)

backend-repo/
├── specs/ → symlink to root-repo/specs/
└── .speck/config.json  → worktrees enabled with auto-install
```

### Stacked PRs with Worktrees

**Best practice**: One worktree per stacked branch

```bash
# Base feature (no worktree needed)
git checkout -b username/feature-base

# Stack 1: Database layer
/speck:branch create username/feature-db --base username/feature-base
# → Worktree 1

# Stack 2: API layer
/speck:branch create username/feature-api --base username/feature-db
# → Worktree 2

# Stack 3: UI layer
/speck:branch create username/feature-ui --base username/feature-api
# → Worktree 3
```

**Result**: Three worktrees, three PRs, independent development.

## Troubleshooting

### Worktree Creation Fails

**Error**: Insufficient disk space
```
Error: Insufficient disk space
  Available: 512 MB
  Required: 1 GB minimum
```

**Solution**: Free up space or disable dependency auto-install.

### IDE Doesn't Launch

**Error**: Failed to launch IDE
```
Error: Failed to launch IDE
  Command: code /Users/dev/my-app-002-feature
  Exit code: 127
```

**Solution**: Verify IDE is installed and command is in PATH:
```bash
which code  # Should show path to VSCode CLI
```

### Dependency Installation Hangs

**Symptom**: Installation progress stuck at same percentage

**Solution**:
1. Cancel with Ctrl+C
2. Disable auto-install: `"autoInstall": false` in config
3. Create worktree: `/speck:specify "Feature" --no-deps`
4. Install manually: `cd ../my-app-002-feature && bun install`

### Stale Worktree References

**Symptom**: `git worktree list` shows worktrees that don't exist

**Solution**: Run cleanup
```bash
bun .speck/scripts/worktree/cli.ts prune
```

## Performance Benchmarks

**Worktree Creation** (typical project):
- Git worktree add: <1 second
- File copy/symlink: 1-3 seconds (<1000 files)
- Dependency install: 10-60 seconds (varies by package manager)
- IDE launch: <2 seconds

**Total**: 15-70 seconds (with auto-install enabled)

**Comparison to manual workflow**:
- Manual branch switch: ~5 seconds
- Manual dependency install: ~30-60 seconds
- Manual IDE navigation: ~5 seconds
- **Manual total**: 40-70 seconds

**Worktree advantage**: Maintains all working states - no repeated setup when switching back.

## See Also

- [Worktree Integration Guide](/docs/advanced-features/worktrees) - Complete worktree feature documentation
- [Stacked PR Setup](/docs/advanced-features/stacked-prs) - Stacked PR workflow without worktrees
- [Configuration Reference](/docs/configuration/speck-config) - `.speck/config.json` schema
- [Commands Reference](/docs/commands/reference) - All Speck commands
- [Three-Phase Workflow](/docs/core-concepts/workflow) - Specify → Plan → Implement cycle
