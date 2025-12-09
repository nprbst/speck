---
description: Install OpenSpec from npm and capture artifacts
arguments:
  - name: version
    description: "Version to pull (e.g., 0.16.0)"
    required: true
  - name: options
    description: "Command options: --json, --dry-run"
    required: false
---

# Pull OpenSpec from npm

Install a specific OpenSpec version from npm and capture the generated artifacts.

## Usage

```bash
/speck-changes.pull-upstream <version> [--json] [--dry-run]
```

## Arguments

- `version` - The OpenSpec version to pull (e.g., 0.16.0 or v0.16.0)

## Options

- `--json` - Output in JSON format
- `--dry-run` - Show what would be done without making changes

## Execute

Run the pull-upstream script:

```bash
speck changes pull-upstream $ARGUMENTS
```

## What This Does

1. Installs `@fission-ai/openspec@<version>` via npm
2. Runs `bun openspec init --tools claude`
3. Copies npm package to `upstream/openspec/<version>/package/`
4. Copies generated commands to `upstream/openspec/<version>/init-output/.claude/commands/openspec/`
5. Moves AGENTS.md to `upstream/openspec/<version>/init-output/`
6. Updates `upstream/openspec/releases.json` registry
7. Creates/updates `upstream/openspec/latest` symlink

## Output Structure

```
upstream/openspec/<version>/
├── package/                    # Copy of node_modules/@fission-ai/openspec
│   ├── package.json
│   ├── dist/
│   └── ...
└── init-output/                # Output from openspec init
    ├── AGENTS.md
    └── .claude/
        └── commands/
            └── openspec/
                ├── proposal.md
                ├── apply.md
                └── archive.md
```

## Output

On success:
```
Successfully pulled 0.16.0 to upstream/openspec/0.16.0
```

## Next Steps

After pulling a version:

1. Review the generated commands in `upstream/openspec/<version>/init-output/`
2. Compare with other versions for side-by-side analysis
