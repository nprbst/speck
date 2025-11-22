---
title: "Stacked PR Concepts"
description: "Understand how Speck enables breaking large features into reviewable chunks with branch dependency tracking and PR automation."
category: concepts
audience: [existing-users, evaluators]
prerequisites: ["/docs/core-concepts/workflow"]
tags: ["stacked-prs", "concepts", "branch-tracking", "workflow"]
lastUpdated: 2025-11-22
relatedPages: ["/docs/advanced-features/stacked-prs", "/docs/examples/stacked-pr-workflow", "/docs/reference/capability-matrix"]
order: 4
---

# Stacked PR Concepts

Stacked PRs allow breaking large features into multiple dependent pull requests that can be reviewed and merged sequentially. Each branch builds on the previous one through explicit parent-child relationships, enabling faster review cycles and parallel work.

## How Stacked PRs Work

### Traditional vs Stacked Workflow

**Traditional Workflow**:
- Single branch with 100+ commits
- One giant PR (slow review, high cognitive load)
- Blocked until entire feature reviewed
- All-or-nothing merge

**Stacked Workflow**:
- Multiple branches with 20-30 commits each
- Multiple reviewable PRs (faster review cycles)
- Parallel work: Start next branch while previous PR in review
- Incremental delivery: Merge completed work without waiting

### Branch Dependency Tracking

Speck tracks parent-child relationships between branches in `.speck/branches.json`:

```
main
└─ username/db-schema [20 commits, 400 lines] → PR #1
   └─ username/db-queries [30 commits, 600 lines] → PR #2
      └─ username/api-layer [25 commits, 500 lines] → PR #3
```

Each branch explicitly declares its base, creating a **dependency chain**:
- `username/db-schema` builds on `main`
- `username/db-queries` builds on `username/db-schema`
- `username/api-layer` builds on `username/db-queries`

### Natural Boundaries

Speck detects logical boundaries for creating stacked branches:

- **User story completion**: Each branch implements 1-3 related user stories
- **System boundaries**: Database layer → API endpoints → UI components
- **Clear separation**: Focused code reviews, isolated testing

**Examples of Good Boundaries**:
- Database schema migrations → Data access layer → Business logic
- Authentication models → Auth endpoints → Login UI
- Configuration setup → Core functionality → Polish & optimization

## Key Benefits

### 1. Faster Review Cycles

**Small PRs review faster**:
- 400-600 lines (reviewable in 15-30 minutes)
- Focused changes (single responsibility)
- Clear context (building on previous layer)

**Large PRs stall**:
- 2000+ lines (requires hours to review)
- Multiple concerns (hard to reason about)
- Missing context (reviewer fatigue)

### 2. Parallel Work

**While PR #1 is in review**:
- Create branch 2 based on branch 1
- Continue implementation
- No blocking on reviewer availability

**Without stacking**:
- Wait for review feedback
- Context switch to other work
- Lose momentum on feature

### 3. Incremental Delivery

**Ship value sooner**:
- Merge database layer (enables backend work)
- Merge API endpoints (enables frontend work)
- Merge UI components (ship to users)

**All-or-nothing delivery**:
- Everything blocked until feature 100% complete
- High risk (large changeset)
- Delayed value realization

### 4. Clear Dependencies

**Explicit parent-child relationships prevent**:
- Confusion about merge order
- Accidental conflicts from parallel branches
- Missing prerequisite work

## Tool Compatibility

Speck's stacked PR support is **tool-agnostic**:

### Works With
- **Graphite** (`gt create`, `gt stack`, `gt restack`)
- **GitHub Stack** (GitHub's native stacked PRs)
- **GitHub CLI** (`gh pr create`)
- **Manual git workflows** (traditional branching)

### No Vendor Lock-In
- Speck tracks metadata in `.speck/branches.json`
- Use any tool for rebasing, PR creation, merging
- Import existing stacks with `/speck.branch import`
- Zero conflicts between tools (all respect git state)

## Branch Lifecycle

### 1. Creation
```
/speck.branch create username/feature-name --base main
```
- Creates git branch
- Records dependency in `.speck/branches.json`
- Checks out new branch

### 2. Development
- Implement feature scope (1-3 user stories)
- Commit changes (20-30 commits typical)
- Push to remote when ready

### 3. PR Creation
- Auto-generated PR suggestion from commits
- Copy/paste `gh pr create` command
- Or manually create PR via GitHub web UI

### 4. Status Updates
```
/speck.branch update username/feature-name --status submitted --pr 42
```
- Track PR number and review status
- Monitor across all stacked branches

### 5. Merge & Rebase
- Merge base branch first (PR #1)
- Rebase dependent branches
- Repeat for each layer in stack

## Multi-Repo Stacked PRs

In multi-repo mode, each child repository manages **independent branch stacks**:

**Example: Microservices Architecture**
- **Backend**: `nprbst/auth-db` → `nprbst/auth-api`
- **Frontend**: `nprbst/login-ui` → `nprbst/profile-ui`
- **Notifications**: `nprbst/email-templates`

All tracked under same parent spec, view aggregate status:
```
/speck.branch list --all
```

**Key Constraint**: Branches in child A **cannot depend on** branches in child B (same-repo only).

## Performance

Stacked PR features are optimized for scale:

- **Branch lookups**: <100ms for repos with 100+ branches
- **Stack status display**: <500ms for complete dependency visualization
- **Aggregate multi-repo status**: <1 second for 10 repos, 50 total branches

Minimal overhead enables using stacked PRs for projects of any size.

## When to Use Stacked PRs

### Great For
- Features spanning multiple system layers (DB → API → UI)
- Large features (50+ commits, 1000+ lines)
- Teams with fast review turnaround
- Incremental delivery requirements

### Not Ideal For
- Tiny features (<10 commits, <200 lines)
- Hotfixes requiring immediate merge
- Teams unfamiliar with stacked workflows
- Projects with slow review cycles (>1 week)

## Next Steps

- [Stacked PR Setup Guide](/docs/advanced-features/stacked-prs) - Learn `/speck.branch` commands
- [Stacked PR Workflow Example](/docs/examples/stacked-pr-workflow) - Step-by-step tutorial
- [Multi-Repo Support](/docs/advanced-features/multi-repo-support) - Combine with multi-repo workflows
- [Capability Matrix](/docs/reference/capability-matrix) - Feature compatibility reference
