# CLI Interface: Worktree Integration

## Overview

This document defines the command-line interface for worktree operations. These commands will be integrated into existing Speck workflows (`/speck:specify`, `/speck:branch`) and may also be exposed as standalone commands for advanced users.

## Integration Points

### Primary: Automatic Worktree Creation

Worktrees are created automatically during branch creation when `worktree.enabled=true`:

- **`/speck:specify`**: Creates spec + worktree
- **`/speck:branch`**: Creates branch + worktree

No new commands needed for basic usage. Configuration controls behavior.

### Secondary: Manual Worktree Management

For advanced users who want explicit control:

```bash
# Create worktree for existing branch
speck worktree create <branch-name> [options]

# Remove worktree (keeps branch)
speck worktree remove <branch-name> [options]

# List all worktrees
speck worktree list

# Cleanup stale worktree references
speck worktree prune

# Interactive configuration setup
speck worktree init
```

## Command Specifications

---

### `speck worktree create`

**Purpose**: Create a worktree for an existing branch

**Signature**:
```bash
speck worktree create <branch-name> [options]
```

**Arguments**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `branch-name` | string | Yes | Name of existing branch to create worktree for |

**Options**:
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--path <path>` | string | `{worktreePath}/{branch-name}` | Custom worktree location |
| `--no-deps` | boolean | false | Skip dependency installation even if autoInstall=true |
| `--no-ide` | boolean | false | Skip IDE launch even if autoLaunch=true |
| `--reuse-worktree` | boolean | false | Reuse existing worktree directory if present (FR-013) |
| `--force` | boolean | false | Force creation, removing existing worktree if needed |

**Examples**:
```bash
# Basic: create worktree for branch "002-user-auth"
speck worktree create 002-user-auth

# Custom path
speck worktree create 002-user-auth --path ../my-worktrees/user-auth

# Skip IDE and dependencies (fast creation)
speck worktree create 002-user-auth --no-ide --no-deps

# Reuse existing directory
speck worktree create 002-user-auth --reuse-worktree
```

**Output** (success):
```
Creating worktree for branch '002-user-auth'...
✓ Worktree created at .speck/worktrees/002-user-auth
✓ Copied 8 files (configuration)
✓ Symlinked 1 directory (node_modules)
✓ Installing dependencies... [====================] 100%
✓ Launched VSCode

Worktree ready at: .speck/worktrees/002-user-auth
```

**Output** (collision without --reuse-worktree):
```
Error: Worktree directory already exists at .speck/worktrees/002-user-auth

Options:
  - Use --reuse-worktree to skip recreation and reuse the existing directory
  - Use --force to remove and recreate the worktree
  - Manually delete the directory and try again
```

**Exit Codes**:
- `0`: Success
- `1`: Worktree already exists (without --reuse-worktree or --force)
- `2`: Branch does not exist
- `3`: Git worktree creation failed
- `4`: File copy/symlink failed
- `5`: Dependency installation failed (if autoInstall=true)
- `6`: IDE launch failed (warning only, worktree still created)

---

### `speck worktree remove`

**Purpose**: Remove a worktree (branch remains)

**Signature**:
```bash
speck worktree remove <branch-name> [options]
```

**Arguments**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `branch-name` | string | Yes | Name of branch whose worktree to remove |

**Options**:
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--force` | boolean | false | Remove even if worktree has uncommitted changes |
| `--delete-branch` | boolean | false | Also delete the branch after removing worktree |

**Examples**:
```bash
# Remove worktree (keep branch)
speck worktree remove 002-user-auth

# Force removal with uncommitted changes
speck worktree remove 002-user-auth --force

# Remove worktree and delete branch
speck worktree remove 002-user-auth --delete-branch
```

**Output** (success):
```
Removing worktree for branch '002-user-auth'...
✓ Worktree removed from .speck/worktrees/002-user-auth
✓ Branch '002-user-auth' still exists
```

**Output** (uncommitted changes without --force):
```
Error: Worktree has uncommitted changes

Uncommitted files:
  - src/auth/login.ts (modified)
  - tests/auth.test.ts (new file)

Options:
  - Commit or stash changes in the worktree
  - Use --force to discard changes and remove anyway
```

**Exit Codes**:
- `0`: Success
- `1`: Worktree has uncommitted changes (without --force)
- `2`: Worktree does not exist for branch
- `3`: Git worktree removal failed

---

### `speck worktree list`

**Purpose**: List all worktrees for the repository

**Signature**:
```bash
speck worktree list [options]
```

**Options**:
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON for scripting |
| `--verbose` | boolean | false | Show additional details (creation time, status) |

**Examples**:
```bash
# Basic list
speck worktree list

# Verbose output
speck worktree list --verbose

# JSON output for scripts
speck worktree list --json
```

**Output** (basic):
```
Worktrees for repository: /Users/dev/project

Branch                Path                              Status
002-user-auth        .speck/worktrees/002-user-auth    Ready
003-payment-flow     .speck/worktrees/003-payment-flow Ready

2 worktrees total
```

**Output** (verbose):
```
Worktrees for repository: /Users/dev/project

Branch: 002-user-auth
  Path:    .speck/worktrees/002-user-auth
  Created: 2025-11-22 10:30:45
  Status:  Ready
  HEAD:    a1b2c3d Fix login validation

Branch: 003-payment-flow
  Path:    .speck/worktrees/003-payment-flow
  Created: 2025-11-22 14:15:20
  Status:  Ready
  HEAD:    d4e5f6g Add Stripe integration

2 worktrees total
```

**Output** (JSON):
```json
{
  "repository": "/Users/dev/project",
  "worktrees": [
    {
      "branch": "002-user-auth",
      "path": ".speck/worktrees/002-user-auth",
      "absolutePath": "/Users/dev/project/.speck/worktrees/002-user-auth",
      "createdAt": "2025-11-22T10:30:45Z",
      "status": "ready",
      "head": "a1b2c3d"
    },
    {
      "branch": "003-payment-flow",
      "path": ".speck/worktrees/003-payment-flow",
      "absolutePath": "/Users/dev/project/.speck/worktrees/003-payment-flow",
      "createdAt": "2025-11-22T14:15:20Z",
      "status": "ready",
      "head": "d4e5f6g"
    }
  ],
  "count": 2
}
```

**Exit Codes**:
- `0`: Success (even if no worktrees exist)

---

### `speck worktree prune`

**Purpose**: Cleanup stale worktree references (FR-018)

**Signature**:
```bash
speck worktree prune [options]
```

**Options**:
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dry-run` | boolean | false | Show what would be pruned without removing |
| `--verbose` | boolean | false | Show detailed information |

**Examples**:
```bash
# Cleanup stale references
speck worktree prune

# Preview what would be pruned
speck worktree prune --dry-run
```

**Output** (stale references found):
```
Pruning stale worktree references...
✓ Removed reference for .speck/worktrees/001-initial (directory no longer exists)
✓ Removed reference for .speck/worktrees/004-old-feature (directory no longer exists)

Pruned 2 stale reference(s)
```

**Output** (no stale references):
```
No stale worktree references found
```

**Exit Codes**:
- `0`: Success

---

### `speck worktree init`

**Purpose**: Interactive setup for worktree configuration

**Signature**:
```bash
speck worktree init [options]
```

**Options**:
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--defaults` | boolean | false | Use default values without prompts |
| `--minimal` | boolean | false | Create minimal config (only worktree.enabled) |

**Examples**:
```bash
# Interactive setup
speck worktree init

# Quick setup with defaults
speck worktree init --defaults

# Minimal config (just enable worktrees)
speck worktree init --minimal
```

**Interactive Flow**:
```
Worktree Integration Setup

? Enable worktree integration? (y/n) › y

? Where should worktrees be created? › .speck/worktrees

? Use a branch name prefix (e.g., "specs/")? (optional) › specs/
  Note: This breaks backwards compatibility with spec-kit

IDE Auto-Launch

? Automatically launch IDE when worktree is created? (y/n) › y

? Which IDE do you use?
  ❯ VSCode (code)
    Cursor (cursor)
    WebStorm (webstorm)
    IntelliJ IDEA (idea)
    PyCharm (pycharm)

? Open in new window or add to workspace?
  ❯ New window
    Add to workspace

Dependency Installation

? Automatically install dependencies before IDE launch? (y/n) › y

? Which package manager? (auto-detect recommended)
  ❯ Auto-detect
    npm
    yarn
    pnpm
    bun

File Operations

? Customize file copy/symlink rules? (y/n) › n
  (Using sensible defaults)

Configuration saved to .speck/config.json

Summary:
  ✓ Worktrees enabled at .speck/worktrees
  ✓ Branch prefix: specs/
  ✓ IDE: VSCode (new window)
  ✓ Auto-install: yes (auto-detect)
  ✓ File rules: defaults

Next steps:
  - Run /speck:specify or /speck:branch to create a worktree
  - Customize file rules in .speck/config.json if needed
```

**Exit Codes**:
- `0`: Success
- `1`: User cancelled setup

---

## Flags Available on Existing Commands

When worktree integration is enabled, these flags are available on existing commands:

### `/speck:specify` and `/speck:branch` Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--no-worktree` | boolean | false | Skip worktree creation even if enabled in config |
| `--no-deps` | boolean | false | Skip dependency installation |
| `--no-ide` | boolean | false | Skip IDE launch |
| `--reuse-worktree` | boolean | false | Reuse existing worktree directory if present |

**Examples**:
```bash
# Create spec without worktree (one-off override)
/speck:specify "User Authentication" --no-worktree

# Create branch with worktree but skip IDE
/speck:branch feat/new-feature --no-ide

# Create spec with worktree, reusing directory if exists
/speck:specify "Payment Flow" --reuse-worktree
```

---

## Error Handling

### Common Error Scenarios

#### 1. Git Worktree Creation Fails
```
Error: Failed to create Git worktree

Reason: Insufficient disk space (requires 2.3 GB, only 1.1 GB available)

Suggestions:
  - Free up disk space and try again
  - Use a custom path on a different drive with --path
  - Disable dependency installation with --no-deps to save space
```

#### 2. IDE Not Found
```
Warning: Could not launch IDE

Reason: 'code' command not found

Suggestions:
  - Install VSCode and add 'code' to PATH
  - In VSCode: Cmd+Shift+P → "Shell Command: Install 'code' command in PATH"
  - Change IDE in config: .speck/config.json → worktree.ide.editor
  - Disable auto-launch: .speck/config.json → worktree.ide.autoLaunch = false

Worktree created successfully at: .speck/worktrees/002-user-auth
```

#### 3. Dependency Installation Fails
```
Error: Dependency installation failed

Reason: Network timeout while downloading packages

Output:
  npm ERR! network request to https://registry.npmjs.org/react failed, reason: socket hang up

Suggestions:
  - Check internet connection and try again
  - Manually run 'npm ci' in .speck/worktrees/002-user-auth
  - Disable auto-install: .speck/config.json → worktree.dependencies.autoInstall = false

IDE launch aborted. Worktree created but dependencies not installed.
```

#### 4. Invalid Configuration
```
Error: Invalid configuration in .speck/config.json:
  - worktree.ide.editor: Invalid enum value. Expected 'vscode' | 'cursor' | 'webstorm' | 'idea' | 'pycharm', received 'sublime'
  - worktree.files.rules[0].action: Invalid enum value. Expected 'copy' | 'symlink' | 'ignore', received 'link'

Please fix the configuration and try again.
```

### Exit Code Summary

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error (collision, uncommitted changes, user cancelled) |
| 2 | Resource not found (branch doesn't exist, worktree doesn't exist) |
| 3 | Git operation failed (worktree add/remove failed) |
| 4 | File operation failed (copy/symlink failed) |
| 5 | Dependency installation failed |
| 6 | IDE launch failed (non-fatal warning) |
| 7 | Configuration error (invalid config) |

---

## Progress Indicators

### Worktree Creation Progress
```
Creating worktree for branch '002-user-auth'...
[====                ] 20% - Running git worktree add
[========            ] 40% - Copying configuration files
[============        ] 60% - Symlinking dependencies
[================    ] 80% - Installing dependencies
[====================] 100% - Launching IDE

✓ Worktree ready at .speck/worktrees/002-user-auth
```

### Dependency Installation Progress
```
Installing dependencies with npm...
[====================] 100% - 1234/1234 packages installed

Total: 8.6s
```

---

## Input/Output Formats

### JSON Output Format (for `--json` flags)

**Worktree List**:
```typescript
interface WorktreeListOutput {
  repository: string;       // Absolute path to main repo
  worktrees: Array<{
    branch: string;         // Branch name
    path: string;           // Relative path from repo root
    absolutePath: string;   // Absolute path
    createdAt: string;      // ISO 8601 timestamp
    status: string;         // "ready", "error", etc.
    head: string;           // Short commit hash
  }>;
  count: number;
}
```

### Interactive Input Format

Prompts use `@clack/prompts` library (consistent with Speck's existing UI):
- Confirm prompts: yes/no questions
- Select prompts: choose from list
- Text prompts: free-form input with validation

---

## Integration with Existing Commands

### Hook Points in `/speck:specify`

1. **After spec creation, before branch creation**:
   - Check if `worktree.enabled=true`
   - Prompt for branch name approval (FR-016)
   - If user approves, create worktree instead of regular branch

2. **Worktree creation flow**:
   - Run `git worktree prune` (FR-018)
   - Create worktree with `git worktree add`
   - Apply file rules (copy/symlink)
   - Install dependencies (if enabled)
   - Launch IDE (if enabled)

### Hook Points in `/speck:branch`

1. **After branch name input, before creation**:
   - Check if `worktree.enabled=true`
   - If enabled, create worktree instead of regular branch

2. **Same worktree creation flow as above**

### Configuration Check

Before every worktree operation:
```typescript
const config = await loadConfig(repoPath);
if (!config.worktree.enabled) {
  // Skip worktree creation, use regular branch
  return;
}
```
