---
title: "Multi-Repo Setup"
description: "Configure Speck for multi-repository projects using symlink-based detection and shared specifications."
category: advanced-features
audience: [existing-users, evaluators]
prerequisites: ["/docs/getting-started/quick-start", "/docs/core-concepts/workflow", "/docs/core-concepts/multi-repo"]
tags: ["multi-repo", "symlinks", "speck:link", "setup"]
lastUpdated: 2025-11-22
relatedPages: ["/docs/advanced-features/monorepos", "/docs/examples/multi-repo-workflow", "/docs/reference/capability-matrix"]
order: 1
---

# Multi-Repo Setup

Set up Speck to coordinate feature development across multiple repositories using shared specifications and per-repo implementation plans and tasks.

## Prerequisites

- Speck plugin installed in Claude Code
- Two or more git repositories (e.g., frontend and backend)
- Optional: A root git repository for shared specs
- Repositories located on the same filesystem (for symlinks)

## Setup Overview

Multi-repo setup involves three steps:

1. **Create root specification directory** - Central location for shared specs
2. **Link child repositories** - Establish symlinks from child repos to root
3. **Verify configuration** - Confirm multi-repo detection is working

## Step 1: Create Root Specification Directory

The root directory contains shared specifications that all child repos reference.

### Option A: Dedicated Specifications Repository

Create a separate repository just for specifications:

```bash
# Create new repository for shared specs
mkdir shared-specs
cd shared-specs
git init
claude
```
Create your first shared specification
```
/speck:specify "User authentication with JWT tokens"
```

### Option B: Use Existing Repository as Root

Use an existing repository (e.g., backend) as the specification root:

```bash
# In your backend repository
cd backend-repo
claude
```

Create specification normally

```
/speck:specify "User authentication with JWT tokens"
```

`backend repo` IS the root - no linking needed here. Other repos will link TO this one.

**Best Practice**: Dedicated specifications repository (Option A) works best for systems where no single repo should be the "owner" of shared specs.

## Step 2: Link Child Repositories

For each child repository that will implement the shared specification:

### Using `/speck:link` Command

```bash
# From child repository (e.g., frontend)
cd frontend-repo
claude
```

Link to root specification directory

```
/speck:link ../shared-specs
```

**What this does**:
1. Creates `.speck/root` symlink pointing to `../shared-specs`
2. Enables multi-repo detection
3. Allows child repo to read shared `spec.md` files
4. Preserves ability to generate independent `plan.md` and `tasks.md`

### Relative vs Absolute Paths

**Relative paths** (recommended):
```bash
/speck:link ../shared-specs
/speck:link ../../workspace/specifications
```

**Absolute paths** (use if repos move independently _and you are working solo_):
```bash
/speck:link /Users/yourname/workspace/shared-specs
/speck:link /home/user/projects/specs
```

**Recommendation**: Use relative paths.

### Symlink Verification

Check that symlink was created correctly:

```bash
# From child repo
ls -la .speck/root

# Should show:
# .speck/root -> ../shared-specs
```

## Step 3: Verify Configuration

<!-- TODO: Rename this /speck:doctor and make it like that -->
Use `/speck:env` to verify multi-repo detection:

From child repository:

```ash
/speck:env
```

**Expected output**:
<!-- TOOD: verify -->
```yaml
Repository Mode: multi-repo-child
Root Directory: ../shared-specs
Current Feature: 001-user-auth
```

**From root repository**:
```yaml
Repository Mode: multi-repo-root
Root Directory: .
Current Feature: 001-user-auth
```

**From single-repo** (no symlink):
```yaml
Repository Mode: single-repo
Root Directory: N/A
Current Feature: 001-user-auth
```

## Working with Shared Specifications

Once linked, child repos can generate independent plans from shared specs:

### In Root Repository

Create shared specification:

```
/speck:specify "User authentication with JWT tokens"
```
```yaml
Output: specs/001-user-auth/spec.md
```

### In Child Repository A (Frontend)

Generate frontend-specific plan:
```
/speck:plan
```
```yaml
▸ Reads from: ../shared-specs/specs/001-user-auth/spec.md (shared)
▸ Writes to: specs/001-user-auth/plan.md (independent)
▸ Writes to: specs/001-user-auth/tasks.md (independent)
```

### In Child Repository B (Backend)

Generate backend-specific plan:

```
/speck:plan
```
```yaml
▸ Reads from: ../shared-specs/specs/001-user-auth/spec.md (shared)
▸ Writes to: specs/001-user-auth/plan.md (independent)
▸ Writes to: specs/001-user-auth/tasks.md (independent)
```

Each child repo creates its own implementation plan based on the shared specification.

## Shared vs Per-Repo Files

| File | Location | Sharing |
|------|----------|---------|
| `constitution.md` | Root & Child repos | Shared & Per-repo (constitutional principles) |
| `spec.md` | Root only | Shared (all repos read from root) |
| `checklists/` | Root only | Shared (project compliance checklists) |
| `contracts/` | Root only | Shared (API definitions, schemas) |
| `research.md` | Each repo | Per-repo (tech stack research) |
| `data-model.md` | Each repo (optional) | Per-repo (entity definitions) |
| `plan.md` | Each repo | Per-repo (independent implementations) |
| `tasks.md` | Each repo | Per-repo (repo-specific task breakdown) |

**Key Principle**: Specifications and contracts are shared. Implementation details are per-repo.

## Directory Structure Example

<!-- TODO: Is there a way to tighten the vertical padding in this block? -->
```bash
project/
├── shared-specs/                # Root repository
│   ├── .speck/
│   │   └── constitution.md      # Shared constitution
│   └── specs/001-user-auth/
│       ├── spec.md              # Shared specification
│       ├── contracts/           # Shared API contracts
│       │   └── auth-api.md
│       └── data-model.md        # Shared entity definitions
│
├── frontend-repo/               # Child repository A
│   ├── .speck/
│   │   └── root  ../../shared-specs  # Symlink
│   └── specs/001-user-auth/
│       ├── spec.md              # Symlink to root
│       ├── plan.md              # Frontend plan (React)
│       └── tasks.md             # Frontend tasks (UI)
│
└── backend-repo/                # Child repository B
    ├── .speck/
    │   ├── constitution.md      # Backend constitution
    │   └── root  ../../shared-specs   # Symlink
    └── specs/001-user-auth/
        ├── spec.md              # Symlink to root
        ├── plan.md              # Backend plan (Node.js)
        └── tasks.md             # Backend tasks (API)
```

## Common Workflows

### Creating New Feature Across Repos

```bash
# 1. Create shared spec in root
cd shared-specs
```
```
/speck:specify "Payment processing with Stripe"
```
```bash
# 2. Link child repos (if not already linked)
cd ../frontend-repo
```
```
/speck:link ../shared-specs
```
```bash
cd ../backend-repo
```
```
/speck:link ../shared-specs
```
```bash
# 3. Generate plans in each child
cd ../frontend-repo
```
```
/speck:plan  # Creates frontend plan
```
```bash
cd ../backend-repo
```
```
/speck:plan  # Creates backend plan
```
```bash
# 4. Implement in parallel
# Each team works on their plan independently
```

### Updating Shared Specification

```bash
# 1. Update spec in root
cd shared-specs
# Edit specs/001-user-auth/spec.md

# 2. Regenerate plans in child repos
cd ../frontend-repo
claude
```
```
/speck:plan  # Regenerates frontend plan with changes
```
```bash
cd ../backend-repo
claude
```
```
/speck:plan  # Regenerates backend plan with changes
```

## Troubleshooting

**Common multi-repo issues:**
- Symlink missing or broken → Check with `ls -la .speck/root`
- Spec file not found → Verify symlink points to correct directory
- Plans out of sync → Regenerate plans with `/speck:plan` in each repo

For detailed solutions, see [Multi-Repo Issues](/docs/getting-started/troubleshooting#multi-repo-issues) in the Troubleshooting Guide.

## Advanced Configuration

### Per-Repo Constitutions

Speck extends [spec-kit](https://github.com/github/spec-kit)'s constitution concept to support per-repository governance in multi-repo environments. Each child repo can have its own constitution with different architectural principles:

```bash
# Frontend repo constitution
cd frontend-repo
/speck:constitution

# Principles:
# - React components must be functional
# - State management via Redux
# - CSS-in-JS with styled-components

# Backend repo constitution
cd backend-repo
/speck:constitution

# Principles:
# - RESTful API design
# - PostgreSQL for persistence
# - Express.js middleware pattern
```

### Selective Sharing

You can choose which files to share:

**Fully Shared** (default):
- `spec.md` + `contracts/` + `data-model.md`

**Spec Only**:
- Only `spec.md` shared
- Contracts defined per-repo (microservices with different protocols)

**Custom Sharing**:
- Share `spec.md` and some contracts
- Other contracts per-repo (mixed HTTP/gRPC APIs)

## Next Steps

- [Multi-Repo Workflow Example](/docs/examples/multi-repo-workflow) - Complete frontend/backend tutorial
- [Worktree Integration](/docs/advanced-features/worktrees) - Combine multi-repo with worktree workflows
- [Capability Matrix](/docs/reference/capability-matrix) - Feature compatibility reference
- [Monorepos](/docs/advanced-features/monorepos) - Monorepo workspace management
