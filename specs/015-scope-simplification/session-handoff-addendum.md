# Session Handoff Addendum

**Feature**: 015-scope-simplification
**Date**: 2025-11-28
**Status**: Implementation Reference
**Source**: Claude Code worktree handoff research conversation

This addendum captures implementation-critical details for the session handoff mechanism that supplements the main spec and research documents.

---

## 1. Git Worktree Atomic Creation

### Key Insight

Use `git worktree add -b` to create branch + worktree atomically **without changing the current checkout**:

```bash
# You're on main, and you STAY on main
git worktree add -b feature/new-thing ../worktrees/new-thing main
```

This:
1. Creates branch `feature/new-thing` pointing at `main` (or specified start-point)
2. Creates the worktree at the specified path
3. Checks out that branch *in the new worktree only*
4. **Never touches your current checkout**

### Implementation Pattern

```bash
# Full flow - original repo never changes state
git worktree add -b feat/oauth ../worktrees/feat-oauth HEAD
code ../worktrees/feat-oauth
# You're still on main, worktree is on feat/oauth
```

Variations:
```bash
# Branch from a specific commit
git worktree add -b hotfix/urgent ../worktrees/hotfix abc123

# Branch from remote
git worktree add -b feat/upstream ../worktrees/upstream origin/develop
```

**Impact**: The `create-new-feature` command does NOT need to "switch back to main" after worktree creation - this was a non-issue all along.

---

## 2. SessionStart Hook Configuration

### Hook Registration

The SessionStart hook must be registered in the **worktree's** `.claude/settings.json` (not `.claude-plugin/plugin.json`):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/scripts/handoff.sh"
          }
        ]
      }
    ]
  }
}
```

### Hook Output Format

The hook script MUST output JSON with `hookSpecificOutput.additionalContext` to inject content into the session:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "# HANDOFF FROM PARENT WORKTREE\n\n...content...\n\n---\nPlease read the above carefully and proceed with the task."
  }
}
```

Multiple hooks' `additionalContext` values are concatenated by Claude Code.

---

## 3. Handoff Shell Script

### Location

```
<worktree>/.claude/scripts/handoff.sh
```

### Implementation (Self-Cleaning)

```bash
#!/bin/bash

HANDOFF_FILE="$CLAUDE_PROJECT_DIR/.speck/handoff.md"
SETTINGS_FILE="$CLAUDE_PROJECT_DIR/.claude/settings.json"

# Exit silently if no handoff file
[ ! -f "$HANDOFF_FILE" ] && exit 0

# Inject context into Claude session
# Use jq -Rs to properly JSON-escape the content (handles newlines, quotes, etc.)
cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": $(jq -Rs . < "$HANDOFF_FILE")
  }
}
EOF

# Cleanup: Mark handoff as processed
mv "$HANDOFF_FILE" "${HANDOFF_FILE%.md}.done.md"

# Cleanup: Remove the SessionStart hook from settings.json (one-time use)
if command -v jq &> /dev/null; then
  jq 'del(.hooks.SessionStart)' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && \
    mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
fi

exit 0
```

### Key Implementation Notes

1. **`jq -Rs`**: Properly JSON-escapes the handoff content (handles newlines, quotes, special chars)
2. **Self-cleaning**: Hook removes itself from `settings.json` after firing to prevent repeated injection
3. **Idempotent**: If handoff file doesn't exist, exits silently with success
4. **Archive**: Renames `handoff.md` → `handoff.done.md` for audit trail

---

## 4. VSCode Auto-Open Claude Panel

### Purpose

When VSCode opens the worktree, automatically focus the Claude Code extension panel.

### Configuration

Write `.vscode/tasks.json` to the worktree:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Open Claude Code Panel",
      "command": "${command:claude-vscode.focus}",
      "type": "shell",
      "problemMatcher": [],
      "runOptions": {
        "runOn": "folderOpen"
      },
      "presentation": {
        "reveal": "silent",
        "panel": "shared"
      },
      "hide": true
    }
  ]
}
```

### Key Properties

- `runOn: folderOpen`: Executes automatically when VSCode opens this folder
- `${command:claude-vscode.focus}`: Focuses existing Claude panel (doesn't spawn new chat)
- `hide: true`: Hides task from task picker (user doesn't need to see it)
- `reveal: silent`: Doesn't steal focus from editor

---

## 5. Complete Worktree Setup Flow

```typescript
async function createWorktreeWithHandoff(task: TaskContext) {
  const worktreePath = `../${repoName}-worktrees/${task.branch}`;

  // 1. Create branch + worktree (atomic, stays on current branch)
  await exec(`git worktree add -b ${task.branch} ${worktreePath} HEAD`);

  // 2. Write handoff content
  await mkdir(`${worktreePath}/.speck`, { recursive: true });
  await writeFile(`${worktreePath}/.speck/handoff.md`, task.handoffContent);

  // 3. Write handoff shell script
  await mkdir(`${worktreePath}/.claude/scripts`, { recursive: true });
  await writeFile(`${worktreePath}/.claude/scripts/handoff.sh`, HANDOFF_SCRIPT);
  await exec(`chmod +x ${worktreePath}/.claude/scripts/handoff.sh`);

  // 4. Write Claude settings with SessionStart hook
  await writeFile(`${worktreePath}/.claude/settings.json`, JSON.stringify({
    hooks: {
      SessionStart: [{
        matcher: "",
        hooks: [{
          type: "command",
          command: "$CLAUDE_PROJECT_DIR/.claude/scripts/handoff.sh"
        }]
      }]
    }
  }, null, 2));

  // 5. Write VSCode tasks for auto-open Claude panel
  await mkdir(`${worktreePath}/.vscode`, { recursive: true });
  await writeFile(`${worktreePath}/.vscode/tasks.json`, VSCODE_TASKS_JSON);

  // 6. Open VSCode - Claude opens AND gets handoff context injected
  await exec(`code ${worktreePath}`);
}
```

---

## 6. File Artifacts Written to Worktree

| File | Purpose | Lifecycle |
|------|---------|-----------|
| `.speck/handoff.md` | Feature context for Claude | Renamed to `.done.md` after load |
| `.claude/settings.json` | Hook configuration | SessionStart hook removed after fire |
| `.claude/scripts/handoff.sh` | Hook script | Persists (inert after handoff processed) |
| `.vscode/tasks.json` | Auto-open Claude panel | Persists (useful for future sessions) |

---

## 7. Graceful Degradation

If any step fails, the worktree should still be created and usable:

| Failure | Behavior |
|---------|----------|
| Handoff file write fails | Warning logged, worktree created without handoff |
| Hook script write fails | Warning logged, user manually opens Claude |
| VSCode tasks write fails | Warning logged, user manually opens Claude |
| VSCode launch fails | Warning logged, user manually opens IDE |
| `jq` not available | Hook works but doesn't self-clean from settings.json |

---

## 8. References

- Spec: [spec.md](./spec.md) - FR-027 through FR-031
- Contract: [contracts/handoff-document.ts](./contracts/handoff-document.ts)
- Data Model: [data-model.md](./data-model.md) - HandoffDocument entity
- Research: [research.md](./research.md) - Section 3
