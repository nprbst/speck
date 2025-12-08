---
title: "Feature Development Workflow"
description: "Complete end-to-end workflow for developing features with Speck, including worktree-based parallel development"
category: examples
audience: [existing-users, evaluators]
prerequisites: ["/docs/getting-started/quick-start", "/docs/core-concepts/workflow"]
tags: ["workflow", "worktrees", "parallel-development", "best-practices"]
lastUpdated: 2025-11-22
relatedPages: ["/docs/advanced-features/worktrees", "/docs/commands/reference"]
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
speck worktree init
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
speck worktree remove 002-user-auth

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
speck worktree prune
```

## Worktree Management Commands

### List All Worktrees

```bash
speck worktree list
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
speck worktree create 005-feature-name
```

### Remove Worktree

```bash
speck worktree remove 002-user-auth
```

### Cleanup Stale Worktrees

```bash
speck worktree prune --dry-run  # See what would be removed
speck worktree prune             # Actually remove
```

## Command Flags Reference

### Worktree Override Flags

`/speck:specify` supports these flags:

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
5. Remove worktree after PR is merged: `speck worktree remove`

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
speck worktree prune
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
- [Configuration Reference](/docs/configuration/speck-config) - `.speck/config.json` schema
- [Commands Reference](/docs/commands/reference) - All Speck commands
- [Three-Phase Workflow](/docs/core-concepts/workflow) - Specify → Plan → Implement cycle
