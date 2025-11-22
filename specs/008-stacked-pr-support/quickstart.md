# Quickstart: Stacked PR Support

**Feature**: 008-stacked-pr-support
**Audience**: Developers using Speck for feature specification and implementation
**Time**: 5-10 minutes

## What is Stacked PR Support?

Stacked PRs allow you to break large features into multiple dependent pull requests that can be reviewed and merged sequentially. Each branch in the stack builds on the previous one, enabling:

- **Faster review cycles**: Smaller PRs are easier to review
- **Parallel work**: Start next branch while previous PR is in review
- **Incremental delivery**: Merge completed work without waiting for entire feature
- **Clear dependencies**: Explicit parent-child relationships between branches

## Traditional vs Stacked Workflow

**Traditional (Single Branch)**:
```
main
└─ 007-multi-repo [100 commits, 2000 lines changed]
   ↓ (One giant PR, slow to review)
   main
```

**Stacked (Multiple Branches)**:
```
main
└─ username/db-layer [20 commits, 400 lines]
   └─ username/api-endpoints [30 commits, 600 lines]
      └─ username/ui-components [25 commits, 500 lines]
         ↓ (Three reviewable PRs, merged sequentially)
         main
```

---

## Quick Start: First Stacked Branch

### Prerequisites

- Existing Speck spec (e.g., `specs/007-multi-repo/spec.md`)
- Working git repository
- Speck CLI or Claude Code installed

### Step 1: Create First Stacked Branch

Using traditional branch naming (optional):
```bash
/speck.branch create 007-multi-repo-db --base main
```

Using freeform naming:
```bash
/speck.branch create username/db-layer --base main --spec 007-multi-repo
```

**Output**:
```
✓ Created stacked branch 'username/db-layer'
✓ Based on: main
✓ Linked to spec: 007-multi-repo

Branch stack:
  main
  └─ username/db-layer (current)

Next steps:
  - Implement feature on this branch
  - Run /speck.tasks --branch username/db-layer to generate tasks
  - When ready: /speck.branch create <next-branch> --base username/db-layer
```

**What happened**:
1. Created `.speck/branches.json` file (first time only)
2. Added branch entry linking to spec 007-multi-repo
3. Created git branch `username/db-layer` based on `main`
4. Checked out new branch

### Step 2: Generate Branch-Specific Tasks

Filter tasks by user story:
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

### Step 3: Implement & Commit Work

```bash
# Implement feature
git add .
git commit -m "feat: implement database layer (US1)"

# Push and create PR
git push -u origin username/db-layer
gh pr create --title "Database layer (part 1/3)" --base main
```

### Step 4: Update Branch Status

Mark branch as submitted with PR number:
```bash
/speck.branch update username/db-layer --status submitted --pr 42
```

### Step 5: Create Second Stacked Branch

While first PR is in review, start next branch:
```bash
/speck.branch create username/api-endpoints --base username/db-layer
```

**Output**:
```
✓ Created stacked branch 'username/api-endpoints'
✓ Based on: username/db-layer
✓ Linked to spec: 007-multi-repo

Branch stack:
  main
  └─ username/db-layer (submitted, PR #42)
     └─ username/api-endpoints (current)

Next steps:
  - Implement feature on this branch
  - Run /speck.tasks --branch username/api-endpoints --stories US2,US3
```

Generate tasks for next branch:
```bash
/speck.tasks --branch username/api-endpoints --stories US2,US3
```

### Step 6: Check Stack Status

View branch stack health:
```bash
/speck.branch status
```

**Output** (if first PR merged):
```
⚠ Branch stack needs attention

Spec: 007-multi-repo

username/db-layer (submitted, PR #42)
  ⚠ MERGED: Branch merged into base but status is 'submitted'
  → Run: /speck.branch update username/db-layer --status merged

username/api-endpoints (active)
  ⚠ REBASE NEEDED: Base branch 'username/db-layer' has been merged into main
  → Run: git rebase main
  → Update base: /speck.branch update username/api-endpoints --base main
```

Update branch status and rebase:
```bash
# Mark first branch as merged
/speck.branch update username/db-layer --status merged

# Rebase second branch onto main
git rebase main

# Update base in metadata
/speck.branch update username/api-endpoints --base main
```

---

## Common Workflows

### Workflow 1: Import Existing Branches

If you already have branches created via git or tools like Graphite:

```bash
/speck.branch import --pattern 'username/*'
```

Interactive prompt will ask you to map each branch to a spec:
```
Branch: username/db-layer
  Upstream: origin/main
  Inferred base: main
  Link to spec? (Enter number or 's' to skip)
    1. 007-multi-repo
    2. 008-stacked-pr-support
  > 1
```

### Workflow 2: Visualize Branch Stack

Check current stack structure:
```bash
/speck.branch list
```

**Output**:
```
Spec: 007-multi-repo

Branch Stack:
  main
  └─ username/db-layer (submitted, PR #42)
     └─ username/api-endpoints (active, current)
        └─ username/ui-components (active)

Legend:
  (current) = checked out branch
  (active) = development in progress
  (submitted) = PR open for review
```

View all stacks across repository:
```bash
/speck.branch list --all
```

### Workflow 3: Delete Abandoned Branch

Remove branch from stack metadata:
```bash
/speck.branch delete username/old-feature
```

**Note**: This does NOT delete the git branch. To fully clean up:
```bash
/speck.branch delete username/old-feature
git branch -D username/old-feature
```

### Workflow 4: Check Environment with Stack Info

Enhanced environment display:
```bash
/speck.env
```

**Output** (with stacked mode enabled):
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
```

---

## Tool Integration

### Graphite Integration

Speck works seamlessly with Graphite:

1. **Create stack with Graphite**:
```bash
gt create username/db-layer
gt create username/api-endpoints
```

2. **Import into Speck**:
```bash
/speck.branch import --pattern 'username/*'
```

3. **Use both tools**:
- Graphite for rebasing: `gt restack`
- Speck for task management: `/speck.tasks --branch username/db-layer`
- Both tools respect git state, no conflicts

### GitHub CLI Integration

Use GitHub CLI for PRs, Speck for task tracking:

```bash
# Create PR with GitHub CLI
gh pr create --title "Database layer" --base main

# Update Speck metadata with PR number
/speck.branch update username/db-layer --status submitted --pr 42

# Check PR status
gh pr view 42

# Check stack health
/speck.branch status
```

---

## Branch Naming Conventions

Speck supports **freeform branch naming**. Choose what works for your team:

### Option 1: Traditional Speck Pattern
```bash
/speck.branch create 007-multi-repo-db --base main
```
- Pro: Consistent with existing Speck conventions
- Con: Less flexible

### Option 2: Username Prefix
```bash
/speck.branch create username/feature-name --base main --spec 007-multi-repo
```
- Pro: Clear ownership, works with Graphite
- Con: Requires `--spec` flag

### Option 3: Ticket ID Prefix
```bash
/speck.branch create JIRA-123-api-endpoints --base main --spec 007-multi-repo
```
- Pro: Direct traceability to issue tracker
- Con: Longer names

### Option 4: Feature Prefix
```bash
/speck.branch create feature/database-layer --base main --spec 007-multi-repo
```
- Pro: Clear branch type, common GitHub convention
- Con: Generic (no ownership)

**Recommendation**: Use username prefix (`username/feature`) for teams using stacked PRs. Provides clear ownership and works well with Graphite.

---

## Best Practices

### 1. Break Features into Logical Chunks

**Good** (clear boundaries):
```
main
└─ username/db-schema [US1: Define entities]
   └─ username/db-queries [US2: CRUD operations]
      └─ username/api-layer [US3: REST endpoints]
```

**Bad** (arbitrary splits):
```
main
└─ username/part1 [Mixed: schema + half of queries]
   └─ username/part2 [Mixed: other half of queries + API]
```

**Tip**: Use user stories from spec.md as natural boundaries. Each branch = 1-3 user stories.

### 2. Update Status Promptly

Keep metadata synchronized with PR state:

```bash
# When PR created
/speck.branch update <name> --status submitted --pr <number>

# When PR merged
/speck.branch update <name> --status merged

# When branch abandoned
/speck.branch update <name> --status abandoned
```

**Why**: Accurate status enables helpful warnings from `/speck.branch status`.

### 3. Rebase Proactively

After base branch merges, rebase dependent branches:

```bash
# Check for rebase warnings
/speck.branch status

# Rebase onto new base
git rebase main

# Update metadata
/speck.branch update <name> --base main
```

**Why**: Prevents merge conflicts and keeps dependency chain clean.

### 4. Use Branch-Aware Tasks

Generate tasks specific to each branch:

```bash
# First branch: Database layer (US1)
/speck.tasks --branch username/db-layer --stories US1

# Second branch: API layer (US2, US3)
/speck.tasks --branch username/api-layer --stories US2,US3
```

**Why**: Focused task lists reduce cognitive load and clarify scope per PR.

### 5. Check Stack Health Regularly

Run status check before creating new PRs:

```bash
/speck.branch status
```

**Why**: Catch issues early (merged branches, stale branches, rebase needs).

---

## Troubleshooting

### Problem: Circular dependency error

**Error**:
```
Error: Circular dependency detected: A → B → C → A
```

**Solution**: Change base branch to break cycle:
```bash
/speck.branch update <name> --base <different-base>
```

### Problem: Branch stack not showing in /speck.env

**Cause**: Stacked mode not enabled (no `.speck/branches.json`)

**Solution**: Create first stacked branch to initialize:
```bash
/speck.branch create <name> --base main
```

### Problem: "Branch has children" when deleting

**Error**:
```
Error: Branch 'username/db-layer' has child branches. Use --force to delete anyway.
```

**Solution**: Either delete children first, or use `--force`:
```bash
/speck.branch delete username/db-layer --force
```

**Note**: Force delete orphans child branches (they'll need manual base updates).

### Problem: Corrupted branches.json

**Error**:
```
Error: Cannot parse branches.json
```

**Solution**: Restore from git history:
```bash
git show HEAD:.speck/branches.json > .speck/branches.json
```

Or if recent commit had valid file:
```bash
git show HEAD~1:.speck/branches.json > .speck/branches.json
```

### Problem: Git branch exists but not in stack

**Cause**: Branch created via git directly, not imported into Speck

**Solution**: Import existing branch:
```bash
/speck.branch import --pattern '<branch-name>'
```

---

## Backwards Compatibility

### Using Traditional Single-Branch Workflow

Stacked PR support is **opt-in**. If you never run `/speck.branch create`, you'll never see stacked PR features:

- No `.speck/branches.json` file created
- `/speck.tasks` works exactly as before (no filtering)
- `/speck.env` shows traditional branch info
- Zero behavior changes

### Mixing Single-Branch and Stacked Workflows

You can have some specs with stacked branches, others with traditional single branch:

```
specs/
├── 007-multi-repo/         # Has stacked branches in branches.json
│   └── spec.md
├── 008-stacked-pr-support/ # Traditional single branch
│   └── spec.md
```

`.speck/branches.json`:
```json
{
  "branches": [
    { "name": "username/db-layer", "specId": "007-multi-repo", ... },
    { "name": "username/api-layer", "specId": "007-multi-repo", ... }
  ],
  "specIndex": {
    "007-multi-repo": ["username/db-layer", "username/api-layer"]
  }
}
```

- Spec 007: Uses stacked PR features
- Spec 008: Uses traditional single-branch workflow
- Both coexist peacefully

---

## Next Steps

### Learn More
- See [spec.md](./spec.md) for complete user scenarios and requirements
- See [data-model.md](./data-model.md) for metadata schema details
- See [contracts/cli-commands.md](./contracts/cli-commands.md) for full command reference
- See [contracts/typescript-api.md](./contracts/typescript-api.md) for programmatic API

### Try It Out
1. Create a new spec: `/speck.specify "Multi-repo support feature"`
2. Create first stacked branch: `/speck.branch create username/initial --base main`
3. Generate tasks: `/speck.tasks --branch username/initial --stories US1`
4. Implement feature, create PR
5. Create second branch: `/speck.branch create username/next --base username/initial`
6. Check stack status: `/speck.branch status`

### Provide Feedback
- Report issues: [GitHub Issues](https://github.com/nprbst/speck/issues)
- Request features: Use `/speck.specify` to document desired enhancements
- Share patterns: Contribute examples to documentation

---

## Summary

### Key Commands
- `/speck.branch create <name> --base <base>`: Create stacked branch
- `/speck.branch list`: View branch stacks
- `/speck.branch status`: Check stack health
- `/speck.branch update <name>`: Update branch metadata
- `/speck.tasks --branch <name> --stories <US1,US2>`: Generate filtered tasks

### Key Benefits
- **Faster reviews**: Break large features into reviewable chunks
- **Parallel work**: Don't block on PR reviews
- **Incremental delivery**: Merge completed work sooner
- **Tool-agnostic**: Works with Graphite, GitHub CLI, or manual git
- **Backwards compatible**: Zero impact on existing workflows

### Key Files
- `.speck/branches.json`: Centralized branch-to-spec mapping
- `specs/<NNN-feature>/spec.md`: Feature specification (unchanged)
- `specs/<NNN-feature>/tasks.md`: Task list (branch-filterable)

**Ready to use stacked PRs? Start with `/speck.branch create`!**
