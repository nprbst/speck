# Plugin Manifest Contract

**Version**: 1.0.0
**Created**: 2025-12-07

## Root Marketplace: `.claude-plugin/marketplace.json`

Located at repository root, lists all available plugins.

```json
{
  "name": "speck-market",
  "owner": {
    "name": "Nathan Prabst",
    "email": "nathan@example.com"
  },
  "metadata": {
    "description": "Official Speck plugin marketplace for specification and planning tools",
    "version": "1.1.0"
  },
  "plugins": [
    {
      "name": "speck",
      "source": {
        "source": "github",
        "repo": "nprbst/speck-market",
        "path": "plugins/speck"
      },
      "description": "Specification and planning workflow framework for Claude Code",
      "version": "1.0.0",
      "author": {
        "name": "Nathan Prabst"
      },
      "homepage": "https://github.com/nprbst/speck",
      "repository": "https://github.com/nprbst/speck",
      "license": "MIT",
      "keywords": ["specification", "planning", "workflow", "feature-management"],
      "category": "development-tools",
      "strict": true
    },
    {
      "name": "speck-reviewer",
      "source": {
        "source": "github",
        "repo": "nprbst/speck-market",
        "path": "plugins/speck-reviewer"
      },
      "description": "AI-powered PR review with Speck-aware context and structured walkthroughs",
      "version": "1.0.0",
      "author": {
        "name": "Nathan Prabst"
      },
      "homepage": "https://github.com/nprbst/speck",
      "repository": "https://github.com/nprbst/speck",
      "license": "MIT",
      "keywords": ["code-review", "pull-request", "github", "spec-aware"],
      "category": "development-tools",
      "strict": true
    }
  ]
}
```

---

## Plugin Manifest: `plugins/speck-reviewer/.claude-plugin/plugin.json`

```json
{
  "name": "speck-reviewer",
  "description": "AI-powered PR review with Speck-aware context and structured walkthroughs",
  "version": "1.0.0",
  "author": {
    "name": "Nathan Prabst",
    "email": "nathan@example.com"
  },
  "homepage": "https://github.com/nprbst/speck",
  "repository": "https://github.com/nprbst/speck",
  "license": "MIT",
  "keywords": [
    "code-review",
    "pull-request",
    "github",
    "spec-aware",
    "pr-review"
  ],
  "commands": {
    "review": "commands/review.md"
  },
  "skills": {
    "pr-review": "skills/pr-review/SKILL.md"
  }
}
```

---

## Command File: `plugins/speck-reviewer/commands/review.md`

```markdown
---
description: Review a GitHub pull request with Speck-aware context
argument-hint: [pr-number]
---

# PR Review Command

First, use the Read tool to load the skill instructions from
`${CLAUDE_PLUGIN_ROOT}/skills/pr-review/SKILL.md`, then follow
those instructions to review the specified PR.

## Arguments

- `$ARGUMENTS`: Optional PR number. If not provided, finds PRs
  where user is assigned or requested as reviewer.

## Prerequisites

- `gh` CLI authenticated
- PR checked out or accessible

## Workflow

1. Load existing state (if any)
2. Analyze PR with clustering
3. Check for self-review mode
4. Generate narrative and present clusters
5. Guide through structured review
6. Manage comments and submit review
```

---

## Skill File: `plugins/speck-reviewer/skills/pr-review/SKILL.md`

**Structure**:
```markdown
---
name: pr-review
description: Review GitHub pull requests with structured walkthroughs...
---

# PR Review Skill

[Comprehensive review guidance - see POC for full content]

## Core Principles
## Guided Review Mode
## Cluster Analysis
## Comment Management
## State Persistence
## CLI Reference
```

---

## Directory Structure

```
plugins/speck-reviewer/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── commands/
│   └── review.md                # /review slash command
├── skills/
│   └── pr-review/
│       └── SKILL.md             # Review skill guidance
└── cli/
    ├── src/
    │   ├── index.ts             # CLI entry point
    │   ├── state.ts             # State management
    │   ├── clustering.ts        # File clustering
    │   ├── github.ts            # GitHub operations
    │   ├── speck.ts             # Speck integration
    │   └── logger.ts            # Logging
    ├── dist/
    │   └── speck-review         # Compiled binary
    ├── package.json
    └── tsconfig.json
```

---

## Installation Flow

1. User adds marketplace:
   ```
   /plugin marketplace add github:nprbst/speck-market
   ```

2. User installs plugin:
   ```
   /plugin install speck-reviewer@speck-market
   ```

3. Plugin downloads to `~/.claude/plugins/marketplaces/speck-market/speck-reviewer/`

4. CLI binary linked or executed via bun:
   ```
   bun ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts <command>
   ```

5. `/review` command becomes available

---

## Version Compatibility

| Plugin Version | Claude Code | gh CLI |
|---------------|-------------|--------|
| 1.0.x | 2.0+ | 2.0+ |

---

## Coexistence with Speck Plugin

Both plugins can be installed simultaneously:

```
/plugin install speck@speck-market
/plugin install speck-reviewer@speck-market
```

- No command name conflicts (`/speck.*` vs `/review`)
- No skill name conflicts (`speck-help` vs `pr-review`)
- Independent state files (`.speck/` vs `.claude/review-state.json`)
- Shared marketplace for single source management
