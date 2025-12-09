---
description: Create a new change proposal
arguments:
  - name: name
    description: "Change name in kebab-case (e.g., add-user-auth)"
    required: true
  - name: options
    description: "Options: --with-design, --description <text>, --json"
    required: false
---

# Create Change Proposal

Create a new change proposal with structured templates.

## Usage

```bash
/speck-changes.propose <name> [--with-design] [--description "text"]
```

## Arguments

- `name` - Change name in kebab-case (e.g., `add-user-auth`)

## Options

- `--with-design` - Include optional design.md template
- `--description "text"` - Initial proposal description
- `--json` - Output in JSON format

## Execute

Run the propose script:

```bash
bun ${CLAUDE_PLUGIN_ROOT}/scripts/propose.js $ARGUMENTS
```

## What This Creates

```text
.speck/changes/<name>/
├── proposal.md     # Change rationale and scope
├── tasks.md        # Implementation checklist
├── design.md       # Optional technical design (with --with-design)
└── specs/          # Delta files for affected specifications
```

## Example

```bash
/speck-changes.propose add-user-auth --with-design
```

Creates:
```text
.speck/changes/add-user-auth/
├── proposal.md
├── tasks.md
├── design.md
└── specs/
```

## Next Steps

1. Edit `proposal.md` with your change description and rationale
2. Add implementation tasks to `tasks.md`
3. Create delta files in `specs/` for affected specifications
4. Use `/speck-changes.validate` to check formatting
