# Speck CLI & Hook Architecture

This directory contains the unified Speck CLI implementation with dual-mode operation (standalone CLI and Claude Code hook integration).

## Directory Structure

```
.speck/scripts/
├── speck.ts                  # Main dual-mode CLI entry point
├── build-hook.ts             # Build script for bundled hook
├── commands/                 # Command handler implementations
│   ├── index.ts             # Centralized command registry
│   ├── echo.ts              # Test command handler
│   ├── env.ts               # Environment info command
│   └── ...                  # Additional command handlers
├── hooks/                    # Claude Code hook implementations
│   ├── pre-tool-use.ts      # PreToolUse hook (virtual commands)
│   └── pre-prompt-submit.ts # PrePromptSubmit hook (prerequisite checks)
├── lib/                      # Shared utilities
│   ├── types.ts             # TypeScript interfaces
│   ├── mode-detector.ts     # CLI vs hook mode detection
│   ├── hook-utils.ts        # Hook JSON formatting
│   ├── prereq-runner.ts     # Prerequisite check execution
│   ├── prereq-cache.ts      # 5-second TTL caching
│   ├── error-handler.ts     # Error formatting for both modes
│   └── output-formatter.ts  # Output formatting for both modes
├── dist/                     # Build output (gitignored)
│   └── speck-hook.js        # Bundled single-file hook script
└── [individual scripts]      # Legacy scripts (being deprecated)
```

## Dual-Mode CLI Pattern

The Speck CLI operates in two modes:

### CLI Mode (Standalone)
- Invoked directly: `bun .speck/scripts/speck.ts <command> [args]`
- Uses Commander.js for argument parsing
- Outputs to stdout/stderr
- Returns exit codes (0=success, non-zero=failure)

### Hook Mode (Claude Code Integration)
- Invoked via Claude Code hooks (PreToolUse, PrePromptSubmit)
- Receives JSON input via stdin
- Returns JSON output via stdout
- Wraps output in `echo` commands for Claude consumption

**Design Principle**: Identical business logic in both modes, different I/O formatting.

## Command Registry

Commands are registered in [commands/index.ts](commands/index.ts) using one of three patterns:

### Pattern 1: handler (Inline Logic)
Simple commands with inline logic:
```typescript
{
  "echo": {
    handler: echoHandler,
    parseArgs: parseEchoArgs,
    description: "Echo back the provided message",
    version: "1.0.0"
  }
}
```

### Pattern 2: main (Static Import)
Lightweight commands loaded immediately:
```typescript
{
  "check-prerequisites": {
    main: checkPrerequisitesMain,
    description: "Validate feature directory structure",
    version: "1.0.0"
  }
}
```

### Pattern 3: lazyMain (Dynamic Import)
Heavy commands loaded on demand:
```typescript
{
  "branch": {
    lazyMain: async () => {
      const module = await import("../branch-command");
      return module.main;
    },
    description: "Manage stacked feature branches",
    version: "1.0.0"
  }
}
```

**Decision tree:**
- **handler**: Command < 50 lines, no external script
- **main**: Lightweight, frequently used
- **lazyMain**: Heavy, infrequently used

## Hook Architecture

### PreToolUse Hook (Virtual Commands)

**Purpose**: Intercept `speck-*` commands and route to unified CLI

**Flow**:
1. Claude attempts to run: `speck-env`
2. Hook intercepts via stdin JSON: `{"tool_name": "Bash", "tool_input": {"command": "speck-env"}}`
3. Hook routes to CLI: `bun .speck/dist/speck-hook.js --hook`
4. CLI executes command and returns JSON
5. Hook wraps output: `{"hookSpecificOutput": {"updatedInput": {"command": "echo '...'"}}}`
6. Claude executes wrapped command and sees output

**Key Files**:
- [hooks/pre-tool-use.ts](hooks/pre-tool-use.ts): Hook router
- [lib/mode-detector.ts](lib/mode-detector.ts): Detects `--hook` flag or TTY
- [lib/hook-utils.ts](lib/hook-utils.ts): JSON formatting and escaping

### PrePromptSubmit Hook (Prerequisite Checks)

**Purpose**: Automatically run prerequisite checks before `/speck.*` slash commands

**Flow**:
1. User types: `/speck.tasks`
2. Hook intercepts prompt via stdin JSON
3. Hook runs prerequisite check (with 5-second caching)
4. On success: Injects context as markdown comment
5. On failure: Replaces prompt with error message

**Injected Context Format**:
```markdown
<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/path/to/specs/010-feature","AVAILABLE_DOCS":["spec.md","plan.md"]}
-->
```

**Key Files**:
- [hooks/pre-prompt-submit.ts](hooks/pre-prompt-submit.ts): Prerequisite hook
- [lib/prereq-runner.ts](lib/prereq-runner.ts): Check execution logic
- [lib/prereq-cache.ts](lib/prereq-cache.ts): 5-second TTL caching

## Adding New Commands

To add a new virtual command (e.g., `speck-analyze`):

**Step 1: Create Handler** (if needed)

```typescript
// .speck/scripts/commands/analyze.ts
import type { CommandHandler } from "../lib/types";

export const analyzeHandler: CommandHandler = async (args, context) => {
  // Your logic here
  return {
    success: true,
    output: "Analysis complete",
    exitCode: 0
  };
};
```

**Step 2: Register Command**

```typescript
// .speck/scripts/commands/index.ts
import { analyzeHandler } from "./analyze";

export const registry: CommandRegistry = {
  // ...existing commands
  "analyze": {
    handler: analyzeHandler,
    description: "Analyze feature specifications",
    version: "1.0.0"
  }
};
```

**Step 3: Add to CLI** (auto-generated from registry)

The [speck.ts](speck.ts) CLI already dynamically registers all commands from the registry.

**Step 4: Rebuild Hook Bundle**

```bash
bun run build:hook
```

**Step 5: Test**

```bash
# CLI mode
bun .speck/scripts/speck.ts analyze

# Hook mode simulation
echo '{"tool_name":"Bash","tool_input":{"command":"speck-analyze"}}' | \
  bun .speck/dist/speck-hook.js
```

**Total time**: <30 minutes (per SC-008)

## Performance Targets

- **SC-003**: Hook routing latency <100ms ✅ (measured ~18ms avg)
- **SC-005**: Prerequisite caching 30% faster ✅ (measured 100% reduction)
- **SC-008**: Add new command in <30min ✅ (validated via registry pattern)

## Building & Testing

### Build Hook Bundle
```bash
bun run build:hook
```

Generates `.speck/dist/speck-hook.js` - a minified single-file bundle for optimal hook performance.

### Run Tests
```bash
# All tests
bun test

# Specific test suites
bun test tests/integration/virtual-command.test.ts
bun test tests/unit/speck-cli.test.ts
bun test tests/benchmarks/

# With coverage
bun test --coverage
```

### Run Linter
```bash
bun run lint
```

## Migration Status

| Script | Status | Virtual Command | Notes |
|--------|--------|-----------------|-------|
| check-prerequisites.ts | ✅ Migrated | `speck-check-prerequisites` | Uses `main` pattern |
| branch-command.ts | ✅ Migrated | `speck-branch` | Uses `lazyMain` pattern |
| create-new-feature.ts | ✅ Migrated | `speck-create-new-feature` | Uses `lazyMain` pattern |
| setup-plan.ts | ✅ Migrated | `speck-setup-plan` | Uses `lazyMain` pattern |
| link-repo.ts | ✅ Migrated | `speck-link-repo` | Uses `lazyMain` pattern |

## Related Documentation

- **Feature Spec**: [specs/010-virtual-command-pattern/spec.md](../../specs/010-virtual-command-pattern/spec.md)
- **Implementation Plan**: [specs/010-virtual-command-pattern/plan.md](../../specs/010-virtual-command-pattern/plan.md)
- **Data Model**: [specs/010-virtual-command-pattern/data-model.md](../../specs/010-virtual-command-pattern/data-model.md)
- **Quickstart Guide**: [specs/010-virtual-command-pattern/quickstart.md](../../specs/010-virtual-command-pattern/quickstart.md)
- **Knowledge Base**: [specs/010-virtual-command-pattern/addendum.md](../../specs/010-virtual-command-pattern/addendum.md)
- **Contracts**: [specs/010-virtual-command-pattern/contracts/](../../specs/010-virtual-command-pattern/contracts/)

## Troubleshooting

### Hook not intercepting commands
- Check `.claude-plugin/plugin.json` has correct hook registration
- Restart Claude Code to reload plugin
- Verify hook script path is correct
- Check hook script has execute permissions

### parseArgs errors
- Ensure command uses correct pattern (handler/main/lazyMain)
- Check that `lazyMain` commands use conditional logic in action handlers
- Verify `handler` commands have `parseArgs` defined

### Mode detection issues
- Explicit `--hook` flag takes precedence
- TTY detection used as fallback
- Check stdin.isTTY value in debug logs

### Performance issues
- Use `lazyMain` for heavy commands
- Check 5-second cache TTL is working (see `getCacheStats()`)
- Profile with benchmarks: `bun test tests/benchmarks/`

## Architecture Principles

1. **Dual-mode parity**: Same business logic in both CLI and hook modes
2. **Registry-driven**: Commands registered centrally, hooks lookup dynamically
3. **Lazy loading**: Heavy commands loaded on demand
4. **Fast hooks**: Bundled single-file for minimal startup time
5. **Caching**: 5-second TTL for prerequisite checks
6. **Shell safety**: POSIX single-quote escaping for all output
7. **Error handling**: Consistent error formatting across modes
8. **Testability**: Both modes tested in isolation and integration

## Contributing

When adding new commands:
1. Follow the registry pattern (handler/main/lazyMain)
2. Add unit tests in `tests/unit/`
3. Add integration tests in `tests/integration/`
4. Update this README if introducing new patterns
5. Rebuild hook bundle: `bun run build:hook`
6. Run full test suite: `bun test`

For questions, see [quickstart.md](../../specs/010-virtual-command-pattern/quickstart.md) or [addendum.md](../../specs/010-virtual-command-pattern/addendum.md).
