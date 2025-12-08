---
description: Migrate an existing OpenSpec project to Speck
arguments:
  - name: --dry-run
    description: Show what would be done without making changes
    required: false
---

# Migrate from OpenSpec

Migrate an existing OpenSpec project to Speck format.

## Usage

```bash
/speck-changes.migrate [--dry-run]
```

## What It Does

1. Detects `openspec/` directory in project root
2. Copies specs from `openspec/specs/` to `specs/`
3. Copies changes from `openspec/changes/` to `.speck/changes/`
4. Validates migrated content

## Options

- `--dry-run`: Show what would be migrated without making changes

## Example

```bash
# Preview migration
/speck-changes.migrate --dry-run

# Perform migration
/speck-changes.migrate
```

## After Migration

1. Review migrated specs in `specs/`
2. Review migrated changes in `.speck/changes/`
3. Run `/speck-changes.validate` on each change
4. Consider removing original `openspec/` directory

## Implementation

```bash
bun plugins/speck-changes/scripts/migrate.ts $ARGUMENTS
```
