# CLI Commands Contract

**Feature**: 008-stacked-pr-support
**Date**: 2025-11-18

## Overview

This contract defines the command-line interface for stacked PR management. All commands are accessible via both TypeScript CLI (`speck branch ...`) and Claude Code slash commands (`/speck.branch ...`).

---

## Command: branch create

Creates a new stacked branch with explicit parent dependency.

### Syntax
```bash
speck branch create <name> [--base <base-branch>] [--spec <spec-id>]
/speck.branch create <name> [--base <base-branch>] [--spec <spec-id>]
```

### Arguments
- `<name>` (required): Branch name
  - Type: string
  - Validation: Must pass `git check-ref-format --branch <name>`
  - Examples: `username/feature-name`, `JIRA-123-api`, `008-stacked-pr-support`
  - No pattern enforcement (freeform naming)

### Options
- `--base <base-branch>` (optional): Parent branch in dependency chain
  - Type: string
  - Validation: Must exist in git (`git rev-parse --verify <base>`)
  - Examples: `008-stacked-pr-support` (feature branch), `username/db-layer` (stacked branch)
  - Default: Current branch (from `git rev-parse --abbrev-ref HEAD`)
  - Note: In Speck workflow, base is typically the feature branch (e.g., `007-multi-repo`) or another stacked branch
- `--spec <spec-id>` (optional): Spec identifier to link branch to
  - Type: string (format: `NNN-feature-name`)
  - Validation: Must reference existing `specs/<spec-id>/` directory
  - Default: Auto-detect from current branch or prompt user

### Behavior
1. Validate branch name format (git check-ref-format)
2. Determine base branch: use --base value or default to current branch
3. Validate base branch exists in git
4. Detect or prompt for spec ID if not provided
5. Validate no circular dependencies (DFS cycle detection)
6. **Prompt for PR creation**: "Create PR for <current-branch> before switching? (yes/no)"
7. If yes to PR prompt:
   a. Check if `gh` CLI is available and authenticated
   b. Prompt for PR title (default: spec title or branch name)
   c. Prompt for PR description (default: spec summary)
   d. Determine PR base (main/master for feature branches, base branch for stacked branches)
   e. Execute: `gh pr create --title "<title>" --body "<body>" --base <pr-base>`
   f. Capture PR number from output
   g. Update current branch entry in branches.json with PR number and status="submitted"
8. Create `.speck/branches.json` if it doesn't exist (initialize empty)
9. Add new BranchEntry to branches array
10. Update specIndex with new branch
11. Create git branch: `git branch <name> <base>`
12. Checkout new branch: `git checkout <name>`
13. Display success message with stack visualization

### Output (with PR creation)
```
Defaulting base to current branch: 008-stacked-pr-support

Create PR for 008-stacked-pr-support before switching? (yes/no): yes

PR title [Stacked PR Support]:
PR description [Feature specification for stacked PR support]:

✓ Created PR #42 for 008-stacked-pr-support → main
✓ Updated branch status to 'submitted'

✓ Created stacked branch 'username/db-layer'
✓ Based on: 008-stacked-pr-support
✓ Linked to spec: 008-stacked-pr-support

Branch stack:
  008-stacked-pr-support (PR #42)
  └─ username/db-layer (current)

Next steps:
  - Implement feature on this branch
  - Run /speck.tasks --branch username/db-layer to generate tasks
  - When ready: /speck.branch create <next-branch>
```

### Output (without PR creation)
```
Defaulting base to current branch: 008-stacked-pr-support

Create PR for 008-stacked-pr-support before switching? (yes/no): no

✓ Created stacked branch 'username/db-layer'
✓ Based on: 008-stacked-pr-support
✓ Linked to spec: 008-stacked-pr-support

Branch stack:
  008-stacked-pr-support
  └─ username/db-layer (current)

Next steps:
  - Implement feature on this branch
  - Run /speck.tasks --branch username/db-layer to generate tasks
  - When ready: /speck.branch create <next-branch>
```

### Error Cases
- Branch name invalid: `Error: Invalid branch name 'foo..bar'. Must pass git check-ref-format.`
- Base branch doesn't exist: `Error: Base branch 'nonexistent' not found in git repository.`
- Circular dependency: `Error: Circular dependency detected: A → B → C → A`
- Branch already exists: `Error: Branch 'username/feature-name' already exists. Use different name or delete existing branch.`
- Spec not found: `Error: Spec directory 'specs/999-missing/' not found.`

### Exit Codes
- 0: Success
- 1: Validation error (invalid name, missing base, cycle detected)
- 2: File system error (cannot write branches.json)
- 3: Git error (branch creation failed)

---

## Command: branch list

Displays all stacked branches for current or specified spec.

### Syntax
```bash
speck branch list [--spec <spec-id>] [--all]
/speck.branch list [--spec <spec-id>] [--all]
```

### Options
- `--spec <spec-id>` (optional): Filter by spec ID
  - Type: string (format: `NNN-feature-name`)
  - Default: Current spec (detected from current branch or working directory)
- `--all` (optional): Show branches for all specs
  - Type: boolean flag
  - Conflicts with `--spec` (mutually exclusive)

### Behavior
1. Load branches.json (error if stacked mode not enabled)
2. Filter branches by spec ID (unless `--all` specified)
3. Build dependency chains (BranchStack computation)
4. Sort chains by depth (shortest to longest)
5. Display formatted output with status indicators

### Output (Single Spec)
```
Spec: 007-multi-repo

Branch Stack 1:
  main
  └─ nprbst/db-layer (submitted, PR #42)
     └─ nprbst/api-endpoints (active, current)

Branch Stack 2:
  main
  └─ username/docs-update (merged)

Legend:
  (current) = checked out branch
  (active) = development in progress
  (submitted) = PR open for review
  (merged) = PR merged into base
```

### Output (All Specs)
```
Repository Branch Stacks

[008-stacked-pr-support]
  main
  └─ username/feature-x (active)

[007-multi-repo]
  main
  └─ nprbst/db-layer (submitted, PR #42)
     └─ nprbst/api-endpoints (active)

Total: 3 stacked branches across 2 specs
```

### Error Cases
- No branches.json: `Error: Stacked mode not enabled. Run /speck.branch create to start using stacked PRs.`
- Invalid spec ID: `Error: No branches found for spec '999-missing'.`
- Corrupted file: `Error: Cannot parse branches.json. Run /speck.branch repair or restore from git history.`

### Exit Codes
- 0: Success
- 1: Stacked mode not enabled
- 2: Invalid spec ID or no branches found

---

## Command: branch status

Shows health of branch stacks: merged branches, rebase warnings, stale branches.

### Syntax
```bash
speck branch status [--spec <spec-id>]
/speck.branch status [--spec <spec-id>]
```

### Options
- `--spec <spec-id>` (optional): Check status for specific spec
  - Type: string (format: `NNN-feature-name`)
  - Default: Current spec (detected from current branch)

### Behavior
1. Load branches.json
2. For each branch in spec:
   - Check if merged via `git branch --merged <base>`
   - Compare status field with git state (detect mismatches)
   - Check if base branch merged (indicates rebase needed)
   - Calculate staleness (current time - updatedAt)
3. Display warnings and recommendations

### Output (Healthy Stack)
```
✓ Branch stack healthy

Spec: 007-multi-repo

nprbst/db-layer (submitted, PR #42)
  ✓ Based on: main
  ✓ Status: Open for review

nprbst/api-endpoints (active)
  ✓ Based on: nprbst/db-layer
  ✓ Status: Development in progress

No issues detected.
```

### Output (Issues Detected)
```
⚠ Branch stack needs attention

Spec: 007-multi-repo

nprbst/db-layer (submitted, PR #42)
  ✓ Based on: main
  ⚠ MERGED: Branch merged into base but status is 'submitted'
  → Run: /speck.branch update nprbst/db-layer --status merged

nprbst/api-endpoints (active)
  ⚠ REBASE NEEDED: Base branch 'nprbst/db-layer' has been merged into main
  → Run: git rebase main
  → Update base: /speck.branch update nprbst/api-endpoints --base main

username/old-feature (active)
  ⚠ STALE: Last updated 45 days ago
  → Consider abandoning: /speck.branch update username/old-feature --status abandoned

Issues: 3 warnings
```

### Error Cases
- No branches.json: `Error: Stacked mode not enabled.`
- Invalid spec ID: `Error: No branches found for spec '999-missing'.`

### Exit Codes
- 0: No issues detected
- 1: Warnings detected (non-blocking)
- 2: Errors detected (blocking issues like circular dependencies)

---

## Command: branch update

Updates metadata for existing stacked branch.

### Syntax
```bash
speck branch update <name> [--status <status>] [--pr <number>] [--base <new-base>]
/speck.branch update <name> [--status <status>] [--pr <number>] [--base <new-base>]
```

### Arguments
- `<name>` (required): Branch name to update
  - Type: string
  - Validation: Must exist in branches.json

### Options
- `--status <status>` (optional): New status
  - Type: enum (`active`, `submitted`, `merged`, `abandoned`)
  - Validation: Cannot transition from terminal states (`merged`, `abandoned`)
  - If `submitted`: requires `--pr` to be set
- `--pr <number>` (optional): Pull request number
  - Type: positive integer
  - Validation: Must be > 0
- `--base <new-base>` (optional): Change parent branch
  - Type: string
  - Validation: Must exist in git, must not create cycles
  - Use case: Rebasing after base branch merged

### Behavior
1. Load branches.json
2. Find branch by name
3. Validate status transition (if `--status` provided)
4. Validate new base (if `--base` provided) - cycle detection
5. Update fields
6. Set `updatedAt` to current timestamp
7. Save branches.json atomically
8. Display confirmation

### Output
```
✓ Updated branch 'nprbst/db-layer'
  Status: submitted → merged
  PR: #42
  Updated: 2025-11-18T16:30:00Z

Downstream branches affected:
  - nprbst/api-endpoints
  → Consider rebasing onto main: git rebase main
```

### Error Cases
- Branch not found: `Error: Branch 'nonexistent' not found in branches.json.`
- Invalid status: `Error: Invalid status 'invalid'. Must be: active, submitted, merged, abandoned.`
- Terminal state transition: `Error: Cannot change status from 'merged' to 'active'. Merged branches are terminal.`
- Submitted without PR: `Error: Status 'submitted' requires --pr <number>.`
- Circular dependency: `Error: Changing base to 'foo' would create cycle: A → B → C → A`

### Exit Codes
- 0: Success
- 1: Validation error
- 2: Branch not found

---

## Command: branch import

Imports existing git branch relationships into branches.json.

### Syntax
```bash
speck branch import [--pattern <glob>]
/speck.branch import [--pattern <glob>]
```

### Options
- `--pattern <glob>` (optional): Filter branches by pattern
  - Type: glob pattern (e.g., `username/*`, `feature/*`)
  - Default: All branches

### Behavior
1. List all git branches: `git branch --list --format='%(refname:short) %(upstream:short)'`
2. Filter by pattern (if provided)
3. Parse upstream relationships to infer base branches
4. For each branch, prompt user interactively:
   - "Link branch 'username/feature' to which spec?"
   - Show list of available specs (from `specs/` directory)
   - Allow skip (don't import this branch)
5. Validate no cycles created
6. Add imported branches to branches.json
7. Update specIndex
8. Display summary

### Output (Interactive)
```
Found 5 branches matching pattern 'username/*'

Branch: username/db-layer
  Upstream: origin/main
  Inferred base: main
  Link to spec? (Enter number or 's' to skip)
    1. 007-multi-repo
    2. 008-stacked-pr-support
  > 1

Branch: username/api-endpoints
  Upstream: origin/username/db-layer
  Inferred base: username/db-layer
  Link to spec? (Enter number or 's' to skip)
    1. 007-multi-repo
    2. 008-stacked-pr-support
  > 1

Branch: username/docs
  Upstream: origin/main
  Inferred base: main
  Link to spec? (Enter number or 's' to skip)
  > s (skipped)

✓ Imported 2 branches:
  - username/db-layer → 007-multi-repo (base: main)
  - username/api-endpoints → 007-multi-repo (base: username/db-layer)

Skipped 1 branch (username/docs)
```

### Error Cases
- No git branches: `Error: No branches found matching pattern 'username/*'.`
- Circular dependency: `Error: Importing 'foo' would create cycle. Skipping.`
- No specs found: `Error: No specs found in specs/ directory. Create a spec first.`

### Exit Codes
- 0: Success (at least 1 branch imported)
- 1: No branches imported (all skipped or no matches)
- 2: Git error (cannot list branches)

---

## Command: branch delete

Removes branch from branches.json metadata (does not delete git branch).

### Syntax
```bash
speck branch delete <name> [--force]
/speck.branch delete <name> [--force]
```

### Arguments
- `<name>` (required): Branch name to remove
  - Type: string
  - Validation: Must exist in branches.json

### Options
- `--force` (optional): Delete even if branch has children
  - Type: boolean flag
  - Default: false (prevent deleting parent branches)

### Behavior
1. Load branches.json
2. Find branch by name
3. Check if branch has children (other branches with baseBranch = name)
4. If children exist and `--force` not set: error
5. Remove branch from branches array
6. Remove from specIndex
7. Save branches.json atomically
8. Display warning if git branch still exists

### Output
```
✓ Removed 'username/feature' from branch stack metadata

⚠ Git branch still exists. To delete git branch:
  git branch -D username/feature
```

### Output (With Children)
```
✓ Removed 'username/db-layer' from branch stack metadata

⚠ Child branches affected (orphaned):
  - username/api-endpoints (now based on deleted branch)
  → Update child bases manually: /speck.branch update <name> --base <new-base>

⚠ Git branch still exists. To delete git branch:
  git branch -D username/db-layer
```

### Error Cases
- Branch not found: `Error: Branch 'nonexistent' not found in branches.json.`
- Has children without --force: `Error: Branch 'username/db-layer' has child branches. Use --force to delete anyway.`

### Exit Codes
- 0: Success
- 1: Validation error (branch not found)
- 2: Cannot delete (has children without --force)

---

## Extended Commands

These are modifications to existing Speck commands to support stacked PR workflows.

### Command: tasks (Extended)

Generate branch-specific task subsets.

**New Options**:
- `--branch <name>` (optional): Generate tasks for specific branch
  - Type: string (branch name from branches.json)
  - Requires: `--stories` flag
- `--stories <ids>` (optional): Filter by user story IDs
  - Type: comma-separated list (e.g., `US1,US2,US3`)
  - Requires: `--branch` flag

**Example**:
```bash
/speck.tasks --branch username/db-layer --stories US1
```

**Output**:
```
Generated tasks for branch 'username/db-layer' (spec: 007-multi-repo)
User stories: US1
Tasks: 8 tasks generated → specs/007-multi-repo/tasks.md

Branch-specific filtering enabled. Full task list available via:
  /speck.tasks (without --branch flag)
```

### Command: env (Extended)

Display branch stack status when stacked mode enabled.

**New Output Section** (if branches.json exists):
```
Speck Environment
=================

Repository: /Users/nathan/git/github.com/nprbst/speck
Current Branch: username/api-endpoints
Branch Stack Mode: ✓ Enabled

Branch Stack (spec: 007-multi-repo):
  main
  └─ username/db-layer (submitted, PR #42)
     └─ username/api-endpoints (active, current)

Stack Status: ⚠ 1 warning (run /speck.branch status for details)

[... rest of env output ...]
```

---

## Exit Code Summary

All commands follow consistent exit code conventions:

- **0**: Success
- **1**: Validation error (invalid input, failed constraint)
- **2**: File system error (cannot read/write branches.json)
- **3**: Git error (git command failed)
- **4**: Not found error (branch, spec, or file not found)

---

## Error Message Format

All errors follow consistent format:

```
Error: <Short description>
<Optional details>
→ <Suggested action>
```

Example:
```
Error: Circular dependency detected
  Dependency chain: A → B → C → A
→ Change base branch or remove intermediate dependency
```

---

## Summary

### New Commands (6)
1. `branch create`: Create stacked branch
2. `branch list`: Display branch stacks
3. `branch status`: Health check for stacks
4. `branch update`: Modify branch metadata
5. `branch import`: Import existing branches
6. `branch delete`: Remove from metadata

### Extended Commands (2)
1. `tasks`: Add `--branch` and `--stories` flags
2. `env`: Add stack status section

### Design Principles
- Consistent argument/option naming
- Clear validation errors with suggestions
- Interactive prompts for ambiguous operations
- Tool-agnostic (no GitHub API dependencies)
- Backwards compatible (all commands fail gracefully if stacked mode not enabled)
