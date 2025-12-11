---
description: Show details of a change proposal
arguments:
  - name: name
    description: "Change name to show"
    required: true
  - name: options
    description: "Options: --json"
    required: false
---

# Show Change Details

Display detailed information about a change proposal.

## Usage

```bash
/speck-changes.show <name> [--json]
```

## Arguments

- `name` - Change name to show

## Options

- `--json` - Output in JSON format

## Execute

```bash
speck changes show $ARGUMENTS
```

## Output

```text
## Change: add-auth

**Status**: 📝 active
**Created**: 2025-12-07
**Tasks**: 2/5
**Design doc**: ✓ Yes

### Summary

Add user authentication to the application.

### Delta Files

- auth.md
- user-model.md
```

## Next Steps

- Edit files in `.speck/changes/<name>/`
- Use `/speck-changes.validate <name>` to check formatting
- Use `/speck-changes.archive <name>` when complete
