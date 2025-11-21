# Addendum: Claude Code Hooks and Virtual Command Pattern

**Feature**: 010-virtual-command-pattern
**Created**: 2025-11-21
**Purpose**: Extract critical knowledge and techniques for implementing virtual command pattern with Claude Code hooks

## Table of Contents

1. [Overview](#overview)
2. [PreToolUse Hook Mechanism](#pretooluse-hook-mechanism)
3. [Virtual Command Pattern](#virtual-command-pattern)
4. [Dual-Mode CLI Architecture](#dual-mode-cli-architecture)
5. [Hook Response Format](#hook-response-format)
6. [Argument Parsing and Escaping](#argument-parsing-and-escaping)
7. [Error Handling](#error-handling)
8. [Testing Strategies](#testing-strategies)
9. [Plugin Integration](#plugin-integration)
10. [Implementation Checklist](#implementation-checklist)

---

## Overview

This document captures architectural patterns for building Claude Code plugins that use the **virtual command pattern** - a technique where user-friendly command names (e.g., `speck-branch`) are intercepted by hooks and routed to actual plugin scripts without requiring users to know installation paths.

**Key Benefits**:
- Path-independent command invocation
- Seamless Claude integration
- Testable dual-mode CLI scripts
- Maintainable command routing

**Source**: Based on discussions around GitHub issue [#9185](https://github.com/anthropics/claude-code/issues/9185) confirming `updatedInput` field in PreToolUse hooks.

---

## PreToolUse Hook Mechanism

### How It Works

Claude Code provides a hook system that can intercept tool calls before execution. The `PreToolUse` hook receives tool invocation details and can:

1. **Allow** - Execute as-is
2. **Block** - Prevent execution
3. **Modify** - Change tool parameters via `updatedInput` field

### Hook Input Format

```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "speck-branch list",
    "description": "List branches for current spec"
  }
}
```

### Hook Output Format

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": "bun /path/to/actual/script.ts branch list",
      "description": "List branches for current spec"
    },
    "permissionDecisionReason": "Routed speck-branch to plugin script"
  }
}
```

**Critical Fields**:
- `hookEventName`: Must be `"PreToolUse"`
- `permissionDecision`: `"allow"` | `"block"` | `"modify"`
- `updatedInput`: Replacement tool parameters (same structure as original `tool_input`)
- `permissionDecisionReason`: Human-readable explanation for logging

### Empty Pass-Through

If hook doesn't want to intercept, return empty JSON:

```json
{}
```

This allows the original command to execute unchanged.

---

## Virtual Command Pattern

### Concept

Virtual commands are user-friendly names that don't exist as actual executables but are intercepted and routed to real scripts by hooks.

**Example Mapping**:
```
speck-branch     →  bun .speck/scripts/speck.ts branch
speck-env        →  bun .speck/scripts/speck.ts env
speck-analyze    →  bun .speck/scripts/speck.ts analyze
```

### Hook Router Implementation

```typescript
#!/usr/bin/env bun

import { join } from "path";

const PLUGIN_NAME = "speck";
const PLUGIN_DIR = import.meta.dir; // Resolves to hook script location
const CLI_PATH = join(PLUGIN_DIR, "speck.ts");

// Read hook input from stdin
const input = await Bun.stdin.text();
let data: { tool_input?: { command?: string; description?: string } };

try {
  data = JSON.parse(input);
} catch {
  // Invalid JSON - pass through
  console.log("{}");
  process.exit(0);
}

const command = data.tool_input?.command ?? "";
const virtualPrefix = `${PLUGIN_NAME}-`;

// Check if this is one of our virtual commands
if (!command.startsWith(virtualPrefix)) {
  // Not our command - pass through
  console.log("{}");
  process.exit(0);
}

// Parse: "speck-branch list" -> ["branch", "list"]
const withoutPrefix = command.slice(virtualPrefix.length);
const parts = withoutPrefix.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
const subcommand = parts[0];
const args = parts.slice(1).map(a => a.replace(/^"|"$/g, "")); // Strip quotes

// Build replacement command
const replacementCommand = `bun "${CLI_PATH}" ${subcommand} ${args.join(" ")}`;

const output = {
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    updatedInput: {
      command: replacementCommand,
      description: data.tool_input?.description ?? "",
    },
    permissionDecisionReason: `Routed ${PLUGIN_NAME}-${subcommand} to plugin CLI`,
  },
};

console.log(JSON.stringify(output));
process.exit(0);
```

### Command Registry Pattern

For maintainability, use a registry instead of inline parsing:

```typescript
interface CommandDef {
  handler: (options: Record<string, unknown>) => Promise<string>;
  parseArgs: (args: string[]) => Record<string, unknown>;
}

const COMMANDS: Record<string, CommandDef> = {
  branch: {
    handler: branchHandler,
    parseArgs: parseBranchArgs,
  },
  env: {
    handler: envHandler,
    parseArgs: parseEnvArgs,
  },
  // Add new commands here
};

// In hook router:
const commandDef = COMMANDS[subcommand];
if (!commandDef) {
  console.log("{}"); // Unknown command, pass through
  process.exit(0);
}

// Execute handler directly
const options = commandDef.parseArgs(args);
const result = await commandDef.handler(options);

// Return result via echo
const escapedResult = result.replace(/'/g, "'\\''");
const output = {
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    updatedInput: {
      command: `echo '${escapedResult}'`,
      description: data.tool_input?.description ?? "",
    },
    permissionDecisionReason: `Executed ${PLUGIN_NAME} ${subcommand}`,
  },
};
```

---

## Dual-Mode CLI Architecture

### Why Dual-Mode?

A dual-mode CLI serves two purposes:

1. **Standalone Mode**: Direct invocation for development, testing, debugging
2. **Hook Mode**: Invoked by Claude hooks with JSON stdin

Both modes share identical business logic.

### Mode Detection

```typescript
async function main(): Promise<void> {
  // Detect mode via explicit flag or piped stdin
  const isHookMode = process.argv.includes("--hook") || !process.stdin.isTTY;

  if (isHookMode) {
    await runAsHook();
  } else {
    const cli = buildCli();
    cli.parse();
  }
}
```

### Standalone Mode (Commander.js)

```typescript
import { program } from "commander";

function buildCli(): Command {
  program
    .name("speck")
    .description("Speck feature management CLI")
    .version("1.0.0");

  program
    .command("branch")
    .description("Manage feature branches")
    .argument("[action]", "Action: list, create, status")
    .option("-n, --name <name>", "Branch name")
    .action(async (action, options) => {
      const result = await branchHandler({ action, ...options });
      console.log(result);
    });

  // Add more commands...

  return program;
}
```

### Hook Mode (JSON stdin)

```typescript
async function runAsHook(): Promise<void> {
  const input = await Bun.stdin.text();

  let data: { tool_input?: { command?: string } };
  try {
    data = JSON.parse(input);
  } catch {
    console.log("{}");
    process.exit(0);
  }

  const command = data.tool_input?.command ?? "";

  // Parse command string into args
  const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const subcommand = parts[1]; // parts[0] is "speck-"
  const args = parts.slice(2).map(a => a.replace(/^"|"$/g, ""));

  // Look up and execute handler
  const commandDef = COMMANDS[subcommand];
  if (!commandDef) {
    console.log("{}");
    process.exit(0);
  }

  try {
    const options = commandDef.parseArgs(args);
    const result = await commandDef.handler(options);

    // Return via echo
    const escapedResult = result.replace(/'/g, "'\\''");
    const output = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        updatedInput: {
          command: `echo '${escapedResult}'`,
          description: data.tool_input?.description ?? "",
        },
        permissionDecisionReason: `Executed speck ${subcommand}`,
      },
    };
    console.log(JSON.stringify(output));
  } catch (err) {
    // Return error via stderr
    const errorMsg = err instanceof Error ? err.message : String(err);
    const output = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        updatedInput: {
          command: `echo 'Error: ${errorMsg.replace(/'/g, "'\\''")}' >&2 && exit 1`,
          description: data.tool_input?.description ?? "",
        },
        permissionDecisionReason: `speck ${subcommand} failed`,
      },
    };
    console.log(JSON.stringify(output));
  }

  process.exit(0);
}
```

---

## Hook Response Format

### Success Response

When command succeeds, return output via `echo`:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": "echo 'Success output here'",
      "description": "Original description"
    },
    "permissionDecisionReason": "Executed successfully"
  }
}
```

### Error Response

When command fails, redirect to stderr and exit with non-zero code:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": "echo 'Error: something failed' >&2 && exit 1",
      "description": "Original description"
    },
    "permissionDecisionReason": "Command failed with error"
  }
}
```

### Why Echo Instead of Direct Execution?

Hooks cannot directly return output to Claude. They can only modify the command that Claude will execute. Using `echo` with properly escaped content ensures:

1. Output appears in Claude's terminal
2. Structured data (JSON, etc.) is preserved
3. Exit codes propagate correctly
4. Works with Claude's existing Bash tool integration

---

## Argument Parsing and Escaping

### Parsing Quoted Arguments

Commands may contain quoted strings:

```bash
speck-branch create "my feature name"
```

Use regex to preserve quotes:

```typescript
const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
// ["speck-branch", "create", "\"my feature name\""]

const args = parts.slice(1).map(a => a.replace(/^"|"$/g, ""));
// ["create", "my feature name"]
```

### Escaping Single Quotes for Echo

Output may contain single quotes that would break the echo command:

```typescript
const result = "User's data";

// WRONG: echo 'User's data'  (breaks shell)
// RIGHT:  echo 'User'\''s data'

const escapedResult = result.replace(/'/g, "'\\''");
const command = `echo '${escapedResult}'`;
// Result: echo 'User'\''s data'
```

**Pattern**: Replace `'` with `'\''`
- Close current quote: `'`
- Escaped single quote: `\'`
- Open new quote: `'`

### Handling JSON Output

For structured output, escape the entire JSON:

```typescript
const jsonResult = JSON.stringify({ status: "ok", data: [1, 2, 3] });
const escapedJson = jsonResult.replace(/'/g, "'\\''");
const command = `echo '${escapedJson}'`;
```

### Handling Large Output

For output >100KB, consider:

1. Write to temporary file and return file path
2. Stream output in chunks (if Claude supports)
3. Compress output before echoing

---

## Error Handling

### Error Propagation Pattern

Errors must flow correctly in both modes:

```typescript
// Shared handler
async function branchHandler(options: BranchOptions): Promise<string> {
  if (!options.name) {
    throw new Error("Branch name is required");
  }

  // Business logic...
  return "Branch created successfully";
}

// CLI mode
program.command("branch").action(async (options) => {
  try {
    const result = await branchHandler(options);
    console.log(result);
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
});

// Hook mode
async function runAsHook() {
  try {
    const result = await commandDef.handler(options);
    // Return success via echo...
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const output = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        updatedInput: {
          command: `echo 'Error: ${errorMsg.replace(/'/g, "'\\''")}' >&2 && exit 1`,
        },
        permissionDecisionReason: "Command failed",
      },
    };
    console.log(JSON.stringify(output));
  }
}
```

### Error Categories

1. **Validation Errors**: Missing/invalid arguments
   - Exit code: 1
   - Message: Specific guidance (e.g., "Branch name is required. Usage: speck-branch create <name>")

2. **Runtime Errors**: File not found, network failure, etc.
   - Exit code: 1
   - Message: Context + suggestion (e.g., "Could not read spec file. Ensure you're on a feature branch.")

3. **System Errors**: Hook script failure, JSON parse error
   - Exit code: 1 (or 2 for suggestions)
   - Message: Technical details + recovery steps

### Graceful Degradation

```typescript
// If hook fails, pass through to let command fail naturally
try {
  data = JSON.parse(input);
} catch {
  console.log("{}"); // Pass through
  process.exit(0);
}

// If command not recognized, pass through
if (!COMMANDS[subcommand]) {
  console.log("{}");
  process.exit(0);
}
```

---

## Testing Strategies

### Test Structure

```typescript
describe("Dual-Mode CLI Tests", () => {
  describe("CLI Mode", () => {
    test("executes branch list command", async () => {
      const { stdout, exitCode } = await runCli(["branch", "list"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Branches:");
    });
  });

  describe("Hook Mode", () => {
    test("intercepts virtual command", async () => {
      const input = { tool_input: { command: "speck-branch list" } };
      const { output, exitCode } = await runHook(input);
      expect(exitCode).toBe(0);
      expect(output.hookSpecificOutput.permissionDecision).toBe("allow");
    });
  });
});
```

### Helper Functions

```typescript
// Run CLI in normal mode
async function runCli(args: string[]) {
  const proc = Bun.spawn(["bun", CLI_PATH, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

// Run CLI in hook mode
async function runHook(input: object) {
  const proc = Bun.spawn(["bun", CLI_PATH, "--hook"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  const writer = proc.stdin.getWriter();
  await writer.write(new TextEncoder().encode(JSON.stringify(input)));
  await writer.close();

  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  let output: object;
  try {
    output = JSON.parse(stdout);
  } catch {
    output = { raw: stdout };
  }

  return { output, exitCode };
}
```

### Test Categories

1. **Command Routing**: Virtual commands map to correct handlers
2. **Argument Preservation**: Flags and positional args pass through correctly
3. **Output Format**: JSON structure is valid and complete
4. **Error Handling**: Errors propagate with correct exit codes
5. **Edge Cases**: Malformed input, concurrent invocation, special characters
6. **Equivalence**: Same command produces same result in both modes

### Test Fixtures

```typescript
let testDir: string;

beforeAll(async () => {
  testDir = join(tmpdir(), `cli-test-${Date.now()}`);
  await Bun.write(join(testDir, "test-file.txt"), "test content");
});

afterAll(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});
```

---

## Plugin Integration

### Plugin Manifest (plugin.json)

```json
{
  "name": "speck",
  "version": "1.0.0",
  "description": "Feature-driven development workflow",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$CLAUDE_PLUGIN_DIR/hooks/router.ts\" --hook"
          }
        ]
      }
    ]
  }
}
```

**Key Points**:
- `matcher: "Bash"` - Hook applies to all Bash tool calls
- `$CLAUDE_PLUGIN_DIR` - Environment variable set by Claude Code pointing to plugin installation directory
- `--hook` flag - Ensures CLI runs in hook mode

### Directory Structure

```
.speck/
├── speck.ts              # Unified dual-mode CLI
├── hooks/
│   └── router.ts         # Hook router (optional, can use speck.ts directly)
├── scripts/
│   ├── branch.ts         # Individual command handlers (legacy)
│   └── env.ts
└── tests/
    └── cli.test.ts       # Dual-mode tests
```

**Migration Strategy**:
1. Create unified `speck.ts` with Commander setup
2. Move command logic to handlers in `speck.ts`
3. Add hook mode support to `speck.ts`
4. Update plugin.json to use `speck.ts --hook`
5. Deprecate individual script files

### Environment Variables

Available in hooks:

- `$CLAUDE_PLUGIN_DIR` - Plugin installation path
- `$CLAUDE_PROJECT_DIR` - User's working directory
- Standard env vars (HOME, PATH, etc.)

### Installation and Registration

Claude Code handles:
1. Plugin installation via `/plugin` command
2. Hook registration from plugin.json
3. Environment variable injection
4. Automatic cleanup on uninstall

No manual configuration required by users.

---

## Implementation Checklist

Use this checklist when implementing the virtual command pattern:

### Phase 1: Dual-Mode CLI

- [ ] Create unified CLI entry point (e.g., `speck.ts`)
- [ ] Implement mode detection (TTY check or `--hook` flag)
- [ ] Set up Commander for standalone mode
- [ ] Implement hook mode with JSON stdin parsing
- [ ] Create command registry mapping names to handlers
- [ ] Migrate existing command logic to handlers
- [ ] Test both modes produce identical results

### Phase 2: Hook Router

- [ ] Create hook router script (or use CLI directly)
- [ ] Implement virtual command prefix detection (`speck-`)
- [ ] Add command string parsing with quote handling
- [ ] Implement pass-through for non-matching commands
- [ ] Add error handling with stderr redirection
- [ ] Implement output escaping for echo commands
- [ ] Test with various argument combinations

### Phase 3: Integration

- [ ] Update plugin.json with PreToolUse hook configuration
- [ ] Verify `$CLAUDE_PLUGIN_DIR` resolves correctly
- [ ] Test hook registration in Claude Code
- [ ] Verify virtual commands work end-to-end
- [ ] Test error scenarios (malformed JSON, unknown commands)
- [ ] Validate no breaking changes to existing workflows

### Phase 4: Testing

- [ ] Write CLI mode tests for all commands
- [ ] Write hook mode tests for all commands
- [ ] Test argument parsing (flags, positional, quoted)
- [ ] Test error propagation and exit codes
- [ ] Test edge cases (concurrent calls, large output, special chars)
- [ ] Achieve >90% code coverage
- [ ] Set up CI/CD for automated testing

### Phase 5: Documentation

- [ ] Document virtual command usage
- [ ] Create command reference (all subcommands)
- [ ] Explain dual-mode architecture
- [ ] Provide troubleshooting guide
- [ ] Add examples for common workflows
- [ ] Document testing approach for contributors

---

## Additional Resources

- **GitHub Issue**: [#9185 - PreToolUse hooks with updatedInput](https://github.com/anthropics/claude-code/issues/9185)
- **Claude Code Docs**: Hook system reference (when published)
- **Commander.js**: [npm package](https://www.npmjs.com/package/commander)
- **Bun Shell API**: [Documentation](https://bun.sh/docs/api/shell)

---

## Conclusion

The virtual command pattern provides a clean abstraction for plugin functionality while maintaining testability through dual-mode architecture. Key takeaways:

1. **PreToolUse hooks** can intercept and modify tool calls via `updatedInput`
2. **Virtual commands** eliminate path dependencies for users
3. **Dual-mode CLIs** enable both standalone and hook-invoked operation
4. **Comprehensive testing** validates both modes with identical assertions
5. **Proper escaping** ensures safe command substitution

By following this pattern, plugins can offer seamless Claude integration while remaining testable and maintainable as standalone tools.
