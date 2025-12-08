---
description: Archive a completed change proposal and merge deltas into source specs
arguments:
  - name: change-name
    description: Name of the change proposal to archive
    required: true
  - name: --force
    description: Archive even if tasks are incomplete
    required: false
---

# Archive Change Proposal

Archive a completed change proposal, merging delta specs back into source specs.

## Usage

```bash
/speck-changes.archive <change-name> [--force]
```

## What It Does

1. Checks that all tasks in tasks.md are complete
2. Merges ADDED requirements from delta files into source specs
3. Moves the change folder to `.speck/archive/<name>-<YYYYMMDD>/`

## Options

- `--force`: Archive even if tasks are incomplete (will show warning)

## Example

```bash
# Archive a completed change
/speck-changes.archive add-auth

# Force archive with incomplete tasks
/speck-changes.archive add-auth --force
```

## Implementation

```bash
bun plugins/speck-changes/scripts/archive.ts $ARGUMENTS
```
