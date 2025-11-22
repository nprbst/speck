# Command Interfaces: Multi-Repo Stacked PR Support

**Feature**: 009-multi-repo-stacked
**Date**: 2025-11-19
**Purpose**: Define command-line interfaces for multi-repo stacked PR workflows

---

## Command Reference

### `/speck.branch create`

**Description**: Create new stacked branch in current repository (supports single-repo, multi-repo root, and multi-repo child contexts)

**Syntax**:
```bash
/speck.branch create <name> [--base <base-branch>] [--spec <spec-id>]
```

**Arguments**:
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Branch name (freeform, any valid git branch name) |
| `--base` | string | No | Base branch (defaults to current branch) |
| `--spec` | string | No | Spec ID (auto-detected if on feature branch) |

**Pre-Checks**:
1. **Dirty working tree detection**: Checks `git status --porcelain`
   - If uncommitted changes exist: Display warning with `git diff --stat` output
   - Suggests: commit changes, stash, or abort
   - Exits with error code 1 if dirty (user must handle changes first)

2. **PR suggestion generation** (if commits exist):
   - Analyzes commits between PR base and current branch
   - Auto-generates PR title and body from commit messages
   - Displays formatted `gh pr create` command for user to copy/paste
   - In multi-repo child context: Prefixes PR title with `[repo-name]`

**Output**:
- Success: Branch created and checked out, `.speck/branches.json` updated
- If commits exist: PR suggestion displayed with copy-paste command
- If no remote configured: Warning (not error), continues without PR suggestion

**Exit Codes**:
- `0`: Success (branch created, no PR suggestion needed)
- `1`: Error (validation failure, dirty working tree, circular dependency)
- `2`: PR suggestion displayed (user should run suggested command)

**Multi-Repo Behavior**:
- Single-repo: Standard Feature 008 behavior
- Multi-repo root: Creates branch in root repo, no `parentSpecId` field
- Multi-repo child: Creates branch in child repo, adds `parentSpecId` field linking to parent spec

**Example (Single-Repo)**:
```bash
/speck.branch create nprbst/db-layer
# Output: Branch 'nprbst/db-layer' created and checked out
#         Updated .speck/branches.json
```

**Example (Multi-Repo Child with PR Suggestion)**:
```bash
/speck.branch create nprbst/auth-api --base nprbst/auth-db

# Output:
# Branch 'nprbst/auth-api' created and checked out
# Updated .speck/branches.json
#
# PR Suggestion:
# Title: [backend-service] Add authentication API endpoints
# Base: main
#
# Run this command to create PR:
# gh pr create --title "[backend-service] Add authentication API endpoints" \
#   --body "## Changes..." \
#   --base main
```

**Error Handling**:
```bash
# Dirty working tree
Error: Uncommitted changes detected

Changed files:
  M  src/auth.ts
  A  src/database.ts

Please commit or stash changes before creating new branch:
  git add . && git commit -m "..."
  git stash

Exit code: 1
```

```bash
# Cross-repo base branch
Error: Base branch 'auth-layer' does not exist in current repository.

Cross-repo branch dependencies are not supported. Base branches must exist
in the same repository as the new branch.

Alternatives:
  1. Complete work in other repo first and merge to main
  2. Use shared contracts/APIs for coordination
  3. Coordinate PR merge order manually across repos

Exit code: 1
```

---

### `/speck.branch list`

**Description**: List stacked branches for current spec or all specs

**Syntax**:
```bash
/speck.branch list [--all]
```

**Arguments**:
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `--all` | flag | No | List all specs (default: current spec only) |

**Output**:
- Table format with columns: Branch, Base, Spec, PR#, Status
- Multi-repo: Grouped by repository (root first, then children alphabetically)

**Exit Codes**:
- `0`: Success (branches listed)
- `1`: Error (no branches.json found)

**Multi-Repo Behavior**:
- Single-repo: Lists branches for current repo
- Multi-repo root (no `--all`): Lists branches for current spec only
- Multi-repo root (`--all`): Lists branches from root + all child repos
- Multi-repo child: Lists branches for current child repo only

**Example (Single-Repo)**:
```bash
/speck.branch list

# Output:
Branch                Base                    Spec                    PR#   Status
─────────────────────────────────────────────────────────────────────────────────
nprbst/db-layer       008-stacked-pr-support  008-stacked-pr-support  42    active
nprbst/api-layer      nprbst/db-layer         008-stacked-pr-support  43    submitted
```

**Example (Multi-Repo Root with --all)**:
```bash
/speck.branch list --all

# Output:
Root Repository:
Branch             Base                    Spec                    PR#   Status
───────────────────────────────────────────────────────────────────────────────
nprbst/core-fix    007-multi-repo-support  008-stacked-pr-support  38    active

Child: backend-service
Branch             Base             Spec                    PR#   Status
────────────────────────────────────────────────────────────────────────
nprbst/auth-db     main             009-multi-repo-stacked  50    merged
nprbst/auth-api    nprbst/auth-db   009-multi-repo-stacked  51    active

Child: frontend-app
Branch             Base    Spec                    PR#   Status
─────────────────────────────────────────────────────────────────
nprbst/login-ui    main    009-multi-repo-stacked  52    active
```

---

### `/speck.branch status`

**Description**: Display branch stack health, dependency chains, and rebase warnings

**Syntax**:
```bash
/speck.branch status [--all]
```

**Arguments**:
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `--all` | flag | No | Show status for all repos (multi-repo only) |

**Output**:
- Dependency tree visualization
- Merged branches requiring rebase
- PR status summary
- Multi-repo: Per-repo status summaries

**Exit Codes**:
- `0`: Success (status displayed)
- `1`: Error (no branches for current spec)

**Multi-Repo Behavior**:
- Single-repo: Shows stack health for current spec
- Multi-repo root (no `--all`): Shows root repo stack only
- Multi-repo root (`--all`): Shows per-repo status summaries
- Multi-repo child: Shows child repo stack + parent spec reference

**Example (Single-Repo)**:
```bash
/speck.branch status

# Output:
Feature: 008-stacked-pr-support
Branches: 3 active, 1 merged

Dependency Tree:
└─ 008-stacked-pr-support (base)
   └─ nprbst/db-layer (active) → PR #42
      └─ nprbst/api-layer (active) → PR #43
         └─ nprbst/ui-components (submitted) → PR #44

Warnings:
  nprbst/db-layer merged - downstream branches may need rebase
```

**Example (Multi-Repo Root with --all)**:
```bash
/speck.branch status --all

# Output:
Multi-Repo Status:

Root Repository:
  Feature: 008-stacked-pr-support
  2 active branches

Child: backend-service
  Feature: 009-multi-repo-stacked
  3 active, 1 merged
  └─ nprbst/auth-db (merged) → PR #50
     └─ nprbst/auth-api (active) → PR #51

Child: frontend-app
  Feature: 009-multi-repo-stacked
  1 active
  └─ nprbst/login-ui (active) → PR #52
```

**Example (Multi-Repo Child)**:
```bash
/speck.branch status

# Output:
Context: Child repo (backend-service)
Parent Spec: 007-multi-repo-monorepo-support
Feature: 009-multi-repo-stacked

Branches: 2 active, 1 merged

Dependency Tree:
└─ main (base)
   └─ nprbst/auth-db (merged) → PR #50
      └─ nprbst/auth-api (active) → PR #51
```

---

### `/speck.branch import`

**Description**: Import existing git branches into Speck stacked PR tracking

**Syntax**:
```bash
/speck.branch import [--all]
```

**Arguments**:
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `--all` | flag | No | Import branches for all child repos (multi-repo root only) |

**Output**:
- Detected branches with inferred parent relationships
- Interactive confirmation prompts for ambiguous mappings
- Updated `.speck/branches.json` files

**Exit Codes**:
- `0`: Success (branches imported)
- `1`: Error (import failed, invalid git state)
- `3`: Import mapping prompt needed (interactive selection required)

**Multi-Repo Behavior**:
- Single-repo: Import branches from current repo
- Multi-repo root (no `--all`): Import branches for root repo only
- Multi-repo root (`--all`): Prompt for which child repos to import
- Multi-repo child: Import branches for current child repo only

**Example (Single-Repo)**:
```bash
/speck.branch import

# Output:
Detected 3 git branches for import:
  nprbst/db-layer (parent: 008-stacked-pr-support)
  nprbst/api-layer (parent: nprbst/db-layer)
  nprbst/ui-layer (parent: nprbst/api-layer)

Import these branches? [y/N]: y

Imported 3 branches successfully.
Updated .speck/branches.json
```

**Example (Multi-Repo Root with --all)**:
```bash
/speck.branch import --all

# Output:
Import branches for which child repos?

[ ] Root repository
[x] backend-service (3 branches detected)
[x] frontend-app (1 branch detected)

Importing from 2 child repositories...

backend-service: Imported 3 branches
frontend-app: Imported 1 branch

Done.
```

---

### `/speck.env`

**Description**: Display environment status including multi-repo branch stacks

**Syntax**:
```bash
/speck.env
```

**Output**:
- Existing sections (git status, branch, feature detection, etc.)
- NEW: Branch Stack Status section (added after existing sections)

**Multi-Repo Behavior**:
- Single-repo: Shows local branch stack (if branches.json exists)
- Multi-repo root: Shows aggregate status (root + all children)
- Multi-repo child: Shows local stack + parent spec reference

**Example (Multi-Repo Root)**:
```bash
/speck.env

# Output:
[... existing env sections ...]

Branch Stack Status (Multi-Repo):
  Root (008-stacked-pr-support):
    2 active branches

  Child: backend-service
    Feature: 009-multi-repo-stacked
    3 active, 1 merged
    └─ nprbst/auth-db (merged) → PR #50
       └─ nprbst/auth-api (active) → PR #51

  Child: frontend-app
    Feature: 009-multi-repo-stacked
    1 active
    └─ nprbst/login-ui (active) → PR #52
```

---

## Exit Code Reference

| Code | Meaning | When Used |
|------|---------|-----------|
| `0` | Success | Command completed successfully |
| `1` | Error | Validation failure, git error, user error |
| `2` | PR suggestion | `/speck.branch create` suggests PR command |
| `3` | Import prompt | `/speck.branch import` requires interactive input |

---

## Error Message Catalog

### Symlink Resolution Failures

```
Error: Failed to resolve multi-repo symlink '.speck-link-backend'

Possible causes:
  - Symlink target does not exist
  - Permission denied reading symlink
  - Filesystem does not support symlinks

Fix:
  1. Verify symlink target exists: ls -l .speck-link-backend
  2. Check permissions: ls -ld .speck-link-backend
  3. Re-create symlink: /speck.link /path/to/backend-repo

Exit code: 1
```

### Cross-Repo Branch Dependencies

```
Error: Base branch 'auth-layer' does not exist in current repository.

Cross-repo branch dependencies are not supported. Base branches must exist
in the same repository as the new branch.

Alternatives:
  1. Complete work in other repo first and merge to main
  2. Use shared contracts/APIs for coordination
  3. Coordinate PR merge order manually across repos

Exit code: 1
```

### Missing Remote Configuration

```
Warning: No git remote configured for this repository.

Branch 'api-layer' created successfully, but PR creation requires a remote.

To configure remote:
  git remote add origin https://github.com/org/repo.git
  git push -u origin api-layer

Continuing...
```

### Orphaned Branch Metadata

```
Warning: .speck/branches.json found but no parent spec symlink detected.

This may indicate:
  - Child repo was previously linked to a multi-repo spec
  - Symlink was removed manually

If this is incorrect:
  1. Re-link repo: /speck.link /path/to/speck-root
  2. Or remove orphaned metadata: rm -rf .speck/
```

---

**Command Interfaces Complete**: 2025-11-19
