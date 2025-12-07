---
title: "Speck Reviewer Plugin"
description: "AI-assisted PR review with cluster analysis and Speck-aware context"
category: "plugins"
order: 2
lastUpdated: 2025-12-07
tags: ["plugins", "code-review", "pull-request", "github", "cluster-analysis"]
---

# Speck Reviewer Plugin

Speck Reviewer brings structured, AI-assisted code review to your GitHub pull
requests. It groups related files into semantic clusters, guides you through a
structured walkthrough, and manages review comments with one-click posting.

## Features

- **Cluster-Based Review** - Automatically groups related files for coherent
  review sessions
- **Speck-Aware Context** - When specs exist, references requirements in
  feedback
- **Guided Walkthrough** - Step-by-step navigation through large PRs (5+ files)
- **Comment Management** - Stage, refine, and batch-post comments
- **Session Persistence** - Resume interrupted reviews exactly where you left
  off
- **Self-Review Mode** - Review your own PRs with appropriate comment handling

## Installation

```bash
# Ensure speck-market is added
/plugin marketplace add nprbst/speck-market

# Install speck-reviewer
/plugin install speck-reviewer@speck-market
```

## Quick Start

1. **Check out a PR**:
   ```bash
   gh pr checkout 142
   ```

2. **Start a review**:
   ```
   /speck-reviewer:review
   ```

3. **Navigate clusters** using natural language:
   - "next" - Move to next cluster
   - "back" - Return to previous
   - "where was I?" - Show progress
   - "show comments" - View staged comments

4. **Post comments**:
   - "post 1, 3" - Post specific comments
   - "post all" - Post all staged
   - "post all then approve" - Post and submit review

## How It Works

### Cluster Analysis

When you run `/speck-reviewer:review`, Speck Reviewer:

1. Analyzes the PR diff to identify changed files
2. Groups files into semantic clusters based on:
   - Directory structure
   - File types (types, services, routes, tests)
   - Dependencies between files
3. Presents clusters in dependency order (foundational changes first)

### Guided Walkthrough

For PRs with 5+ files, you'll see:

```markdown
## Cluster 1: Core Types (Priority: 1)

**Why review first:** These types are used by all other changes

| File                                   | Changes | Focus Areas      |
| -------------------------------------- | ------- | ---------------- |
| [src/types/user.ts](src/types/user.ts) | +45/-0  | Interface design |

**What to look for:**

- Required vs optional fields
- Naming conventions
```

### Speck Integration

When a Speck specification exists for the branch:

- Requirements are loaded automatically
- Comments can reference spec IDs: "This implements FR-003"
- Review notes alignment with acceptance criteria

If no spec exists, review proceeds normally (graceful degradation).

## CLI Reference

The plugin includes a CLI for programmatic access:

```bash
# Analyze PR with clustering
speck-review analyze [pr-number]

# State management
speck-review state show
speck-review state clear

# Speck context (loads spec for current branch)
speck-review spec-context

# Comment operations
speck-review comment <file> <line> <body>
speck-review comment-reply <id> <body>
speck-review comment-delete <id>
speck-review list-comments

# Review submission
speck-review review approve [body]
speck-review review request-changes <body>

# Self-review detection
speck-review check-self-review <author>

# Utilities
speck-review files
speck-review link <file> [line]
speck-review actions
```

## Self-Review Mode

When reviewing your own PR, Speck Reviewer automatically:

- Posts comments as issue comments (not review comments)
- Hides Approve/Request Changes actions
- Provides the same thorough review feedback

This is detected automatically via `gh api user`.

## Session Persistence

Review state is saved to `.speck/review-state.json`:

- Cluster progress (which clusters reviewed)
- Staged comments (not yet posted)
- Current position (for resume)
- Q&A history (questions asked during review)

To start fresh: answer "start fresh" when prompted or run
`speck-review state clear`.

## Prerequisites

- **GitHub CLI (`gh`)** - Installed and authenticated
- **Git** - PR must be checked out locally

## Example Session

```
User: /review

Claude: Found 1 PR requiring your review:
1. **#142** "Add user authentication" by @alice

## PR #142: Add user authentication

### Summary
This PR adds JWT-based authentication...

### Review Order
1. [src/types/auth.ts](src/types/auth.ts) - New types
2. [src/services/AuthService.ts](src/services/AuthService.ts) - Core logic
3. [src/routes/auth.ts](src/routes/auth.ts) - Endpoints

### Suggested Comments
| # | Location | Comment |
|---|----------|---------|
| 1 | src/services/AuthService.ts:42 | Consider rate limiting |
| 2 | src/services/AuthService.ts:78 | Nit: make expiry configurable |

**Actions:** "post all", "skip 2", "post 1 then approve"

User: post 1 then approve

Claude: ✅ Posted comment on src/services/AuthService.ts:42
✅ Approved PR #142
```

## Troubleshooting

### "gh CLI not authenticated"

Run `gh auth login` and follow the prompts.

### "No PR found"

Specify the PR number: `/review 142`

### Comments not posting

Check GitHub rate limits. Staged comments are preserved - retry with "post all".

## See Also

- [Plugin Extensibility](./) - Overview of Speck plugins
- [Quick Start Guide](/getting-started/quick-start) - Core Speck installation
- [Feature Development Workflow](/workflows/feature-development) - Using Speck
  for features
