---
description: Check available OpenSpec versions from npm registry
arguments:
  - name: options
    description: "Command options: --json for JSON output, --limit N for version count"
    required: false
---

# Check OpenSpec npm Versions

Query the npm registry for available @fission-ai/openspec versions.

## Usage

```bash
/speck-changes.check-upstream [--json] [--limit N]
```

## Options

- `--json` - Output in JSON format for machine processing
- `--limit N` - Limit results to N versions (default: 10)

## Execute

Run the check-upstream script to query npm versions:

```bash
bun ${CLAUDE_PLUGIN_ROOT}/scripts/check-upstream.ts $ARGUMENTS
```

## Present Results

After running the script, present the versions as a table for the user to review and select from. Include:
- Version number
- Publication date
- Status (latest, pulled, or new)

Then ask the user which version they'd like to pull using the AskUserQuestion tool with the available versions as options.

## Next Steps

After the user selects a version:

1. Use `/speck-changes.pull-upstream <version>` to install and capture it
