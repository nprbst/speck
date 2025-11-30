# Quickstart: Scope Simplification Implementation

**Feature**: 015-scope-simplification
**Date**: 2025-11-28

## Overview

This quickstart guide covers implementing the Scope Simplification feature, which:
1. Removes stacked PR support and virtual commands
2. Consolidates to a dual-mode CLI with `--json` and `--hook` flags
3. Adds auto-install via `/speck.init`
4. Enhances worktree integration with session handoff
5. Prunes website documentation

---

## Prerequisites

- Bun 1.0+ installed
- Git 2.5+ installed
- VSCode with Claude Code extension
- Familiarity with TypeScript and Commander.js

---

## Quick Reference

### Key Files

| Purpose | Location |
|---------|----------|
| Main CLI entry | `src/cli/index.ts` (NEW) |
| Command implementations | `.speck/scripts/commands/` |
| Branch mapping | `.speck/scripts/common/branch-mapper.ts` |
| Worktree integration | `.speck/scripts/worktree/` |
| Handoff generation | `.speck/scripts/worktree/handoff.ts` (NEW) |
| speck-help skill | `.claude/skills/speck-help/` (RENAMED) |
| Plugin config | `.claude-plugin/plugin.json` |

### Commands to Implement

```bash
speck install              # Create symlink at ~/.local/bin/speck
speck create-new-feature   # Create feature with worktree (existing, enhance)
speck check-prerequisites  # Validate context (existing)
speck env                  # Show environment (existing)
speck help                 # Alias to --help
```

### Output Modes

```bash
speck env                  # Human-readable (default)
speck env --json           # Structured JSON for LLM
speck env --hook           # Hook format for Claude Code
```

---

## Phase 1: Code Removal

### Files to Delete

```bash
# Stacked PR implementation
rm .speck/scripts/branch-command.ts
rm .speck/scripts/commands/branch.ts

# Virtual command pattern
rm .speck/scripts/lib/hook-utils.ts
rm .speck/scripts/lib/mode-detector.ts
rm .speck/scripts/build-hook.ts

# Slash command
rm .claude/commands/speck.branch.md

# Feature spec (optional, keep for history)
# rm -rf specs/008-stacked-pr-support/
```

### Code Changes

1. **Command Registry** (`.speck/scripts/commands/index.ts`):
   - Remove `branch` command registration

2. **CLI Entry** (`.speck/scripts/speck.ts`):
   - Remove `runHookMode()` function
   - Keep CLI mode with output format flags

3. **Plugin Config** (`.claude-plugin/plugin.json`):
   - Remove `PreToolUse` hook entry
   - Keep `UserPromptSubmit` hook

---

## Phase 2: Branch Mapping Simplification

### Schema Migration

Update `.speck/scripts/common/branch-mapper.ts`:

```typescript
// Old schema (remove these fields)
interface LegacyBranchEntry {
  baseBranch: string;     // REMOVE
  status: BranchStatus;   // REMOVE
  pr: number | null;      // REMOVE
}

// New schema (keep these only)
interface BranchEntry {
  name: string;
  specId: string;
  createdAt: string;
  updatedAt: string;
  parentSpecId?: string;
}
```

### Migration Logic

```typescript
function migrateBranchMapping(legacy: LegacyMapping): BranchMapping {
  return {
    version: "2.0.0",
    branches: legacy.branches.map(entry => ({
      name: entry.name,
      specId: entry.specId,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      parentSpecId: entry.parentSpecId,
    })),
    specIndex: rebuildSpecIndex(branches),
  };
}
```

---

## Phase 3: CLI Consolidation

### New Entry Point

Create `src/cli/index.ts`:

```typescript
#!/usr/bin/env bun
import { program } from "commander";
import { installCommand } from "./commands/install";
import { createNewFeatureCommand } from "./commands/create-new-feature";
import { checkPrerequisitesCommand } from "./commands/check-prerequisites";
import { envCommand } from "./commands/env";

program
  .name("speck")
  .description("Specification-driven development workflow")
  .version("1.8.0")
  .option("--json", "Output structured JSON")
  .option("--hook", "Output hook format for Claude Code");

program.addCommand(installCommand);
program.addCommand(createNewFeatureCommand);
program.addCommand(checkPrerequisitesCommand);
program.addCommand(envCommand);

program.parse();
```

### Install Command

Create `.speck/scripts/commands/install.ts`:

```typescript
export async function install(options: InstallOptions): Promise<void> {
  const homeDir = process.env.HOME || "~";
  const localBin = path.join(homeDir, ".local", "bin");
  const symlinkPath = path.join(localBin, "speck");
  const targetPath = path.resolve(__dirname, "../../../src/cli/index.ts");

  // Create ~/.local/bin if missing
  await fs.mkdir(localBin, { recursive: true });

  // Check if symlink exists
  if (await fileExists(symlinkPath)) {
    if (!options.force) {
      console.log("Speck is already installed. Use --force to reinstall.");
      return;
    }
    await fs.unlink(symlinkPath);
  }

  // Create symlink
  await fs.symlink(targetPath, symlinkPath);

  // Check if ~/.local/bin is in PATH
  const pathDirs = (process.env.PATH || "").split(":");
  if (!pathDirs.includes(localBin)) {
    console.log(`\nWarning: ${localBin} is not in your PATH.`);
    console.log("Add this line to your ~/.bashrc or ~/.zshrc:");
    console.log(`  export PATH="$HOME/.local/bin:$PATH"`);
  }
}
```

---

## Phase 4: Worktree + Handoff Integration

### Handoff Document Generation

Create `.speck/scripts/worktree/handoff.ts`:

```typescript
import type { HandoffDocument } from "../../contracts/handoff-document";

export async function createHandoff(
  worktreePath: string,
  featureName: string,
  branchName: string,
  specPath: string
): Promise<void> {
  const handoff: HandoffDocument = {
    featureName,
    branchName,
    specPath,
    createdAt: new Date().toISOString(),
    context: `Working on feature: ${featureName}`,
    status: "not-started",
    nextStep: "Run /speck.plan to create an implementation plan.",
  };

  const markdown = generateHandoffMarkdown(handoff);
  const handoffPath = path.join(worktreePath, ".speck", "handoff.md");

  await fs.mkdir(path.dirname(handoffPath), { recursive: true });
  await fs.writeFile(handoffPath, markdown);
}
```

### Session Start Hook

Update `.speck/scripts/hooks/session-start.ts`:

```typescript
export async function onSessionStart(): Promise<void> {
  const handoffPath = ".speck/handoff.md";

  if (await fileExists(handoffPath)) {
    const content = await fs.readFile(handoffPath, "utf-8");
    const handoff = parseHandoffMarkdown(content);

    // Output context for Claude Code
    console.log(`\n## Feature Context: ${handoff.featureName}`);
    console.log(`\nBranch: ${handoff.branchName}`);
    console.log(`Spec: ${handoff.specPath}`);
    console.log(`Status: ${handoff.status || "unknown"}`);
    console.log(`\n${handoff.context}`);
    console.log(`\nNext step: ${handoff.nextStep}`);

    // Archive the handoff document
    const archivePath = ".speck/handoff-loaded.md";
    await fs.rename(handoffPath, archivePath);
  }
}
```

---

## Phase 5: Skill Rename

### Directory Rename

```bash
mv .claude/skills/speck-knowledge .claude/skills/speck-help
```

### Update SKILL.md

```yaml
---
name: speck-help
description: "Answer questions about Speck features, commands, and workflows"
---
```

### Content Updates

Remove sections:
- Section 8: Stacked PR Mode Detection
- Section 9: Virtual Command Architecture

Update slash command table:
- Remove `/speck.branch`
- Add `/speck.init` and `/speck.help`

---

## Phase 6: Slash Commands

### Create /speck.init

`.claude/commands/speck.init.md`:

```markdown
---
description: Install Speck CLI globally
---

# /speck.init

Installs the Speck CLI to `~/.local/bin/speck` for global access.

## Usage

Run this command to set up Speck CLI:

\`\`\`bash
bun run $PLUGIN_ROOT/.speck/scripts/speck.ts install
\`\`\`

After installation, you can use `speck` from any directory.
```

### Create /speck.help

`.claude/commands/speck.help.md`:

```markdown
---
description: Get help with Speck features and commands
---

# /speck.help

Load the speck-help skill to answer questions about Speck.

## Skill Activation

This command activates the `speck-help` skill. After loading,
you can ask questions about:

- Speck commands (`/speck.*`)
- Workflow phases (specify → plan → tasks → implement)
- Spec, plan, and tasks file formats
- Multi-repo configuration
- Worktree integration
```

---

## Phase 7: Website Pruning

### Content to Remove

Search and remove mentions of:
- "stacked PR"
- "virtual command"
- "branch dependency"
- "/speck.branch"

### Content to Update

1. Getting started guide: Focus on core workflow
2. CLI reference: New command structure
3. Add `/speck.init` and `/speck.help` documentation
4. Add session handoff documentation

---

## Testing Checklist

Before marking complete:

- [ ] `speck --help` shows all commands
- [ ] `speck install` creates symlink correctly
- [ ] `speck create-new-feature` creates worktree with handoff
- [ ] `speck env --json` outputs valid JSON
- [ ] `/speck.init` triggers install
- [ ] `/speck.help` loads speck-help skill
- [ ] No mentions of stacked PR in codebase
- [ ] No mentions of virtual command in codebase
- [ ] All tests pass (baseline - deleted tests)
- [ ] Website builds without errors

---

## Common Issues

### Symlink Permission Error

If `speck install` fails with permission error:
```bash
# Check if ~/.local/bin exists
ls -la ~/.local/bin

# Create manually if needed
mkdir -p ~/.local/bin
```

### PATH Not Updated

If `speck` command not found after install:
```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$HOME/.local/bin:$PATH"

# Reload shell
source ~/.bashrc  # or ~/.zshrc
```

### Handoff Not Loading

If new session doesn't show feature context:
1. Check `.speck/handoff.md` exists in worktree
2. Verify SessionStart hook is registered in plugin.json
3. Check hook permissions and execution
