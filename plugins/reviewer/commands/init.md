---
description: Configure auto-allow permissions for speck reviewer PR reviews
---

## Speck-Reviewer Initialization

This command configures auto-allow permissions for seamless PR reviews using `speck reviewer <command>`.

### What This Does

1. Verifies the `speck` CLI is installed and accessible
2. Configures auto-allow permissions for GitHub CLI commands
3. Adds `review-state.json` to `.speck/.gitignore`

### Prerequisites

- Speck CLI installed globally (`speck --version`)
- GitHub CLI installed and authenticated (`gh auth login`)

### Verification Steps

Run these commands to verify prerequisites:

```bash
# 1. Verify speck CLI is installed
speck --version

# 2. Verify GitHub CLI is authenticated
gh auth status
```

If `speck --version` fails, install Speck first using `/speck:init`.

### Auto-Allow Permissions

Configure auto-allow permissions by adding these entries to `.claude/settings.local.json` in the repository root. Create the file if it doesn't exist.

**Required permissions:**
```json
{
  "permissions": {
    "allow": [
      "Read(~/.claude/plugins/marketplaces/speck-market/speck-reviewer/skills/**)",
      "Bash(gh pr list:*)",
      "Bash(gh pr view:*)",
      "Bash(gh pr diff:*)",
      "Bash(gh api:*)",
      "Bash(gh auth status:*)",
      "Bash(speck reviewer:*)"
    ]
  }
}
```

If `.claude/settings.local.json` already exists, merge these permissions into the existing `allow` array. Do not remove existing permissions.

### Configure .gitignore

Add `review-state.json` to `.speck/.gitignore` to prevent committing machine-specific review state.

**If `.speck/.gitignore` exists:** Read it, and if `review-state.json` is not already present, add it to the file using the Edit tool.

**If `.speck/.gitignore` does not exist:** Create it with:
```
# Machine-specific files
review-state.json
```

### Usage

After initialization, use the unified CLI to review PRs:

```bash
# List open PRs
speck reviewer list

# Analyze a specific PR
speck reviewer analyze 123

# Show review state
speck reviewer state show
```

### Verification

After setup, verify everything is working:

```bash
speck reviewer help
gh auth status
```

The `speck reviewer` command routes to the speck-reviewer plugin automatically.
