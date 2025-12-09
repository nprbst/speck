---
description: List all change proposals
arguments:
  - name: options
    description: "Options: --all (include archived), --json"
    required: false
---

# List Change Proposals

Display all active change proposals.

## Usage

```bash
/speck-changes.list [--all] [--json]
```

## Options

- `--all` - Include archived changes
- `--json` - Output in JSON format

## Execute

```bash
speck changes list $ARGUMENTS
```

## Output

| Name | Status | Tasks | Created |
|------|--------|-------|---------|
| add-auth | 📝 active | 2/5 | 2025-12-07 |
| fix-bug | 📝 active | 3/3 | 2025-12-06 |

## Next Steps

- Use `/speck-changes.show <name>` to see details
- Use `/speck-changes.validate <name>` to check formatting
