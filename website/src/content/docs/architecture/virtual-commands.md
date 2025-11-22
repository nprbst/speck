---
title: "Virtual Commands"
description: "Understand how Speck's virtual command pattern eliminates path dependencies and enables Claude Code hooks for automatic context loading."
category: architecture
audience: [existing-users, evaluators]
prerequisites: ["/docs/core-concepts/workflow"]
tags: ["virtual-commands", "hooks", "architecture", "performance", "claude-code"]
lastUpdated: 2025-11-22
relatedPages: ["/docs/architecture/hooks", "/docs/architecture/performance"]
order: 1
---

# Virtual Commands

Speck uses a **virtual command pattern** to eliminate path dependencies and enable seamless integration with Claude Code's hook system. This architectural approach makes Speck commands work identically whether invoked as slash commands in Claude Code or as CLI tools in your terminal.

## What Are Virtual Commands?

Traditional CLI tools require explicit paths in your shell configuration. Virtual commands, by contrast, are discovered dynamically through a centralized command registry. When you run `/speck.specify` in Claude Code or `speck-specify` in your terminal, the same underlying implementation handles your request—no path configuration needed.

**Key Benefits:**
- **Zero Configuration**: No need to add Speck to your PATH or configure shell aliases
- **Hook Integration**: Enables automatic prerequisite checking and context pre-loading
- **Consistent Behavior**: Same functionality whether invoked via Claude Code or terminal
- **Extensibility**: New commands can be added to the registry without user configuration changes

## How It Works

### Command Registry

Speck maintains a command registry that maps command names to their implementations:

```typescript
{
  "speck.specify": {
    "scriptPath": "./commands/specify.ts",
    "requiresContext": true,
    "supportsParallelExecution": false
  },
  "speck.plan": {
    "scriptPath": "./commands/plan.ts",
    "requiresContext": true,
    "supportsParallelExecution": false
  }
  // ... additional commands
}
```

### Execution Flow

1. **Command Invocation**: User runs `/speck.specify` in Claude Code or `speck-specify` in terminal
2. **Hook Trigger** (Claude Code only): PrePromptSubmit hook detects the command invocation
3. **Registry Lookup**: Hook script or CLI router looks up the command in the registry
4. **Prerequisite Check**: Hook runs prerequisite validation and context gathering (see [Hooks](/docs/architecture/hooks))
5. **Command Execution**: The appropriate script is executed with the pre-loaded context

### Dual-Mode Execution

Speck commands support two execution modes:

**Claude Code Mode** (via hooks):
- Automatic prerequisite checking before command runs
- Context pre-loading (tasks.md, plan.md, etc.) injected into command prompt
- Sub-100ms hook latency for fast command response

**Terminal Mode** (direct CLI):
- Manual prerequisite checks via `speck-check-prerequisites`
- Standard CLI argument parsing
- No hook overhead, direct script execution

Both modes execute the same command implementation, ensuring consistent behavior.

## Performance Characteristics

Virtual commands are designed for minimal overhead:

- **Hook routing latency**: ~18ms average (well under 100ms target)
- **Command registry lookup**: <5ms
- **Context pre-loading**: Cached for 5 seconds, <5ms for cached reads
- **Total overhead**: <30ms for typical command invocations

See [Performance](/docs/architecture/performance) for detailed metrics.

## Implementation Details

### Command Registration

Commands are registered in `.claude-plugin/plugin.json` using standard Claude Code plugin conventions:

```json
{
  "commands": [
    {
      "name": "speck.specify",
      "description": "Create feature specification",
      "source": ".claude/commands/speck.specify.md"
    }
  ]
}
```

The virtual command registry extends this with execution metadata needed for hook routing and CLI invocation.

### Hook Integration

The PrePromptSubmit hook intercepts command invocations and injects prerequisite context:

```markdown
<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/path/to/specs/010-feature","AVAILABLE_DOCS":["tasks.md","plan.md"],"FILE_CONTENTS":{"tasks.md":"...","plan.md":"..."}}
-->
```

This context injection happens automatically before the command runs, eliminating manual prerequisite checks. See [Hooks](/docs/architecture/hooks) for details.

## When to Use This Pattern

Virtual commands are ideal for:

- **Plugin-Based Tools**: Tools that integrate with extensible editors or IDEs
- **Multi-Environment CLIs**: Commands that need identical behavior across different invocation contexts
- **Hook-Dependent Workflows**: Tools that benefit from automatic context gathering before execution
- **Dynamic Command Registration**: Systems where new commands can be added without user configuration

## Comparison to Traditional CLI Patterns

| Aspect | Traditional CLI | Virtual Commands |
|--------|----------------|------------------|
| Path Configuration | Required (PATH, aliases) | None required |
| Command Discovery | Static (shell PATH) | Dynamic (registry lookup) |
| Hook Support | None | Native PrePromptSubmit integration |
| Context Loading | Manual (user reads files) | Automatic (hook pre-loads) |
| Setup Overhead | High (path config per user) | Low (plugin install only) |

## Related Documentation

- [Hooks](/docs/architecture/hooks) - Learn how PrePromptSubmit hooks enable automatic context loading
- [Performance](/docs/architecture/performance) - See detailed performance metrics and benchmarks
- [Commands Reference](/docs/commands/reference) - Complete list of all Speck commands and their syntax
