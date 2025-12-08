---
title: ".speck/config.json Schema"
description: "Complete reference for Speck configuration file including worktree integration, validation rules, and examples."
category: reference
audience: [existing-users, evaluators]
prerequisites: ["/docs/getting-started/quick-start"]
tags: ["configuration", "worktrees", "schema", "reference"]
lastUpdated: 2025-11-22
relatedPages: ["/docs/advanced-features/worktrees", "/docs/commands/reference"]
order: 1
---

# .speck/config.json Schema

Complete reference for Speck's configuration file, including worktree integration settings, validation rules, and practical examples.

## Overview

Speck uses `.speck/config.json` to store repository-specific configuration:
- Worktree integration settings
- IDE preferences
- Dependency installation behavior
- File copy/symlink rules

**Location**: `.speck/config.json` (repository root)
**Format**: JSON with Zod schema validation
**Scope**: Per-repository (not shared across multi-repo setups)

## Root Schema

```typescript
{
  "version": string,      // Schema version (current: "1.0")
  "worktree": {           // Worktree integration settings
    // ... see below
  }
}
```

### `version`

**Type**: `string`
**Default**: `"1.0"`
**Required**: Yes

Schema version for configuration format. Used for future migrations.

**Example**:
```json
{
  "version": "1.0"
}
```

## Worktree Configuration

### `worktree`

**Type**: `object`
**Default**: All features disabled
**Required**: No (defaults to disabled)

Top-level worktree integration settings.

**Schema**:
```typescript
{
  "worktree": {
    "enabled": boolean,           // Master switch (default: false)
    "worktreePath": string,       // Storage location (default: ".speck/worktrees")
    "branchPrefix": string,       // Optional branch prefix (default: none)
    "ide": {                      // IDE auto-launch settings
      "autoLaunch": boolean,      // Auto-launch IDE (default: false)
      "editor": string,           // IDE to launch (default: "vscode")
      "newWindow": boolean        // Open in new window (default: true)
    },
    "dependencies": {             // Dependency installation settings
      "autoInstall": boolean,     // Auto-install deps (default: false)
      "packageManager": string    // Package manager (default: "auto")
    },
    "files": {                    // File copy/symlink rules
      "rules": Array<FileRule>,   // Custom rules (default: [])
      "includeUntracked": boolean // Copy untracked files (default: true)
    }
  }
}
```

### `worktree.enabled`

**Type**: `boolean`
**Default**: `false`
**Required**: Yes (if using worktrees)

Master switch for worktree integration. When `false`, all other worktree settings are ignored.

**Example**:
```json
{
  "worktree": {
    "enabled": true
  }
}
```

### `worktree.worktreePath`

**Type**: `string`
**Default**: `".speck/worktrees"`
**Required**: No

Directory where worktrees are stored (relative to repository root).

**Note**: In practice, worktrees are created as peer directories of the main repository (one level up), not inside `.speck/worktrees/`. This setting may be deprecated in future versions.

**Example**:
```json
{
  "worktree": {
    "enabled": true,
    "worktreePath": ".speck/worktrees"
  }
}
```

### `worktree.branchPrefix`

**Type**: `string | undefined`
**Default**: `undefined` (no prefix)
**Required**: No

Optional prefix for all spec branches (e.g., `"specs/"` → `specs/002-user-auth`).

**⚠️ Warning**: Using a branch prefix breaks backwards compatibility with spec-kit (spec-kit expects branches without prefixes).

**Example**:
```json
{
  "worktree": {
    "enabled": true,
    "branchPrefix": "specs/"
  }
}
```

**Result**: Branch `002-user-auth` becomes `specs/002-user-auth`

## IDE Configuration

### `worktree.ide`

**Type**: `object`
**Default**: All disabled
**Required**: No

Settings for automatic IDE launch when creating worktrees.

### `worktree.ide.autoLaunch`

**Type**: `boolean`
**Default**: `false`
**Required**: No

Automatically launch IDE when worktree is created.

**Example**:
```json
{
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true
    }
  }
}
```

### `worktree.ide.editor`

**Type**: `"vscode" | "cursor" | "webstorm" | "idea" | "pycharm"`
**Default**: `"vscode"`
**Required**: No (if `autoLaunch` is `true`)

Which IDE to launch automatically.

**Supported Values**:
- `"vscode"` - Visual Studio Code
- `"cursor"` - Cursor editor
- `"webstorm"` - WebStorm (JetBrains)
- `"idea"` - IntelliJ IDEA (JetBrains)
- `"pycharm"` - PyCharm (JetBrains)

**IDE Command Mapping**:
| Editor | CLI Command | Args |
|--------|-------------|------|
| `vscode` | `code` | `["-n", path]` |
| `cursor` | `cursor` | `["-n", path]` |
| `webstorm` | `webstorm` | `[path]` |
| `idea` | `idea` | `[path]` |
| `pycharm` | `pycharm` | `[path]` |

**Example**:
```json
{
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true,
      "editor": "cursor"
    }
  }
}
```

### `worktree.ide.newWindow`

**Type**: `boolean`
**Default**: `true`
**Required**: No

Open IDE in a new window (vs. reusing existing window).

**Example**:
```json
{
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true,
      "editor": "vscode",
      "newWindow": true  // Opens in new VSCode window
    }
  }
}
```

## Dependency Configuration

### `worktree.dependencies`

**Type**: `object`
**Default**: Auto-install disabled
**Required**: No

Settings for automatic dependency installation in worktrees.

### `worktree.dependencies.autoInstall`

**Type**: `boolean`
**Default**: `false`
**Required**: No

Automatically install dependencies before launching IDE.

**Behavior**:
- Detects package manager from lockfiles
- Runs install command with progress indicator
- Blocks IDE launch until installation completes
- Aborts IDE launch if installation fails

**Example**:
```json
{
  "worktree": {
    "enabled": true,
    "dependencies": {
      "autoInstall": true
    }
  }
}
```

### `worktree.dependencies.packageManager`

**Type**: `"npm" | "yarn" | "pnpm" | "bun" | "auto"`
**Default**: `"auto"`
**Required**: No

Which package manager to use for dependency installation.

**Values**:
- `"auto"` - Auto-detect from lockfiles (recommended)
- `"npm"` - Force npm
- `"yarn"` - Force yarn
- `"pnpm"` - Force pnpm
- `"bun"` - Force bun

**Auto-Detection Logic** (when `"auto"`):
1. Check for `bun.lockb` → use `bun`
2. Check for `pnpm-lock.yaml` → use `pnpm`
3. Check for `yarn.lock` → use `yarn`
4. Check for `package-lock.json` → use `npm`
5. Default to `npm` if no lockfile found

**Example**:
```json
{
  "worktree": {
    "enabled": true,
    "dependencies": {
      "autoInstall": true,
      "packageManager": "bun"  // Force bun even if other lockfiles exist
    }
  }
}
```

## File Configuration

### `worktree.files`

**Type**: `object`
**Default**: Empty rules (uses defaults)
**Required**: No

Settings for file copy and symlink operations in worktrees.

### `worktree.files.rules`

**Type**: `Array<FileRule>`
**Default**: `[]` (uses `DEFAULT_FILE_RULES`)
**Required**: No

Custom rules for how files/directories should be handled in worktrees.

**FileRule Schema**:
```typescript
{
  "pattern": string,  // Glob pattern or relative path
  "action": "copy" | "symlink" | "ignore"
}
```

**Pattern Syntax** (Bun.Glob):
- `*` - Match any characters except `/`
- `**` - Match any characters including `/`
- `?` - Match single character
- `[abc]` - Match character class
- `{a,b}` - Match alternatives

**Actions**:
- `"copy"` - Create independent copy in worktree (changes don't affect main repo)
- `"symlink"` - Create symbolic link to main repo file/directory (changes shared)
- `"ignore"` - Don't copy or symlink (file handled by Git)

**Default Rules** (when `rules: []`):
```typescript
[
  // Copy configuration files (isolation)
  { "pattern": ".env*", "action": "copy" },
  { "pattern": "*.config.js", "action": "copy" },
  { "pattern": "*.config.ts", "action": "copy" },
  { "pattern": "*.config.json", "action": "copy" },
  { "pattern": ".nvmrc", "action": "copy" },
  { "pattern": ".node-version", "action": "copy" },

  // Symlink large dependency directories (if they exist)
  { "pattern": "node_modules", "action": "symlink" },
  { "pattern": ".bun", "action": "symlink" },
  { "pattern": ".cache", "action": "symlink" },

  // Ignore (don't copy or symlink)
  { "pattern": ".git", "action": "ignore" },
  { "pattern": ".speck", "action": "ignore" },
  { "pattern": "dist", "action": "ignore" },
  { "pattern": "build", "action": "ignore" }
]
```

**Example**:
```json
{
  "worktree": {
    "enabled": true,
    "files": {
      "rules": [
        { "pattern": ".env*", "action": "copy" },
        { "pattern": "*.config.{js,ts}", "action": "copy" },
        { "pattern": "node_modules", "action": "symlink" }
      ]
    }
  }
}
```

### `worktree.files.includeUntracked`

**Type**: `boolean`
**Default**: `true`
**Required**: No

Whether to copy untracked files that match copy rules.

**Use Case**: Local `.env` files are often untracked but needed in worktrees.

**Example**:
```json
{
  "worktree": {
    "enabled": true,
    "files": {
      "rules": [
        { "pattern": ".env*", "action": "copy" }
      ],
      "includeUntracked": true  // Copies .env.local even if untracked
    }
  }
}
```

## Validation

### Schema Validation

Configuration is validated using Zod schemas at runtime. Invalid configuration triggers detailed error messages:

**Example Error**:
```
Error: Invalid configuration in .speck/config.json:
  - worktree.ide.editor: Editor must be one of: vscode, cursor, webstorm, idea, pycharm
  - worktree.files.rules[0].pattern: Pattern cannot be empty
```

### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| `version` | Must be string | Version must be a string |
| `worktree.enabled` | Must be boolean | Enabled must be true or false |
| `worktree.ide.editor` | Must be enum value | Editor must be one of: vscode, cursor, webstorm, idea, pycharm |
| `worktree.dependencies.packageManager` | Must be enum value | Package manager must be 'npm', 'yarn', 'pnpm', 'bun', or 'auto' |
| `worktree.files.rules[].pattern` | Must be non-empty string | Pattern cannot be empty |
| `worktree.files.rules[].action` | Must be enum value | Action must be 'copy', 'symlink', or 'ignore' |

### Performance

**Validation Performance**: <100ms (fast command startup)

## Complete Examples

### Minimal Configuration (Worktrees Only)

Enable worktrees without IDE launch or dependency install:

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true
  }
}
```

### Full Automation (VSCode)

Enable all features with VSCode:

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true,
      "editor": "vscode",
      "newWindow": true
    },
    "dependencies": {
      "autoInstall": true,
      "packageManager": "auto"
    },
    "files": {
      "rules": [
        { "pattern": ".env*", "action": "copy" },
        { "pattern": "*.config.{js,ts}", "action": "copy" },
        { "pattern": "node_modules", "action": "symlink" },
        { "pattern": ".bun", "action": "symlink" }
      ],
      "includeUntracked": true
    }
  }
}
```

### JetBrains IDE Setup (WebStorm)

Full automation with WebStorm:

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true,
      "editor": "webstorm",
      "newWindow": true
    },
    "dependencies": {
      "autoInstall": true,
      "packageManager": "bun"
    }
  }
}
```

### Conservative Disk Usage

Minimize disk usage by symlinking large directories:

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "dependencies": {
      "autoInstall": false  // Manual install to save disk
    },
    "files": {
      "rules": [
        { "pattern": ".env*", "action": "copy" },
        { "pattern": "*.config.{js,ts}", "action": "copy" },
        { "pattern": "node_modules", "action": "symlink" },
        { "pattern": ".bun", "action": "symlink" },
        { "pattern": ".cache", "action": "symlink" },
        { "pattern": ".next", "action": "symlink" },
        { "pattern": ".turbo", "action": "symlink" }
      ],
      "includeUntracked": true
    }
  }
}
```

### Monorepo Setup

Configuration for monorepo with shared dependencies:

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true,
      "editor": "vscode"
    },
    "dependencies": {
      "autoInstall": false  // Manual install per package
    },
    "files": {
      "rules": [
        { "pattern": ".env*", "action": "copy" },
        { "pattern": "*.config.{js,ts}", "action": "copy" },
        { "pattern": "node_modules", "action": "symlink" },  // Root deps
        { "pattern": "packages/*/node_modules", "action": "symlink" }  // Package deps
      ],
      "includeUntracked": true
    }
  }
}
```

### Python Project

Configuration for Python projects:

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true,
      "editor": "pycharm"
    },
    "dependencies": {
      "autoInstall": false  // Python deps handled by virtualenv
    },
    "files": {
      "rules": [
        { "pattern": ".env*", "action": "copy" },
        { "pattern": "*.toml", "action": "copy" },
        { "pattern": "*.ini", "action": "copy" },
        { "pattern": "venv", "action": "symlink" },
        { "pattern": ".venv", "action": "symlink" },
        { "pattern": "__pycache__", "action": "ignore" },
        { "pattern": "*.pyc", "action": "ignore" }
      ],
      "includeUntracked": true
    }
  }
}
```

### Branch Prefix (Team Convention)

Use `specs/` prefix for all spec branches:

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "branchPrefix": "specs/",  // Creates specs/002-user-auth
    "ide": {
      "autoLaunch": true,
      "editor": "vscode"
    }
  }
}
```

**⚠️ Warning**: This breaks spec-kit compatibility.

## Migration Guide

### From No Config to Worktrees

**Step 1**: Create minimal config
```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true
  }
}
```

**Step 2**: Test with a single feature
```bash
/speck:specify "Test worktree feature"
```

**Step 3**: Enable auto-launch
```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true,
      "editor": "vscode"
    }
  }
}
```

**Step 4**: Enable auto-install
```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true,
      "editor": "vscode"
    },
    "dependencies": {
      "autoInstall": true
    }
  }
}
```

### From Default Rules to Custom Rules

**Default rules** are applied when `files.rules` is empty or missing. To customize:

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "files": {
      "rules": [
        // Start with default patterns you want to keep
        { "pattern": ".env*", "action": "copy" },
        { "pattern": "node_modules", "action": "symlink" },

        // Add your custom patterns
        { "pattern": "local-config.json", "action": "copy" },
        { "pattern": ".husky", "action": "ignore" }
      ]
    }
  }
}
```

**Note**: Once you define custom rules, defaults are NOT applied. You must explicitly include patterns you want.

## TypeScript Types

For TypeScript projects, import types from the schema:

```typescript
import type {
  SpeckConfig,
  WorktreeConfig,
  FileRule,
  IDEConfig,
  DependencyConfig
} from "./plugins/speck/scripts/worktree/config-schema";

// Type-safe config object
const config: SpeckConfig = {
  version: "1.0",
  worktree: {
    enabled: true,
    ide: {
      autoLaunch: true,
      editor: "vscode"  // Type-checked against allowed values
    }
  }
};
```

## See Also

- [Worktree Integration Guide](/docs/advanced-features/worktrees) - Complete feature documentation
- [Quickstart Guide](/docs/getting-started/quick-start) - Initial setup instructions
- [/speck:specify Command](/docs/commands/specify) - Create features with worktrees
- [/speck:branch Command](/docs/commands/branch) - Create branches with worktrees
