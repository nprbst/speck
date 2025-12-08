---
description: Check available OpenSpec releases from GitHub
arguments:
  - name: options
    description: "Command options: --json for JSON output, --limit N for release count"
    required: false
---

# Check OpenSpec Upstream Releases

Query the OpenSpec GitHub repository for available releases.

## Usage

```bash
/speck-changes.check-upstream [--json] [--limit N]
```

## Options

- `--json` - Output in JSON format for machine processing
- `--limit N` - Limit results to N releases (default: 10)

## Execute

Run the check-upstream script to query releases:

```bash
bun ${CLAUDE_PLUGIN_ROOT}/scripts/check-upstream.ts $ARGUMENTS
```

## Output

The command displays a table of available OpenSpec releases:

| Version | Title | Published | Status |
|---------|-------|-----------|--------|
| v0.16.0 | Antigravity | 2025-11-21 | **latest** |
| v0.15.0 | Gemini | 2025-11-15 | |

## Next Steps

After identifying the desired release:

1. Use `/speck-changes.pull-upstream <version>` to download it
2. Use `/speck-changes.transform-upstream` to transform to Bun TypeScript
