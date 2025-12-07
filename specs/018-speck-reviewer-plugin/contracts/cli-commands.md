# CLI Commands Contract: speck-review

**Version**: 1.0.0
**Created**: 2025-12-07

## Command Interface

All commands follow the pattern:
```
speck-review <command> [args...]
```

Exit codes:
- `0`: Success
- `1`: Error (with message to stderr)

---

## Core Commands

### analyze

Analyze a PR and output clustered file groupings.

```
speck-review analyze [pr-number]
```

**Arguments**:
- `pr-number` (optional): PR number. If omitted, uses current checkout.

**Output** (JSON to stdout):
```json
{
  "prNumber": 142,
  "title": "Add user authentication",
  "author": "alice",
  "baseBranch": "main",
  "headBranch": "feature/auth",
  "narrative": "This PR implements...",
  "clusters": [
    {
      "id": "cluster-1",
      "name": "Data Models",
      "description": "Core type definitions",
      "files": [
        {
          "path": "src/types/user.ts",
          "changeType": "modified",
          "additions": 25,
          "deletions": 5
        }
      ],
      "priority": 1,
      "dependsOn": [],
      "status": "pending"
    }
  ],
  "crossCuttingConcerns": ["Configuration changes", "New dependencies"],
  "totalFiles": 12
}
```

**Errors**:
- No PR checked out and no number provided
- GitHub API failure

---

### state

Manage review session state.

```
speck-review state [show|clear]
```

**Subcommands**:
- `show` (default): Display current review state
- `clear`: Remove state file

**Output (show)**:
```
## Active Review Session

- **PR**: #142 - Add user authentication
- **Author**: @alice
- **Branch**: feature/auth
- **Mode**: normal
- **Started**: 2025-12-07T10:00:00Z
- **Last Updated**: 2025-12-07T10:30:00Z

### Progress: 2/4 clusters reviewed

- ✓ **Data Models** (3 files)
- ✓ **Authentication Logic** (5 files)
- → **API Routes** (4 files)
- ○ **Tests** (6 files)

### Comments: 3 staged, 0 posted, 1 skipped
```

**Output (clear)**:
```
✓ Cleared review state for PR #142
```

---

### comment

Post a line comment to the current PR.

```
speck-review comment <file> <line> <body>
```

**Arguments**:
- `file`: File path (relative to repo root)
- `line`: Line number
- `body`: Comment text

**Output**:
```
✓ Added comment #12345 on src/auth.ts:42
  [src/auth.ts:42](vscode://file/path/to/src/auth.ts:42)
```

**Errors**:
- File not in PR diff
- GitHub API failure (comment preserved locally, retry available)

---

### comment-reply

Reply to an existing comment thread.

```
speck-review comment-reply <comment-id> <body>
```

**Arguments**:
- `comment-id`: GitHub comment ID
- `body`: Reply text

**Output**:
```
✓ Replied to comment #12345
```

---

### comment-delete

Delete a comment.

```
speck-review comment-delete <comment-id>
```

**Arguments**:
- `comment-id`: GitHub comment ID

**Output**:
```
✓ Deleted comment #12345
```

---

### list-comments

List all comments on the current PR.

```
speck-review list-comments
```

**Output**:
```
## PR Comments (5 total: 3 open, 2 resolved)

### Open

- **#12345** [src/auth.ts:42](src/auth.ts#L42) (@alice)
  Consider adding rate limiting...

- **#12346** [src/routes.ts:15](src/routes.ts#L15) (@bob)
  Should validate input here...

### Resolved

- ~~**#12340**~~ [src/types.ts:10](src/types.ts#L10) (@alice)
  Fixed typo in type name...
```

---

### review

Submit a formal PR review.

```
speck-review review <event> [body]
```

**Arguments**:
- `event`: One of `approve`, `request-changes`, `comment`
- `body` (required for request-changes): Review body text

**Output**:
```
✓ Submitted review: APPROVE
```

**Errors**:
- `request-changes` without body
- Self-review attempting approve (in self-review mode)

---

### files

List changed files with metadata.

```
speck-review files
```

**Output**:
```
## Changed Files

- [src/auth/token.ts](src/auth/token.ts) (+85/-0, added)
- [src/auth/validate.ts](src/auth/validate.ts) (+42/-5, modified)
- [src/types/user.ts](src/types/user.ts) (+25/-10, modified)
```

---

### check-self-review

Check if the current user is the PR author.

```
speck-review check-self-review <author>
```

**Arguments**:
- `author`: PR author username

**Output** (JSON):
```json
{
  "isSelfReview": true,
  "author": "alice"
}
```

---

### spec-context

Load Speck specification for current branch (if exists).

```
speck-review spec-context
```

**Output** (JSON):
```json
{
  "found": true,
  "featureId": "018-speck-reviewer-plugin",
  "specPath": "specs/018-speck-reviewer-plugin/spec.md",
  "requirements": [
    {"id": "FR-001", "text": "Repository MUST support multiple plugins..."}
  ],
  "userStories": [
    {"id": 1, "title": "Install Speck Reviewer Plugin", "priority": "P1"}
  ]
}
```

**Output (no spec)**:
```json
{
  "found": false,
  "reason": "No spec found for branch 018-speck-reviewer-plugin"
}
```

---

### help

Display usage information.

```
speck-review help
speck-review --help
speck-review -h
```

---

### version

Display version.

```
speck-review --version
speck-review -v
```

**Output**:
```
speck-review 1.0.0
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SPECK_DEBUG` | Enable debug logging | `0` |
| `SPECK_LOG_LEVEL` | Log level (debug, info, warn, error) | `info` |
| `SPECK_STATE_PATH` | Override state file location | `.claude/review-state.json` |

---

## Error Handling

### GitHub API Failures

When GitHub API calls fail:
1. Log error details
2. Preserve any staged comments locally
3. Output actionable error message
4. Exit with code 1

```
✗ GitHub API error: rate limit exceeded
  Staged comments preserved in .claude/review-state.json
  Retry with: speck-review retry-post
```

### Authentication Errors

```
✗ GitHub CLI not authenticated
  Run: gh auth login
```

### File Not Found

```
✗ File not in PR diff: src/missing.ts
  Use 'speck-review files' to see changed files
```
