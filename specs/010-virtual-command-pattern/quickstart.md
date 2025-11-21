# Quickstart: Virtual Command Pattern

**Date**: 2025-11-21
**Feature**: 010-virtual-command-pattern

This guide helps you get started with the virtual command pattern implementation for Speck. Follow these steps to set up your development environment and run the POC.

## Prerequisites

Before starting, ensure you have:

- **Bun 1.0+** installed (`curl -fsSL https://bun.sh/install | bash`)
- **Git 2.30+** for version control
- **Claude Code** with plugin system 2.0+ support
- **TypeScript 5.3+** knowledge (for development)
- Speck repository cloned locally

Verify installations:
```bash
bun --version    # Should show 1.0.0 or higher
git --version    # Should show 2.30.0 or higher
```

## Initial Setup

### 1. Install Dependencies

From the repository root:

```bash
bun install
```

This installs:
- Commander.js (CLI framework)
- Bun types for TypeScript
- Testing dependencies

### 2. Verify Existing Plugin Installation

Check that the Speck plugin is installed in Claude Code:

```bash
cat "$HOME/.claude/speck-plugin-path"
```

Expected output: Path to Speck plugin root (e.g., `/Users/you/git/speck/.speck`)

## POC Implementation (User Story 0)

The POC validates the hook-based virtual command pattern with two commands:

1. **test-hello**: Simple test command proving hook mechanism works
2. **speck-env**: Real Speck command validating integration

### Step 1: Create Hook Router Script

Create `.speck/scripts/hooks/pre-tool-use.ts`:

```typescript
#!/usr/bin/env bun

import type { HookInput, HookOutput } from '../lib/types';

async function main() {
  const input = await Bun.stdin.text();

  try {
    const hookInput: HookInput = JSON.parse(input);
    const { command } = hookInput.tool_input;

    // Check if this is a virtual command
    if (!command.startsWith('speck-') && !command.startsWith('test-')) {
      // Pass through non-matching commands
      console.log('{}');
      return;
    }

    // Route to unified CLI
    const output: HookOutput = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        updatedInput: {
          command: `bun run $HOME/.claude/speck-plugin-path/scripts/speck.ts --hook <<'HOOK_INPUT_EOF'\n${input}\nHOOK_INPUT_EOF`
        }
      }
    };

    console.log(JSON.stringify(output));
  } catch (error) {
    // Malformed input: pass through to avoid breaking Claude
    console.error(`Hook error: ${error.message}`);
    console.log('{}');
  }
}

main();
```

### Step 2: Create Minimal Dual-Mode CLI

Create `.speck/scripts/speck.ts`:

```typescript
#!/usr/bin/env bun

import { Command } from 'commander';
import { detectMode, readHookInput, formatHookOutput } from './lib/mode-detector';

const program = new Command();

program
  .name('speck')
  .description('Speck unified CLI')
  .version('0.1.0');

// POC command: test-hello
program
  .command('test-hello [message]')
  .description('Test command for POC')
  .action(async (message = 'world') => {
    const output = `Hello ${message}`;
    console.log(output);
  });

// Real command: env
program
  .command('env')
  .description('Show Speck environment info')
  .action(async () => {
    const pluginRoot = process.env.HOME + '/.claude/speck-plugin-path';
    const output = `Plugin root: ${pluginRoot}`;
    console.log(output);
  });

async function main() {
  const mode = detectMode();

  if (mode === 'hook') {
    const hookInput = await readHookInput();
    const { command } = hookInput.tool_input;

    // Parse virtual command to argv
    // "speck-test-hello world" -> ["test-hello", "world"]
    // "test-hello world" -> ["test-hello", "world"]
    const argv = command
      .replace(/^(speck-|test-)?/, '')
      .split(/\s+/);

    // Capture output
    const originalLog = console.log;
    let output = '';
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };

    await program.parseAsync(argv, { from: 'user' });

    // Restore console.log
    console.log = originalLog;

    // Return hook output
    const hookOutput = formatHookOutput(output.trim());
    console.log(JSON.stringify(hookOutput));
  } else {
    // Normal CLI mode
    await program.parseAsync(process.argv);
  }
}

main();
```

### Step 3: Create Mode Detection Utility

Create `.speck/scripts/lib/mode-detector.ts`:

```typescript
export type ExecutionMode = 'cli' | 'hook';

export interface HookInput {
  tool_name: string;
  tool_input: {
    command: string;
    description?: string;
    timeout?: number;
  };
}

export interface HookOutput {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse';
    permissionDecision: 'allow';
    updatedInput: {
      command: string;
    };
  };
}

export function detectMode(): ExecutionMode {
  // Check for explicit --hook flag first
  if (process.argv.includes('--hook')) {
    return 'hook';
  }

  // Fallback to TTY detection
  return process.stdin.isTTY ? 'cli' : 'hook';
}

export async function readHookInput(): Promise<HookInput> {
  const input = await Bun.stdin.text();
  return JSON.parse(input);
}

export function formatHookOutput(output: string): HookOutput {
  // Escape single quotes for shell safety
  const escaped = output.replace(/'/g, "'\\''");

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      updatedInput: {
        command: `echo '${escaped}'`
      }
    }
  };
}
```

### Step 4: Register Hook in Plugin Manifest

Update `.claude-plugin/plugin.json`:

```json
{
  "name": "speck",
  "version": "0.10.0",
  "hooks": {
    "PreToolUse": {
      "Bash": {
        "script": "../.speck/scripts/hooks/pre-tool-use.ts"
      }
    }
  }
}
```

### Step 5: Test POC

#### Test 1: Direct CLI Mode (test-hello)

```bash
bun run .speck/scripts/speck.ts test-hello world
```

Expected output:
```
Hello world
```

#### Test 2: Hook Mode Simulation (test-hello)

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"test-hello world"}}' | \
  bun run .speck/scripts/speck.ts --hook
```

Expected output (JSON):
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": "echo 'Hello world'"
    }
  }
}
```

#### Test 3: Direct CLI Mode (speck-env)

```bash
bun run .speck/scripts/speck.ts env
```

Expected output:
```
Plugin root: /Users/you/.claude/plugins/speck
```

#### Test 4: Hook Mode Simulation (speck-env)

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"speck-env"}}' | \
  bun run .speck/scripts/speck.ts --hook
```

Expected output (JSON):
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": "echo 'Plugin root: /Users/you/.claude/plugins/speck'"
    }
  }
}
```

#### Test 5: Virtual Command in Claude Code

1. Restart Claude Code to reload plugin with updated hook
2. In Claude, ask: "Run speck-env"
3. Observe that Claude executes the command without requiring full path
4. Verify output matches direct CLI execution

### Step 6: Validation Checklist

- [ ] `test-hello` works in CLI mode
- [ ] `test-hello` works in hook mode with correct JSON output
- [ ] `speck-env` works in CLI mode
- [ ] `speck-env` works in hook mode with correct JSON output
- [ ] Hook router correctly passes through non-matching commands (test with `ls`)
- [ ] Single quotes in output are escaped correctly (test with `test-hello "it's working"`)
- [ ] Hook errors don't crash Claude (test with malformed JSON input)

## Next Steps (User Stories 1-5)

After POC validation:

1. **User Story 1**: Expand command registry to support all Speck commands
2. **User Story 2**: Formalize dual-mode pattern with comprehensive error handling
3. **User Story 3**: Implement PrePromptSubmit hook for automatic prerequisite checks
4. **User Story 4**: Centralize command registry with dynamic lookup
5. **User Story 5**: Document patterns in addendum for future reference

## Troubleshooting

### Hook not intercepting commands

**Symptom**: Claude executes original command instead of virtual command

**Solution**:
1. Check `.claude-plugin/plugin.json` has correct hook registration
2. Restart Claude Code to reload plugin
3. Verify hook script path is correct relative to plugin.json
4. Check hook script has execute permissions: `chmod +x .speck/scripts/hooks/pre-tool-use.ts`

### Malformed JSON errors

**Symptom**: Hook crashes with JSON parse error

**Solution**:
1. Wrap JSON.parse in try/catch with pass-through fallback
2. Validate hook input against `contracts/hook-input.schema.json`
3. Test with: `echo 'invalid json' | bun run .speck/scripts/hooks/pre-tool-use.ts`

### Single quote escaping issues

**Symptom**: Output with single quotes breaks shell command

**Solution**:
1. Verify `formatHookOutput` uses correct escaping: `text.replace(/'/g, "'\\'''")`
2. Test with: `test-hello "it's working"`
3. Expected echo command: `echo 'Hello it'\''s working'`

### Command not found in registry

**Symptom**: Virtual command fails with "command not found"

**Solution**:
1. Check command registry in `speck.ts` includes the command
2. Verify virtual command name matches registry key (minus "speck-" prefix)
3. Test registry lookup with debug logging

## Resources

- [Feature Spec](spec.md) - User stories and requirements
- [Implementation Plan](plan.md) - Technical architecture
- [Data Model](data-model.md) - Entity relationships
- [Contracts](contracts/) - JSON schemas for interfaces
- [Claude Code Plugin Docs](https://code.claude.com/docs/plugins) - Hook system documentation
