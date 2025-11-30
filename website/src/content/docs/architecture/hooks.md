---
title: "Hook System"
description: "Learn how Speck's PrePromptSubmit hook automatically validates prerequisites and pre-loads context before slash commands execute."
category: architecture
audience: [existing-users, evaluators]
prerequisites: []
tags: ["hooks", "claude-code", "automation", "prerequisites", "context"]
lastUpdated: 2025-11-29
relatedPages: ["/docs/architecture/performance"]
order: 2
---

# Hook System

Speck leverages Claude Code's **PrePromptSubmit hook** to automatically validate prerequisites and pre-load file contents before slash commands execute. This eliminates manual prerequisite checks and provides commands with instant access to relevant context (like tasks.md, plan.md, and constitution.md).

## What Are Hooks?

Hooks are user-configurable extension points in Claude Code that run automatically in response to events. Speck uses the **PrePromptSubmit hook**, which triggers when you invoke a slash command.

**Key Benefits:**
- **Zero Manual Checks**: No need to run `/speck.env` or validate prerequisites manually
- **Instant Context**: Commands receive pre-loaded file contents without reading from disk
- **Fast Execution**: Cached prerequisite results avoid redundant file system operations
- **Consistent State**: All commands run with validated, up-to-date context

## How Hooks Work

### Execution Flow

When you invoke `/speck.plan` in Claude Code:

1. **Hook Trigger**: PrePromptSubmit hook detects the command invocation
2. **Command Detection**: Hook script identifies this as a Speck command requiring prerequisites
3. **Prerequisite Check**: Runs `speck-check-prerequisites --json --require-tasks --include-tasks`
4. **Context Gathering**: Reads and caches tasks.md, plan.md, constitution.md, data-model.md
5. **Context Injection**: Injects a JSON comment into the command prompt with all context
6. **Command Execution**: Your slash command runs with pre-loaded context immediately available

All of this happens in **under 100ms** (typically ~18-50ms), making it imperceptible to users.

### Prerequisite Context Format

The hook injects context as a machine-readable comment:

```markdown
<!-- SPECK_PREREQ_CONTEXT
{
  "MODE": "single-repo",
  "FEATURE_DIR": "/Users/you/project/specs/010-feature",
  "AVAILABLE_DOCS": ["tasks.md", "plan.md", "constitution.md"],
  "FILE_CONTENTS": {
    "tasks.md": "# Implementation Tasks...",
    "plan.md": "# Implementation Plan...",
    "constitution.md": "# Project Constitution..."
  },
  "WORKFLOW_MODE": "single-branch"
}
-->
```

Commands parse this JSON to access context without file I/O. If a file is too large, the value will be `"TOO_LARGE"`, and the command can use Claude Code's Read tool if needed.

## What Gets Pre-Loaded

The hook pre-loads these files (if they exist):

**High Priority** (always loaded):
- `tasks.md` - Current implementation tasks and progress
- `plan.md` - Implementation plan and architecture decisions
- `constitution.md` - Project principles and quality gates

**Medium Priority** (loaded if available):
- `data-model.md` - Entity definitions and data structures
- `checklists/*.md` - All checklist files in the checklists directory

**Large Files** (marked as `"TOO_LARGE"` if they exceed size limits):
- Commands can still access these via the Read tool when needed
- Prevents hook latency from growing with file size

**Not Pre-Loaded** (always require Read tool):
- `contracts/` directory files
- `research.md`
- `quickstart.md`

## Caching Strategy

To maintain sub-100ms performance, the hook caches prerequisite results for **5 seconds**:

- **Uncached check**: ~50-100ms (reads files from disk)
- **Cached check**: <5ms (returns cached JSON)
- **Cache TTL**: 5 seconds (balances freshness with performance)

If you run `/speck.plan` and then `/speck.implement` within 5 seconds, the second command uses cached context. After 5 seconds, the hook re-runs prerequisite checks to ensure freshness.

### Cache Metadata

The hook provides cache metadata so commands can determine data freshness:

```json
{
  "isCached": true,
  "ageMs": 1234,
  "ttlMs": 5000
}
```

Commands can choose to re-run prerequisites if cached data is too old for their use case.

## Failure Handling

If prerequisite checks fail (e.g., missing tasks.md), the hook:

1. **Blocks Command Execution**: Prevents the slash command from running with invalid state
2. **Shows Clear Error**: Displays error message with remediation steps
3. **Suggests Next Steps**: e.g., "Run `/speck.tasks` to generate tasks.md first"

This prevents commands from failing mid-execution due to missing prerequisites.

## Performance Characteristics

The hook system is designed for imperceptible latency:

| Operation | Latency | Notes |
|-----------|---------|-------|
| Hook routing | ~18ms avg | Command registry lookup + subprocess spawn |
| Uncached prerequisite check | 50-100ms | Reads files from disk, validates structure |
| Cached prerequisite check | <5ms | Returns pre-loaded JSON |
| Context injection | <1ms | Appends JSON comment to prompt |
| **Total overhead** | **<100ms** | Meets success criteria (SC-003) |

See [Performance](/docs/architecture/performance) for detailed benchmarks.

## Configuration

Hooks are configured in `.claude/hooks/user-prompt-submit.ts` (or `.js`):

```typescript
import { speckPrerequisiteHook } from '@speck/hooks';

export async function onUserPromptSubmit(context) {
  // Run Speck prerequisite hook for relevant commands
  await speckPrerequisiteHook(context);

  // Other hook logic (if any)
}
```

The hook automatically detects Speck commands and only runs for relevant invocations (e.g., `/speck.plan`, `/speck.implement`). It has zero impact on non-Speck commands.

## Backwards Compatibility

Commands gracefully handle environments without hooks:

1. **Check for Prerequisite Context**: Parse `<!-- SPECK_PREREQ_CONTEXT -->` comment
2. **Fallback to Manual Check**: If comment missing, run `speck-check-prerequisites` directly
3. **Continue Execution**: Same behavior whether context is pre-loaded or manually fetched

This ensures Speck works in:
- **Claude Code with hooks**: Automatic prerequisite injection (fast)
- **Claude Code without hooks**: Manual prerequisite checks (still works, slightly slower)
- **Terminal CLI**: Direct prerequisite checks via explicit command invocation

## Benefits Over Manual Prerequisite Checks

**Before hooks** (manual prerequisite checks):
```markdown
User: /speck.implement
Claude: Let me first run speck-check-prerequisites...
[Command runs prerequisite check]
[Command reads tasks.md]
[Command reads plan.md]
[Command begins implementation]
```

**With hooks** (automatic prerequisite injection):
```markdown
User: /speck.implement
[Hook automatically injects prerequisites]
Claude: I'll implement the tasks from tasks.md...
[Command begins implementation immediately]
```

**Result**: Faster execution, fewer manual steps, better user experience.

## Related Documentation

- [Performance](/docs/architecture/performance) - See detailed hook latency benchmarks
- [Commands Reference](/docs/commands/reference) - Complete list of commands that use hook-based prerequisites
