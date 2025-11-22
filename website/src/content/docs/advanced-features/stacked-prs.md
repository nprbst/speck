---
title: "Stacked PR Setup"
description: "Configure Speck to break large features into reviewable chunks using branch dependency tracking and PR automation."
category: "advanced-features"
order: 3
tags: ["stacked-prs", "speck.branch", "setup", "workflow"]
lastUpdated: 2025-11-22
---

# Stacked PR Setup

Set up Speck to break large features into multiple dependent pull requests with automatic branch tracking and PR automation.

## Prerequisites

- Speck plugin installed in Claude Code
- Git repository initialized
- Basic familiarity with git branching

**No additional tools required** - stacked PRs work with any git workflow.

## When to Use Stacked PRs vs Single-Branch

### Use Stacked PRs When

✅ **Feature spans multiple system layers**
- Database schema → Data access → Business logic → API → UI
- Each layer is independently reviewable

✅ **Large feature (50+ commits, 1000+ lines)**
- Breaking into chunks reduces reviewer cognitive load
- Parallel work while waiting for reviews

✅ **Fast review turnaround (<2 days)**
- Team can review and merge PRs quickly
- Blocking time minimized

✅ **Incremental delivery valuable**
- Ship database layer to unblock backend team
- Ship API to unblock frontend team

### Use Single-Branch When

❌ **Tiny feature (<10 commits, <200 lines)**
- Overhead of multiple PRs not worth it
- Single PR review fast enough

❌ **Hotfix requiring immediate merge**
- No time for stacked workflow
- Ship directly to main/production

❌ **Slow review cycles (>1 week per PR)**
- Stacking amplifies blocking
- Single PR may be faster overall

❌ **Team unfamiliar with stacked workflows**
- Learning curve adds friction
- Stick with familiar processes

## Setup: Create Your First Stack

### Step 1: Start Feature Branch

Create the base branch for your feature:

```bash
# In Claude Code
/speck.branch create username/auth-feature --base main
```

This creates a new branch and tracks it in `.speck/branches.json`.

### Step 2: Implement First Layer

Focus on the foundational layer (e.g., database schema, data models):

```bash
# Work on database schema
# Commit changes as you go
git add .
git commit -m "Add user table schema"
git commit -m "Add authentication tokens table"
```

### Step 3: Create PR for First Layer

Push and create PR:

```bash
git push -u origin username/auth-feature
```

Speck auto-generates PR suggestion:

```bash
# Copy this command:
gh pr create --title "Add authentication database schema" \
  --body "Implements user and token tables for JWT authentication" \
  --base main
```

Update Speck with PR number:

```bash
/speck.branch update username/auth-feature --status submitted --pr 123
```

### Step 4: Start Second Layer (While PR #1 in Review)

Create next branch **based on first branch**:

```bash
/speck.branch create username/auth-api --base username/auth-feature
```

Now you can continue working while PR #123 is being reviewed!

### Step 5: Repeat for Additional Layers

```bash
# After completing API endpoints
git push -u origin username/auth-api
gh pr create --title "Add authentication API endpoints" --base username/auth-feature

/speck.branch update username/auth-api --status submitted --pr 124

# Create third layer for UI
/speck.branch create username/auth-ui --base username/auth-api
```

Your stack now looks like:

```
main
└─ username/auth-feature [PR #123] → Database schema
   └─ username/auth-api [PR #124] → API endpoints
      └─ username/auth-ui [WIP] → Login UI
```

## Managing Your Stack

### View All Branches

```bash
/speck.branch list
```

**Output:**
```
Branch                  Base                    Spec    PR#   Status
username/auth-feature   main                    008     123   submitted
username/auth-api       username/auth-feature   008     124   submitted
username/auth-ui        username/auth-api       008     -     active
```

### Check Stack Health

```bash
/speck.branch status
```

**Output:**
```
✓ No circular dependencies
⚠ username/auth-feature merged - rebase dependent branches
✓ All active branches up to date
```

### Update Branch Metadata

```bash
# Mark PR as merged
/speck.branch update username/auth-feature --status merged

# Change PR number
/speck.branch update username/auth-api --pr 125

# Rebase to new base
/speck.branch update username/auth-ui --base username/auth-api
```

## Working with External Tools

### Graphite Integration

If using Graphite for stacked PR management:

```bash
# Create stack with Graphite
gt create username/db-layer
gt create username/api-layer -p username/db-layer

# Import into Speck tracking
/speck.branch import --pattern 'username/*'
```

Both tools work together:
- **Graphite**: Rebasing (`gt restack`), PR creation
- **Speck**: Task tracking, spec alignment, status visibility

### GitHub CLI (gh)

Speck auto-generates `gh pr create` commands but **doesn't execute them**:

```bash
# Speck suggests:
gh pr create --title "..." --body "..." --base main

# You run it manually or copy/paste
```

**If gh not installed**:
- Speck displays manual PR URL: `https://github.com/owner/repo/compare/base...branch`
- Create PR via GitHub web UI

### Manual Workflow (No Tools)

Stacked PRs work perfectly without any external tools:

1. Create branches: `/speck.branch create <name> --base <parent>`
2. Push to remote: `git push -u origin <name>`
3. Create PR manually via GitHub web UI
4. Update metadata: `/speck.branch update <name> --pr <number> --status submitted`

## Advanced Features

### Import Existing Branches

Already have git branches? Import them into Speck tracking:

```bash
# Import all branches matching pattern
/speck.branch import --pattern 'username/*'

# Import specific branch
/speck.branch import username/feature-branch
```

Speck analyzes git upstream relationships to infer parent-child dependencies.

### Branch-Specific Tasks

Filter task breakdown to specific branch scope:

```bash
# Generate tasks only for this branch's user stories
/speck.tasks --branch username/auth-api --stories US2,US3
```

Reduces cognitive load by showing only relevant tasks.

### Multi-Repo Stacked PRs

In multi-repo mode, each child repository manages independent stacks:

```bash
# In root repo
/speck.branch list --all
```

**Output:**
```
=== backend-service ===
username/auth-db → username/auth-api

=== frontend-app ===
username/login-ui → username/profile-ui
```

**Limitation**: Branches in `backend-service` **cannot depend on** branches in `frontend-app` (same-repo only).

## Troubleshooting

### Circular dependency detected

**Error**: "Cannot create branch: circular dependency detected"

**Cause**: Trying to create `A → B → A` cycle

**Fix**: Choose different base branch

### Base branch already merged

**Warning**: "Base branch merged - rebase recommended"

**Cause**: PR #123 merged, but dependent branches still point to it

**Fix**: Rebase dependent branches to new base (usually `main`)

```bash
git checkout username/auth-api
git rebase main
git push --force-with-lease

/speck.branch update username/auth-api --base main
```

### PR number mismatch

**Issue**: Speck shows wrong PR number

**Cause**: Manual PR creation without updating metadata

**Fix**: Update metadata manually

```bash
/speck.branch update username/auth-api --pr 125
```

## Next Steps

- [Stacked PR Workflow Example](/docs/examples/stacked-pr-workflow) - Complete step-by-step tutorial
- [Multi-Repo Support](/docs/advanced-features/multi-repo-support) - Combine with multi-repo workflows
- [Commands Reference](/docs/commands/reference) - Full `/speck.branch` command syntax
- [Capability Matrix](/docs/reference/capability-matrix) - Feature compatibility reference
