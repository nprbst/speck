---
description: Manage stacked PR branches with dependency tracking
---

# Stacked Branch Management

Manage stacked PR branches with explicit dependency tracking for multi-PR workflows.

## Usage

```bash
/speck.branch create <name> [--base <base-branch>] [--spec <spec-id>]
/speck.branch list [--all]
/speck.branch status
/speck.branch update <name> [--status <status>] [--pr <number>] [--base <branch>]
/speck.branch delete <name> [--force]
/speck.branch import [--pattern <pattern>]
```

## Commands

### create - Create a new stacked branch

Creates a new branch in the stack with explicit dependency tracking.

**Arguments:**
- `<name>` - Branch name (freeform, any valid git ref name)
- `--base <branch>` - Base branch to stack on (optional, defaults to current branch)
- `--spec <spec-id>` - Spec ID to link to (optional, auto-detected)

**Examples:**
```bash
# On branch 008-stacked-pr-support, create first stacked branch
/speck.branch create username/db-layer

# On branch username/db-layer, create next branch in stack
/speck.branch create username/api-endpoints

# Explicitly specify base (e.g., to branch from feature branch instead of current)
/speck.branch create username/ui-layer --base 008-stacked-pr-support
```

### list - View branch stacks

Shows all branches for the current spec or across all specs.

**Examples:**
```bash
/speck.branch list           # Current spec only
/speck.branch list --all     # All specs
```

### status - Check stack health

Shows warnings for branches needing attention (merged, stale, rebase needed).

**Example:**
```bash
/speck.branch status
```

### update - Update branch metadata

Updates branch status, PR number, or base branch.

**Examples:**
```bash
/speck.branch update username/db-layer --status submitted --pr 42
/speck.branch update username/api --base main
```

### delete - Remove branch from metadata

Removes branch from branches.json (does not delete git branch).

**Examples:**
```bash
/speck.branch delete username/old-feature
/speck.branch delete username/db-layer --force
```

### import - Import existing branches

Imports existing git branches into stacked mode.

**Examples:**
```bash
/speck.branch import --pattern 'username/*'
/speck.branch import
```

## What This Does

1. Creates/manages `.speck/branches.json` for branch-to-spec mapping
2. Enables freeform branch naming (no NNN-pattern required)
3. Tracks dependency chains (which branch stacks on which)
4. Detects circular dependencies automatically
5. Works alongside Graphite, GitHub Stack, or manual git

## Backwards Compatibility

- If `.speck/branches.json` doesn't exist, traditional single-branch workflow continues
- Creating first stacked branch automatically initializes the file
- Existing specs can mix traditional and stacked branches

## Implementation

```bash
# Determine plugin root (prefer local .speck/scripts, fallback to plugin path)
if [ -d ".speck/scripts" ]; then
  PLUGIN_ROOT=".speck"
else
  PLUGIN_ROOT=$(cat "$HOME/.claude/speck-plugin-path" 2>/dev/null || echo ".speck")
fi

# Execute branch management script
bun run "$PLUGIN_ROOT/scripts/branch-command.ts" {{args}}
```
