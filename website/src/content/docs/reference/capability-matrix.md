---
title: "Capability Matrix"
description: "Feature compatibility reference showing which Speck capabilities are supported across single-repo, multi-repo root, and multi-repo child contexts."
category: "reference"
order: 1
tags: ["reference", "compatibility", "multi-repo", "stacked-pr", "features"]
lastUpdated: 2025-11-22
---

# Capability Matrix

This reference table shows feature compatibility across different Speck usage contexts. Use this to understand which capabilities are available in your repository setup.

**Covers**: Specifications 007-010 (Multi-repo support, Stacked PRs, Virtual Commands)

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
| Symlink detection | N/A (Single repo) | ✅ Supported | ✅ Supported (via `.speck/root`) | Requires manual `/speck.link` setup in child repos |
| Shared specifications | N/A (Single repo) | ✅ Supported | ✅ Supported | Spec lives at root, children reference via symlink |
| Per-repo implementation plans | N/A (Single repo) | ✅ Supported | ✅ Supported | Each repo generates independent `plan.md` from shared spec |
| Cross-repo coordination | N/A (Single repo) | ⚠️ Manual (via shared spec) | ⚠️ Manual (via shared spec) | No automatic synchronization - requires manual review |
| `/speck.link` command | N/A (Single repo) | N/A (Root doesn't link) | ✅ Supported | Creates `.speck/root` symlink to parent directory |
| `/speck.env` multi-repo detection | N/A (Single repo) | ✅ Supported (Shows root) | ✅ Supported (Shows child) | Displays current repository context and linked root |

## Stacked PR Features (Spec 008)

| Feature | Single-Repo | Multi-Repo Root | Multi-Repo Child | Limitations |
|---------|-------------|-----------------|------------------|-------------|
| Create stacked branches | ✅ Supported | ✅ Supported | ⚠️ Limited (Spec 008) | Spec 008: Not supported in child repos |
| Track branch dependencies | ✅ Supported | ✅ Supported | ⚠️ Limited (Spec 008) | Spec 008: Not supported in child repos |
| Automatic PR creation | ✅ Supported | ✅ Supported | ⚠️ Limited (Spec 008) | Spec 008: Not supported in child repos |
| Branch-aware task generation | ✅ Supported | ✅ Supported | ⚠️ Limited (Spec 008) | Spec 008: Not supported in child repos |
| Stack status view | ✅ Supported | ✅ Supported | ⚠️ Limited (Spec 008) | Spec 008: Not supported in child repos |
| Tool compatibility (Graphite, etc.) | ✅ Supported | ✅ Supported | ⚠️ Limited (Spec 008) | Spec 008: Not supported in child repos |

## Multi-Repo Stacked PRs (Spec 009)

| Feature | Single-Repo | Multi-Repo Root | Multi-Repo Child | Limitations |
|---------|-------------|-----------------|------------------|-------------|
| Independent stacks per child repo | N/A (Single repo) | ✅ Supported | ✅ Supported (Spec 009) | Each child maintains separate `.speck/branches.json` |
| Cross-repo stack visibility | N/A (Single repo) | ✅ Supported | ✅ Supported (Spec 009) | `/speck.env` shows aggregate view across all repos |
| Aggregate branch commands | N/A (Single repo) | ✅ Supported | ✅ Supported (Spec 009) | `--all` flag shows branches from root + all children |
| Cross-repo branch validation | N/A (Single repo) | ✅ Supported | ✅ Supported (Spec 009) | Prevents invalid cross-repo base branches |
| Child-specific PR creation | N/A (Single repo) | N/A (Root manages own PRs) | ✅ Supported (Spec 009) | PRs target child repo remote with `[repo-name]` prefix |

## Virtual Commands & Hooks (Spec 010)

| Feature | Single-Repo | Multi-Repo Root | Multi-Repo Child | Limitations |
|---------|-------------|-----------------|------------------|-------------|
| Virtual command pattern | ✅ Supported | ✅ Supported | ✅ Supported | Simple commands: `speck-env`, `speck-branch`, etc. |
| Automatic prerequisite checks | ✅ Supported | ✅ Supported | ✅ Supported | PrePromptSubmit hook runs before slash commands |
| Hook-based routing | ✅ Supported | ✅ Supported | ✅ Supported | Transparent interception and execution |
| Dual-mode CLI | ✅ Supported | ✅ Supported | ✅ Supported | Scripts work standalone (testing) and hook-invoked (Claude) |
| Context pre-loading | ✅ Supported | ✅ Supported | ✅ Supported | Feature directory and docs injected into prompt |
| Performance improvements | ✅ Supported | ✅ Supported | ✅ Supported | 30% faster slash command execution |

## Feature Progression Notes

### Stacked PR Evolution (Specs 008 → 009)

**Spec 008**: Stacked PRs supported in single-repo and multi-repo root contexts only. Child repos could not use stacked PRs.

**Spec 009**: Extended stacked PR support to multi-repo child contexts. Each child repo maintains independent stack in separate `.speck/branches.json` file.

This progression demonstrates capability expansion while maintaining backwards compatibility.

## Detailed Limitations

### Multi-Repo Coordination (Spec 007)

**Limitation**: Cross-repo coordination is manual via shared specification and contracts.

**What's Supported**:
- Shared `spec.md` at root level (single source of truth)
- Per-repo `plan.md` and `tasks.md` (independent implementations)
- Per-repo constitutions (different architectural principles allowed)

**What's NOT Supported**:
- Automatic synchronization of implementation progress
- Cross-repo branch dependencies (e.g., "backend PR #2 depends on frontend PR #5")
- Unified task view across all child repos

**Workaround**: Use shared contracts in `spec.md` to define APIs and interfaces. Each child repo implements its side of the contract independently.

### Stacked PRs in Multi-Repo Child (Spec 008 vs 009)

**Spec 008 Limitation**: Child repos in multi-repo setup could not use stacked PRs. If you needed stacking, you had to work in single-repo or multi-repo root context.

**Spec 009 Resolution**: Child repos now support independent stacked PRs. Each child maintains its own `.speck/branches.json` file, allowing parallel stacking across child repos.

**Example**:
```
Root repo: main → 007-multi-repo (PR #1)
Child repo A (frontend): 007-multi-repo → ui-components (PR #2) → api-integration (PR #3)
Child repo B (backend): 007-multi-repo → api-endpoints (PR #4) → database-layer (PR #5)
```

**Remaining Limitation**: No cross-repo branch dependencies. Cannot make `backend PR #5` depend on `frontend PR #3`.

### Performance Overhead

**Multi-Repo Detection** (Spec 007):
- Single-repo: <2ms median detection overhead (minimal)
- Multi-repo root: <10ms median detection overhead
- Multi-repo child: <10ms median detection overhead (symlink resolution)

**Branch Lookups** (Spec 009):
- Single-repo: <100ms for 100 stacked branches
- Multi-repo child: <150ms for 100 stacked branches (50ms overhead for multi-repo context)

**Aggregate Status** (Spec 009):
- <1 second for 10 repos, 50 total branches (p95)

**Hook Execution** (Spec 010):
- <100ms hook latency (trigger to CLI execution start)
- 30% faster slash command execution vs manual prerequisite checks

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

### When to Use Stacked PRs

**Use Stacked PRs When**:
- Feature is too large for single PR review
- Work has natural logical boundaries (e.g., user stories)
- You want parallel review for faster delivery
- Breaking feature into reviewable chunks improves quality

**Skip Stacked PRs When**:
- Feature is small enough for single PR (avoid over-engineering)
- No clear logical boundaries in the work
- Team unfamiliar with stacked PR workflows (learning curve)
- Working solo with no review constraints

### Combining Multi-Repo + Stacked PRs

**Scenario**: Multi-repo project where each child repo needs stacked PRs.

**Solution** (requires Spec 009):
1. Set up multi-repo structure via `/speck.link` in each child repo
2. Create shared specification at root level
3. In each child repo, use `/speck.branch create` to stack work
4. Each child repo maintains independent stack (separate `.speck/branches.json`)
5. Use `/speck.env` from root to view aggregate stack status

**Example**:
```bash
# Root repo
cd /workspace/shared-specs
/speck.specify "User authentication with JWT"

# Child repo A (frontend)
cd /workspace/frontend
/speck.link ../shared-specs
/speck.plan
/speck.branch create "auth-ui"
/speck.branch create "login-form"

# Child repo B (backend)
cd /workspace/backend
/speck.link ../shared-specs
/speck.plan
/speck.branch create "auth-api"
/speck.branch create "token-validation"

# View aggregate status from root
cd /workspace/shared-specs
/speck.env
# Shows:
#   root: main → 001-user-auth
#   frontend: 001-user-auth → auth-ui → login-form
#   backend: 001-user-auth → auth-api → token-validation
```

---

**Last Updated**: 2025-11-22 | **Covers**: Specs 007-010
