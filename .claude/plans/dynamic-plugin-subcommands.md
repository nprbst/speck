# Plan: Dynamic Plugin Subcommands for Speck CLI

## Goal

Enable `speck reviewer <command>` and `speck changes <command>` instead of
separate binaries (`speck-reviewer`, `speck-changes`). Single global entry point
with plugin subcommand routing.

## Design Decisions

1. **Manifest-based declaration**: Add `cli` field to plugin.json for opt-in
   registration
2. **Subprocess delegation**: Spawn plugin CLIs as subprocesses (not bundled)
   for isolation and independent updates
3. **Discovery locations**: Installed marketplace, CLAUDE_PLUGIN_ROOT, local
   plugins/
4. **Backwards compatible**: Keep standalone binaries working alongside new
   unified approach
5. **Unified CLI pattern**: Create unified CLI for speck-changes first, so all
   plugins use `entrypoint` pattern (no `scripts` pattern)

## Architecture

```
speck reviewer analyze PR-123
  │
  ├─ Check if "reviewer" matches a plugin CLI
  │
  ├─ Find speck-reviewer/plugin.json with cli.subcommand: "reviewer"
  │
  └─ Spawn: bun {plugin_path}/{entrypoint} analyze PR-123 [--json]
```

## Implementation Tasks

### Phase 0: Unify speck-changes CLI

**T000: Create unified CLI for speck-changes**

- File: [plugins/changes/src/index.ts](plugins/changes/src/index.ts) (new)
- Pattern: Dispatch table with lazy imports (same as speck-reviewer)
- Commands to expose: propose, apply, list, show, validate, archive, migrate,
  check-upstream, pull-upstream, transform-upstream
- Build output: `dist/speck-changes.js`

```typescript
const commands: Record<string, () => Promise<{ main: MainFunction }>> = {
    propose: () => import("../scripts/propose"),
    apply: () => import("../scripts/apply"),
    list: () => import("../scripts/list"),
    show: () => import("../scripts/show"),
    validate: () => import("../scripts/validate"),
    archive: () => import("../scripts/archive"),
    migrate: () => import("../scripts/migrate"),
    "check-upstream": () => import("../scripts/check-upstream"),
    "pull-upstream": () => import("../scripts/pull-upstream"),
    "transform-upstream": () => import("../scripts/transform-upstream"),
};
```

**T000b: Update changes package.json with bin entry**

- File: [plugins/changes/package.json](plugins/changes/package.json)
- Add build script and bin entry for `speck-changes`

### Phase 1: Schema & Discovery

**T001: Extend PluginJsonSchema with CLI declaration**

- File:
  [packages/common/src/manifest-schemas.ts](packages/common/src/manifest-schemas.ts)
- Add `cli` field with `entrypoint` pattern only (simplified)

```typescript
const PluginCLISchema = z.object({
    subcommand: z.string(), // e.g., "reviewer", "changes"
    description: z.string(),
    entrypoint: z.string(), // e.g., "dist/speck-review.js"
});
```

**T002: Create plugin-loader module**

- File: [plugins/speck/cli/plugin-loader.ts](plugins/speck/cli/plugin-loader.ts)
  (new)
- Functions:
  - `discoverPlugins()`: Search known locations
  - `loadPluginManifest(path)`: Parse and validate plugin.json
  - `executePluginCommand(plugin, args, opts)`: Subprocess delegation

**T003: Update plugin manifests**

- File:
  [plugins/reviewer/.claude-plugin/plugin.json](plugins/reviewer/.claude-plugin/plugin.json)
  ```json
  "cli": {
    "subcommand": "reviewer",
    "entrypoint": "dist/speck-review.js",
    "description": "AI-powered PR review"
  }
  ```
- File:
  [plugins/changes/.claude-plugin/plugin.json](plugins/changes/.claude-plugin/plugin.json)
  ```json
  "cli": {
    "subcommand": "changes",
    "entrypoint": "dist/speck-changes.js",
    "description": "OpenSpec change management"
  }
  ```

### Phase 2: Core CLI Integration

**T004: Add plugin routing to main CLI**

- File: [plugins/speck/cli/index.ts](plugins/speck/cli/index.ts)
- Before Commander parsing, check if first arg is a plugin subcommand
- Location: Modify `main()` function (line 373)

```typescript
async function main(): Promise<void> {
    // Early plugin routing (before Commander)
    const firstArg = process.argv[2];
    if (firstArg && !firstArg.startsWith("-")) {
        const plugins = discoverPlugins();
        const match = plugins.find((p) => p.cli.subcommand === firstArg);
        if (match) {
            const exitCode = await executePluginCommand(
                match,
                process.argv.slice(3),
            );
            process.exit(exitCode);
        }
    }

    const program = createProgram();
    // ... existing logic
}
```

**T005: Implement subprocess delegation**

- In plugin-loader.ts
- Stream stdout/stderr
- Forward env vars (SPECK_DEBUG, etc.)
- Propagate --json flag
- Return exit code

**T006: Add plugin commands to help output**

- Dynamically inject plugin subcommands into Commander help
- Show: `reviewer    AI-powered PR review (speck-reviewer)`

### Phase 3: Build & Validation

**T007: Update build script**

- File: [scripts/build-plugin.ts](scripts/build-plugin.ts)
- Validate CLI declarations in manifests
- Verify entrypoint/script files exist

**T008: Add integration tests**

- Test `speck reviewer analyze` routing
- Test `speck changes propose` routing
- Test core commands unchanged
- Test --json propagation

### Phase 4: Simplify Plugin Init Commands

**T009: Simplify /speck-reviewer:init**

- File: [plugins/reviewer/commands/init.md](plugins/reviewer/commands/init.md)
- Current behavior (to remove):
  - Creates `~/.local/bin/speck-review` symlink
  - Configures `Bash(speck-review:*)` auto-allow
- New simplified behavior:
  - Just verifies `speck` CLI is installed (`speck --version`)
  - Configures permissions for `gh` commands only
  - Adds `review-state.json` to `.gitignore`
  - Instructs user: "Use `speck reviewer <command>` instead of `speck-review`"

**T010: Remove standalone binary artifacts**

- Remove: `plugins/reviewer/src/cli/bootstrap.sh` (if exists)
- Keep: `dist/speck-review.js` for subprocess delegation (but not global
  install)

### Phase 5: Documentation

**T011: Create plugin CLI development guide**

- File: [docs/plugin-cli-development.md](docs/plugin-cli-development.md) (new)
- Audience: Developers creating new Speck plugins with CLI subcommands
- Contents outlined below

#### Plugin CLI Development Guide Contents

```markdown
# Creating Plugin CLI Subcommands

## Overview

How unified CLI routing works with subprocess delegation.

## Quick Start Checklist

- [ ] Create `src/index.ts` with dispatch table
- [ ] Add `cli` field to `.claude-plugin/plugin.json`
- [ ] Add build script to `package.json`
- [ ] Export `main(args: string[]): Promise<number>` from each command

## Manifest Declaration

Required fields in plugin.json:

- cli.subcommand: The name users type (e.g., "reviewer")
- cli.entrypoint: Path to compiled CLI (e.g., "dist/speck-review.js")
- cli.description: Short description for help output

## CLI Entry Point Template

Standard dispatch table pattern with lazy imports.

## Command Module Interface

- Signature: `main(args: string[]): Promise<number>`
- Exit codes: 0=success, 1=error, 127=command not found
- Output modes: Handle --json and --hook flags

## Output Mode Handling

- Human: stdout for results, stderr for logs
- JSON: Structured output for LLM parsing
- Hook: Claude Code hook format

## Error Handling

- Use CommandError from @speck/common
- Include meaningful error messages
- Return appropriate exit codes

## Build Configuration

- package.json scripts for build
- bin entry for standalone binary (optional)
- Bun build command example

## Testing Requirements

- Unit tests for command logic
- Integration tests for CLI routing
- Test --json output format
```

## Files to Modify

| File                                                                                       | Changes                                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| [plugins/changes/src/index.ts](plugins/changes/src/index.ts)                               | **New** - Unified CLI with dispatch table        |
| [plugins/changes/package.json](plugins/changes/package.json)                               | Add build script and bin entry                   |
| [packages/common/src/manifest-schemas.ts](packages/common/src/manifest-schemas.ts)         | Add PluginCLISchema                              |
| [plugins/speck/cli/index.ts](plugins/speck/cli/index.ts)                                   | Add plugin routing before Commander              |
| [plugins/speck/cli/plugin-loader.ts](plugins/speck/cli/plugin-loader.ts)                   | **New** - Discovery and delegation               |
| [plugins/reviewer/.claude-plugin/plugin.json](plugins/reviewer/.claude-plugin/plugin.json) | Add cli field                                    |
| [plugins/changes/.claude-plugin/plugin.json](plugins/changes/.claude-plugin/plugin.json)   | Add cli field                                    |
| [scripts/build-plugin.ts](scripts/build-plugin.ts)                                         | Validate CLI declarations, add changes build     |
| [plugins/reviewer/commands/init.md](plugins/reviewer/commands/init.md)                     | Simplify - remove symlink setup, use unified CLI |
| [docs/plugin-cli-development.md](docs/plugin-cli-development.md)                           | **New** - Developer guide for plugin CLIs        |

## Help Output Preview

```
$ speck --help
Usage: speck [options] [command]

Speck CLI - Claude Code-Native Spec-Driven Development

Options:
  -V, --version  Show version number
  --json         Output structured JSON
  --hook         Output hook-formatted response
  -h, --help     Display help

Core Commands:
  init           Install Speck CLI globally
  link <path>    Link repository to multi-repo root
  env            Show environment info
  ...

Plugin Commands:
  reviewer       AI-powered PR review (speck-reviewer)
  changes        OpenSpec change management (speck-changes)

Run 'speck <plugin> --help' for plugin-specific commands.
```

## Risks & Mitigations

| Risk                    | Mitigation                                          |
| ----------------------- | --------------------------------------------------- |
| Discovery slows startup | Lazy discover only when needed; cache results       |
| Subprocess overhead     | ~50ms; document direct invocation for scripts       |
| Plugin errors           | Graceful handling; skip broken plugins with warning |

## Out of Scope

- Deprecating standalone binaries (keep both working)
- Plugin dependency resolution
- Remote plugin loading
- Scripts pattern in CLI schema (all plugins use unified entrypoint)

---

# Phase 6: Consolidate speck-changes Scripts

## Problem

The speck-changes build bundles each script individually:

- 10 scripts × ~128KB each = ~1.3MB in `dist/plugins/speck-changes/scripts/`
- Each script bundles all its dependencies redundantly
- Total plugin size: 1.7MB (vs ~200KB if consolidated)

## Solution

Use the single unified CLI entrypoint (`dist/speck-changes.js`) for all
invocations instead of individual scripts.

## Implementation Tasks

### T012: Update plugin commands to use unified CLI

Update 7 commands in `plugins/changes/commands/` to use:

```bash
# Before
bun ${CLAUDE_PLUGIN_ROOT}/scripts/propose.js $ARGUMENTS

# After
speck changes propose $ARGUMENTS
```

The `speck` CLI is globally installed (via `speck init`) and handles plugin
routing automatically.

**Files to update:**

- [plugins/changes/commands/speck-changes.propose.md](plugins/changes/commands/speck-changes.propose.md)
- [plugins/changes/commands/speck-changes.apply.md](plugins/changes/commands/speck-changes.apply.md)
- [plugins/changes/commands/speck-changes.list.md](plugins/changes/commands/speck-changes.list.md)
- [plugins/changes/commands/speck-changes.show.md](plugins/changes/commands/speck-changes.show.md)
- [plugins/changes/commands/speck-changes.archive.md](plugins/changes/commands/speck-changes.archive.md)
- [plugins/changes/commands/speck-changes.validate.md](plugins/changes/commands/speck-changes.validate.md)
- [plugins/changes/commands/speck-changes.migrate.md](plugins/changes/commands/speck-changes.migrate.md)

### T013: Update root commands for upstream operations

Update 3 commands in `.claude/commands/` to use unified CLI:

```bash
# Before
bun ${CLAUDE_PLUGIN_ROOT}/scripts/check-upstream.ts $ARGUMENTS

# After
speck changes check-upstream $ARGUMENTS
```

**Files to update:**

- [.claude/commands/speck-changes.check-upstream.md](.claude/commands/speck-changes.check-upstream.md)
- [.claude/commands/speck-changes.pull-upstream.md](.claude/commands/speck-changes.pull-upstream.md)
- [.claude/commands/speck-changes.transform-upstream.md](.claude/commands/speck-changes.transform-upstream.md)

### T014: Remove per-script bundling from build

Update `scripts/build-plugin.ts` to:

1. Remove the loop that bundles individual scripts (lines ~719-728)
2. Remove copying lib/ directory bundling
3. Keep only the unified CLI bundle (`dist/speck-changes.js`)

**Before** (in `buildSpeckChangesPlugin`):

```typescript
// 7. Bundle and copy scripts
const scriptsSourceDir = join(changesSourceDir, "scripts");
if (existsSync(scriptsSourceDir)) {
    // Bundle each script individually  <- REMOVE THIS
    const scriptFiles = await readdir(scriptsSourceDir);
    for (const file of scriptFiles) {
        // ... bundling each script
    }
}
```

**After**:

```typescript
// Scripts are invoked via unified CLI (dist/speck-changes.js)
// No individual script bundling needed
```

### T015: Update validation to not require scripts/

Update `validateRequiredFiles()` in build script:

- Remove: `speck-changes/scripts` directory requirement
- Keep: `speck-changes/dist/speck-changes.js` requirement (already exists)

### T016: Verify and test

1. Run build script and verify size reduction
2. Test all commands work via unified CLI
3. Update documentation if needed

## Expected Results

| Metric                  | Before                                   | After                 |
| ----------------------- | ---------------------------------------- | --------------------- |
| speck-changes dist size | ~1.62 MB                                 | ~150-200 KB           |
| Scripts bundled         | 10 individual                            | 1 unified             |
| Command invocation      | `bun ${CLAUDE_PLUGIN_ROOT}/scripts/*.js` | `speck changes <cmd>` |

## Files to Modify

| File                                          | Changes                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| plugins/changes/commands/*.md (7 files)       | Change `bun ${CLAUDE_PLUGIN_ROOT}/scripts/*.js` → `speck changes <cmd>` |
| .claude/commands/speck-changes.*.md (3 files) | Change `bun ${CLAUDE_PLUGIN_ROOT}/scripts/*.ts` → `speck changes <cmd>` |
| scripts/build-plugin.ts                       | Remove per-script bundling, update validation                           |
