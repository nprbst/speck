# Addendum: Virtual Command Pattern - Technical Knowledge Base

**Feature**: Virtual Command Pattern with Dual-Mode CLI
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Tasks**: [tasks.md](tasks.md)
**Created**: 2025-11-21
**Purpose**: Extract and document critical architectural patterns and techniques for future reference

---

## Overview

This document serves as a technical knowledge base for the virtual command pattern implementation. It extracts key architectural decisions, implementation patterns, and techniques that can be reused in future projects or referenced by new contributors.

**Target Audience**: Developers implementing similar hook-based command systems, contributors extending the Speck CLI, or architects evaluating the virtual command pattern.

**Key Concepts Covered**:
1. PreToolUse Hook Mechanism
2. Dual-Mode CLI Architecture
3. Virtual Command Pattern with Registry
4. Testing Strategies for Hook Systems
5. Error Handling and Propagation
6. Performance Optimization Patterns

---

## 1. PreToolUse Hook Mechanism

### What It Is

The PreToolUse hook intercepts Bash tool calls before Claude executes them, allowing you to:
- Detect virtual command patterns (e.g., `speck-*`)
- Substitute the original command with a transformed version
- Inject additional context or validation
- Block execution by returning errors

### Hook Contract

**Input** (JSON via stdin):
```json
{
  "tool_input": {
    "command": "speck-branch list --all",
    "description": "List all branches"
  }
}
```

**Output** (JSON via stdout):
```json
{
  "permissionDecision": "allow",
  "hookSpecificOutput": {
    "updatedInput": {
      "command": "echo 'branch1\nbranch2\nbranch3'"
    }
  }
}
```

### Implementation Pattern

**File**: [.speck/scripts/speck.ts](.speck/scripts/speck.ts) (hook mode)

```typescript
async function runHookMode() {
  try {
    // 1. Read and parse hook input
    const hookInput = await readHookInput();
    const { command } = hookInput.tool_input;

    // 2. Pattern matching - only intercept our commands
    if (!command.match(/^speck-/)) {
      // Pass through non-matching commands
      console.log(JSON.stringify({ permissionDecision: "allow" }));
      return;
    }

    // 3. Parse command to extract name and args
    const commandMatch = command.match(/^speck-(.+?)(?:\s+(.*))?$/);
    const [, commandName, argsString = ""] = commandMatch;

    // 4. Lookup command in registry
    const commandEntry = registry[commandName];
    if (!commandEntry) {
      console.log(JSON.stringify({ permissionDecision: "allow" }));
      return;
    }

    // 5. Execute command and capture output
    let output = "";
    const exitCode = await executeCommand(commandEntry, args);

    // 6. Return hook output with substitution
    const hookOutput = formatHookOutput(output, hookInput.tool_input);
    console.log(JSON.stringify(hookOutput));
  } catch (error) {
    // Hook-level errors pass through
    console.log(JSON.stringify({ permissionDecision: "allow" }));
    process.exit(1);
  }
}
```

### Key Patterns

**Pattern 1: Safe Pass-Through**
- Always return valid JSON, even on errors
- Unknown commands should pass through (don't block Claude)
- Use `permissionDecision: "allow"` with empty `updatedInput` to pass through

**Pattern 2: Output Substitution**
- Use `updatedInput.command` to replace the original command
- Wrap output in `echo 'escaped output'` for Claude consumption
- Escape single quotes: `text.replace(/'/g, "'\\'''")`

**Pattern 3: Error Isolation**
- Catch hook-level errors separately from command errors
- Hook errors → pass through (don't break Claude)
- Command errors → capture and format as stderr output

### Shell Escaping

**Critical for Security**: All output must be shell-safe.

```typescript
function formatHookOutput(output: string, originalToolInput: any) {
  // POSIX single-quote escaping
  const escaped = output.replace(/'/g, "'\\'''");

  return {
    permissionDecision: "allow",
    hookSpecificOutput: {
      updatedInput: {
        ...originalToolInput,
        command: `echo '${escaped}'`
      }
    }
  };
}
```

**Why this works**:
- Single quotes preserve literal text in bash
- `'\'` ends the quote, adds escaped quote, starts new quote
- Pattern: `'it'\''s working'` → outputs `it's working`

### Testing Hook Behavior

```bash
# Test 1: Simulate hook input
echo '{"tool_input":{"command":"speck-env"}}' | \
  bun .speck/scripts/speck.ts --hook

# Test 2: Verify JSON output
echo '{"tool_input":{"command":"speck-branch list"}}' | \
  bun .speck/scripts/speck.ts --hook | jq .

# Test 3: Test escaping with special characters
echo '{"tool_input":{"command":"speck-echo \"it'\''s working\""}}' | \
  bun .speck/scripts/speck.ts --hook
```

---

## 2. Dual-Mode CLI Architecture

### Why Dual-Mode?

The same CLI script operates in two distinct modes:
1. **CLI Mode**: Normal command-line usage with stdout/stderr
2. **Hook Mode**: JSON stdin/stdout for Claude Code integration

**Benefits**:
- Single source of truth for business logic
- Test business logic independently of hook mechanism
- Easier debugging (run commands directly)
- Migration path from individual scripts to unified CLI

### Mode Detection

**File**: [.speck/scripts/lib/mode-detector.ts](.speck/scripts/lib/mode-detector.ts)

```typescript
export type Mode = "cli" | "hook";

export function detectMode(): Mode {
  // Explicit flag takes precedence
  if (process.argv.includes("--hook")) {
    return "hook";
  }

  // TTY detection (hook mode has no TTY)
  // IMPORTANT: Use ?? false to handle undefined
  const hasTTY = process.stdin.isTTY ?? false;
  return hasTTY ? "cli" : "hook";
}
```

**Critical Detail**: `process.stdin.isTTY` is `undefined` in some environments (not just `false`). Always use `?? false` to avoid treating `undefined` as falsy in the wrong context.

### Dual-Mode Execution Flow

```typescript
async function main() {
  const mode = detectMode();

  if (mode === "hook") {
    await runHookMode();  // JSON stdin → JSON stdout
  } else {
    await runCliMode();   // Commander args → stdout/stderr
  }
}
```

### Output Formatting by Mode

**File**: [.speck/scripts/lib/output-formatter.ts](.speck/scripts/lib/output-formatter.ts)

```typescript
export function formatOutput(result: CommandResult, mode: Mode) {
  if (mode === "cli") {
    // CLI mode: Direct stdout/stderr
    if (result.success) {
      console.log(result.output);
    } else {
      console.error(result.errorOutput);
    }
  } else {
    // Hook mode: JSON wrapped output
    // (Handled by formatHookOutput in hook-utils.ts)
  }
}
```

### Error Handling by Mode

**File**: [.speck/scripts/lib/error-handler.ts](.speck/scripts/lib/error-handler.ts)

```typescript
export function formatError(error: Error, mode: Mode): string | object {
  if (mode === "cli") {
    // CLI mode: Human-readable error message
    return `Error: ${error.message}\n\n` +
           `See logs for details or run with --debug for more info.`;
  } else {
    // Hook mode: Structured error for JSON
    return {
      permissionDecision: "allow",
      hookSpecificOutput: {
        updatedInput: {
          command: `echo 'Error: ${escapeShell(error.message)}'`
        }
      }
    };
  }
}
```

### Testing Dual-Mode Behavior

**Pattern**: Same assertions, different invocation

```typescript
describe("speck-branch command", () => {
  test("CLI mode: bun speck.ts branch list", async () => {
    const result = await $`bun .speck/scripts/speck.ts branch list`.text();
    expect(result).toContain("feature-branch-1");
  });

  test("Hook mode: JSON stdin", async () => {
    const input = { tool_input: { command: "speck-branch list" } };
    const result = await $`echo ${JSON.stringify(input)} | bun .speck/scripts/speck.ts --hook`.json();

    expect(result.permissionDecision).toBe("allow");
    expect(result.hookSpecificOutput.updatedInput.command).toContain("feature-branch-1");
  });
});
```

---

## 3. Virtual Command Pattern with Registry

### Architecture

The virtual command pattern decouples command names from implementation:

```
User: "speck-branch list"
  ↓
PreToolUse Hook (intercepts)
  ↓
Parse: commandName="branch", args=["list"]
  ↓
Registry Lookup: registry["branch"]
  ↓
Execute: branchEntry.handler(args, context)
  ↓
Return: echo 'output'
```

### Registry Structure

**File**: [.speck/scripts/commands/index.ts](.speck/scripts/commands/index.ts)

```typescript
export const registry: CommandRegistry = {
  "command-name": {
    // Option 1: Inline handler (simple commands)
    handler: async (args, context) => {
      return { success: true, output: "result", exitCode: 0 };
    },

    // Option 2: Static main function (lightweight commands)
    main: checkPrerequisitesMain,

    // Option 3: Lazy main function (heavy commands)
    lazyMain: async () => {
      const module = await import("../branch-command");
      return module.main;
    },

    // Optional: Custom argument parser
    parseArgs: (cmdString) => ({ flags: [], args: [] }),

    // Required metadata
    description: "Human-readable description",
    version: "1.0.0"
  }
};
```

### Decision Tree: Handler vs Main vs LazyMain

**Use `handler` when**:
- Command is simple (< 50 lines)
- Logic is inline in command file
- No existing script to delegate to
- Example: echo, test commands

**Use `main` when**:
- Command is lightweight (fast to load)
- Frequently used (benefits from caching)
- Already implemented as script with `main()` export
- Example: check-prerequisites, env

**Use `lazyMain` when**:
- Command is heavy (slow to load)
- Infrequently used (avoid startup cost)
- Has many dependencies
- Example: branch, create-new-feature, setup-plan

### Adding New Commands

**3-Step Process** (per SC-008: <30 minutes):

1. **Create Handler** (`.speck/scripts/commands/my-command.ts`)
2. **Register Command** (add to `registry` in `index.ts`)
3. **Test Command** (`bun test tests/unit/registry.test.ts`)

No hook code changes needed - registry lookup is dynamic!

### Registry Lookup Flow

```typescript
// In hook mode
const commandMatch = command.match(/^speck-(.+?)(?:\s+(.*))?$/);
const [, commandName, argsString] = commandMatch;

// Dynamic lookup (no hardcoded command list!)
const commandEntry = registry[commandName];
if (!commandEntry) {
  return passThrough();  // Unknown command
}

// Execute via handler, main, or lazyMain
if (commandEntry.main) {
  exitCode = await commandEntry.main(args);
} else if (commandEntry.lazyMain) {
  const mainFn = await commandEntry.lazyMain();
  exitCode = await mainFn(args);
} else if (commandEntry.handler) {
  const result = await commandEntry.handler(parsedArgs, context);
  exitCode = result.exitCode;
}
```

---

## 4. Testing Patterns for Hook Systems

### Test Pyramid for Dual-Mode CLI

```
        Integration Tests
       (Hook simulation)
      /                 \
     /                   \
    Unit Tests          Unit Tests
  (CLI mode)          (Hook mode)
```

### Unit Test Pattern: CLI Mode

```typescript
test("branch command lists all branches", async () => {
  // Direct CLI invocation
  const result = await $`bun .speck/scripts/speck.ts branch list`.text();

  expect(result).toContain("main");
  expect(result).toContain("feature-branch");
});
```

### Unit Test Pattern: Hook Mode Simulation

```typescript
test("branch command via hook returns JSON", async () => {
  const hookInput = {
    tool_input: { command: "speck-branch list" }
  };

  const stdin = JSON.stringify(hookInput);
  const result = await $`echo ${stdin} | bun .speck/scripts/speck.ts --hook`.json();

  expect(result.permissionDecision).toBe("allow");
  expect(result.hookSpecificOutput.updatedInput.command).toMatch(/^echo/);
});
```

### Integration Test Pattern: End-to-End

```typescript
test("virtual command executes via hook in Claude", async () => {
  // 1. Setup: Create test feature directory
  await $`mkdir -p /tmp/test-feature`;

  // 2. Execute: Simulate Claude invoking virtual command
  const hookInput = {
    tool_input: {
      command: "speck-check-prerequisites --json --cwd /tmp/test-feature"
    }
  };

  // 3. Verify: Hook returns expected output
  const result = await $`echo ${JSON.stringify(hookInput)} | bun .speck/scripts/speck.ts --hook`.json();

  expect(result.hookSpecificOutput.updatedInput.command).toContain("MODE");
});
```

### Test Data Patterns

**Pattern 1: Golden Files**
```typescript
// Store expected output for comparison
const expectedOutput = await readFile("tests/fixtures/branch-list.golden.txt");
const actualOutput = await $`bun speck.ts branch list`.text();
expect(actualOutput).toBe(expectedOutput);
```

**Pattern 2: Snapshot Testing**
```typescript
// For complex JSON structures
const hookOutput = await runHookMode("speck-env");
expect(hookOutput).toMatchSnapshot();
```

**Pattern 3: Property-Based Testing**
```typescript
// Test invariants across random inputs
test("all commands return valid exit codes", async () => {
  for (const cmdName of listCommands()) {
    const result = await runCommand(cmdName, []);
    expect([0, 1, 2, 127]).toContain(result.exitCode);
  }
});
```

---

## 5. Error Handling and Propagation

### Error Categories

**1. Hook-Level Errors** (infrastructure failures)
- JSON parse errors
- Mode detection failures
- Script load failures
- **Handling**: Pass through (don't block Claude)

**2. Command-Level Errors** (business logic failures)
- Invalid arguments
- Missing files
- Git operation failures
- **Handling**: Capture and return as formatted error

**3. System-Level Errors** (environment issues)
- Permission denied
- Out of memory
- Network timeouts
- **Handling**: Retry or escalate to user

### Error Handling Pattern

```typescript
async function runHookMode() {
  try {
    const hookInput = await readHookInput();

    try {
      // Command execution (business logic)
      const result = await executeCommand(cmdEntry, args);

      if (!result.success) {
        // Command-level error - return formatted error
        return formatHookOutput(result.errorOutput, hookInput.tool_input);
      }

      return formatHookOutput(result.output, hookInput.tool_input);
    } catch (cmdError) {
      // Command-level exception - capture and format
      const errorResult = errorToResult(cmdError);
      return formatHookOutput(errorResult.errorOutput, hookInput.tool_input);
    }
  } catch (hookError) {
    // Hook-level error - pass through
    console.log(JSON.stringify({ permissionDecision: "allow" }));
    process.exit(1);
  }
}
```

### CommandError Pattern

**File**: [.speck/scripts/lib/error-handler.ts](.speck/scripts/lib/error-handler.ts)

```typescript
export class CommandError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
    public details?: string
  ) {
    super(message);
    this.name = "CommandError";
  }
}

export function errorToResult(error: Error): CommandResult {
  if (error instanceof CommandError) {
    return {
      success: false,
      output: "",
      errorOutput: `Error: ${error.message}\n${error.details || ""}`,
      exitCode: error.exitCode,
    };
  }

  // Unknown error
  return {
    success: false,
    output: "",
    errorOutput: `Unexpected error: ${error.message}\n${error.stack}`,
    exitCode: 1,
  };
}
```

### Exit Code Standards

Following POSIX conventions:

- **0**: Success
- **1**: General error (default)
- **2**: Misuse of command (invalid arguments)
- **126**: Command cannot execute (permissions)
- **127**: Command not found
- **128+N**: Fatal signal N (e.g., 130 = SIGINT)

### Error Messages: User-Friendly Guidance

**Bad**: `Error: ENOENT`
**Good**: `Error: Feature directory not found. Run /speck.specify first to create the feature spec.`

**Pattern**:
```typescript
throw new CommandError(
  "Feature directory not found",
  1,
  "Run /speck.specify first to create the feature spec.\n" +
  "Or use --feature-dir to specify a different directory."
);
```

---

## 6. Performance Optimization Patterns

### Hook Startup Time

**Goal**: <100ms from hook trigger to CLI execution (SC-003)

**Optimization 1: Single-File Bundle**
```bash
# Build hook as single file (eliminates module resolution)
bun build .speck/scripts/speck.ts --target=bun --outfile=.speck/dist/speck-hook.js
```

**Optimization 2: Lazy Loading**
```typescript
// Don't load heavy commands until needed
const lazyBranchMain = async () => {
  const module = await import("../branch-command");
  return module.main;
};
```

**Optimization 3: Early Exit**
```typescript
// Pass through non-matching commands immediately
if (!command.match(/^speck-/)) {
  console.log(JSON.stringify({ permissionDecision: "allow" }));
  return;  // Exit early, don't load registry
}
```

### Prerequisite Check Caching

**Goal**: 30% reduction in slash command execution time (SC-005)

**Pattern**: Time-based cache with git invalidation

**File**: [.speck/scripts/lib/prereq-cache.ts](.speck/scripts/lib/prereq-cache.ts)

```typescript
const CACHE_TTL = 5000; // 5 seconds
const cache = new Map<string, CachedResult>();

export function getCachedResult(key: string): CachedResult | null {
  const cached = cache.get(key);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return cached;
}

export function invalidateCache() {
  cache.clear();
}

// Hook: Invalidate on git operations
process.on("SIGCHLD", () => {
  // Child process completed - might be git operation
  invalidateCache();
});
```

### Memory Optimization

**Pattern 1: Streaming Large Output**
```typescript
// Don't buffer entire output in memory
const stream = await $`speck-branch list --all`.stream();
for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

**Pattern 2: Cleanup After Execution**
```typescript
async function executeCommand(cmd: string) {
  try {
    const result = await runCommand(cmd);
    return result;
  } finally {
    // Cleanup temp files, close handles
    await cleanup();
  }
}
```

---

## 7. Architectural Diagrams

### Hook Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User in Claude Code                                         │
│ "Run: speck-branch list"                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Claude Code                                                 │
│ About to execute Bash tool: "speck-branch list"            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ PreToolUse Hook (.speck/dist/speck-hook.js)                │
│ • Read JSON stdin: {"tool_input":{"command":"speck-..."}}  │
│ • Pattern match: /^speck-/                                  │
│ • Parse: commandName="branch", args=["list"]               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Command Registry Lookup                                     │
│ registry["branch"] → { lazyMain: ... }                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Execute Command (Lazy Load)                                 │
│ const main = await lazyBranchMain();                        │
│ exitCode = await main(["list"]);                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Capture Output                                              │
│ output = "main\nfeature-1\nfeature-2"                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Format Hook Output (Shell Escape)                          │
│ escaped = output.replace(/'/g, "'\\'''")                    │
│ JSON: {"permissionDecision":"allow",                        │
│        "hookSpecificOutput":{                               │
│          "updatedInput":{                                   │
│            "command":"echo 'main\nfeature-1\nfeature-2'"    │
│        }}}                                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Claude Code Executes Substitution                          │
│ Runs: echo 'main\nfeature-1\nfeature-2'                     │
│ Output displayed to user                                    │
└─────────────────────────────────────────────────────────────┘
```

### Dual-Mode Execution Diagram

```
┌──────────────────────────┐
│   Unified CLI Entry      │
│  .speck/scripts/speck.ts │
└────────────┬─────────────┘
             │
             ▼
      ┌─────────────┐
      │ detectMode()│
      └──────┬──────┘
             │
        ┌────┴────┐
        │         │
        ▼         ▼
   ┌────────┐  ┌──────┐
   │--hook? │  │ TTY? │
   └───┬────┘  └──┬───┘
       │          │
    Yes│       No │
       │          │
       └────┬─────┘
            │
    ┌───────▼────────┐
    │  mode: "hook"  │
    └───────┬────────┘
            │
            ▼
    ┌──────────────────────┐       ┌──────────────────────┐
    │   runHookMode()      │       │   runCliMode()       │
    │                      │       │                      │
    │ • readHookInput()    │       │ • Commander.parse()  │
    │ • Parse command      │       │ • Extract args       │
    │ • Registry lookup    │       │ • Registry lookup    │
    │ • Execute handler    │       │ • Execute handler    │
    │ • formatHookOutput() │       │ • console.log()      │
    │ • JSON stdout        │       │ • process.exit()     │
    └──────────────────────┘       └──────────────────────┘
```

### Command Registry Lookup Diagram

```
┌──────────────────────────────────────────┐
│ Command String                           │
│ "speck-check-prerequisites --json"      │
└─────────────────┬────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ Parse Command                            │
│ commandName = "check-prerequisites"      │
│ args = ["--json"]                        │
└─────────────────┬────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ Registry Lookup                          │
│ registry[commandName]                    │
└─────────────────┬────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼                    ▼
  ┌──────────┐         ┌──────────┐
  │  Found   │         │Not Found │
  └────┬─────┘         └────┬─────┘
       │                    │
       ▼                    ▼
┌────────────────┐    ┌──────────────┐
│ CommandEntry   │    │ Pass Through │
│ {              │    │ (unknown cmd)│
│   main: fn,    │    └──────────────┘
│   description, │
│   version      │
│ }              │
└───────┬────────┘
        │
        ▼
┌───────────────────────────┐
│ Execution Strategy        │
│ if (entry.handler)   →    │
│ if (entry.main)      →    │
│ if (entry.lazyMain)  →    │
└───────┬───────────────────┘
        │
        ▼
┌──────────────────────────┐
│ Execute & Return Result  │
│ { success, output, ... } │
└──────────────────────────┘
```

---

## 8. Migration Strategy

### Incremental Migration Pattern

**Goal**: Zero breaking changes during migration (SC-006)

**Phase 1: Coexistence**
- Unified CLI implements command
- Individual script remains functional
- Both produce identical output

**Phase 2: Validation**
```typescript
// tests/integration/migration-validation.test.ts
test("unified CLI matches individual script output", async () => {
  const unifiedOutput = await $`bun speck.ts branch list`.text();
  const scriptOutput = await $`bun .speck/scripts/branch-command.ts list`.text();

  expect(unifiedOutput).toBe(scriptOutput);
});
```

**Phase 3: Deprecation Warning**
```typescript
// In individual script
console.warn(
  "⚠️  DEPRECATION: Direct script invocation is deprecated.\n" +
  "Use virtual command instead: speck-branch list\n" +
  "This script will be removed in v2.0.0"
);
```

**Phase 4: Removal**
- Remove individual script after one release cycle
- Update documentation to reference virtual commands
- Remove deprecation tests

---

## 9. Common Pitfalls and Solutions

### Pitfall 1: TTY Detection Edge Cases

**Problem**: `process.stdin.isTTY` can be `undefined`

**Solution**:
```typescript
// ❌ Wrong
const hasTTY = process.stdin.isTTY;  // undefined breaks logic

// ✅ Correct
const hasTTY = process.stdin.isTTY ?? false;
```

### Pitfall 2: Shell Injection via Unescaped Output

**Problem**: Output with single quotes breaks echo command

**Solution**:
```typescript
// ❌ Wrong
command: `echo '${output}'`  // Breaks with output="it's working"

// ✅ Correct
const escaped = output.replace(/'/g, "'\\'''");
command: `echo '${escaped}'`
```

### Pitfall 3: Hook Errors Blocking Claude

**Problem**: Hook crashes and Claude can't execute any Bash commands

**Solution**:
```typescript
// Always catch and pass through
try {
  // Hook logic
} catch (error) {
  console.log(JSON.stringify({ permissionDecision: "allow" }));
  process.exit(1);  // Exit cleanly
}
```

### Pitfall 4: Heavy Imports Slowing Hook Startup

**Problem**: Importing all commands on every hook trigger

**Solution**:
```typescript
// ❌ Wrong (eager loading)
import { branchMain } from "../branch-command";
registry.branch = { main: branchMain };

// ✅ Correct (lazy loading)
const lazyBranchMain = async () => {
  const module = await import("../branch-command");
  return module.main;
};
registry.branch = { lazyMain: lazyBranchMain };
```

### Pitfall 5: Forgetting to Update Both Modes

**Problem**: CLI mode works, hook mode doesn't (or vice versa)

**Solution**:
```typescript
// Use shared business logic
async function executeCommand(cmdEntry, args, context) {
  // Identical logic for both modes
  const result = await cmdEntry.handler(args, context);
  return result;
}

// Different output formatting only
if (context.mode === "cli") {
  console.log(result.output);
} else {
  return formatHookOutput(result.output);
}
```

---

## 10. Future Extension Patterns

### Adding PrePromptSubmit Hook

**Use Case**: Inject context before slash command expansion

```typescript
// .speck/scripts/hooks/pre-prompt-submit.ts
async function prePromptSubmit(input: PromptInput) {
  if (input.prompt.match(/^\/speck\./)) {
    // Run prerequisite checks
    const prereqResult = await checkPrerequisites();

    // Inject context into prompt
    return {
      updatedPrompt: input.prompt + "\n\n" + prereqContext
    };
  }

  return { updatedPrompt: input.prompt };
}
```

### Supporting Non-Bash Tools

**Pattern**: Extend to other tool types

```typescript
// Register for multiple tools
{
  "hooks": {
    "PreToolUse.Bash": ".speck/dist/speck-hook.js",
    "PreToolUse.Python": ".speck/dist/python-hook.js",
    "PreToolUse.Read": ".speck/dist/read-hook.js"
  }
}
```

### Multi-Repository Support

**Pattern**: Detect and route to correct Speck installation

```typescript
async function detectSpeckRoot() {
  let dir = process.cwd();

  while (dir !== "/") {
    if (await exists(join(dir, ".speck", "config.json"))) {
      return dir;
    }
    dir = dirname(dir);
  }

  throw new Error("Not in a Speck repository");
}
```

---

## 11. References

### Implementation Files

- **Entry Point**: [.speck/scripts/speck.ts](.speck/scripts/speck.ts)
- **Command Registry**: [.speck/scripts/commands/index.ts](.speck/scripts/commands/index.ts)
- **Mode Detection**: [.speck/scripts/lib/mode-detector.ts](.speck/scripts/lib/mode-detector.ts)
- **Hook Utilities**: [.speck/scripts/lib/hook-utils.ts](.speck/scripts/lib/hook-utils.ts)
- **Error Handling**: [.speck/scripts/lib/error-handler.ts](.speck/scripts/lib/error-handler.ts)
- **Output Formatting**: [.speck/scripts/lib/output-formatter.ts](.speck/scripts/lib/output-formatter.ts)

### Documentation

- **Feature Spec**: [spec.md](spec.md)
- **Implementation Plan**: [plan.md](plan.md)
- **Task Breakdown**: [tasks.md](tasks.md)
- **Data Model**: [data-model.md](data-model.md)
- **Contracts**: [contracts/](contracts/)
- **Quickstart Guide**: [quickstart.md](quickstart.md)

### External Resources

- [Claude Code Plugin Documentation](https://code.claude.com/docs/plugins)
- [Commander.js Documentation](https://github.com/tj/commander.js)
- [Bun Documentation](https://bun.sh/docs)
- [POSIX Shell Quoting](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#tag_18_02)

---

## Appendix: Complete Example

### Adding a New Command (End-to-End)

**Scenario**: Add `speck-validate` command to check spec quality

**Step 1**: Create handler file

```typescript
// .speck/scripts/commands/validate.ts
import type { CommandHandler } from "../lib/types";

export const validateHandler: CommandHandler = async (args, context) => {
  // Business logic
  const specPath = args.specPath || "specs/current/spec.md";
  const issues = await checkSpec(specPath);

  if (issues.length === 0) {
    return {
      success: true,
      output: "✓ Spec validation passed",
      exitCode: 0
    };
  }

  return {
    success: false,
    errorOutput: `✗ Found ${issues.length} issues:\n${issues.join("\n")}`,
    exitCode: 1
  };
};

async function checkSpec(path: string): Promise<string[]> {
  // Validation logic...
  return [];
}
```

**Step 2**: Register in registry

```typescript
// .speck/scripts/commands/index.ts
import { validateHandler } from "./validate";

export const registry: CommandRegistry = {
  // ... existing commands ...

  validate: {
    handler: validateHandler,
    description: "Validate specification quality and completeness",
    version: "1.0.0"
  }
};
```

**Step 3**: Test the command

```typescript
// tests/unit/validate.test.ts
import { describe, test, expect } from "bun:test";

describe("validate command", () => {
  test("CLI mode", async () => {
    const result = await $`bun .speck/scripts/speck.ts validate`.text();
    expect(result).toContain("passed");
  });

  test("Hook mode", async () => {
    const input = { tool_input: { command: "speck-validate" } };
    const result = await $`echo ${JSON.stringify(input)} | bun speck.ts --hook`.json();
    expect(result.hookSpecificOutput.updatedInput.command).toContain("passed");
  });
});
```

**Step 4**: Use in Claude

```
User: "Run speck-validate to check my spec"
Claude: [Executes via hook, command works without any hook code changes!]
```

**Total Time**: ~20 minutes ✅ (meets SC-008 goal of <30 minutes)

---

**End of Addendum**

This document captures the essential patterns and techniques from the virtual command pattern implementation. For complete implementation details, see the referenced source files and documentation.
