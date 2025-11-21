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

### 3. Build the Hook Bundle

The hook system uses a bundled single-file script for optimal performance. Build it with:

```bash
bun run build:hook
```

This generates `.speck/dist/speck-hook.js` - a minified bundle that includes all dependencies. The bundle:
- Improves hook execution performance (no runtime transpilation)
- Reduces file I/O during hook invocation
- Contains the entire CLI in a single ~48KB file

**Note**: Rebuild after any changes to `.speck/scripts/speck.ts` or its dependencies:
```bash
bun run build:hook
```

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

## User Story 3: Automatic Prerequisite Checks

The PrePromptSubmit hook automatically runs prerequisite checks before `/speck.*` or `/speck:*` slash commands expand, providing context injection and early error detection.

### How It Works

1. **Detection**: Hook intercepts user prompts starting with `/speck.` or `/speck:` (supports both standard and plugin-qualified formats)
2. **Check Execution**: Runs `check-prerequisites.ts` with command-appropriate flags
3. **Caching**: Results cached for 5 seconds to avoid redundant checks
4. **Success**: Injects prerequisite context as markdown comment into prompt
5. **Failure**: Replaces prompt with error message, preventing command execution

### Implementation

The PrePromptSubmit hook is registered in `.claude-plugin/plugin.json`:

```json
{
  "hooks": {
    "PrePromptSubmit": {
      "command": "bun .speck/scripts/hooks/pre-prompt-submit.ts"
    }
  }
}
```

### Command-Specific Check Options

Different `/speck.*` or `/speck:*` commands require different prerequisite checks:

- **`/speck.implement`** or **`/speck:implement`**: Requires `tasks.md` to exist, includes it in available docs
- **`/speck.analyze`** or **`/speck:analyze`**: Includes `tasks.md` in available docs if present
- **`/speck.specify`** or **`/speck:specify`**: Skips feature check (runs before feature directory exists)
- **All others**: Standard check (requires `plan.md`, optional docs)

**Note**: Both `.` and `:` separators are supported to handle both standard slash commands and plugin-qualified commands.

### Caching Behavior

**TTL**: 5 seconds (per research.md decision 7)

**Benefits**:
- Avoids redundant checks when user runs multiple commands rapidly
- Reduces latency for subsequent commands
- Maintains consistency within short time window

**Invalidation**:
- Automatic after 5 seconds
- Manual via `invalidateCache()` (e.g., after git operations)

**Cache Statistics**:
```typescript
import { getCacheStats } from ".speck/scripts/lib/prereq-cache";

const stats = getCacheStats();
// { isCached: true, ageMs: 1234, ttlMs: 5000 }
```

### Context Injection Format

On successful check, the hook injects context as a markdown comment:

```markdown
/speck.tasks

<!-- Speck Prerequisites Context (auto-injected) -->
**Feature Directory**: `/Users/you/git/speck/specs/010-virtual-command-pattern`
**Repository Mode**: single-repo
**Available Docs**: research.md, data-model.md, contracts/, quickstart.md, tasks.md
*(cached result)*
<!-- End Prerequisites Context -->
```

### Error Handling

On failed check, the hook replaces the prompt with an error message:

```markdown
⚠️ **Prerequisite Check Failed**

ERROR: Feature directory not found: /path/to/specs/010-missing
Run /speckit.specify first to create the feature structure.

Please ensure you're on a valid feature branch and have run the necessary Speck commands.
```

This prevents the slash command from expanding and executing with invalid state.

### Testing

Run integration tests to validate hook behavior:

```bash
bun test tests/integration/prereq-check.test.ts
```

**Test Coverage**:
- ✅ Prerequisite check execution
- ✅ Result caching and TTL
- ✅ Cache invalidation
- ✅ Context formatting
- ✅ Error formatting
- ✅ Command detection (`/speck.*` and `/speck:*` patterns)
- ✅ Command-specific options
- ✅ Hook input/output simulation

### Manual Testing

**Test 1: Successful Check with Context Injection**

1. Ensure you're on a valid feature branch
2. In Claude Code, type: `/speck.tasks`
3. Observe that command executes successfully
4. Check that prerequisite context is available to the agent

**Test 2: Failed Check with Error Message**

1. Switch to `main` branch (not a feature branch)
2. In Claude Code, type: `/speck.tasks`
3. Observe error message about invalid branch
4. Command should not execute

**Test 3: Cache Behavior**

1. Run `/speck.plan` (uncached)
2. Immediately run `/speck.tasks` (cached result, faster)
3. Wait 6 seconds
4. Run `/speck.analyze` (cache expired, fresh check)

### Debugging

Enable debug logging by setting environment variable:

```bash
export SPECK_DEBUG=1
```

This will log:
- Cache hits/misses
- Check execution time
- Prerequisite check output
- Context injection results

### Performance

**Metrics** (from research.md):
- Uncached check: ~50-100ms
- Cached check: <5ms
- Hook routing overhead: <10ms
- Total latency: <110ms (well under <100ms goal, but acceptable for UX)

**Optimization**:
- Static imports and bundling reduce load time
- Direct function calls (no subprocess spawning)
- In-memory caching eliminates I/O

### Authoring Slash Commands with Context Injection

When creating or updating `/speck.*` slash commands, follow this pattern to use injected prerequisite context:

**Step 1: Extract Context from Prompt**

Add this instruction at the beginning of your slash command:

```markdown
1. Extract prerequisite context from the auto-injected comment in the prompt:
   ```
   <!-- SPECK_PREREQ_CONTEXT
   {"MODE":"single-repo","FEATURE_DIR":"/path/to/specs/010-feature","AVAILABLE_DOCS":["spec.md","plan.md"]}
   -->
   ```
   Use the FEATURE_DIR and AVAILABLE_DOCS values from this JSON. All paths are absolute.

   **Fallback**: If the comment is not present (backwards compatibility), run:
   ```bash
   speck-check-prerequisites --json [flags]
   ```
```

**Step 2: Remove Plugin Path Setup**

Do NOT include the old "Plugin Path Setup" section. The virtual command pattern eliminates the need for path resolution.

**Before (deprecated)**:
```markdown
## Plugin Path Setup

Before proceeding, determine the plugin root path by running:

\`\`\`bash
if [ -d ".speck/scripts" ]; then
  echo ".speck"
else
  cat "$HOME/.claude/speck-plugin-path" 2>/dev/null || echo ".speck"
fi
\`\`\`

Store this value and use `$PLUGIN_ROOT` in all subsequent script paths.
```

**After (correct)**:
```markdown
## Outline

1. Extract prerequisite context from the auto-injected comment...
```

**Step 3: Use Virtual Commands in Fallback**

When specifying fallback commands, use virtual command names (without paths):

```markdown
**Fallback**: If the comment is not present (backwards compatibility), run:
\`\`\`bash
speck-check-prerequisites --json
\`\`\`
```

NOT: `bun run $PLUGIN_ROOT/scripts/check-prerequisites.ts --json`

**Step 4: Reference Context Values**

In your slash command instructions, reference the context values directly:

```markdown
2. Load spec.md from FEATURE_DIR:
   - Read FEATURE_DIR/spec.md
   - Parse user stories and requirements

3. Check if tasks.md is available:
   - If "tasks.md" in AVAILABLE_DOCS: Read FEATURE_DIR/tasks.md
   - Otherwise: Inform user to run /speck.tasks first
```

**Command-Specific Flags**

Different commands require different prerequisite check flags. The PrePromptSubmit hook automatically applies the correct flags based on the command:

- `/speck.implement`: `--json --require-tasks --include-tasks`
- `/speck.analyze`: `--json --require-tasks --include-tasks`
- `/speck.tasks`: `--json`
- `/speck.plan`: `--json`
- `/speck.specify`: Skips check entirely (runs before feature exists)
- All others: `--json`

**Testing Context Injection**

Test your slash command with both injected context and fallback mode:

```bash
# Test 1: Simulate injected context
cat << 'EOF'
/speck.yourcommand

<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/010-test","AVAILABLE_DOCS":["spec.md","plan.md"]}
-->
EOF

# Test 2: Simulate fallback (no context)
# Just invoke the command without injected context
# Should run speck-check-prerequisites as fallback
```

**Example: Complete Slash Command Template**

```markdown
---
description: Your slash command description
---

## User Input

\`\`\`text
$ARGUMENTS
\`\`\`

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Extract prerequisite context from the auto-injected comment in the prompt:
   \`\`\`
   <!-- SPECK_PREREQ_CONTEXT
   {"MODE":"single-repo","FEATURE_DIR":"/path/to/specs/010-feature","AVAILABLE_DOCS":["spec.md"]}
   -->
   \`\`\`
   Use FEATURE_DIR to locate spec.md and other artifacts.

   **Fallback**: If the comment is not present (backwards compatibility), run:
   \`\`\`bash
   speck-check-prerequisites --json
   \`\`\`

2. Load required documents from FEATURE_DIR:
   - Read FEATURE_DIR/spec.md
   - If "plan.md" in AVAILABLE_DOCS: Read FEATURE_DIR/plan.md

3. Execute your command logic...
```

**Benefits of This Pattern**:
- No manual prerequisite checks in slash commands
- Automatic caching (5-second TTL)
- Consistent error handling across all commands
- Backwards compatible with fallback mode
- Eliminates path resolution complexity

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
