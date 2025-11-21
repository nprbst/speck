# Research: Virtual Command Pattern with Dual-Mode CLI

**Date**: 2025-11-21
**Feature**: 010-virtual-command-pattern

## Research Tasks

Based on Technical Context analysis, the following areas require research to resolve unknowns and validate technical approaches:

### 1. Claude Code PreToolUse Hook Mechanism

**Unknown**: Exact JSON structure for PreToolUse hook stdin/stdout, behavior on malformed input, error propagation patterns

**Research Focus**:
- Hook input format: `tool_input`, `tool_name` fields
- Hook output format: `permissionDecision`, `hookSpecificOutput`, `updatedInput`
- Error handling: stderr vs structured error responses
- Empty/pass-through response format for non-matching commands

**Decision**: Use documented hook format from Claude Code plugin system 2.0
**Rationale**: PreToolUse hooks receive JSON via stdin containing `{"tool_input": {"command": "..."}}` and must return JSON with `{"permissionDecision": "allow", "hookSpecificOutput": {"updatedInput": {"command": "echo 'output'"}}}` for interception or empty JSON `{}` for pass-through
**Alternatives considered**: PrePromptSubmit hooks (rejected: runs before prompt expansion, doesn't intercept tool calls), custom subprocess wrapper (rejected: doesn't integrate with Claude Code's tool system)

**References**:
- Claude Code Hook Documentation (from prior chat context): PreToolUse fires before Bash tool execution
- Hook response must include `permissionDecision: "allow"` to proceed with modified command
- Shell injection prevention requires single quote escaping: `text.replace(/'/g, "'\\'''")`

### 2. Commander.js Dual-Mode Pattern

**Unknown**: Best practices for detecting stdin mode (TTY vs pipe), argument parsing from both argv and JSON stdin

**Research Focus**:
- Mode detection: `process.stdin.isTTY` vs explicit `--hook` flag
- Argument parsing: extract flags and positional args from command string when in hook mode
- Error handling: exit codes in normal mode vs JSON error responses in hook mode
- Output formatting: stdout in normal mode vs echo command wrapping in hook mode

**Decision**: Explicit mode detection with fallback to TTY check
**Rationale**: Use `--hook` flag for explicit hook mode (reliable), fall back to `!process.stdin.isTTY` for implicit detection. In hook mode, parse command string to extract argv-equivalent array before passing to Commander. This provides deterministic behavior and clear testing scenarios.
**Alternatives considered**: TTY-only detection (rejected: hard to test, less explicit), environment variable (rejected: fragile, requires external setup)

**Pattern**:
```typescript
const isHookMode = process.argv.includes('--hook') || !process.stdin.isTTY;

if (isHookMode) {
  // Read JSON from stdin, extract command, parse to argv, execute via Commander
  const hookInput = await readStdin();
  const { command } = JSON.parse(hookInput).tool_input;
  const argv = parseCommandToArgv(command); // "speck-branch list" -> ["branch", "list"]
  program.parse(argv, { from: 'user' });
  // Wrap output in echo command for Claude consumption
} else {
  // Normal CLI mode
  program.parse(process.argv);
}
```

### 3. Command Registry Architecture

**Unknown**: Registry data structure, handler function signature, argument parser interface

**Research Focus**:
- Registry schema: map command name to handler and optional parser
- Handler signature: async function accepting parsed args, returning result
- Parser interface: function taking command string, returning typed args object
- Error propagation: how handlers signal failures to both CLI and hook modes

**Decision**: Type-safe registry with handler and parser functions
**Rationale**: Use TypeScript interface for registry entries ensuring compile-time safety. Handlers receive parsed args and context (mode, raw command), return Promise<CommandResult>. Parsers are optional (default to positional args).

**Pattern**:
```typescript
interface CommandHandler {
  handler: (args: unknown, context: CommandContext) => Promise<CommandResult>;
  parseArgs?: (commandString: string) => unknown;
  description: string;
}

const registry: Record<string, CommandHandler> = {
  "branch": {
    handler: branchHandler,
    parseArgs: parseBranchArgs,
    description: "Manage feature branches"
  },
  "env": {
    handler: envHandler,
    description: "Show environment info"
  }
};
```

**Alternatives considered**: Class-based handlers (rejected: unnecessary complexity for stateless functions), separate registry file per command (rejected: harder to maintain, lookup overhead)

### 4. Shell Escaping for Single Quotes

**Unknown**: Correct escaping pattern for single quotes in hook output, other shell metacharacters requiring escaping

**Research Focus**:
- Single quote escaping: `'text with 'quotes''` transformation
- Double quote handling within single-quoted strings
- Newline, backtick, and dollar sign escaping
- Testing shell injection scenarios

**Decision**: Single quote escape pattern: `text.replace(/'/g, "'\\'''")`
**Rationale**: In single-quoted strings, cannot escape single quote with backslash. Must close quote, add escaped quote, reopen quote: `'it'\''s'` produces "it's". This is the standard POSIX shell escaping pattern.
**Alternatives considered**: Double-quote wrapping (rejected: requires escaping $, `, \, "), base64 encoding (rejected: requires decode step, less debuggable)

**Testing**: Validate with strings containing: `It's "quoted" with $vars and `backticks``

### 5. Migration Strategy from Individual Scripts

**Unknown**: Coexistence pattern during migration, deprecation timeline, validation approach

**Research Focus**:
- Dual implementation period: both individual scripts and unified CLI functional
- Detection of which implementation is being used (for telemetry/warnings)
- Validation that unified CLI produces identical output to individual scripts
- Deprecation warning mechanism
- Timeline: one feature release cycle after full migration

**Decision**: Incremental migration with validation gates
**Rationale**:
1. **Phase 1 (POC)**: Implement test-hello and speck-env in unified CLI, keep individual scripts unchanged
2. **Phase 2 (Validation)**: Add integration tests comparing unified CLI output to individual script output for migrated commands
3. **Phase 3 (Full Migration)**: Migrate remaining commands one-by-one, validating each
4. **Phase 4 (Deprecation)**: Add warnings to individual scripts directing users to unified CLI
5. **Phase 5 (Removal)**: Remove individual scripts one feature release cycle after Phase 4 completes

**Migration Checklist per Command**:
- [ ] Implement handler in `commands/<name>.ts`
- [ ] Add registry entry with parser
- [ ] Add unit tests for handler (both modes)
- [ ] Add integration test comparing output to individual script
- [ ] Update documentation
- [ ] Add deprecation warning to individual script
- [ ] Monitor usage for one release cycle
- [ ] Remove individual script

**Alternatives considered**: Big-bang migration (rejected: high risk, hard to validate), permanent dual implementation (rejected: maintenance burden, confusion)

### 6. Concurrent Execution Handling

**Unknown**: How system behaves when multiple Claude instances invoke same command, state isolation requirements

**Research Focus**:
- Process isolation: each hook invocation spawns separate process
- File system concurrency: potential conflicts in `.speck/` state files
- Git operation safety: concurrent branch operations
- Lock file requirements

**Decision**: Rely on process isolation, no additional locking needed
**Rationale**: Each hook invocation runs as separate subprocess with independent stdin/stdout. Commands are stateless or use git's built-in locking (ref updates). File reads are safe for concurrent access. Only concern is concurrent writes to same file, which would require application-level locking if added later.
**Alternatives considered**: Explicit file locking (rejected: unnecessary complexity for current commands, git handles ref locking), process-level mutex (rejected: overkill, limits parallelism)

**Action**: Document that command handlers should avoid concurrent writes to same files. If needed later, implement file-based locking using `flock` or similar.

### 7. PrePromptSubmit Hook for Automatic Prerequisite Checks

**Unknown**: PrePromptSubmit hook timing relative to slash command expansion, context injection mechanism

**Research Focus**:
- Hook execution order: PrePromptSubmit fires before slash command markdown expansion
- Prompt modification: how to inject prerequisite check results into command context
- Error handling: can PrePromptSubmit abort slash command execution?
- Performance: caching prerequisite results across slash command invocations

**Decision**: PrePromptSubmit runs check-prerequisites, injects results via prompt modification
**Rationale**: PrePromptSubmit receives user's prompt before slash command expands. Can run `check-prerequisites.sh`, capture output, and append results to prompt as context. If check fails, can replace entire prompt with error message, preventing command from running.

**Pattern**:
```typescript
// In PrePromptSubmit hook
if (prompt.match(/^\/speck\./)) {
  const prereqResult = await runCheckPrerequisites();
  if (prereqResult.success) {
    // Inject context: append to prompt or set environment variable
    return {
      hookSpecificOutput: {
        updatedPrompt: `${prompt}\n\n<!-- Prerequisite Context: ${JSON.stringify(prereqResult.context)} -->`
      }
    };
  } else {
    // Abort with error
    return {
      hookSpecificOutput: {
        updatedPrompt: `Error: ${prereqResult.error}. Cannot execute ${prompt}.`
      }
    };
  }
}
```

**Alternatives considered**: Run prerequisites in each command (rejected: duplicated logic, no early abort), SessionStart hook (rejected: runs once per session, not per command, wrong granularity)

**Performance**: Cache prerequisite results for 5 seconds to avoid redundant checks if user runs multiple commands rapidly. Invalidate cache on git operations (branch switch, commit).

## Summary

All technical unknowns have been researched and resolved. Key decisions:

1. **Hook Format**: Use documented PreToolUse JSON structure with `updatedInput` for command substitution
2. **Dual-Mode CLI**: Explicit `--hook` flag with TTY fallback, separate output formatting per mode
3. **Command Registry**: Type-safe registry mapping command names to handlers and parsers
4. **Shell Escaping**: POSIX single-quote escaping pattern for injection prevention
5. **Migration**: Incremental migration with validation gates and one-release deprecation cycle
6. **Concurrency**: Process isolation sufficient, no additional locking needed
7. **Prerequisite Checks**: PrePromptSubmit hook with caching and early abort on failure

No `[NEEDS CLARIFICATION]` markers remain. Ready to proceed to Phase 1: Design & Contracts.
