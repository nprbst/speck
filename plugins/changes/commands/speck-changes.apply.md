---
description: Apply a change proposal by implementing its tasks
arguments:
  - name: name
    description: "Change name to apply"
    required: true
  - name: options
    description: "Options: --mark <taskId>, --json"
    required: false
---

# Apply Change Proposal

Load a change proposal's tasks and guide implementation with Claude assistance.

## Usage

```bash
/speck-changes.apply <name> [--mark <taskId>] [--json]
```

## Arguments

- `name` - Change name to apply

## Options

- `--mark <taskId>` - Mark a specific task as complete
- `--json` - Output in JSON format

## Execute

```bash
bun ${CLAUDE_PLUGIN_ROOT}/scripts/apply.ts $ARGUMENTS
```

## Output

```text
## Apply Change: add-auth

**Progress**: 2/5 tasks complete

### Pending Tasks

- [ ] **T001**: Create auth service
- [ ] **T003**: Add login endpoint
- [ ] **T004**: Add logout endpoint

### Completed Tasks

- [x] **T002**: Define user model
- [x] **T005**: Update routes

### Delta Context

The following spec changes are defined for this proposal:

- **auth-spec**

Use these delta specs as context when implementing tasks.

### How to Complete Tasks

1. Work through each pending task
2. When a task is done, run:
   /speck-changes.apply add-auth --mark <taskId>
3. Or manually mark `[x]` in tasks.md
```

## Workflow

1. **View tasks**: Run `/speck-changes.apply <name>` to see pending and completed tasks
2. **Implement tasks**: Work through each pending task with Claude's assistance
3. **Mark complete**: Use `--mark <taskId>` or edit tasks.md directly
4. **Check progress**: Re-run apply to see updated progress
5. **Archive when done**: When all tasks complete, follow the archive suggestion

## Examples

```bash
# View change tasks and progress
/speck-changes.apply add-auth

# Mark a task as complete
/speck-changes.apply add-auth --mark T001

# Get JSON output for scripting
/speck-changes.apply add-auth --json
```

## Next Steps

- Tasks marked complete update `.speck/changes/<name>/tasks.md`
- When all tasks complete, run `/speck-changes.archive <name>`
- Use `/speck-changes.show <name>` to view full change details
