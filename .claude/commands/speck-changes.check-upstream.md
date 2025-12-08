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

## Present Results

After running the script, present the releases as a table for the user to review and select from. Include:
- Version number
- Release title
- Publication date
- Status (latest indicator)

Then ask the user which version they'd like to pull using the AskUserQuestion tool with the available versions as options.

## Next Steps

After the user selects a release:

1. Use `/speck-changes.pull-upstream <version>` to download it
2. Use `/speck-changes.transform-upstream` to transform to Bun TypeScript
