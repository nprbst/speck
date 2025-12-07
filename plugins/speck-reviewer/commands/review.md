---
description: Review a GitHub pull request with Speck-aware context
argument-hint: [pr-number]
---

# PR Review Command

First, use the Read tool to load the skill instructions from
`${CLAUDE_PLUGIN_ROOT}/skills/pr-review/SKILL.md`, then follow
those instructions to review the specified PR.

## Arguments

- `$ARGUMENTS`: Optional PR number. If not provided, detects the current PR
  from the checked-out branch or finds PRs where user is assigned/requested.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth login`)
- Git repository with PR access

## Workflow

1. Load existing review state (if any) from `.claude/review-state.json`
2. Analyze PR with clustering: `bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts analyze`
3. Check for self-review mode: `bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts check-self-review <author>`
4. Load Speck context if available: `bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts spec-context`
5. Generate narrative and present clusters to user
6. Guide through structured cluster-by-cluster review
7. Manage comments (stage, refine, post)
8. Submit final review (approve, request-changes, or comment)

## Quick Commands

During review, users can say:
- "next" - advance to next cluster
- "back" - return to previous cluster
- "where was I?" - show current progress
- "skip 2" - skip comment #2
- "reword 1 to be friendlier" - modify comment #1
- "post all then approve" - post staged comments and approve PR
