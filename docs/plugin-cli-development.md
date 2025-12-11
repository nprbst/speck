# Creating Plugin CLI Subcommands

This guide explains how to add CLI functionality to Speck plugins using the unified CLI routing system.

## Overview

The Speck CLI supports plugin subcommands through subprocess delegation. When a user runs `speck <subcommand>`, the CLI:

1. Checks if `<subcommand>` matches a plugin's `cli.subcommand` declaration
2. Finds the plugin's manifest (`plugin.json`) with the CLI declaration
3. Spawns the plugin's CLI entrypoint as a subprocess: `bun {plugin_path}/{entrypoint} <args>`

This architecture provides:
- **Isolation**: Plugin CLIs run in separate processes
- **Independence**: Plugins can be updated without rebuilding the core CLI
- **Flexibility**: Plugins can use any dependencies without bundling concerns

## Quick Start Checklist

- [ ] Create `src/index.ts` with dispatch table pattern
- [ ] Add `cli` field to `.claude-plugin/plugin.json`
- [ ] Add build script to `package.json`
- [ ] Export `main(args: string[]): Promise<number>` from each command module

## Manifest Declaration

Add the `cli` field to your plugin's `.claude-plugin/plugin.json`:

```json
{
  "name": "my-plugin",
  "description": "My awesome plugin",
  "version": "1.0.0",
  "cli": {
    "subcommand": "myplugin",
    "description": "Short description for help output",
    "entrypoint": "dist/my-plugin.js"
  }
}
```

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| `subcommand` | Name users type after `speck` | `"reviewer"`, `"changes"` |
| `description` | Short description shown in `speck --help` | `"AI-powered PR review"` |
| `entrypoint` | Path to compiled CLI relative to plugin root | `"dist/speck-review.js"` |

## CLI Entry Point Template

Create `src/index.ts` using the dispatch table pattern with lazy imports:

```typescript
#!/usr/bin/env bun

/**
 * Plugin CLI - Main Entry Point
 *
 * Dispatch table pattern with lazy imports for fast startup.
 */

type MainFunction = (args: string[]) => Promise<number>;
type CommandHandler = (args: string[]) => Promise<number>;

/**
 * Command dispatch table with lazy imports
 */
const commands: Record<string, CommandHandler> = {
  // Each command lazily imports its module
  'my-command': async (args) => {
    const { runMyCommand } = await import('./commands/my-command');
    return runMyCommand(args);
  },
  'another-command': async (args) => {
    const { runAnotherCommand } = await import('./commands/another-command');
    return runAnotherCommand(args);
  },
};

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Usage: speck myplugin <command> [options]

Commands:
  my-command       Description of my-command
  another-command  Description of another-command
  help             Show this help message

Options:
  --json    Output in JSON format
  --help    Show help for a specific command

Examples:
  speck myplugin my-command --json
  speck myplugin help
`);
}

/**
 * Main entry point
 */
async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const command = args[0];

  // Handle help
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return 0;
  }

  // Find and execute command
  const handler = commands[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.error(`Run 'speck myplugin help' to see available commands.`);
    return 1;
  }

  try {
    return await handler(args.slice(1));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return 1;
  }
}

// Run CLI
main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
```

## Command Module Interface

Each command module should export a main function with this signature:

```typescript
export async function runMyCommand(args: string[]): Promise<number> {
  // Parse args, do work, return exit code
  return 0; // Success
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `127` | Command not found |

## Output Mode Handling

Support `--json` flag for LLM-friendly output:

```typescript
interface OutputOptions {
  json: boolean;
}

function parseOutputOptions(args: string[]): OutputOptions {
  return {
    json: args.includes('--json'),
  };
}

export async function runMyCommand(args: string[]): Promise<number> {
  const opts = parseOutputOptions(args);

  const result = await doWork();

  if (opts.json) {
    // Structured output for LLM parsing
    console.log(JSON.stringify({
      success: true,
      data: result,
    }));
  } else {
    // Human-readable output
    console.log(`Result: ${result}`);
  }

  return 0;
}
```

### Output Conventions

- **Human mode**: Use stdout for results, stderr for progress/logs
- **JSON mode**: Output single JSON object to stdout
- **Errors**: Always write errors to stderr

## Error Handling

Use consistent error patterns:

```typescript
import { CommandError } from '@speck/common/errors';

export async function runMyCommand(args: string[]): Promise<number> {
  try {
    // Validate inputs
    if (!args[0]) {
      throw new CommandError('Missing required argument: <name>', 'MISSING_ARG');
    }

    // Do work...
    return 0;
  } catch (error) {
    if (error instanceof CommandError) {
      console.error(`Error: ${error.message}`);
      return 1;
    }

    // Unexpected error
    console.error('Unexpected error:', error);
    return 1;
  }
}
```

## Build Configuration

### package.json

```json
{
  "name": "@speck/my-plugin",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "speck-myplugin": "./dist/my-plugin.js"
  },
  "scripts": {
    "build": "bun build src/index.ts --outfile dist/my-plugin.js --target bun",
    "build:standalone": "bun build src/index.ts --compile --outfile dist/my-plugin",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@speck/common": "workspace:*"
  },
  "devDependencies": {
    "@types/bun": "^1.3.2",
    "typescript": "^5.3.3"
  }
}
```

### Build Command

```bash
# Bundle to JS (for subprocess delegation)
bun build src/index.ts --outfile dist/my-plugin.js --target bun

# Optional: Compile to standalone binary
bun build src/index.ts --compile --outfile dist/my-plugin
```

## Testing Requirements

### Unit Tests

Test command logic independently:

```typescript
import { describe, test, expect } from 'bun:test';
import { runMyCommand } from '../src/commands/my-command';

describe('my-command', () => {
  test('succeeds with valid input', async () => {
    const exitCode = await runMyCommand(['valid-arg']);
    expect(exitCode).toBe(0);
  });

  test('fails with missing argument', async () => {
    const exitCode = await runMyCommand([]);
    expect(exitCode).toBe(1);
  });
});
```

### Integration Tests

Test CLI routing end-to-end:

```typescript
import { describe, test, expect } from 'bun:test';

describe('speck myplugin routing', () => {
  test('routes to plugin CLI', async () => {
    const proc = Bun.spawn(['speck', 'myplugin', 'help']);
    const output = await new Response(proc.stdout).text();
    expect(output).toContain('Usage: speck myplugin');
  });

  test('propagates --json flag', async () => {
    const proc = Bun.spawn(['speck', 'myplugin', 'my-command', '--json']);
    const output = await new Response(proc.stdout).text();
    const json = JSON.parse(output);
    expect(json.success).toBe(true);
  });
});
```

### Test JSON Output Format

```typescript
test('produces valid JSON output', async () => {
  const proc = Bun.spawn(['speck', 'myplugin', 'list', '--json']);
  const output = await new Response(proc.stdout).text();

  // Should be valid JSON
  expect(() => JSON.parse(output)).not.toThrow();

  // Should have expected structure
  const json = JSON.parse(output);
  expect(json).toHaveProperty('success');
});
```

## Discovery Locations

The plugin loader searches these locations for plugins with CLI declarations:

1. **CLAUDE_PLUGIN_ROOT**: Plugin's own directory (when running from installed plugin)
2. **Local plugins/**: `./plugins/*/` directories in the repository
3. **Marketplace**: `~/.claude/plugins/marketplaces/*/` directories

## Example Plugins

See these plugins for reference implementations:

- **speck-reviewer**: [plugins/reviewer/src/index.ts](../plugins/reviewer/src/index.ts)
- **speck-changes**: [plugins/changes/src/index.ts](../plugins/changes/src/index.ts)

## Troubleshooting

### Plugin not appearing in `speck --help`

1. Check that `plugin.json` has valid `cli` field
2. Verify the plugin is in a discoverable location
3. Run `speck env` to see discovered plugins

### Command not found errors

1. Ensure the entrypoint file exists at the declared path
2. Check that the CLI was built: `bun run build`
3. Verify the plugin manifest path is correct

### JSON output malformed

1. Only write JSON to stdout in JSON mode
2. Write all logs/errors to stderr
3. Return single JSON object, not multiple lines
