# Data Model: Virtual Command Pattern

**Date**: 2025-11-21
**Feature**: 010-virtual-command-pattern

## Core Entities

### 1. VirtualCommand

Represents a user-facing command name that gets intercepted by the hook system and routed to the actual implementation.

**Fields**:
- `name`: string (e.g., "branch", "env", "test-hello")
- `fullCommand`: string (e.g., "speck-branch list --verbose")
- `subcommand`: string | null (e.g., "list", null for commands without subcommands)
- `arguments`: string[] (e.g., ["--verbose"])
- `rawInput`: string (original command as received from Claude)

**Validation Rules**:
- `name` must match pattern `speck-*` for interception
- `fullCommand` must be parseable into name + arguments
- `arguments` must preserve quoted strings as single elements

**State Transitions**: N/A (immutable value object)

**Relationships**:
- Maps to exactly one `CommandRegistryEntry`
- Produces one `CommandResult` when executed

### 2. CommandRegistryEntry

Represents the registration metadata for a command handler in the centralized registry.

**Fields**:
- `commandName`: string (key in registry, e.g., "branch", "env")
- `handler`: CommandHandler (function reference)
- `parseArgs`: ArgumentParser | null (optional custom parser)
- `description`: string (help text)
- `version`: string (semantic version)

**Validation Rules**:
- `commandName` must be unique within registry
- `handler` must be async function accepting `(args, context) => Promise<CommandResult>`
- `parseArgs` if provided must accept command string and return typed args object
- `description` must be non-empty
- `version` must follow semver format

**State Transitions**: N/A (static configuration)

**Relationships**:
- One-to-one mapping from `VirtualCommand.name` (minus "speck-" prefix) to `CommandRegistryEntry.commandName`
- One `CommandHandler` per entry

### 3. HookInput

Represents the JSON structure received via stdin when Claude Code invokes the PreToolUse hook.

**Fields**:
- `tool_name`: string (always "Bash" for PreToolUse targeting bash commands)
- `tool_input`: object
  - `command`: string (the bash command Claude intends to execute)
  - `description`: string | undefined (optional command description)
  - `timeout`: number | undefined (optional timeout in ms)

**Validation Rules**:
- Must be valid JSON
- `tool_name` must equal "Bash" for interception
- `tool_input.command` must be non-empty string

**State Transitions**: N/A (input value object)

**Relationships**:
- Parsed into `VirtualCommand` if command matches `speck-*` pattern
- Otherwise passed through unchanged

### 4. HookOutput

Represents the JSON structure written to stdout by the PreToolUse hook to control command execution.

**Fields**:
- `permissionDecision`: "allow" | "deny" | undefined
- `hookSpecificOutput`: object | undefined
  - `updatedInput`: object | undefined
    - `command`: string (substituted command that Claude will execute)
  - `errorMessage`: string | undefined (if denial reason needed)

**Validation Rules**:
- If intercepting command, must include `permissionDecision: "allow"` and `hookSpecificOutput.updatedInput.command`
- If passing through, return empty object `{}`
- `updatedInput.command` must be valid shell command (properly escaped)

**State Transitions**: N/A (output value object)

**Relationships**:
- Generated from `CommandResult` by wrapping in echo command
- Sent to Claude Code to replace original bash command

### 5. CommandContext

Provides execution context to command handlers, enabling mode-aware behavior.

**Fields**:
- `mode`: "cli" | "hook" (execution mode)
- `rawCommand`: string (original command string before parsing)
- `workingDirectory`: string (cwd where command was invoked)
- `isInteractive`: boolean (whether stdin is TTY)

**Validation Rules**:
- `mode` must be "cli" or "hook"
- `workingDirectory` must be valid absolute path
- `isInteractive` must match `process.stdin.isTTY` in CLI mode

**State Transitions**: N/A (immutable context)

**Relationships**:
- Passed to every `CommandHandler` invocation
- Determines output formatting and error handling strategy

### 6. CommandResult

Represents the outcome of executing a command handler, including output and status.

**Fields**:
- `success`: boolean
- `output`: string (stdout content)
- `errorOutput`: string | null (stderr content)
- `exitCode`: number (0 for success, non-zero for failure)
- `metadata`: object | null (optional structured data for hook consumption)

**Validation Rules**:
- `success` must equal `exitCode === 0`
- `output` must be non-null (empty string if no output)
- `exitCode` must be in range 0-255
- If `success` is false, `errorOutput` should explain failure

**State Transitions**:
```
Pending -> Success (exitCode=0, success=true)
Pending -> Failure (exitCode>0, success=false)
```

**Relationships**:
- Produced by `CommandHandler` execution
- Transformed into `HookOutput` for hook mode or printed to stdout/stderr in CLI mode

### 7. ArgumentParser

Function signature for custom command argument parsing.

**Type Signature**:
```typescript
type ArgumentParser<T = unknown> = (commandString: string) => T
```

**Fields**: N/A (function type)

**Validation Rules**:
- Must parse command string into typed args object
- Must handle quoted arguments correctly (preserve quotes as single arg)
- Must throw clear error if command string is malformed
- Must be deterministic (same input -> same output)

**Relationships**:
- Optional field in `CommandRegistryEntry`
- If not provided, default parser extracts positional args

**Examples**:
```typescript
// Default parser (positional args)
defaultParser("speck-branch list --verbose")
// -> { _: ["list"], verbose: true }

// Custom parser for branch command
parseBranchArgs("speck-branch create my-feature --base main")
// -> { subcommand: "create", name: "my-feature", base: "main" }
```

### 8. CommandHandler

Function signature for command implementation logic.

**Type Signature**:
```typescript
type CommandHandler<TArgs = unknown, TResult = unknown> =
  (args: TArgs, context: CommandContext) => Promise<CommandResult>
```

**Fields**: N/A (function type)

**Validation Rules**:
- Must be async or return Promise
- Must handle errors gracefully and return `CommandResult` with error info (not throw)
- Must produce identical functional outcome in both CLI and hook modes
- Must not have side effects beyond documented command behavior

**State Transitions**: N/A (stateless function)

**Relationships**:
- Required field in `CommandRegistryEntry`
- Receives `CommandContext` and parsed args
- Returns `CommandResult`

**Example**:
```typescript
const envHandler: CommandHandler = async (args, context) => {
  try {
    const envInfo = await getEnvironmentInfo();
    return {
      success: true,
      output: JSON.stringify(envInfo, null, 2),
      errorOutput: null,
      exitCode: 0,
      metadata: envInfo
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      errorOutput: error.message,
      exitCode: 1,
      metadata: null
    };
  }
};
```

## Entity Relationships Diagram

```
VirtualCommand (1) --matches--> (1) CommandRegistryEntry
                                       |
                                       | contains
                                       v
                                   CommandHandler (function)
                                       |
                                       | uses (optional)
                                       v
                                   ArgumentParser (function)
                                       |
                                       | produces
                                       v
                                   CommandResult
                                       |
                 +---------------------+---------------------+
                 |                                           |
         (CLI mode)                                    (Hook mode)
                 |                                           |
                 v                                           v
         stdout/stderr                                  HookOutput
                                                             |
                                                             | wraps in
                                                             v
                                                        echo command

HookInput --parses--> VirtualCommand
HookOutput --consumed by--> Claude Code
CommandContext --provided to--> CommandHandler
```

## Validation Summary

Key validation checkpoints:

1. **Hook Input**: Validate JSON structure, check `tool_name === "Bash"`, extract command
2. **Virtual Command**: Match pattern `speck-*`, parse into name + args, lookup in registry
3. **Registry Entry**: Verify command exists, load handler and parser
4. **Argument Parsing**: Parse command string using custom or default parser, validate args
5. **Handler Execution**: Execute handler with args and context, catch errors
6. **Result Formatting**: Transform `CommandResult` to appropriate output format (stdout or HookOutput)
7. **Shell Escaping**: Escape single quotes in output before wrapping in echo command (hook mode only)

## Edge Cases

- **Empty command**: Return pass-through HookOutput (empty JSON)
- **Unknown virtual command**: Return pass-through (let bash handle "command not found")
- **Malformed hook input**: Log error to stderr, return pass-through to avoid breaking Claude
- **Handler throws exception**: Catch, wrap in `CommandResult` with `success: false`
- **Output contains single quotes**: Escape with `'\\''` pattern before echo wrapping
- **Concurrent execution**: Each process is isolated, no shared state to corrupt
- **Very large output**: Stream results if possible, truncate with warning if exceeds buffer limits (100KB)
