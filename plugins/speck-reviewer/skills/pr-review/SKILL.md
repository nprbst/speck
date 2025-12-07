---
name: pr-review
description: Review GitHub pull requests with structured cluster-based walkthroughs, Speck-aware context, and intelligent comment management
---

# PR Review Skill

Guide users through structured, thorough PR reviews with intelligent file clustering and Speck specification awareness.

## Core Principles

1. **Cluster-Based Review**: Group related files for coherent review sessions
2. **Speck Awareness**: When specs exist, reference requirements in feedback
3. **Conversational Flow**: Natural language navigation ("next", "back", "where was I?")
4. **Comment Refinement**: Stage, edit, and batch-post comments

## CLI Reference

All commands use the speck-review CLI:

```bash
# Analyze PR and create clusters
bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts analyze [pr-number]

# State management
bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts state show
bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts state clear

# File listing
bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts files

# Speck integration
bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts spec-context

# Comment management
bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts comment <file> <line> <body>
bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts comment-reply <id> <body>
bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts comment-delete <id>
bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts list-comments

# Review submission
bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts review approve
bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts review request-changes "Reason for changes"
bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts review comment

# Self-review check
bun run ${CLAUDE_PLUGIN_ROOT}/cli/src/index.ts check-self-review <author>
```

## Guided Review Mode

### Starting a Review

1. Run `analyze` to get clustered file groupings
2. Check for existing state with `state show`
3. Load Speck context if available with `spec-context`
4. Present the narrative summary and cluster overview

### Cluster Walkthrough

For each cluster:
1. Announce cluster name, description, and file count
2. Use Read tool to examine each file's changes
3. Consider the spec requirements if loaded
4. Generate review comments as suggestions
5. Ask if user wants to proceed to next cluster

### Navigation Commands

- **"next"**: Advance to the next cluster
- **"back"**: Return to previous cluster
- **"go to [name]"**: Jump to specific cluster
- **"where was I?"**: Show progress summary
- **"show clusters"**: List all clusters with status

## Speck-Aware Context

When a Speck specification exists for the branch:

1. The `spec-context` command returns parsed requirements and user stories
2. Reference spec requirements in comments: "This implements FR-003"
3. Note alignment or misalignment with spec acceptance criteria
4. Suggest spec updates if implementation differs

If no spec exists, proceed with standard review (graceful degradation).

## Comment Management

### Comment States

- **suggested**: AI-generated, awaiting user decision
- **staged**: Accepted by user, ready to post
- **skipped**: User chose not to post
- **posted**: Successfully posted to GitHub

### Comment Operations

| User Says | Action |
|-----------|--------|
| "skip 2" | Mark comment #2 as skipped |
| "restore 2" | Restore skipped comment |
| "reword 1 to be friendlier" | Edit comment #1 text |
| "combine 1 and 2" | Merge comments into one |
| "post 1, 3" | Post specific comments |
| "post all" | Post all staged comments |
| "post all then approve" | Post + submit approval |

### Comment Quality Guidelines

- Be specific and actionable
- Reference line numbers and file paths
- Suggest alternatives, don't just criticize
- Use tentative language for style suggestions
- Be direct for correctness issues

## Self-Review Mode

When the current user is the PR author:

1. Automatically detected via `check-self-review`
2. Comments posted as issue comments (not review comments)
3. Approve/request-changes actions hidden
4. Still provides valuable self-review feedback

## State Persistence

Review state persists to `.claude/review-state.json`:

- Survives session interruptions
- Tracks reviewed clusters
- Preserves staged comments
- Stores current position

To resume: Simply run `/review` again on the same PR.
To start fresh: `state clear` or answer "start fresh" when prompted.

## Error Handling

### Common Errors

| Error | Solution |
|-------|----------|
| `gh CLI not authenticated` | Run `gh auth login` |
| `No PR found` | Specify PR number: `/review 142` |
| `GitHub API rate limit` | Wait and retry; comments preserved |
| `File not in PR diff` | Check file path matches diff |

### Retry Support

If posting fails, staged comments are preserved. Use "retry" to attempt again.

## Example Session

```
User: /review 142