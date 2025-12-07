# Quickstart: OpenSpec Changes Plugin

**Date**: 2025-12-07
**Feature**: 019-openspec-changes-plugin

## Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Bun | 1.0+ | `bun --version` |
| Git | 2.30+ | `git --version` |
| Claude Code | Latest | `claude --version` |
| gh CLI (optional) | Any | `gh --version` |

## Installation

The speck-changes plugin is bundled with Speck. No separate installation required.

Verify plugin is available:
```bash
# Check if commands are registered
ls .claude/commands/speck-changes/
```

## Project Setup

### 1. Initialize Speck (if not already done)

```bash
speck init
```

### 2. Create Required Directories

```bash
mkdir -p .speck/changes
mkdir -p .speck/archive
mkdir -p upstream/openspec
```

## Development Commands

### Upstream Sync

```bash
# Check available OpenSpec releases
/speck-changes.check-upstream

# Pull a specific release
/speck-changes.pull-upstream v0.16.0

# Transform upstream to Speck plugin
/speck-changes.transform-upstream
```

### Change Management

```bash
# Create a new change proposal
/speck-changes.propose add-user-auth

# Create proposal with design document
/speck-changes.propose add-user-auth --with-design

# List all active changes
/speck-changes.list

# List with JSON output
/speck-changes.list --json

# Show details of a specific change
/speck-changes.show add-user-auth

# Validate a change proposal
/speck-changes.validate add-user-auth
```

### Archive Workflow

```bash
# Archive a completed change (merges deltas into specs)
/speck-changes.archive add-user-auth

# Force archive with incomplete tasks
/speck-changes.archive add-user-auth --force
```

### Migration

```bash
# Migrate existing OpenSpec project
/speck-changes.migrate
```

## Project Structure

```text
your-project/
├── .speck/
│   ├── changes/              # Active change proposals
│   │   └── add-user-auth/
│   │       ├── proposal.md
│   │       ├── tasks.md
│   │       └── specs/
│   │           └── auth.md   # Delta file
│   ├── archive/              # Completed changes
│   └── plugins/
│       └── speck-changes/    # Plugin implementation
├── upstream/
│   └── openspec/
│       ├── releases.json     # Release metadata
│       └── v0.16.0/          # Pulled release
├── specs/                    # Source specifications
└── .claude/
    └── commands/
        └── speck-changes/    # Slash commands
```

## Common Tasks

### Create a Change Proposal

1. Run `/speck-changes.propose my-feature`
2. Edit `.speck/changes/my-feature/proposal.md` with rationale
3. Add delta files to `.speck/changes/my-feature/specs/`
4. Update tasks in `tasks.md`

### Validate Before Review

1. Run `/speck-changes.validate my-feature`
2. Fix any reported issues
3. Re-validate until clean

### Complete and Archive

1. Mark all tasks complete in `tasks.md`
2. Run `/speck-changes.archive my-feature`
3. Verify deltas merged into source specs
4. Change moved to `.speck/archive/`

## Testing

```bash
# Run plugin tests
bun test tests/.speck-plugins/speck-changes/

# Run specific test file
bun test tests/.speck-plugins/speck-changes/propose.test.ts

# Run with coverage
bun test --coverage tests/.speck-plugins/speck-changes/
```

## Troubleshooting

### "Change name must be kebab-case"

Change names must use lowercase letters, numbers, and hyphens only.

```bash
# Wrong
/speck-changes.propose Add_User_Auth

# Correct
/speck-changes.propose add-user-auth
```

### "GitHub rate limit exceeded"

Install and authenticate `gh` CLI for higher rate limits:

```bash
gh auth login
```

### "Incomplete tasks exist"

Archive requires all tasks complete. Use `--force` to override:

```bash
/speck-changes.archive my-feature --force
```

### "No OpenSpec release found"

Check available releases first:

```bash
/speck-changes.check-upstream
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SPECK_CHANGES_DIR` | Override changes directory | `.speck/changes` |
| `SPECK_ARCHIVE_DIR` | Override archive directory | `.speck/archive` |
| `GITHUB_TOKEN` | GitHub API token (if no gh CLI) | None |

## Next Steps

1. Review [research.md](./research.md) for technical decisions
2. Review [data-model.md](./data-model.md) for entity definitions
3. Run `/speck.tasks` to generate implementation tasks
