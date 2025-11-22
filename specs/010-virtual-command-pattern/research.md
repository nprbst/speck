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

**Decision**: Use documented hook format from Claude Code plugin system 2.0, with cat heredoc for output and smart path detection
**Rationale**: PreToolUse hooks receive JSON via stdin containing `{"tool_input": {"command": "..."}}` and must return JSON with `{"permissionDecision": "allow", "hookSpecificOutput": {"updatedInput": {"command": "cat << 'EOF'\noutput\nEOF"}}}` for interception or empty JSON `{}` for pass-through. Using cat with heredoc (quoted delimiter) eliminates all escaping concerns - no variable expansion, no quote escaping, complete safety.

**Path Detection Strategy**: Hook detects execution context automatically:
- Local development: Uses `import.meta.dir` to construct relative path to CLI (e.g., `../speck.ts`)
- Installed plugin: Reads from `~/.claude/speck-plugin-path` or derives from script location
- Benefit: Works seamlessly in both development and production without configuration

**Alternatives considered**:
- echo with single-quote escaping (rejected: requires escaping pattern `'\\''`, error-prone)
- PrePromptSubmit hooks (rejected: runs before prompt expansion, doesn't intercept tool calls)
- custom subprocess wrapper (rejected: doesn't integrate with Claude Code's tool system)
- hardcoded paths (rejected: breaks in development mode, requires configuration)

**References**:
- Claude Code Hook Documentation (from prior chat context): PreToolUse fires before Bash tool execution
- Hook response must include `permissionDecision: "allow"` to proceed with modified command
- Heredoc with quoted delimiter (`<<'EOF'`) prevents all variable expansion and requires zero escaping
- Bun's `import.meta.dir` provides reliable script location for path resolution

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

### 4. Shell Safety for Output

**Unknown**: How to safely pass command output through bash without escaping concerns

**Research Focus**:
- Single quote escaping patterns
- Double quote handling within quoted strings
- Newline, backtick, and dollar sign escaping
- Testing shell injection scenarios

**Decision**: Use heredoc with quoted delimiter - NO escaping needed
**Rationale**: Using `cat << 'EOF'\n${output}\nEOF` completely eliminates escaping concerns. The quoted delimiter (`'EOF'`) prevents all variable expansion, quote interpretation, and special character processing. Output is passed literally byte-for-byte. This is safer, simpler, and more maintainable than any escaping pattern.
**Alternatives considered**:
- Single quote escaping with `'\\''` pattern (rejected: complex, error-prone, doesn't handle all edge cases)
- Double-quote wrapping (rejected: requires escaping $, `, \, ")
- Base64 encoding (rejected: requires decode step, less debuggable, adds complexity)

**Benefits of heredoc approach**:
- Zero escaping logic needed
- Handles all special characters naturally: `'`, `"`, `$`, `` ` ``, `\`, newlines
- More readable and maintainable
- Standard bash pattern, well-understood
- Impossible to have escaping bugs

**Note**: Shell escaping utilities remain available in `shell-escape.ts` for other use cases (e.g., constructing shell commands, not for output formatting)

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

1. **Hook Format**: Use documented PreToolUse JSON structure with `updatedInput` for command substitution, using cat with heredoc for output (zero escaping)
2. **Dual-Mode CLI**: Explicit `--hook` flag with TTY fallback, separate output formatting per mode
3. **Command Registry**: Type-safe registry mapping command names to handlers and parsers
4. **Shell Safety**: Heredoc with quoted delimiter (`cat << 'EOF'`) - eliminates all escaping concerns, safer than any escaping pattern
5. **Migration**: Incremental migration with validation gates and one-release deprecation cycle
6. **Concurrency**: Process isolation sufficient, no additional locking needed
7. **Prerequisite Checks**: PrePromptSubmit hook with caching and early abort on failure

No `[NEEDS CLARIFICATION]` markers remain. Ready to proceed to Phase 1: Design & Contracts.
