---
description: Pull a specific OpenSpec release from GitHub
arguments:
  - name: version
    description: "Version to pull (e.g., v0.16.0)"
    required: true
  - name: options
    description: "Command options: --json, --dry-run"
    required: false
---

# Pull OpenSpec Release

Download and store a specific OpenSpec release from GitHub.

## Usage

```bash
/speck-changes.pull-upstream <version> [--json] [--dry-run]
```

## Arguments

- `version` - The OpenSpec version to pull (e.g., v0.16.0)

## Options

- `--json` - Output in JSON format
- `--dry-run` - Show what would be done without making changes

## Execute

Run the pull-upstream script:

```bash
bun ${CLAUDE_PLUGIN_ROOT}/scripts/pull-upstream.ts $ARGUMENTS
```

## What This Does

1. Fetches release metadata from GitHub API
2. Downloads the release tarball
3. Extracts to `upstream/openspec/<version>/`
4. Updates `upstream/openspec/releases.json` registry
5. Creates/updates `upstream/openspec/latest` symlink

## Output

On success:
```
Successfully pulled v0.16.0 to upstream/openspec/v0.16.0
```

## Next Steps

After pulling a release:

1. Review the source code in `upstream/openspec/<version>/`
2. Use `/speck-changes.transform-upstream` to transform to Bun TypeScript
