# Speck Scripts Directory

This directory contains the unified CLI and command handlers for the Speck feature specification workflow.

## Overview

The virtual command pattern (feature 010) enables seamless CLI invocation without path dependencies through:
- **Unified CLI** ([speck.ts](speck.ts)): Single entry point using Commander.js
- **Command Registry** ([commands/index.ts](commands/index.ts)): Centralized mapping of virtual commands to handlers
- **Hook System**: PreToolUse and PrePromptSubmit hooks for Claude Code integration

## Architecture

### CLI Entry Point

**File**: [speck.ts](speck.ts)

The main CLI entry point that:
- Detects execution mode (CLI vs hook-invoked)
- Registers commands from the command registry
- Handles dual-mode output (human-readable vs JSON)
- Routes virtual commands (speck-*) to appropriate handlers

**Usage**:
```bash
# Direct CLI invocation
bun .speck/scripts/speck.ts <command> [args...]

# Examples
bun .speck/scripts/speck.ts env
bun .speck/scripts/speck.ts branch list
bun .speck/scripts/speck.ts check-prerequisites --json
```

### Command Registry

**File**: [commands/index.ts](commands/index.ts)

Centralized registry mapping command names to handlers. Each entry contains:
- `handler`: Function implementing the command logic
- `parseArgs`: Argument parser specific to the command
- `description`: Help text for the command
- `version`: Semantic version for migration tracking

**Adding a New Command**:
1. Create handler in `commands/<command-name>.ts`
2. Export `handler` and `parseArgs` functions
3. Add entry to registry in `commands/index.ts`
4. Hook automatically routes `speck-<command-name>` virtual commands

No hook code changes needed!

### Hook Scripts

**Files**:
- [hooks/pre-tool-use.ts](hooks/pre-tool-use.ts): Intercepts bash commands matching `speck-*` or `test-*` patterns
- [hooks/pre-prompt-submit.ts](hooks/pre-prompt-submit.ts): Auto-injects prerequisite context for `/speck.*` slash commands

**Hook Flow**:
```
Claude invokes: speck-env
→ PreToolUse hook intercepts
→ Routes to: bun speck.ts env --hook
→ JSON response returned to Claude
→ Hook wraps in echo for display
```

### Shared Utilities

**Directory**: [lib/](lib/)

Reusable utilities for command handlers:
- `types.ts`: TypeScript interfaces (HookInput, HookOutput, CommandContext, CommandResult)
- `mode-detector.ts`: Detects CLI vs hook execution mode
- `hook-utils.ts`: JSON parsing/formatting for hook I/O
- `error-handler.ts`: Consistent error formatting across modes
- `output-formatter.ts`: Mode-aware output formatting
- `logger.ts`: Debug logging utilities
- `prereq-runner.ts`: Prerequisite check orchestration
- `prereq-cache.ts`: 5-second TTL cache for prerequisite results

## Command Handler Pattern

All command handlers follow this pattern:

```typescript
import type { CommandHandler, CommandContext, CommandResult } from "../lib/types";

export interface MyCommandArgs {
  // Parsed arguments
  someArg: string;
}

export function parseMyCommandArgs(commandString: string): MyCommandArgs {
  // Parse the command string into structured args
  return { someArg: "..." };
}

export const myCommandHandler: CommandHandler<MyCommandArgs> = async (args, context) => {
  try {
    // Command logic here
    return {
      success: true,
      output: "Command output",
      errorOutput: null,
      exitCode: 0,
    };
  } catch (error) {
    return errorToResult(error, context);
  }
};
```

## Dual-Mode Operation

Commands must work identically in both modes:

### CLI Mode
- Input: Command-line arguments
- Output: Human-readable text to stdout/stderr
- Exit: Process exit code

### Hook Mode
- Input: JSON via stdin (`{ "command": "..." }`)
- Output: JSON via stdout (`{ "success": true, "output": "..." }`)
- Exit: Always 0 (errors encoded in JSON)

**Mode Detection**:
```typescript
import { detectMode } from "./lib/mode-detector";

const mode = detectMode(); // "cli" | "hook"
```

## Testing

### Unit Tests
```bash
bun test tests/unit/
```

### Integration Tests
```bash
bun test tests/integration/
```

### Hook Simulation
```bash
echo '{"command":"speck-env"}' | bun .speck/scripts/speck.ts --hook
```

## Migration from Individual Scripts

Old pattern (deprecated):
```bash
bun .speck/scripts/env-command.ts
bun .speck/scripts/branch-command.ts
```

New pattern (recommended):
```bash
bun .speck/scripts/speck.ts env
bun .speck/scripts/speck.ts branch list
```

Virtual command pattern (Claude Code):
```bash
speck-env
speck-branch list
```

## Build Process

The hook system requires a bundled single-file script for Claude Code:

```bash
# Build bundled hook (run automatically by plugin build)
bun run build:hook

# Output: .speck/dist/speck-hook.js
```

This bundles `speck.ts` and all dependencies into a single file for hook execution.

## Related Documentation

- [Virtual Command Pattern Specification](../../specs/010-virtual-command-pattern/spec.md)
- [Implementation Plan](../../specs/010-virtual-command-pattern/plan.md)
- [Quickstart Guide](../../specs/010-virtual-command-pattern/quickstart.md)
- [Knowledge Base Addendum](../../specs/010-virtual-command-pattern/addendum.md)

## Troubleshooting

### Command not found
- Verify command is registered in `commands/index.ts`
- Check command name matches pattern: `speck-<command-name>`

### Hook not working
- Rebuild hook: `bun run build:hook`
- Check `.claude-plugin/plugin.json` has correct hook path
- Verify hook is enabled in `.claude/settings.json`

### Dual-mode output mismatch
- Check mode detection in command handler
- Ensure output formatting respects `context.mode`
- Use `output-formatter.ts` utilities for consistency

### Permission denied
- Make sure scripts are executable: `chmod +x .speck/scripts/*.ts`
- Or use `bun` explicitly: `bun .speck/scripts/speck.ts`

## Contributing

When adding new commands:
1. Follow the command handler pattern above
2. Add comprehensive JSDoc comments
3. Include unit and integration tests
4. Update this README if introducing new patterns
5. Verify command works in both CLI and hook modes
