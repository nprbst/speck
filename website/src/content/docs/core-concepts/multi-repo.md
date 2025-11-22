---
title: "Multi-Repo Concepts"
description: "Understand how Speck detects multi-repo contexts, manages shared specifications, and coordinates implementations across repositories."
category: core-concepts
audience: [existing-users, evaluators]
prerequisites: ["/docs/core-concepts/workflow"]
tags: ["multi-repo", "concepts", "symlinks", "architecture"]
lastUpdated: 2025-11-22
relatedPages: ["/docs/advanced-features/multi-repo-support", "/docs/advanced-features/monorepos"]
---

# Multi-Repo Concepts

Speck supports multi-repository projects through symlink-based detection, shared specifications, and per-repo implementation plans. This enables coordinated feature development across frontend, backend, and other microservices while maintaining independent implementation details.

## How Multi-Repo Works

### Symlink Detection

Speck detects multi-repo contexts by checking for a `.speck/root` symlink in your repository. When this symlink exists and points to a parent directory containing specifications, Speck automatically switches to multi-repo mode.

**Detection Process**:
1. Check for `.speck/root` symlink
2. Verify symlink points to valid specification directory
3. Enable multi-repo features (shared specs, per-repo plans)
4. Display multi-repo context in `/speck.env`

**Performance**: Symlink detection adds <10ms overhead (median) to command execution.

### Shared Specifications

In multi-repo mode, the **specification** (`spec.md`) lives at the root level and is shared across all child repositories. This ensures:

- **Single source of truth**: All repos reference the same feature requirements
- **Consistent understanding**: Everyone implements from the same specification
- **Contract-based coordination**: APIs and interfaces defined in shared contracts

**What's Shared**:
- `spec.md` - Feature specification (requirements, acceptance criteria)
- `contracts/` - API definitions, data schemas, interface contracts
- `data-model.md` - Shared entity definitions (optional)

**What's NOT Shared**:
- `plan.md` - Each repo generates independent implementation plan
- `tasks.md` - Each repo has unique task breakdown
- `.speck/memory/constitution.md` - Per-repo architectural principles

### Per-Repo Implementation Plans

Each child repository generates its own `plan.md` and `tasks.md` from the shared specification. This allows:

- **Independent architectures**: Frontend uses React, backend uses Node.js
- **Different tech stacks**: Each repo chooses appropriate tools
- **Parallel development**: Teams work independently with shared contracts as integration points
- **Per-repo constitutions**: Different architectural principles per codebase

**Example**:
```
Root repo (shared-specs):
  specs/001-user-auth/
    ├── spec.md (shared)
    ├── contracts/ (shared)
    └── data-model.md (shared)

Child repo A (frontend):
  .speck/root → ../shared-specs
  specs/001-user-auth/
    ├── spec.md (symlink to root)
    ├── plan.md (independent - React implementation)
    └── tasks.md (independent - UI tasks)

Child repo B (backend):
  .speck/root → ../shared-specs
  specs/001-user-auth/
    ├── spec.md (symlink to root)
    ├── plan.md (independent - Node.js implementation)
    └── tasks.md (independent - API tasks)
```

## Repository Modes

Speck supports three repository modes:

### Single-Repo

Traditional single-repository project. All code lives in one repo. No symlinks, no shared specs.

**When to Use**:
- Monolithic applications
- Simple projects with all code in one place
- No cross-repo coordination needed

### Multi-Repo Root

The root repository containing shared specifications. Other repos link to it.

**Characteristics**:
- Contains canonical `spec.md` files
- No `.speck/root` symlink (it IS the root)
- Manages shared contracts and data models
- May or may not contain implementation code

**When to Use**:
- Central specifications repository for microservices
- Coordinating features across multiple repos
- Managing API contracts for distributed systems

### Multi-Repo Child

A repository linked to a multi-repo root via `.speck/root` symlink.

**Characteristics**:
- Has `.speck/root` symlink pointing to root repo
- Reads `spec.md` from root (shared)
- Generates independent `plan.md` and `tasks.md`
- Implements its portion of shared specification

**When to Use**:
- Implementing frontend for shared feature
- Implementing backend API for shared feature
- Any service in microservices architecture

## Cross-Repo Coordination

Multi-repo support enables coordination without tight coupling:

**What Speck Provides**:
- Shared specifications (requirements, contracts)
- Per-repo implementation plans
- Aggregate status view (`/speck.env` from root)
- Independent branch stacks per repo (with spec 009)

**What Speck Does NOT Provide**:
- Automatic synchronization of implementation progress
- Cross-repo branch dependencies
- Unified task view across all repos

**Coordination Strategy**:
1. Define shared API contracts in `spec.md` contracts section
2. Each repo implements its side of the contract independently
3. Use manual review to verify contract compliance
4. Test integration points explicitly

## Monorepo Support

Monorepos (single repo with multiple workspaces) are detected automatically when:
- Workspace configuration exists (`package.json` workspaces, `lerna.json`, etc.)
- Multiple project directories present

Speck treats monorepo workspaces similarly to multi-repo child contexts for cross-workspace coordination.

See [Monorepos documentation](/docs/advanced-features/monorepos) for details.

## Performance Characteristics

**Multi-Repo Detection**:
- Single-repo: <2ms median overhead
- Multi-repo root: <10ms median overhead
- Multi-repo child: <10ms median overhead (symlink resolution)

**Branch Lookups** (with spec 009):
- Single-repo: <100ms for 100 stacked branches
- Multi-repo child: <150ms for 100 stacked branches

**Aggregate Status** (with spec 009):
- <1 second for 10 repos, 50 total branches (p95)

Multi-repo features add minimal performance overhead while enabling powerful coordination capabilities.

## Next Steps

- [Multi-Repo Setup Guide](/docs/advanced-features/multi-repo-support) - Step-by-step setup instructions
- [Multi-Repo Workflow Example](/docs/examples/multi-repo-workflow) - Complete frontend/backend example
- [Monorepos](/docs/advanced-features/monorepos) - Monorepo workspace management
- [Capability Matrix](/docs/reference/capability-matrix) - Feature compatibility reference
