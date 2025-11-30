# Refactor: Simplify speck.env.md Slash Command

## Problem

`speck.env.md` is 303 lines of inline bash and bun scripts that Claude executes step-by-step. Meanwhile, `env-command.ts` (393 lines) already implements all this functionality properly with JSON/hook/human output modes, and is already registered as `speck env` in the CLI.

The slash command should simply call `speck env --json` and present results.

## Current State

| File | Lines | Purpose |
|------|-------|---------|
| `.claude/commands/speck.env.md` | 303 | Inline bash/bun scripts executed by Claude |
| `.speck/scripts/env-command.ts` | 393 | Proper TypeScript command with output formatting |
| `src/cli/index.ts` | 344 | CLI with `speck env` command already registered |

**The env-command.ts already supports:**
- `--json` flag for structured output
- `--hook` flag for Claude Code integration
- Multi-repo detection via `detectSpeckRoot()`
- Branch mapping status
- Human-readable text output

## Solution

### 1. Replace speck.env.md entirely

**New `.claude/commands/speck.env.md`** (~30 lines):

```markdown
---
description: Check Speck plugin environment and configuration
---

## User Input

```text
$ARGUMENTS
```

## Environment Check

Run the Speck environment check:

```bash
speck env --json
```

## Present Results

Parse the JSON output and present a summary table to the user showing:
- Mode (single-repo / multi-repo)
- Repository paths
- Current branch
- Branch mappings (if any)
- Any errors or warnings

If there are issues, suggest remediation steps.
```

### 2. Enhance env-command.ts (if needed)

The existing `env-command.ts` may need minor enhancements:

1. **Add broken symlink detection** (Test 2.8 failure):
   - Check if `.speck/root` exists as a symlink
   - If symlink exists but target doesn't, report error with fix suggestion

2. **Add conflicting specs/ warning** (Test 2.9):
   - In multi-repo mode, warn if local `specs/` directory exists

### 3. Files to Modify

| File | Action |
|------|--------|
| `.claude/commands/speck.env.md` | Replace entirely with ~30 line version |
| `.speck/scripts/env-command.ts` | Add broken symlink detection |
| `.speck/scripts/common/paths.ts` | Add `validateSymlink()` helper |

### 4. Validation

After refactoring:
- `speck env` should work from CLI
- `speck env --json` should return structured data
- `/speck.env` slash command should call CLI and present results
- Broken symlink should produce clear error message
