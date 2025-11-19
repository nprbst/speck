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

**Agent Logic for PR Creation (T031k-T031m)**:

When executing `/speck.branch create`, the script may detect a PR opportunity and exit with code 2. You must detect this and interact with the user to offer PR creation.

Execute the command and handle the interrupt-resume pattern:

```bash
# Determine plugin root (prefer local .speck/scripts, fallback to plugin path)
if [ -d ".speck/scripts" ]; then
  PLUGIN_ROOT=".speck"
else
  PLUGIN_ROOT=$(cat "$HOME/.claude/speck-plugin-path" 2>/dev/null || echo ".speck")
fi

# Execute branch management script, capturing stderr for PR suggestions
STDERR_FILE=$(mktemp)
bun run "$PLUGIN_ROOT/scripts/branch-command.ts" {{args}} 2>"$STDERR_FILE"
EXIT_CODE=$?

# Read stderr for PR suggestion JSON
STDERR_CONTENT=$(cat "$STDERR_FILE")
rm -f "$STDERR_FILE"

# Check for PR suggestion JSON in stderr
PR_SUGGESTION=$(echo "$STDERR_CONTENT" | grep '^{.*"type":"pr-suggestion"' | head -1 || echo "")
```

After running the script, handle the exit code:

**If EXIT_CODE is 2 and PR_SUGGESTION contains JSON**: A PR opportunity was detected. Parse the JSON and prompt the user.

**If EXIT_CODE is 0**: Command succeeded.

**If EXIT_CODE is 1 or other**: Command failed.

## Agent Workflow for PR Suggestions (T031k-T031m)

When you detect exit code 2 with a PR suggestion JSON:

1. **Parse the JSON** from `$PR_SUGGESTION` (T031k):
   - Extract: `branch`, `suggestedTitle`, `suggestedDescription`, `suggestedBase`, `newBranch`

2. **Prompt the user** (T031k):
   Display the PR opportunity and ask if they want to create it:
   ```
   I detected a PR opportunity for branch '{branch}' before creating '{newBranch}'.

   Suggested PR:
   - Title: {suggestedTitle}
   - Base: {suggestedBase}
   - Description:
     {suggestedDescription}

   Would you like me to create this PR now?
   ```

3. **Handle user response**:

   **If user confirms YES** (T031l):
   - Re-invoke with PR creation flags (preserve original --base and --spec if present):
     ```bash
     /speck.branch create {newBranch} --create-pr --title "{suggestedTitle}" --description "{suggestedDescription}" --pr-base "{suggestedBase}" [original flags]
     ```

   **If user declines NO** (T031m):
   - Re-invoke with skip flag (preserve original --base and --spec if present):
     ```bash
     /speck.branch create {newBranch} --skip-pr-prompt [original flags]
     ```

## Example Agent Interaction

```
User: /speck.branch create username/api-layer

[Script detects commits on current branch and exits with code 2]

Agent: I detected a PR opportunity for branch 'username/db-layer' before creating 'username/api-layer'.

Suggested PR:
- Title: Add database layer
- Base: main
- Description:
  - Implement User model
  - Add database schema
  - Set up migrations

Would you like me to create this PR now?

User: Yes

Agent: [Re-runs] /speck.branch create username/api-layer --create-pr --title "Add database layer" --description "..." --pr-base "main"

Output:
Creating PR for 'username/db-layer'...
✓ Created PR #42 for 'username/db-layer'
✓ Created stacked branch 'username/api-layer'
...
```
