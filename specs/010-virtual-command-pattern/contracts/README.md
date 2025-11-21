# Contracts: Virtual Command Pattern

This directory contains JSON Schema contracts defining the interfaces for the virtual command pattern implementation.

## Overview

The virtual command pattern uses several contracts to ensure type safety and compatibility between components:

1. **hook-input.schema.json**: Structure received by PreToolUse hook via stdin
2. **hook-output.schema.json**: Structure written by hook to stdout to control command execution
3. **command-registry.schema.json**: Metadata for registered command handlers
4. **command-result.schema.json**: Return value from command handler execution

## Hook Flow

```
Claude Code
    |
    | (invokes Bash tool)
    v
PreToolUse Hook (receives hook-input via stdin)
    |
    | (parses command, checks registry)
    v
Command Registry (looks up handler)
    |
    | (executes handler with parsed args)
    v
Command Handler (returns command-result)
    |
    | (formats result, escapes shell chars)
    v
PreToolUse Hook (writes hook-output to stdout)
    |
    | (substituted echo command)
    v
Claude Code (executes modified command)
```

## Usage in TypeScript

These schemas are for documentation and validation. TypeScript implementations use strongly-typed interfaces derived from these schemas:

```typescript
// Derived from hook-input.schema.json
interface HookInput {
  tool_name: "Bash";
  tool_input: {
    command: string;
    description?: string;
    timeout?: number;
  };
}

// Derived from hook-output.schema.json
type HookOutput =
  | { permissionDecision: "allow"; hookSpecificOutput: { updatedInput: { command: string } } }
  | {};

// Derived from command-result.schema.json
interface CommandResult {
  success: boolean;
  output: string;
  errorOutput: string | null;
  exitCode: number;
  metadata?: object | null;
}
```

## Validation

These schemas can be used with JSON Schema validators to ensure runtime compliance:

```bash
# Validate hook input
echo '{"tool_name":"Bash","tool_input":{"command":"speck-env"}}' | \
  ajv validate -s hook-input.schema.json -d -

# Validate hook output
echo '{"permissionDecision":"allow","hookSpecificOutput":{"updatedInput":{"command":"echo hello"}}}' | \
  ajv validate -s hook-output.schema.json -d -
```

## Contract Evolution

When modifying contracts:

1. Update the JSON schema file
2. Regenerate TypeScript types if using code generation
3. Update tests to cover new fields/constraints
4. Document changes in feature plan.md
5. Bump version in command-registry if handler signature changes
